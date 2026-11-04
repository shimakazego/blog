import crypto from 'node:crypto'
import pool from '../config/db.js'
import { migrateAttributeAnomalyNamingDeep } from '../utils/attributeAnomalyMigration.js'

/**
 * 共用方案（服务端预设方案）。
 *
 * - 管理端导入现有方案库导出包（`zzz-hp-schemes`），每个方案一行；
 * - 用户侧只读，复制到本机 localStorage 后才是「自己的方案」；
 * - 每条方案只带它真正引用的自建招式 / 技能组，避免把别人的整库带出去。
 */

const TABLE = 'calculator_shared_scheme'
const MAX_PACK_BYTES = 8 * 1024 * 1024
const MAX_SCHEMES = 200
const MAX_SCHEME_BYTES = 1024 * 1024
const MAX_NAME_LENGTH = 120
const MAX_FOLDER_LENGTH = 255
const MAX_DESCRIPTION_LENGTH = 500

let ensured = false

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function invalid(message) {
  return Object.assign(new Error(message), { code: 'INVALID_SHARED_SCHEME' })
}

function readString(value, maxLength = 0) {
  const text = typeof value === 'string' ? value.trim() : ''
  return maxLength > 0 ? text.slice(0, maxLength) : text
}

function parseJson(value, fallback) {
  if (value == null) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return fallback
  }
}

function normalizeFolder(value) {
  const text = readString(value, MAX_FOLDER_LENGTH).replace(/\\/g, '/')
  if (!text || text === '/') return ''
  return (text.startsWith('/') ? text : `/${text}`).replace(/\/+$/, '')
}

/** 稳定 id：同目录同名重复导入会命中同一行；改名视为新方案 */
export function sharedSchemeId(folder, name) {
  const hash = crypto
    .createHash('sha1')
    .update(`${normalizeFolder(folder)}\n${readString(name)}`)
    .digest('hex')
    .slice(0, 16)
  return `schv1-${hash}`
}

function collectSchemeRefs(entry) {
  const skillIds = new Set()
  const groupIds = new Set()
  for (const slot of Array.isArray(entry?.slots) ? entry.slots : []) {
    for (const prepared of Array.isArray(slot?.prepared) ? slot.prepared : []) {
      if (prepared?.skillSource === 'custom') {
        const skillId = readString(prepared.skillId)
        if (skillId) skillIds.add(skillId)
      }
      const groupId = readString(prepared?.skillGroupId)
      if (groupId) groupIds.add(groupId)
      for (const member of Array.isArray(prepared?.memberAgents) ? prepared.memberAgents : []) {
        const skillId = readString(member?.skillId)
        if (skillId) skillIds.add(skillId)
      }
    }
    for (const flow of Array.isArray(slot?.flow) ? slot.flow : []) {
      for (const override of Array.isArray(flow?.memberOverrides) ? flow.memberOverrides : []) {
        const skillId = readString(override?.skillId)
        if (skillId) skillIds.add(skillId)
      }
    }
  }
  return { skillIds, groupIds }
}

function buildDependencies(pack, entry) {
  const { skillIds, groupIds } = collectSchemeRefs(entry)
  const customSkills = Array.isArray(pack.customSkills) ? pack.customSkills : []
  const skillGroups = Array.isArray(pack.skillGroups) ? pack.skillGroups : []
  const groups = skillGroups.filter((group) => {
    const id = readString(group?.id)
    return id && groupIds.has(id)
  })
  for (const group of groups) {
    for (const member of Array.isArray(group?.members) ? group.members : []) {
      const skillId = readString(member?.skillId)
      if (skillId) skillIds.add(skillId)
    }
  }
  return {
    customSkills: customSkills.filter((skill) => {
      const id = readString(skill?.id)
      return id && skillIds.has(id)
    }),
    skillGroups: groups,
  }
}

/**
 * 纯函数：把方案库导出包转成待入库的行。
 * 抛错信息直接给管理端展示；不做数据库访问，便于单测。
 */
export function buildSharedSchemeRows(rawPack) {
  // 旧个人方案包（属性异常字段旧名 / 旧子类类型值 / 旧生成行属性槽位）在入库前转换，
  // 统一库只存新名（Spec §4.4.3 服务端共用方案一行；同映射见 utils/attributeAnomalyMigration.js）。
  const pack = migrateAttributeAnomalyNamingDeep(rawPack)
  if (!isPlainObject(pack)) throw invalid('文件不是 JSON 对象')
  if (pack.type !== 'zzz-hp-schemes' || !isPlainObject(pack.schemes)) {
    throw invalid('文件类型错误：不是 zzz-hp-schemes 方案库导出')
  }
  const entries = Object.entries(pack.schemes)
  if (!entries.length) throw invalid('方案包里没有方案')
  if (entries.length > MAX_SCHEMES) throw invalid(`方案数量过多（上限 ${MAX_SCHEMES}）`)

  const packBytes = Buffer.byteLength(JSON.stringify(pack), 'utf8')
  if (packBytes > MAX_PACK_BYTES) {
    throw invalid(`方案包过大（${Math.round(packBytes / 1024 / 1024)}MB，上限 8MB）`)
  }

  const usedIds = new Set()
  const rows = []
  let skipped = 0
  entries.forEach(([key, entry], index) => {
    if (!isPlainObject(entry)) {
      skipped++
      return
    }
    const name = readString(entry.name || key.split('/').pop(), MAX_NAME_LENGTH)
    if (!name) {
      skipped++
      return
    }
    const entryBytes = Buffer.byteLength(JSON.stringify(entry), 'utf8')
    if (entryBytes > MAX_SCHEME_BYTES) {
      skipped++
      return
    }
    const folder = normalizeFolder(entry.folder)
    let id = sharedSchemeId(folder, name)
    if (usedIds.has(id)) {
      let suffix = 2
      while (usedIds.has(`${id}-${suffix}`)) suffix++
      id = `${id}-${suffix}`
    }
    usedIds.add(id)
    rows.push({
      id,
      name,
      folder,
      description: readString(entry.description, MAX_DESCRIPTION_LENGTH),
      payload: entry,
      dependencies: buildDependencies(pack, entry),
      sortOrder: Number.isFinite(Number(entry.order)) ? Number(entry.order) : index,
    })
  })
  if (!rows.length) throw invalid('方案包里没有可用方案')
  return { rows, skipped }
}

async function ensureTable() {
  if (ensured) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      folder VARCHAR(255) NOT NULL DEFAULT '',
      description VARCHAR(500) NOT NULL DEFAULT '',
      payload JSON NOT NULL,
      dependencies JSON NULL,
      sort_order INT NOT NULL DEFAULT 0,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_enabled_sort (enabled, sort_order, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  ensured = true
}

function mapRow(row, includePayload) {
  const item = {
    id: row.id,
    name: row.name,
    folder: row.folder || '',
    description: row.description || '',
    sortOrder: Number(row.sort_order) || 0,
    enabled: Boolean(row.enabled),
    updatedAt: row.updated_at,
  }
  if (includePayload) {
    item.payload = parseJson(row.payload, null)
    item.dependencies = parseJson(row.dependencies, { customSkills: [], skillGroups: [] })
  }
  return item
}

export async function importSharedSchemes(pack, options = {}) {
  const mode = options.mode === 'replace' ? 'replace' : 'merge'
  const { rows, skipped } = buildSharedSchemeRows(pack)
  await ensureTable()

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (mode === 'replace') {
      await conn.query(`DELETE FROM ${TABLE}`)
    }
    for (const row of rows) {
      await conn.query(
        `INSERT INTO ${TABLE}
           (id, name, folder, description, payload, dependencies, sort_order, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           folder = VALUES(folder),
           description = VALUES(description),
           payload = VALUES(payload),
           dependencies = VALUES(dependencies),
           sort_order = VALUES(sort_order)`,
        [
          row.id,
          row.name,
          row.folder,
          row.description,
          JSON.stringify(row.payload),
          JSON.stringify(row.dependencies),
          row.sortOrder,
        ],
      )
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return { mode, imported: rows.length, skipped, ids: rows.map((row) => row.id) }
}

export async function listSharedSchemes(options = {}) {
  const enabledOnly = options.enabledOnly !== false
  const includePayload = options.includePayload !== false
  await ensureTable()
  const columns = includePayload
    ? 'id, name, folder, description, payload, dependencies, sort_order, enabled, updated_at'
    : 'id, name, folder, description, sort_order, enabled, updated_at'
  const [rows] = await pool.query(
    `SELECT ${columns} FROM ${TABLE}
     ${enabledOnly ? 'WHERE enabled = 1' : ''}
     ORDER BY sort_order ASC, updated_at DESC, id ASC`,
  )
  return rows.map((row) => mapRow(row, includePayload))
}

export async function updateSharedScheme(id, patch = {}) {
  await ensureTable()
  const key = readString(id)
  if (!key) return null
  const fields = []
  const params = []
  if (typeof patch.enabled === 'boolean') {
    fields.push('enabled = ?')
    params.push(patch.enabled ? 1 : 0)
  }
  if (patch.name != null) {
    const name = readString(patch.name, MAX_NAME_LENGTH)
    if (!name) throw invalid('方案名不能为空')
    fields.push('name = ?')
    params.push(name)
  }
  if (patch.description != null) {
    fields.push('description = ?')
    params.push(readString(patch.description, MAX_DESCRIPTION_LENGTH))
  }
  if (patch.sortOrder != null && Number.isFinite(Number(patch.sortOrder))) {
    fields.push('sort_order = ?')
    params.push(Number(patch.sortOrder))
  }
  if (!fields.length) return null
  params.push(key)
  const [result] = await pool.query(`UPDATE ${TABLE} SET ${fields.join(', ')} WHERE id = ?`, params)
  if (!result?.affectedRows) return null
  const [rows] = await pool.query(
    `SELECT id, name, folder, description, sort_order, enabled, updated_at
     FROM ${TABLE} WHERE id = ? LIMIT 1`,
    [key],
  )
  return rows[0] ? mapRow(rows[0], false) : null
}

export async function deleteSharedScheme(id) {
  await ensureTable()
  const key = readString(id)
  if (!key) return false
  const [result] = await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [key])
  return Boolean(result?.affectedRows)
}

export { TABLE as SHARED_SCHEME_TABLE, MAX_PACK_BYTES, MAX_SCHEMES }

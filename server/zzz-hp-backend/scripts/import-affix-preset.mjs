/**
 * 把 JSON 里的官方预设词条库灌进数据库（**覆盖式**，按方案整份替换）。
 *
 * 数据源：
 *   - 默认从 `zzz-hp-calculator-buffs.json` 的 `affixPresets` 键读取（与游戏主数据合并管理，单一真相源）；
 *   - 也可用 --file 指向任意独立预设 JSON（兼容旧 `affix-preset.seed.json` 单方案格式 `{entries, groups}`）。
 *
 * 口径（用户 2026-09-12 拍板）：官方预设的唯一来源＝数据库，用户侧只读。
 * 见 `dev-docs/affix-optimizer-impl-log.md` 步骤 33。
 *
 * ⚠️ 覆盖式：每套方案的现有条目与分组会被清掉换成这份。**id 一旦发布不可改名**
 *（前端用户本地的 enabledOverride / overrides / removedEntryIds 都按 id 索引）。
 * 故脚本在写入前会把现有内容备份到 scripts/data/backups/。
 */
import fs from 'fs'
import path from 'path'
import pool from '../src/config/db.js'
import {
  listAffixSchemes,
  listAffixPreset,
  replaceAffixPreset,
} from '../src/services/affixPresetService.js'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry')
const fileArg = args.find((item) => !item.startsWith('--'))
const sourceFile = fileArg
  ? path.resolve(fileArg)
  : path.resolve('scripts/data/zzz-hp-calculator-buffs.json')

if (!fs.existsSync(sourceFile)) {
  console.error(`找不到文件：${sourceFile}`)
  process.exit(1)
}

const payload = JSON.parse(fs.readFileSync(sourceFile, 'utf8'))

// 解析预设数据：优先 buffs.json 的 affixPresets（多方案），回退旧单方案格式
let schemes = []
if (payload?.affixPresets && Array.isArray(payload.affixPresets.schemes)) {
  schemes = payload.affixPresets.schemes.map((s) => ({
    name: String(s.name ?? ''),
    entries: Array.isArray(s.entries) ? s.entries : [],
    groups: Array.isArray(s.groups) ? s.groups : [],
  }))
} else if (Array.isArray(payload.entries) || Array.isArray(payload.groups)) {
  // 旧格式：扁平 {entries, groups} → 当作默认方案
  schemes = [
    {
      name: '默认',
      entries: Array.isArray(payload.entries) ? payload.entries : [],
      groups: Array.isArray(payload.groups) ? payload.groups : [],
    },
  ]
}

if (!schemes.length) {
  console.error('文件中找不到可导入的预设数据（既无 affixPresets.schemes，也无 entries/groups）。')
  process.exit(1)
}

/** 与后端控制器同一套最小校验：id/label/target 必填，target 前缀合法 */
function validateScheme(scheme) {
  const errors = []
  const seen = new Set()
  for (const [index, entry] of scheme.entries.entries()) {
    const id = String(entry.id ?? '').trim()
    const target = String(entry.target ?? '').trim()
    if (!id) errors.push(`第 ${index + 1} 条：缺 id`)
    else if (seen.has(id)) errors.push(`第 ${index + 1} 条：id 重复 ${id}`)
    else seen.add(id)
    if (!String(entry.label ?? '').trim()) errors.push(`第 ${index + 1} 条（${id}）：缺 label`)
    if (!target.startsWith('panel:') && !target.startsWith('gain:')) {
      errors.push(`第 ${index + 1} 条（${id}）：target 前缀非法 ${target}`)
    }
    if (!Number.isFinite(Number(entry.perRoll)) || Number(entry.perRoll) <= 0) {
      errors.push(`第 ${index + 1} 条（${id}）：perRoll 非正数`)
    }
  }
  const groupNames = new Set(scheme.groups.map((item) => String(item.name ?? '').trim()))
  for (const entry of scheme.entries) {
    const group = String(entry.group ?? '').trim()
    if (group && !groupNames.has(group)) {
      errors.push(`${entry.id}：分组「${group}」不在 groups 列表里`)
    }
  }
  return errors
}

let totalErrors = 0
for (const scheme of schemes) {
  const errors = validateScheme(scheme)
  totalErrors += errors.length
  if (errors.length) {
    console.error(`方案「${scheme.name}」校验失败（${errors.length} 项）：`)
    for (const err of errors) console.error('  - ' + err)
  }
}
if (totalErrors > 0) process.exit(1)

for (const scheme of schemes) {
  const byGroup = new Map()
  for (const entry of scheme.entries) {
    const key = String(entry.group ?? '').trim() || '(未分组)'
    byGroup.set(key, (byGroup.get(key) ?? 0) + 1)
  }
  console.log(
    `\n方案「${scheme.name}」：待写入 ${scheme.entries.length} 条 / ${scheme.groups.length} 组`,
  )
  for (const [name, count] of byGroup) console.log(`  ${name}: ${count} 条`)
  console.log(`默认启用：${scheme.entries.filter((e) => e.enabledByDefault).length} 条`)
}

if (dryRun) {
  console.log('\n--dry：未写库。')
  await pool.end()
  process.exit(0)
}

// 写入前备份现有内容（按方案全量备份，覆盖式导入前的兜底）
const backupDir = path.resolve('scripts/data/backups')
fs.mkdirSync(backupDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
const existingSchemes = await listAffixSchemes()
const backup = {
  exportedAt: new Date().toISOString(),
  schemes: [],
}
for (const meta of existingSchemes) {
  const full = await listAffixPreset(meta.name)
  backup.schemes.push({
    name: full.scheme,
    isDefault: meta.isDefault,
    sortOrder: meta.sortOrder,
    entries: full.entries,
    groups: full.groups,
  })
}
if (backup.schemes.length) {
  const backupFile = path.join(backupDir, `affix-preset.before-import-${stamp}.json`)
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf8')
  console.log(`\n已备份现有内容 → ${backupFile}`)
}

for (const scheme of schemes) {
  const after = await replaceAffixPreset({
    scheme: scheme.name,
    entries: scheme.entries,
    groups: scheme.groups,
  })
  console.log(`方案「${scheme.name}」完成：库里现有 ${after.entries.length} 条 / ${after.groups.length} 组`)
}
await pool.end()
process.exit(0)

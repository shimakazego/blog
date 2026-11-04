import pool from '../config/db.js'

let ensured = false

export async function ensureSeasonContentTrashTable() {
  if (ensured) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS season_content_trash (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      scheme VARCHAR(20) NOT NULL COMMENT 'defense|crisis',
      version VARCHAR(50) NOT NULL,
      phase VARCHAR(50) NOT NULL COMMENT '期数数字',
      boss_count INT UNSIGNED NOT NULL DEFAULT 0,
      buff_count INT UNSIGNED NOT NULL DEFAULT 0,
      date_count INT UNSIGNED NOT NULL DEFAULT 0,
      note VARCHAR(500) NOT NULL DEFAULT '',
      deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_season_trash (scheme, version, phase)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  ensured = true
}

function normalizePhase(phase) {
  const text = String(phase ?? '').trim()
  return text.replace(/\D/g, '') || text
}

function normalizeScheme(scheme) {
  return String(scheme || '').trim() === 'defense' ? 'defense' : 'crisis'
}

export function seasonTrashKey(scheme, version, phase) {
  return `${normalizeScheme(scheme)}:${String(version).trim()}:${normalizePhase(phase)}`
}

export async function listSeasonContentTrash(scheme) {
  await ensureSeasonContentTrashTable()
  const mode = normalizeScheme(scheme)
  const [rows] = await pool.query(
    `SELECT id, scheme, version, phase, boss_count, buff_count, date_count, note, deleted_at
     FROM season_content_trash
     WHERE scheme = ?
     ORDER BY deleted_at DESC, id DESC`,
    [mode],
  )
  return rows.map((row) => ({
    id: Number(row.id),
    scheme: row.scheme,
    version: String(row.version),
    phase: normalizePhase(row.phase),
    bossCount: Number(row.boss_count || 0),
    buffCount: Number(row.buff_count || 0),
    dateCount: Number(row.date_count || 0),
    note: row.note || '',
    deletedAt: row.deleted_at,
  }))
}

/** @returns {Map<string, { deletedAt: any, bossCount: number, buffCount: number, dateCount: number }>} */
export async function getSeasonContentTrashMap(scheme) {
  const list = await listSeasonContentTrash(scheme)
  const map = new Map()
  for (const item of list) {
    map.set(seasonTrashKey(item.scheme, item.version, item.phase), item)
  }
  return map
}

export async function getSeasonContentTrashEntry(scheme, version, phase) {
  await ensureSeasonContentTrashTable()
  const mode = normalizeScheme(scheme)
  const versionStr = String(version).trim()
  const phaseStr = normalizePhase(phase)
  const [rows] = await pool.query(
    `SELECT id, scheme, version, phase, boss_count, buff_count, date_count, note, deleted_at
     FROM season_content_trash
     WHERE scheme = ? AND version = ? AND phase = ?
     LIMIT 1`,
    [mode, versionStr, phaseStr],
  )
  const row = rows[0]
  if (!row) return null
  return {
    id: Number(row.id),
    scheme: row.scheme,
    version: String(row.version),
    phase: normalizePhase(row.phase),
    bossCount: Number(row.boss_count || 0),
    buffCount: Number(row.buff_count || 0),
    dateCount: Number(row.date_count || 0),
    note: row.note || '',
    deletedAt: row.deleted_at,
  }
}

export async function softDeleteSeasonContent(scheme, version, phase, snapshot = {}) {
  await ensureSeasonContentTrashTable()
  const mode = normalizeScheme(scheme)
  const versionStr = String(version).trim()
  const phaseStr = normalizePhase(phase)
  if (!versionStr || !phaseStr) throw new Error('version 与 phase 为必填项')

  await pool.query(
    `INSERT INTO season_content_trash
      (scheme, version, phase, boss_count, buff_count, date_count, note, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       boss_count = VALUES(boss_count),
       buff_count = VALUES(buff_count),
       date_count = VALUES(date_count),
       note = VALUES(note),
       deleted_at = CURRENT_TIMESTAMP`,
    [
      mode,
      versionStr,
      phaseStr,
      Number(snapshot.bossCount || 0),
      Number(snapshot.buffCount || 0),
      Number(snapshot.dateCount || 0),
      String(snapshot.note || '').slice(0, 500),
    ],
  )

  return getSeasonContentTrashEntry(mode, versionStr, phaseStr)
}

export async function removeSeasonContentTrashEntry(scheme, version, phase) {
  await ensureSeasonContentTrashTable()
  const [result] = await pool.execute(
    `DELETE FROM season_content_trash
     WHERE scheme = ? AND version = ? AND phase = ?`,
    [normalizeScheme(scheme), String(version).trim(), normalizePhase(phase)],
  )
  return result.affectedRows
}

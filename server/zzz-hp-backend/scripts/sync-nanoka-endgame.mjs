/**
 * nanoka.cc → 本地库：只同步「式舆防卫战」和「危局强袭战」。
 *
 * 只写 date/boss/buff（boss_info 由 upsertBoss 维护），绝不碰角色、音擎、
 * 驱动盘、计算器等其他数据。
 *
 * source 规则：
 *   - 有 live_begin/live_end：正式服条目；未到 live_begin 时标记 test（即将开始的数据来自测试服）
 *   - 只有 begin/end：测试服条目，标记 test
 *   - 已过期的正式服条目仍标记 live，前端根据 end 显示“已结束”
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../src/config/db.js'
import { fetchJson, fetchText, resolveNanokaBuildTag } from '../src/services/nanoka/nanokaClient.js'
import { parseNanokaDefenseSeason } from '../src/services/nanoka/nanokaDefenseParser.js'
import { upsertBoss, upsertBuff } from '../src/services/dataService.js'
import { encodeCrisisBuffId } from '../src/utils/defenseId.js'

const STATIC_BASE = 'https://static.nanoka.cc/zzz'
const CDN_ASSET_BASE = 'https://static.nanoka.cc/assets/zzz'
const DRY_RUN = process.argv.includes('--dry-run')
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGE_DIR = process.env.BOSS_IMAGE_DIR || path.join(__dirname, '..', 'boss_image')
const imageFiles = new Set(
    fs.existsSync(IMAGE_DIR)
        ? fs.readdirSync(IMAGE_DIR).filter((name) => {
              try {
                  return fs.statSync(path.join(IMAGE_DIR, name)).size > 0
              } catch {
                  return false
              }
          })
        : [],
)
const imageStats = { downloaded: 0, repaired: 0, failed: [] }
const imageCache = new Map()

function imageBaseName(image) {
    return String(image ?? '')
        .split('/')
        .pop()
        .replace(/\.(png|webp|jpe?g)$/i, '')
}

function localImageFor(base) {
    for (const ext of ['webp', 'png', 'jpg', 'jpeg']) {
        const name = `${base}.${ext}`
        if (imageFiles.has(name)) return `/boss_image/${name}`
    }
    return null
}

async function ensureBossImage(image) {
    if (!image) return image
    const raw = String(image)
    if (imageCache.has(raw)) return imageCache.get(raw)
    const base = imageBaseName(raw)
    if (!base) {
        imageCache.set(raw, raw)
        return raw
    }
    const local = localImageFor(base)
    if (local) {
        imageCache.set(raw, local)
        return local
    }
    if (DRY_RUN) {
        const guess = `/boss_image/${base}.webp`
        imageCache.set(raw, guess)
        return guess
    }
    for (const ext of ['webp', 'png', 'jpg', 'jpeg']) {
        try {
            const url = `${CDN_ASSET_BASE}/${encodeURIComponent(base)}.${ext}`
            const res = await fetch(url, { headers: { 'user-agent': 'zzz-hp-importer/1.0' } })
            if (!res.ok) continue
            const name = `${base}.${ext}`
            fs.mkdirSync(IMAGE_DIR, { recursive: true })
            fs.writeFileSync(path.join(IMAGE_DIR, name), Buffer.from(await res.arrayBuffer()))
            imageFiles.add(name)
            imageStats.downloaded += 1
            const next = `/boss_image/${name}`
            imageCache.set(raw, next)
            return next
        } catch {
            // 换扩展名继续尝试
        }
    }
    imageStats.failed.push({ image: raw, base })
    imageCache.set(raw, raw)
    return raw
}

async function repairExistingBossImages() {
    const paths = new Set()
    const [bossRows] = await pool.execute(
        "SELECT DISTINCT boss_image FROM `boss` WHERE mode IN ('crisis','defense') AND boss_image IS NOT NULL AND boss_image <> ''",
    )
    for (const row of bossRows) paths.add(row.boss_image)
    const [infoRows] = await pool.execute(
        "SELECT DISTINCT boss_image FROM `boss_info` WHERE boss_image IS NOT NULL AND boss_image <> ''",
    )
    for (const row of infoRows) paths.add(row.boss_image)

    for (const current of paths) {
        const next = await ensureBossImage(current)
        if (next !== current && !DRY_RUN) {
            await pool.execute('UPDATE `boss` SET boss_image = ? WHERE boss_image = ?', [next, current])
            await pool.execute('UPDATE `boss_info` SET boss_image = ? WHERE boss_image = ?', [next, current])
            imageStats.repaired += 1
        }
    }
}

// 只列本次要补的新期。旧期已经在库里，不重复抓。
// 数值为 nanoka 赛季 ID → 游戏版本/期数。
const SHIYU_SEASONS = new Map([
    ['62056', { version: '3.1', phase: '3' }],
    ['62057', { version: '3.2', phase: '1' }],
    ['62058', { version: '3.2', phase: '2' }],
    ['62059', { version: '3.2', phase: '3' }],
    ['62060', { version: '3.3', phase: '1' }],
    ['62061', { version: '3.3', phase: '2' }],
    ['62062', { version: '3.3', phase: '3' }],
    ['620631', { version: '3.4', phase: '1', test: true }],
    ['620641', { version: '3.4', phase: '2', test: true }],
    ['620651', { version: '3.4', phase: '3', test: true }],
])

const CRISIS_SEASONS = new Map([
    ['690451', { version: '3.2', phase: '1' }],
    ['690461', { version: '3.2', phase: '2' }],
    ['690471', { version: '3.2', phase: '3' }],
    ['690481', { version: '3.3', phase: '1' }],
    ['690491', { version: '3.3', phase: '2' }],
    ['690501', { version: '3.3', phase: '3' }],
    ['690511', { version: '3.4', phase: '1', test: true }],
    ['690521', { version: '3.4', phase: '2', test: true }],
    ['690531', { version: '3.4', phase: '3', test: true }],
])

// 后续新期只补当前时间线之后的 ID；旧期已经在库里，不重抓。
function augmentShiyuSeasons(summary) {
    for (const id of Object.keys(summary || {})) {
        if (SHIYU_SEASONS.has(id)) continue
        const n = Number(id)
        if (!Number.isInteger(n) || n < 62063) continue
        // 测试服 ID 形如 620631，去掉末位 1 后对应正式期 62063。
        const base = String(id).length === 6 ? Math.floor(n / 10) : n
        if (base < 62063) continue
        const index = base - 62057
        SHIYU_SEASONS.set(id, {
            version: (3.2 + Math.floor(index / 3)).toFixed(1),
            phase: String((index % 3) + 1),
        })
    }
}

function augmentCrisisSeasons(summary) {
    for (const id of Object.keys(summary || {})) {
        if (CRISIS_SEASONS.has(id)) continue
        const n = Number(id)
        if (!Number.isInteger(n) || n < 690451 || (n - 690451) % 10 !== 0) continue
        const index = (n - 690451) / 10
        CRISIS_SEASONS.set(id, {
            version: (3.2 + Math.floor(index / 3)).toFixed(1),
            phase: String((index % 3) + 1),
        })
    }
}

const ELEMENT_LABELS = {
    physical: '物理',
    fire: '火',
    ice: '冰',
    electric: '电',
    ether: '以太',
    wind: '风',
}

function sliceDate(value) {
    if (!value) return null
    return String(value).slice(0, 10)
}

function resolvePeriod(meta, mapping) {
    if (meta.live_begin && meta.live_end) {
        const source = new Date() < new Date(meta.live_begin) ? 'test' : 'live'
        return { start: sliceDate(meta.live_begin), end: sliceDate(meta.live_end), source }
    }
    if (meta.begin && meta.end) {
        return { start: sliceDate(meta.begin), end: sliceDate(meta.end), source: 'test' }
    }
    return null
}

async function ensureSourceColumns() {
    const tables = {
        date: [
            ['source', "VARCHAR(16) NOT NULL DEFAULT 'live'"],
            ['season_id', 'VARCHAR(32) NULL'],
        ],
        boss: [
            ['source', "VARCHAR(16) NOT NULL DEFAULT 'live'"],
            ['season_id', 'VARCHAR(32) NULL'],
        ],
        buff: [
            ['source', "VARCHAR(16) NOT NULL DEFAULT 'live'"],
            ['season_id', 'VARCHAR(32) NULL'],
        ],
    }
    for (const [table, columns] of Object.entries(tables)) {
        const [rows] = await pool.execute(`SHOW COLUMNS FROM \`${table}\``)
        const existing = new Set(rows.map((row) => row.Field))
        for (const [name, ddl] of columns) {
            if (!existing.has(name)) {
                await pool.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${ddl}`)
            }
        }
    }
}

async function resolveBuildTag() {
    try {
        return await resolveNanokaBuildTag()
    } catch {
        const html = await fetchText('https://zzz.nanoka.cc/shiyu')
        const match = html.match(/static\.nanoka\.cc\/zzz\/([^/]+)\/shiyu\.json/)
        if (!match) throw new Error('无法解析 nanoka 数据版本号')
        return match[1]
    }
}

async function fetchSummary(buildTag, kind) {
    return fetchJson(`${STATIC_BASE}/${buildTag}/${kind}.json`)
}

async function fetchDetail(buildTag, kind, seasonId) {
    return fetchJson(`${STATIC_BASE}/${buildTag}/zh/${kind}/${seasonId}.json`)
}

async function markSeason({ mode, version, phase, seasonId, source }) {
    if (DRY_RUN) return
    await pool.execute(
        'UPDATE `boss` SET source = ?, season_id = ? WHERE mode = ? AND version = ? AND phase = ?',
        [source, String(seasonId), mode, version, String(phase)],
    )
    await pool.execute(
        'UPDATE `buff` SET source = ?, season_id = ? WHERE mode = ? AND version = ? AND phase = ?',
        [source, String(seasonId), mode, version, String(phase)],
    )
}

async function upsertDate({ mode, version, phase, start, end, source, seasonId }) {
    if (DRY_RUN) return
    await pool.execute(
        `INSERT INTO \`date\` (mode, version, phase, start_date, end_date, source, season_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           start_date = VALUES(start_date),
           end_date = VALUES(end_date),
           source = VALUES(source),
           season_id = VALUES(season_id)`,
        [mode, version, String(phase), start, end, source, String(seasonId)],
    )
}

async function dateExists({ mode, version, phase }) {
    const [rows] = await pool.execute(
        'SELECT id, source, season_id FROM `date` WHERE mode = ? AND version = ? AND phase = ? LIMIT 1',
        [mode, version, String(phase)],
    )
    return rows[0] ?? null
}

function crisisBossId(version, phase, room) {
    const versionCode = String(version).replace(/\D/g, '')
    const phaseCode = String(phase).replace(/\D/g, '')
    const roomCode = String(room).replace(/\D/g, '') || '1'
    return Number(`${versionCode}${phaseCode}${roomCode}`)
}

function formatWeakness(weakness = {}) {
    const values = Object.values(weakness || {}).filter(Boolean)
    return values.length ? values.join(' ') : null
}

function formatResistance(element = {}) {
    const values = []
    for (const [key, value] of Object.entries(element || {})) {
        if (Number(value) < 0 && ELEMENT_LABELS[key]) values.push(ELEMENT_LABELS[key])
    }
    return values.length ? values.join(' ') : null
}

function parseCrisisDetail(detail, { version, phase, zoneType }) {
    const modes = Array.isArray(detail.modes) ? detail.modes : []
    if (!modes.length) throw new Error('危局详情没有 modes')

    // 普通模式在前（3 个 Boss），困难模式在后（1 个 Boss）；
    // 旧库 3.1 的危局每期正好是 4 个房间，按 1-4 编码。
    const bossModes = [...modes].sort((a, b) => Number(a.zone_type) - Number(b.zone_type))
    const bosses = []
    const seen = new Set()
    let roomCounter = 0
    for (const mode of bossModes) {
        for (const zone of Object.values(mode.zone || {})) {
            roomCounter += 1
            const room = String(roomCounter)
            for (const battleRoom of Object.values(zone.layer_room || {})) {
                for (const monster of Object.values(battleRoom.monster_list || {})) {
                    const id = crisisBossId(version, phase, room)
                    if (seen.has(id)) continue
                    seen.add(id)
                    bosses.push({
                        id,
                        version,
                        phase: String(phase),
                        boss_name: monster.name,
                        hp: Math.round(Number(monster.stats?.hp ?? 0)),
                        defense: Math.round(Number(monster.stats?.defence ?? 0)),
                        level: Number(zone.monster_level ?? 1),
                        room,
                        weakness: formatWeakness(battleRoom.monster_weakness),
                        resistance: formatResistance(monster.element),
                        boss_image: monster.image ? `/${String(monster.image).replace(/^\/+/, '')}` : null,
                        stagger_multiplier: 1.5,
                        mode: 'crisis',
                    })
                }
            }
        }
    }

    // 危局每期的 3 条可选 Buff 在困难模式的 layer_buff 里。
    const buffMode =
        modes.find((item) => Number(item.zone_type) === Number(zoneType)) ??
        modes.find((item) => Number(item.zone_type) === 1002) ??
        modes[0]
    const candidates = []
    const seenBuff = new Set()
    for (const zone of Object.values(buffMode.zone || {})) {
        for (const group of [zone.selectable_buff, zone.layer_buff]) {
            for (const buff of Object.values(group || {})) {
                const title = String(buff.title || '').trim()
                const desc = String(buff.desc || '').trim()
                if (!title && !desc) continue
                const key = `${title}\n${desc}`
                if (seenBuff.has(key)) continue
                seenBuff.add(key)
                candidates.push({ title, desc })
            }
        }
    }
    // 危局固定 3 个可选 Buff；优先取有正式名称的，测试服 TBD 再兜底。
    const realBuffs = candidates.filter((item) => item.title && !item.title.endsWith('_Title') && item.title !== '(Test1)TBD')
    const testBuffs = candidates.filter((item) => item.title === '(Test1)TBD')
    const buffEntries = (realBuffs.length >= 3 ? realBuffs : [...realBuffs, ...testBuffs]).slice(0, 3)
    const buffs = buffEntries.map((buff, index) => ({
        id: encodeCrisisBuffId({ version, phase: String(phase), buffIndex: index + 1 }),
        version,
        phase: String(phase),
        buff_name: buff.title || `关卡效果 ${index + 1}`,
        buff: buff.desc,
        buff_image: null,
        effect_blocks: null,
        mode: 'crisis',
    }))

    return { bosses, buffs, roomCount: roomCounter }
}

async function syncShiyu(buildTag, summary) {
    const result = { mode: 'defense', seasons: [], created: 0, updated: 0, errors: [] }
    for (const [seasonId, mapping] of SHIYU_SEASONS) {
        const meta = summary[seasonId]
        if (!meta) {
            result.errors.push({ seasonId, error: 'nanoka 汇总中不存在' })
            continue
        }
        const period = resolvePeriod(meta, mapping)
        if (!period) {
            result.errors.push({ seasonId, error: '没有可用日期' })
            continue
        }
        try {
            const existing = await dateExists({ mode: 'defense', version: mapping.version, phase: mapping.phase })
            if (existing && existing.season_id === String(seasonId) && existing.source === period.source) {
                result.seasons.push({ seasonId, version: mapping.version, phase: mapping.phase, action: 'skipped' })
                continue
            }
            if (!existing) {
                const detail = await fetchDetail(buildTag, 'shiyu', seasonId)
                const parsed = parseNanokaDefenseSeason(detail, { version: mapping.version, phase: mapping.phase })
                for (const boss of parsed.bosses) {
                    boss.boss_image = await ensureBossImage(boss.boss_image)
                    if (!DRY_RUN) await upsertBoss(boss)
                }
                for (const buff of parsed.buffs) {
                    if (!DRY_RUN) await upsertBuff(buff)
                }
                result.created += 1
            } else {
                result.updated += 1
            }
            await upsertDate({
                mode: 'defense', version: mapping.version, phase: mapping.phase,
                start: period.start, end: period.end, source: period.source, seasonId,
            })
            await markSeason({
                mode: 'defense', version: mapping.version, phase: mapping.phase,
                seasonId, source: period.source,
            })
            result.seasons.push({
                seasonId, version: mapping.version, phase: mapping.phase,
                start: period.start, end: period.end, source: period.source,
                action: existing ? 'updated' : 'created',
            })
        } catch (error) {
            result.errors.push({ seasonId, error: error.message })
        }
    }
    return result
}

async function syncCrisis(buildTag, summary) {
    const result = { mode: 'crisis', seasons: [], created: 0, updated: 0, errors: [] }
    for (const [seasonId, mapping] of CRISIS_SEASONS) {
        const meta = summary[seasonId]
        if (!meta) {
            result.errors.push({ seasonId, error: 'nanoka 汇总中不存在' })
            continue
        }
        const period = resolvePeriod(meta, mapping)
        if (!period) {
            result.errors.push({ seasonId, error: '没有可用日期' })
            continue
        }
        try {
            const existing = await dateExists({ mode: 'crisis', version: mapping.version, phase: mapping.phase })
            if (existing && existing.season_id === String(seasonId) && existing.source === period.source) {
                result.seasons.push({ seasonId, version: mapping.version, phase: mapping.phase, action: 'skipped' })
                continue
            }
            if (!existing) {
                const detail = await fetchDetail(buildTag, 'boss', seasonId)
                const parsed = parseCrisisDetail(detail, {
                    version: mapping.version,
                    phase: mapping.phase,
                    zoneType: meta.zone_type,
                })
                for (const boss of parsed.bosses) {
                    boss.boss_image = await ensureBossImage(boss.boss_image)
                    if (!DRY_RUN) await upsertBoss(boss)
                }
                for (const buff of parsed.buffs) {
                    if (!DRY_RUN) await upsertBuff(buff)
                }
                result.created += 1
            } else {
                result.updated += 1
            }
            await upsertDate({
                mode: 'crisis', version: mapping.version, phase: mapping.phase,
                start: period.start, end: period.end, source: period.source, seasonId,
            })
            await markSeason({
                mode: 'crisis', version: mapping.version, phase: mapping.phase,
                seasonId, source: period.source,
            })
            result.seasons.push({
                seasonId, version: mapping.version, phase: mapping.phase,
                start: period.start, end: period.end, source: period.source,
                action: existing ? 'updated' : 'created',
            })
        } catch (error) {
            result.errors.push({ seasonId, error: error.message })
        }
    }
    return result
}

await ensureSourceColumns()
await repairExistingBossImages()
const buildTag = await resolveBuildTag()
const [shiyu, crisis] = await Promise.all([
    fetchSummary(buildTag, 'shiyu'),
    fetchSummary(buildTag, 'boss'),
])
augmentShiyuSeasons(shiyu)
augmentCrisisSeasons(crisis)

const defenseResult = await syncShiyu(buildTag, shiyu)
const crisisResult = await syncCrisis(buildTag, crisis)

// 新期在 sync 内才插入/下载；再跑一次可覆盖已存在期新增的 Boss、以及刚下载的图片路径。
await repairExistingBossImages()

console.log(JSON.stringify({
    dryRun: DRY_RUN,
    buildTag,
    images: imageStats,
    defense: defenseResult,
    crisis: crisisResult,
}, null, 2))

await pool.end()

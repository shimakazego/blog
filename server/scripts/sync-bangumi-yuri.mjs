// 将 fetch-bangumi-yuri.mjs 产出的数据导入博客数据库（yuri_entries + 快照）。
// 设计为在 blog-express 容器内运行：node scripts/sync-bangumi-yuri.mjs --data-dir /tmp/bangumi-sync
// 去重规则：
//   1) bangumi_subject_id 已存在 -> 仅刷新快照评分
//   2) 标题（含别名）与现有条目规范化匹配（含"续作标记一致性"守卫）-> 跳过并记录
//   3) 其余按新条目插入，slug 冲突时追加年份/ID
// 用法:
//   node scripts/sync-bangumi-yuri.mjs [--data-dir bangumi-data] [--dry-run]
import fs from "node:fs/promises"
import path from "node:path"
import {db} from "../src/config/database.js"
import {toSlug} from "../src/utils/slug.js"

const BGM_SUBJECT_BASE = "https://bgm.tv/subject/"

function parseArgs(argv) {
    const options = {dataDir: "bangumi-data", dryRun: false}
    for(let i = 0; i < argv.length; i += 1) {
        const arg = argv[i]
        if(arg === "--data-dir") { options.dataDir = argv[i + 1]; i += 1; continue }
        if(arg === "--dry-run") { options.dryRun = true }
    }
    return options
}

const options = parseArgs(process.argv.slice(2))
const dataDir = path.resolve(options.dataDir)
const coverSourceDir = path.join(dataDir, "covers")
const coverTargetDir = path.resolve(process.env.UPLOAD_DIR || "storage/uploads", "bangumi-covers")

function normalizeTitle(value = "") {
    return String(value).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5\u3040-\u30ff]/g, "")
}

function formatOneDecimal(value) {
    const num = Number(value)
    return Number.isFinite(num) ? num.toFixed(1) : null
}

function subjectRating(subject) {
    const score = Number(subject.rating?.score || 0)
    const total = Number(subject.rating?.total || 0)
    return {score: score > 0 ? score : null, total: total > 0 ? total : null}
}

function pickDisplayName(subject) {
    const cn = String(subject.name_cn || "").trim()
    const jp = String(subject.name || "").trim()
    if(cn && jp && cn !== jp) {
        return `${cn} ${jp}`
    }
    return cn || jp
}

// 从 infobox 收集指定 key 的文本值
function infoboxText(subject, keys) {
    const values = []
    for(const field of subject.infobox || []) {
        if(!keys.includes(field.key)) {
            continue
        }
        if(typeof field.value === "string") {
            values.push(field.value)
        }
        else if(Array.isArray(field.value)) {
            for(const item of field.value) {
                const text = typeof item === "string" ? item : item?.v
                if(text) {
                    values.push(String(text))
                }
            }
        }
    }
    return values.length ? values.join("、") : null
}

function genreTags(subject, max = 8) {
    return (subject.tags || [])
        .filter((tag) => !/^\d{4}(年|$)/.test(tag.name))
        .slice(0, max)
        .map((tag) => tag.name)
}

function platformToEntryType(platform = "") {
    if(platform.includes("剧场版")) {
        return "movie"
    }
    if(platform === "TV" || platform.includes("OVA") || platform.includes("WEB") || platform.includes("动态漫画")) {
        return "anime"
    }
    return "screen"
}

console.log(`[sync] 读取 ${path.join(dataDir, "topics.json")}`)
const topics = JSON.parse(await fs.readFile(path.join(dataDir, "topics.json"), "utf8"))
console.log(`[sync] 数据生成于 ${topics.generatedAt}，共 ${topics.items.length} 条（tag=${topics.tag}, since=${topics.since}）`)

const [dbEntries] = await db.query(
    "SELECT id, slug, name, title_zh, title_original, douban_subject_id, bangumi_subject_id, score, byline FROM yuri_entries"
)
const [categoryRows] = await db.query("SELECT id FROM categories WHERE slug = 'yuri' AND type = 'yuri_entry' LIMIT 1")
const categoryId = categoryRows[0]?.id
if(!categoryId) {
    throw new Error("yuri 分类不存在")
}
const byBgmId = new Map()
const takenSlugs = new Set()
const dbForms = []
for(const entry of dbEntries) {
    if(entry.bangumi_subject_id) {
        byBgmId.set(String(entry.bangumi_subject_id), entry)
    }
    takenSlugs.add(entry.slug)
    for(const form of [entry.name, entry.title_zh, entry.title_original]) {
        if(form) {
            dbForms.push({entry, form: normalizeTitle(form)})
        }
    }
}

function findDuplicateEntry(subject) {
    const candidateForms = [subject.name_cn, subject.name]
        .map((value) => normalizeTitle(value))
        .filter((value) => value.length >= 2)

    for(const form of candidateForms) {
        for(const {entry, form: dbForm} of dbForms) {
            if(form === dbForm) {
                return {entry, reason: `标题完全一致「${subject.name_cn || subject.name}」`}
            }
            // 方向敏感规则：仅当“库内标题 = 候选标题 + 额外内容”时判重
            // （豆瓣条目习惯为“中文名 日文名”，正则会剥离掉日文尾部；反之候选多出内容
            //   很可能是续作/新剧场版等独立条目，一律放行，避免误吞）
            if(dbForm.startsWith(form) && form.length >= 4) {
                return {entry, reason: `库内标题以候选标题开头（疑似同作品的中日文写法差异）「${subject.name_cn || subject.name}」~「${entry.name}」`}
            }
        }
    }
    return null
}

const plan = {refresh: [], skipDuplicate: [], inserts: []}
for(const item of topics.items) {
    const subject = item.subject
    const existing = byBgmId.get(String(subject.id))
    if(existing) {
        plan.refresh.push({entry: existing, subject})
        continue
    }
    const duplicate = findDuplicateEntry(subject)
    if(duplicate) {
        plan.skipDuplicate.push({subject, entry: duplicate.entry, reason: duplicate.reason})
        continue
    }
    const base = toSlug(subject.name_cn || subject.name || subject.id)
    const year = Number(String(subject.date || "").slice(0, 4)) || null
    let slug = base
    if(takenSlugs.has(slug) && year) {
        slug = `${base}-${year}`
    }
    if(takenSlugs.has(slug)) {
        slug = `${base}-bgm${subject.id}`
    }
    takenSlugs.add(slug)
    plan.inserts.push({subject, cover: item.cover, slug})
}

console.log(`\n[sync] 计划：新增 ${plan.inserts.length} / 刷新 ${plan.refresh.length} / 跳过(疑似重复) ${plan.skipDuplicate.length}`)
console.log("\n[sync] 新增明细：")
for(const {subject, cover, slug} of plan.inserts) {
    const rating = subjectRating(subject)
    console.log(`  + [bgm${subject.id}] ${pickDisplayName(subject)} | ${subject.date} | ${subject.platform} | 评分 ${rating.score ?? "-"}(${rating.total ?? 0}) | 封面:${cover ? "有" : "无"} | slug=${slug}`)
}
console.log("\n[sync] 刷新明细：")
for(const {entry, subject} of plan.refresh) {
    const rating = subjectRating(subject)
    console.log(`  ~ #${entry.id} [bgm${subject.id}] ${entry.name} -> 评分 ${rating.score ?? "-"}(${rating.total ?? 0})`)
}
console.log("\n[sync] 跳过明细（疑似与现有条目重复）：")
for(const {subject, entry, reason} of plan.skipDuplicate) {
    console.log(`  = [bgm${subject.id}] ${subject.name_cn || subject.name} ↔ #${entry.id} ${entry.name}（${reason}）`)
}

if(options.dryRun) {
    console.log("\n[sync] dry-run，未写入数据库。")
    process.exit(0)
}

const connection = await db.getConnection()
try {
    await connection.beginTransaction()
    let refreshedEntries = 0
    let refreshedSnapshots = 0
    let insertedEntries = 0
    let insertedSnapshots = 0
    let copiedCovers = 0

    for(const {entry, subject} of plan.refresh) {
        const rating = subjectRating(subject)
        const scoreText = rating.score !== null ? formatOneDecimal(rating.score) : null
        const byline = rating.score !== null ? `Bangumi ${scoreText} / ${rating.total ?? 0} ratings` : "Bangumi entry"
        if((entry.score ?? null) !== scoreText || (entry.byline ?? null) !== byline) {
            await connection.query("UPDATE yuri_entries SET score = ?, byline = ? WHERE id = ?", [scoreText, byline, entry.id])
            refreshedEntries += 1
        }
        const [snapResult] = await connection.query(
            `UPDATE yuri_entry_source_snapshots
             SET rating_value = ?, rating_count = ?, poster_url = ?, raw_payload = ?, last_synced_at = NOW()
             WHERE yuri_entry_id = ? AND source_type = 'bangumi' AND source_subject_id = ?`,
            [
                rating.score, rating.total,
                subject.images?.large || null,
                JSON.stringify(subject),
                entry.id, subject.id
            ]
        )
        refreshedSnapshots += snapResult.affectedRows
    }

    for(const {subject, cover, slug} of plan.inserts) {
        const year = Number(String(subject.date || "").slice(0, 4)) || null
        const rating = subjectRating(subject)
        const scoreText = rating.score !== null ? formatOneDecimal(rating.score) : null
        const byline = rating.score !== null ? `Bangumi ${scoreText} / ${rating.total ?? 0} ratings` : "Bangumi entry"
        const bgmUrl = `${BGM_SUBJECT_BASE}${subject.id}`

        let externalCoverUrl = subject.images?.large || null
        if(cover) {
            await fs.mkdir(coverTargetDir, {recursive: true})
            const storedName = `${subject.id}.jpg`
            await fs.copyFile(path.join(coverSourceDir, cover), path.join(coverTargetDir, storedName))
            externalCoverUrl = `/media/bangumi-covers/${storedName}`
            copiedCovers += 1
        }

        const [entryResult] = await connection.query(
            `INSERT INTO yuri_entries
                (name, slug, title_original, title_zh, kind, entry_type, release_year, origin_country,
                 byline, summary, note, resource_url, external_cover_url, score,
                 douban_subject_id, douban_url, bangumi_subject_id, bangumi_url,
                 is_curated, category_id, status, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, ?, ?, NULL, NULL, ?, ?, 1, ?, 'published', NOW())`,
            [
                pickDisplayName(subject),
                slug,
                subject.name || null,
                String(subject.name_cn || "").trim() || null,
                genreTags(subject, 4).join("/") || subject.platform || null,
                platformToEntryType(subject.platform),
                year,
                byline,
                String(subject.summary || "").trim() || null,
                bgmUrl,
                externalCoverUrl,
                scoreText,
                String(subject.id),
                bgmUrl,
                categoryId
            ]
        )
        insertedEntries += 1

        await connection.query(
            `INSERT INTO yuri_entry_source_snapshots
                (yuri_entry_id, source_type, source_subject_id, source_url, source_list_id, source_list_name,
                 rating_value, rating_count, directors_text, casts_text, genres_text, countries_text, year_text,
                 poster_url, comment_text, comment_created_at, raw_payload, last_synced_at)
             VALUES (?, 'bangumi', ?, ?, NULL, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, ?, NOW())`,
            [
                entryResult.insertId,
                String(subject.id),
                bgmUrl,
                "Bangumi 百合标签",
                rating.score,
                rating.total,
                infoboxText(subject, ["导演", "監督", "总导演", "副导演"]),
                infoboxText(subject, ["声优", "主演", "CV", "配音"]),
                genreTags(subject).join("/") || null,
                year ? String(year) : null,
                subject.images?.large || null,
                JSON.stringify(subject)
            ]
        )
        insertedSnapshots += 1
        console.log(`  + 写入 #${entryResult.insertId} [bgm${subject.id}] ${pickDisplayName(subject)}`)
    }

    await connection.commit()
    console.log("\n[sync] 事务提交完成")
    console.log(`  新增条目 ${insertedEntries} / 新增快照 ${insertedSnapshots}`)
    console.log(`  刷新条目 ${refreshedEntries} / 刷新快照 ${refreshedSnapshots}`)
    console.log(`  本地化封面 ${copiedCovers}`)
}
catch (error) {
    await connection.rollback()
    console.error("[sync] 事务回滚:", error)
    throw error
}
finally {
    connection.release()
}

const [[verify]] = await db.query(
    `SELECT COUNT(*) AS total, SUM(bangumi_subject_id IS NOT NULL) AS bangumiEntries FROM yuri_entries`
)
console.log("[sync] 库内总数:", verify)

await db.end()

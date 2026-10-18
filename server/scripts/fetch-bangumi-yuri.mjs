// 从 Bangumi（bgm.tv）抓取「百合」标签动画条目（默认近 150 天开播），供博客导入。
// 需要能直连 api.bgm.tv 的网络环境（GitHub Actions runner 或开着代理的本机）。
// 用法:
//   node scripts/fetch-bangumi-yuri.mjs [--data-dir bangumi-data] [--since 2026-06-01]
//        [--min-tag-votes 10] [--limit 200]
// 输出:
//   <data-dir>/topics.json  —— 抓取结果（含完整 subject 对象）
//   <data-dir>/covers/*.jpg —— 封面图
import fs from "node:fs/promises"
import path from "node:path"

const API_BASE = "https://api.bgm.tv"
const REQUEST_HEADERS = {
    "user-agent": "ljx-blog-bangumi-sync/1.0 (+https://github.com/shimakazego/blog)",
    "content-type": "application/json"
}
// 命中任一标签则跳过（R18/成人向等不适合上博客）
const EXCLUDE_TAGS = ["里番", "18禁", "R18", "R-18", "エロ", "成人向"]
// 标签统计里排除的元信息标签（不作为题材）
const META_TAG_PATTERNS = [/^\d{4}年/, /^\d{4}$/]

function parseArgs(argv) {
    const options = {
        dataDir: "bangumi-data",
        since: new Date(Date.now() - 150 * 86400000).toISOString().slice(0, 10),
        minTagVotes: 10,
        limit: 200
    }
    for(let i = 0; i < argv.length; i += 1) {
        const arg = argv[i]
        if(arg === "--data-dir") { options.dataDir = argv[i + 1]; i += 1; continue }
        if(arg === "--since") { options.since = argv[i + 1]; i += 1; continue }
        if(arg === "--min-tag-votes") { options.minTagVotes = Number(argv[i + 1]) || 10; i += 1; continue }
        if(arg === "--limit") { options.limit = Number(argv[i + 1]) || 200; i += 1; continue }
    }
    return options
}

const options = parseArgs(process.argv.slice(2))
const dataDir = path.resolve(options.dataDir)
const coversDir = path.join(dataDir, "covers")

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJson(url, init = {}, retries = 3) {
    let lastError = null
    for(let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const response = await fetch(url, {
                ...init,
                headers: {...REQUEST_HEADERS, ...(init.headers || {})},
                signal: AbortSignal.timeout(30000)
            })
            if(!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }
            return await response.json()
        }
        catch (error) {
            lastError = error
            await sleep(1500 * (attempt + 1))
        }
    }
    throw new Error(`request failed: ${url} -> ${lastError?.message}`)
}

async function downloadCover(subject) {
    const url = subject.images?.medium || subject.images?.large || subject.images?.common
    if(!url) {
        return null
    }

    const storedName = `${subject.id}.jpg`
    const target = path.join(coversDir, storedName)

    for(let attempt = 0; attempt <= 2; attempt += 1) {
        try {
            const response = await fetch(url, {
                headers: {"user-agent": REQUEST_HEADERS["user-agent"], "referer": "https://bgm.tv/"},
                signal: AbortSignal.timeout(30000)
            })
            if(!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }
            await fs.writeFile(target, Buffer.from(await response.arrayBuffer()))
            return storedName
        }
        catch (error) {
            if(attempt === 2) {
                console.warn(`  [cover] ${subject.id} 下载失败: ${error.message}`)
                return null
            }
            await sleep(1200 * (attempt + 1))
        }
    }
    return null
}

function tagCount(subject, name) {
    return subject.tags?.find((tag) => tag.name === name)?.count || 0
}

function pickGenreTags(subject, max = 4) {
    return (subject.tags || [])
        .filter((tag) => !META_TAG_PATTERNS.some((pattern) => pattern.test(tag.name)))
        .slice(0, max)
        .map((tag) => tag.name)
}

console.log(`[fetch] 查询窗口: air_date >= ${options.since}，百合标签票数 >= ${options.minTagVotes}`)

// 1) 搜索（search API 返回的对象已包含 tags/infobox/rating/summary/images）
// 注意：bgm 搜索接口单次最多返回 20 条（与 limit 参数无关），必须按 offset 逐页拉取
const candidates = []
let totalCount = null
let offset = 0
while(offset < options.limit) {
    const page = await fetchJson(`${API_BASE}/v0/search/subjects?limit=100&offset=${offset}`, {
        method: "POST",
        body: JSON.stringify({
            keyword: "",
            sort: "match",
            filter: {type: [2], tag: ["百合"], air_date: [`>=${options.since}`]}
        })
    })
    const data = page?.data || []
    if(totalCount === null) {
        totalCount = Number(page?.total ?? 0)
    }
    candidates.push(...data)
    console.log(`[fetch] offset=${offset} 拉到 ${data.length} 条（共计 ${candidates.length}/${totalCount}）`)
    if(!data.length) {
        break
    }
    offset += data.length
    if(totalCount && candidates.length >= totalCount) {
        break
    }
    await sleep(400)
}

// 2) 过滤
const filtered = []
const skipped = []
for(const subject of candidates) {
    const votes = tagCount(subject, "百合")
    const excludedTag = (subject.tags || []).find((tag) => EXCLUDE_TAGS.includes(tag.name))
    let reason = null
    if(subject.type !== 2) reason = "非动画"
    else if(subject.nsfw) reason = "nsfw"
    else if(subject.locked) reason = "locked"
    else if(excludedTag) reason = `排除标签:${excludedTag.name}`
    else if(votes < options.minTagVotes) reason = `百合票数不足(${votes})`

    if(reason) {
        skipped.push({id: subject.id, name: subject.name_cn || subject.name, reason})
    }
    else {
        filtered.push(subject)
    }
}
filtered.sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")))

console.log(`[fetch] 候选 ${candidates.length} -> 通过 ${filtered.length}，跳过 ${skipped.length}`)
for(const skip of skipped) {
    console.log(`  [skip] ${skip.id} ${skip.name} — ${skip.reason}`)
}
console.log("[fetch] 百合票数分布:")
for(const subject of filtered) {
    const rating = subject.rating?.score ? `${subject.rating.score}(${subject.rating.total})` : "-"
    console.log(`  [pass] ${subject.id} ${subject.name_cn || subject.name} | ${subject.date} | ${subject.platform} | 百合:${tagCount(subject, "百合")} | 评分:${rating} | 题材:${pickGenreTags(subject).join("/")}`)
}

// 3) 下载封面 + 输出
await fs.mkdir(coversDir, {recursive: true})
const items = []
for(const subject of filtered) {
    const cover = await downloadCover(subject)
    items.push({subject, cover})
    await sleep(350)
}
const coverOk = items.filter((item) => item.cover).length

const output = {
    generatedAt: new Date().toISOString(),
    source: "bangumi",
    tag: "百合",
    since: options.since,
    candidateCount: candidates.length,
    items
}
await fs.writeFile(path.join(dataDir, "topics.json"), JSON.stringify(output, null, 2), "utf8")

console.log(`[fetch] 封面 ${coverOk}/${items.length}`)
console.log(`[fetch] 输出: ${path.join(dataDir, "topics.json")}`)

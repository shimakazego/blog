// 用 LLM 将 data 目录 topics.json 中「纯日文」的作品简介翻译成简体中文，
// 写入 item.summaryCn（导入脚本会优先使用它；失败时自动回退日文原文）。
// 带本地缓存（--cache 文件）：同一原文不会重复调用 API。
//
// 运行环境：NAS 上以 host 网络容器执行（需要访问 LLM API）：
//   docker run --rm --network host --env-file /volume1/docker/blog/bangumi-translate.env \
//     -v /volume1/docker/blog/translate-bangumi-summaries.mjs:/translate.mjs \
//     -v /volume1/docker/blog/bangumi-translate-cache.json:/cache.json \
//     -v <data-dir>:/data server-app:latest node /translate.mjs --data-dir /data --cache /cache.json
//
// 环境变量：TRANSLATE_API_BASE / TRANSLATE_API_KEY / TRANSLATE_MODEL（OpenAI 兼容接口）
import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

function parseArgs(argv) {
    const options = {dataDir: "bangumi-data", limit: 30, delayMs: 800, cache: null}
    for(let i = 0; i < argv.length; i += 1) {
        const arg = argv[i]
        if(arg === "--data-dir") { options.dataDir = argv[i + 1]; i += 1; continue }
        if(arg === "--limit") { options.limit = Number(argv[i + 1]) || 30; i += 1; continue }
        if(arg === "--cache") { options.cache = argv[i + 1]; i += 1; continue }
        if(arg === "--delay-ms") { options.delayMs = Number(argv[i + 1]) || 800; i += 1 }
    }
    return options
}

const options = parseArgs(process.argv.slice(2))
const dataDir = path.resolve(options.dataDir)

const apiBase = String(process.env.TRANSLATE_API_BASE || "").replace(/\/+$/, "")
const apiKey = String(process.env.TRANSLATE_API_KEY || "")
const model = String(process.env.TRANSLATE_MODEL || "deepseek-chat")

if(!apiBase || !apiKey) {
    console.log("[translate] 未配置 TRANSLATE_API_BASE / TRANSLATE_API_KEY，跳过")
    process.exit(0)
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function cleanText(text) {
    return String(text || "")
        .split(/\[简介原文\]/)[0]
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

// 判定是否为「日文为主」的文本（含足量假名，且假名占比不低）
function isJapanese(text) {
    const kana = (text.match(/[\u3040-\u30ff]/g) || []).length
    const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    return kana >= 8 && kana > cn * 0.4
}

async function translate(text) {
    for(let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const response = await fetch(`${apiBase}/chat/completions`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.2,
                    messages: [
                        {
                            role: "system",
                            content: "你是动画资料整理助手。把用户给的日文动画简介翻译成简体中文：保持简介文风、忠实原文不增删信息、直接输出译文本身（不要任何前后缀、不要 markdown 标记、不要保留日文原文）。"
                        },
                        {role: "user", content: text}
                    ]
                }),
                signal: AbortSignal.timeout(90000)
            })
            if(!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }
            const json = await response.json()
            const output = String(json.choices?.[0]?.message?.content || "").trim()
            if(output.length >= 10) {
                return output
            }
            throw new Error("空译文")
        }
        catch (error) {
            console.log(`  [translate-retry ${attempt + 1}] ${error.message}`)
            await sleep(1500)
        }
    }
    return null
}

const topicsPath = path.join(dataDir, "topics.json")
console.log(`[translate] 读取 ${topicsPath}`)
const topics = JSON.parse(await fs.readFile(topicsPath, "utf8"))

let cache = {}
if(options.cache) {
    try {
        cache = JSON.parse(await fs.readFile(options.cache, "utf8"))
    }
    catch {
        cache = {}
    }
}
const textHash = (text) => crypto.createHash("md5").update(text).digest("hex")

let translated = 0
let cached = 0
let skipped = 0
let failed = 0

for(const item of topics.items || []) {
    const subject = item.subject || {}
    const label = subject.name_cn || subject.name || subject.id
    const current = item.summaryCn ? String(item.summaryCn) : cleanText(subject.summary)

    if(!current) {
        skipped += 1
        continue
    }
    if(!isJapanese(current)) {
        skipped += 1
        continue
    }

    const cacheKey = String(subject.id)
    const currentHash = textHash(current)
    if(cache[cacheKey] && cache[cacheKey].hash === currentHash && cache[cacheKey].cn) {
        item.summaryCn = cache[cacheKey].cn
        cached += 1
        console.log(`[translate] 缓存命中 [bgm${subject.id}] ${label}`)
        continue
    }

    if(translated >= options.limit) {
        console.log(`[translate] 达到单次上限 ${options.limit}，剩余留待下次`)
        break
    }

    console.log(`[translate] 翻译 [bgm${subject.id}] ${label}`)
    const result = await translate(current)
    if(result) {
        item.summaryCn = result
        cache[cacheKey] = {hash: currentHash, cn: result}
        translated += 1
        console.log(`  -> ${result.slice(0, 60).replace(/\n/g, " ")}...`)
    }
    else {
        failed += 1
        console.log("  -> 失败，保留原文")
    }
    await sleep(options.delayMs)
}

await fs.writeFile(topicsPath, JSON.stringify(topics, null, 2), "utf8")
if(options.cache) {
    await fs.writeFile(options.cache, JSON.stringify(cache, null, 2), "utf8")
}
console.log(`[translate] 完成：翻译 ${translated} / 缓存复用 ${cached} / 跳过 ${skipped} / 失败 ${failed}`)

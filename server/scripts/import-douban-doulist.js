import fs from "node:fs/promises"
import path from "node:path"
import {toSlug} from "../src/utils/slug.js"

const DEFAULT_LIST_URL = "https://www.douban.com/doulist/151157542/"
const PAGE_SIZE = 25
const LABEL_DIRECTOR = "\u5bfc\u6f14"
const LABEL_CAST = "\u4e3b\u6f14"
const LABEL_GENRE = "\u7c7b\u578b"
const LABEL_COUNTRY = "\u5236\u7247\u56fd\u5bb6/\u5730\u533a"
const LABEL_YEAR = "\u5e74\u4efd"
const LABEL_ALL = "\u5168\u90e8"
const LABEL_COMMENT = "\u8bc4\u8bed\uff1a"
const COVER_DIR = path.resolve(process.cwd(), "storage", "uploads", "douban-covers")

let dbPool = null

async function getDb() {
    if(!dbPool) {
        const module = await import("../src/config/database.js")
        dbPool = module.db
    }

    return dbPool
}

function parseArgs(argv) {
    const options = {
        listUrl: DEFAULT_LIST_URL,
        dryRun: false,
        limit: null,
        jsonOut: path.resolve(process.cwd(), "storage", "douban-doulist-preview.json"),
        skipCoverDownload: false
    }

    for(let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]

        if(arg === "--dry-run") {
            options.dryRun = true
            continue
        }

        if(arg === "--skip-cover-download") {
            options.skipCoverDownload = true
            continue
        }

        if(arg === "--list-url") {
            options.listUrl = argv[index + 1] || DEFAULT_LIST_URL
            index += 1
            continue
        }

        if(arg === "--limit") {
            const parsed = Number(argv[index + 1] || 0)
            options.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null
            index += 1
            continue
        }

        if(arg === "--json-out") {
            options.jsonOut = path.resolve(process.cwd(), argv[index + 1] || "storage/douban-doulist-preview.json")
            index += 1
        }
    }

    return options
}

function decodeHtml(value = "") {
    return String(value)
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
}

function stripTags(value = "") {
    return decodeHtml(String(value).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
        .replace(/\r/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

function extractFirst(pattern, value, flags = "") {
    const matcher = new RegExp(pattern, flags)
    const match = matcher.exec(value)
    return match?.[1] || null
}

function normalizeWhitespace(value = "") {
    return stripTags(value).replace(/\s+/g, " ").trim()
}

function parseCount(text = "") {
    const match = String(text).match(/(\d[\d,]*)/)
    return match ? Number(match[1].replace(/,/g, "")) : null
}

function parseYear(text = "") {
    const match = String(text).match(/\b(19|20)\d{2}\b/)
    return match ? Number(match[0]) : null
}

function parseSubjectId(url = "") {
    const match = String(url).match(/subject\/(\d+)/)
    return match?.[1] || null
}

function inferEntryType({genresText = "", source = ""}) {
    const text = `${genresText} ${source}`

    if(text.includes("\u52a8\u753b")) {
        return "anime"
    }

    if(text.includes("\u7535\u5f71")) {
        return "movie"
    }

    if(text.includes("\u7535\u89c6\u5267")) {
        return "tv"
    }

    return "screen"
}

function splitTitleVariants(fullTitle = "") {
    const title = normalizeWhitespace(fullTitle)
    const parts = title.split(/\s{2,}/).filter(Boolean)

    if(parts.length >= 2) {
        return {
            name: title,
            titleZh: parts[0],
            titleOriginal: parts.slice(1).join(" ")
        }
    }

    const heuristicMatch = title.match(/^([\u4e00-\u9fa5A-Za-z0-9\u300a\u300b\u300c\u300d\u3010\u3011\uff08\uff09()\-:\uff1a\u00b7!?\s]+?)\s+(.+)$/)
    if(heuristicMatch && /[\u3040-\u30ffA-Za-z]/.test(heuristicMatch[2])) {
        return {
            name: title,
            titleZh: heuristicMatch[1].trim(),
            titleOriginal: heuristicMatch[2].trim()
        }
    }

    return {
        name: title,
        titleZh: /[\u4e00-\u9fa5]/.test(title) ? title : null,
        titleOriginal: null
    }
}

function parseAbstractMap(abstractHtml = "") {
    const lines = stripTags(abstractHtml)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)

    const result = {}

    lines.forEach((line) => {
        const separatorMatch = line.match(/[:\uff1a]/)
        const index = separatorMatch ? separatorMatch.index : -1

        if(index === undefined || index < 0) {
            return
        }

        const key = line.slice(0, index).trim()
        const value = line.slice(index + 1).trim()
        result[key] = value
    })

    return result
}

function parseListMeta(html) {
    const title = normalizeWhitespace(extractFirst("<h1>\\s*<span>([\\s\\S]*?)</span>\\s*</h1>", html, "i") || "")
    const listId = extractFirst("/doulist/(\\d+)/", html, "i") || extractFirst("/doulist/(\\d+)/", DEFAULT_LIST_URL, "i")
    const totalPages = Number(extractFirst("data-total-page=\"(\\d+)\"", html, "i") || 1)
    const totalItems = Number(extractFirst(`${LABEL_ALL}<span>\\((\\d+)\\)</span>`, html, "i") || 0)
    const description = normalizeWhitespace(extractFirst("<div class=\"doulist-about\">([\\s\\S]*?)</div>", html, "i") || "")

    return {title, listId, totalPages, totalItems, description}
}

function splitDoulistItemBlocks(html) {
    const startMatcher = /<div id="\d+" class="doulist-item"/g
    const matches = [...html.matchAll(startMatcher)]

    if(!matches.length) {
        return []
    }

    return matches.map((match, index) => {
        const start = match.index
        const end = matches[index + 1]?.index ?? html.length
        return html.slice(start, end)
    })
}

function parseDoulistItems(html) {
    const itemBlocks = splitDoulistItemBlocks(html)
    const items = []

    for(const itemHtml of itemBlocks) {
        const itemId = extractFirst("<div id=\"(\\d+)\" class=\"doulist-item\"", itemHtml, "i")
        const titleUrlMatch = itemHtml.match(/<div class="title">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>/i)
        const subjectUrl = titleUrlMatch?.[1] || null
        const fullTitle = normalizeWhitespace(titleUrlMatch?.[2] || "")
        const subjectId = parseSubjectId(subjectUrl)
        const posterUrl = extractFirst("<div class=\"post\">\\s*<a [^>]*>\\s*<img src=\"([^\"]+)\"", itemHtml, "i")
        const ratingValue = extractFirst("<span class=\"rating_nums\">([^<]+)</span>", itemHtml, "i")
        const ratingCount = parseCount(extractFirst("<span>\\(([^<]+(?:\\u4eba\\u8bc4\\u4ef7|ratings?))\\)</span>", itemHtml, "i") || "")
        const abstractHtml = extractFirst("<div class=\"abstract\">([\\s\\S]*?)</div>", itemHtml, "i") || ""
        const abstractMap = parseAbstractMap(abstractHtml)
        const commentText = normalizeWhitespace(
            extractFirst(`<blockquote class="comment">\\s*<span>${LABEL_COMMENT}</span>([\\s\\S]*?)</blockquote>`, itemHtml, "i") || ""
        )
        const commentCreatedAt = normalizeWhitespace(extractFirst("<time class=\"time\">([^<]+)</time>", itemHtml, "i") || "")
        const source = normalizeWhitespace(extractFirst("<div class=\"source\">([\\s\\S]*?)</div>", itemHtml, "i") || "")
        const titleParts = splitTitleVariants(fullTitle)
        const genresText = abstractMap[LABEL_GENRE] || null
        const countryText = abstractMap[LABEL_COUNTRY] || null
        const yearText = abstractMap[LABEL_YEAR] || null

        if(!subjectId || !subjectUrl) {
            continue
        }

        items.push({
            doulistItemId: itemId,
            source,
            subjectId,
            subjectUrl,
            posterUrl,
            localPosterUrl: null,
            fullTitle,
            ...titleParts,
            ratingValue: ratingValue ? Number(ratingValue) : null,
            ratingCount,
            directorsText: abstractMap[LABEL_DIRECTOR] || null,
            castsText: abstractMap[LABEL_CAST] || null,
            genresText,
            countriesText: countryText,
            yearText,
            releaseYear: parseYear(yearText || ""),
            originCountry: countryText,
            entryType: inferEntryType({genresText, source}),
            byline: ratingValue ? `Douban ${ratingValue} / ${ratingCount || 0} ratings` : "Douban entry",
            summary: commentText || null,
            note: commentText || null,
            commentText,
            commentCreatedAt: commentCreatedAt || null,
            rawAbstract: stripTags(abstractHtml)
        })
    }

    return items
}

function buildFetchHeaders(accept) {
    return {
        "accept": accept,
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "referer": "https://movie.douban.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    }
}

async function fetchHtml(url) {
    const response = await fetch(url, {
        headers: buildFetchHeaders("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
    })

    if(!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }

    return response.text()
}

function buildPageUrl(baseUrl, start) {
    const url = new URL(baseUrl)

    if(start > 0) {
        url.searchParams.set("start", String(start))
    }

    url.searchParams.set("sort", "time")
    url.searchParams.set("playable", "0")
    url.searchParams.set("sub_type", "")
    return url.toString()
}

function extensionFromContentType(contentType = "") {
    if(contentType.includes("png")) {
        return ".png"
    }

    if(contentType.includes("webp")) {
        return ".webp"
    }

    return ".jpg"
}

async function downloadCoverToLocal(item) {
    if(!item.posterUrl || !item.subjectId) {
        return item
    }

    try {
        await fs.mkdir(COVER_DIR, {recursive: true})

        const response = await fetch(item.posterUrl, {
            headers: buildFetchHeaders("image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
        })

        if(!response.ok) {
            throw new Error(`cover download failed: ${response.status}`)
        }

        const contentType = response.headers.get("content-type") || "image/jpeg"
        const extension = extensionFromContentType(contentType)
        const storedName = `${item.subjectId}${extension}`
        const absolutePath = path.join(COVER_DIR, storedName)
        const bytes = Buffer.from(await response.arrayBuffer())

        await fs.writeFile(absolutePath, bytes)

        return {
            ...item,
            localPosterUrl: `/media/douban-covers/${storedName}`
        }
    }
    catch (error) {
        console.warn(`[douban-import] cover download skipped for ${item.subjectId}: ${error.message}`)
        return item
    }
}

async function enrichItemsWithLocalCovers(items, skipCoverDownload = false) {
    if(skipCoverDownload) {
        return items
    }

    const enrichedItems = []

    for(const item of items) {
        enrichedItems.push(await downloadCoverToLocal(item))
    }

    return enrichedItems
}

async function scrapeDoulist(listUrl, limit = null, skipCoverDownload = false) {
    const firstHtml = await fetchHtml(buildPageUrl(listUrl, 0))
    const meta = parseListMeta(firstHtml)
    const pagesToFetch = meta.totalPages || 1
    const allItems = []
    const pageStats = []

    for(let pageIndex = 0; pageIndex < pagesToFetch; pageIndex += 1) {
        const start = pageIndex * PAGE_SIZE
        const pageHtml = pageIndex === 0 ? firstHtml : await fetchHtml(buildPageUrl(listUrl, start))
        const pageItems = parseDoulistItems(pageHtml)

        pageStats.push({
            page: pageIndex + 1,
            start,
            count: pageItems.length
        })

        allItems.push(...pageItems)

        if(limit && allItems.length >= limit) {
            break
        }
    }

    const limitedItems = limit ? allItems.slice(0, limit) : allItems
    const enrichedItems = await enrichItemsWithLocalCovers(limitedItems, skipCoverDownload)

    return {
        meta,
        pageStats,
        items: enrichedItems
    }
}

async function ensureCategoryId() {
    const db = await getDb()
    const [rows] = await db.query("SELECT id FROM categories WHERE slug = 'yuri' AND type = 'yuri_entry' LIMIT 1")

    if(!rows.length) {
        throw new Error("Category yuri / yuri_entry not found")
    }

    return rows[0].id
}

async function upsertYuriEntry(connection, categoryId, item) {
    const finalSlug = toSlug(item.titleZh || item.name || item.subjectId)
    const [result] = await connection.query(
        `INSERT INTO yuri_entries (
            name,
            slug,
            title_original,
            title_zh,
            kind,
            entry_type,
            release_year,
            origin_country,
            byline,
            summary,
            note,
            resource_url,
            external_cover_url,
            score,
            douban_subject_id,
            douban_url,
            is_curated,
            category_id,
            status,
            published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', NOW())
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            slug = VALUES(slug),
            title_original = VALUES(title_original),
            title_zh = VALUES(title_zh),
            kind = VALUES(kind),
            entry_type = VALUES(entry_type),
            release_year = VALUES(release_year),
            origin_country = VALUES(origin_country),
            byline = VALUES(byline),
            summary = VALUES(summary),
            note = VALUES(note),
            resource_url = VALUES(resource_url),
            external_cover_url = VALUES(external_cover_url),
            score = VALUES(score),
            douban_subject_id = VALUES(douban_subject_id),
            douban_url = VALUES(douban_url),
            is_curated = VALUES(is_curated),
            category_id = VALUES(category_id)`,
        [
            item.name,
            finalSlug,
            item.titleOriginal,
            item.titleZh,
            item.genresText,
            item.entryType,
            item.releaseYear,
            item.originCountry,
            item.byline,
            item.summary,
            item.note,
            item.subjectUrl,
            item.localPosterUrl || item.posterUrl,
            item.ratingValue !== null ? String(item.ratingValue) : null,
            item.subjectId,
            item.subjectUrl,
            1,
            categoryId
        ]
    )

    if(result.insertId) {
        return result.insertId
    }

    const [rows] = await connection.query("SELECT id FROM yuri_entries WHERE douban_subject_id = ? LIMIT 1", [item.subjectId])

    if(rows.length) {
        return rows[0].id
    }

    throw new Error(`Failed to resolve yuri entry id for subject ${item.subjectId}`)
}

async function upsertSnapshot(connection, yuriEntryId, listMeta, item) {
    const [existingRows] = await connection.query(
        `SELECT id
         FROM yuri_entry_source_snapshots
         WHERE yuri_entry_id = ?
           AND source_type = 'douban'
           AND source_list_id = ?
           AND source_subject_id = ?
         LIMIT 1`,
        [yuriEntryId, listMeta.listId, item.subjectId]
    )

    const payload = JSON.stringify({
        list: {
            id: listMeta.listId,
            title: listMeta.title,
            description: listMeta.description
        },
        item
    })

    if(existingRows.length) {
        await connection.query(
            `UPDATE yuri_entry_source_snapshots
             SET source_url = ?,
                 source_list_name = ?,
                 rating_value = ?,
                 rating_count = ?,
                 directors_text = ?,
                 casts_text = ?,
                 genres_text = ?,
                 countries_text = ?,
                 year_text = ?,
                 poster_url = ?,
                 comment_text = ?,
                 comment_created_at = ?,
                 raw_payload = ?,
                 last_synced_at = NOW()
             WHERE id = ?`,
            [
                item.subjectUrl,
                listMeta.title,
                item.ratingValue,
                item.ratingCount,
                item.directorsText,
                item.castsText,
                item.genresText,
                item.countriesText,
                item.yearText,
                item.posterUrl,
                item.commentText,
                item.commentCreatedAt,
                payload,
                existingRows[0].id
            ]
        )

        return existingRows[0].id
    }

    const [result] = await connection.query(
        `INSERT INTO yuri_entry_source_snapshots (
            yuri_entry_id,
            source_type,
            source_subject_id,
            source_url,
            source_list_id,
            source_list_name,
            rating_value,
            rating_count,
            directors_text,
            casts_text,
            genres_text,
            countries_text,
            year_text,
            poster_url,
            comment_text,
            comment_created_at,
            raw_payload,
            last_synced_at
        ) VALUES (?, 'douban', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
            yuriEntryId,
            item.subjectId,
            item.subjectUrl,
            listMeta.listId,
            listMeta.title,
            item.ratingValue,
            item.ratingCount,
            item.directorsText,
            item.castsText,
            item.genresText,
            item.countriesText,
            item.yearText,
            item.posterUrl,
            item.commentText,
            item.commentCreatedAt,
            payload
        ]
    )

    return result.insertId
}

async function persistDoulistImport(scraped) {
    const categoryId = await ensureCategoryId()
    const db = await getDb()
    const connection = await db.getConnection()

    try {
        await connection.beginTransaction()

        for(const item of scraped.items) {
            const yuriEntryId = await upsertYuriEntry(connection, categoryId, item)
            await upsertSnapshot(connection, yuriEntryId, scraped.meta, item)
        }

        await connection.commit()
    }
    catch (error) {
        await connection.rollback()
        throw error
    }
    finally {
        connection.release()
    }
}

async function writePreview(jsonOut, scraped) {
    await fs.mkdir(path.dirname(jsonOut), {recursive: true})
    await fs.writeFile(jsonOut, JSON.stringify(scraped, null, 2), "utf8")
}

async function main() {
    const options = parseArgs(process.argv.slice(2))
    const scraped = await scrapeDoulist(options.listUrl, options.limit, options.skipCoverDownload)

    await writePreview(options.jsonOut, scraped)

    console.log(`Scraped ${scraped.items.length} items from doulist ${scraped.meta.listId} (${scraped.meta.title}).`)
    scraped.pageStats.forEach((pageStat) => {
        console.log(`  page ${pageStat.page} (start=${pageStat.start}): ${pageStat.count} items`)
    })

    const localCoverCount = scraped.items.filter((item) => item.localPosterUrl).length
    console.log(`Local covers ready: ${localCoverCount}/${scraped.items.length}`)
    console.log(`Preview written to: ${options.jsonOut}`)

    if(options.dryRun) {
        console.log("Dry run enabled, database import skipped.")
        return
    }

    await persistDoulistImport(scraped)
    console.log("Database import completed.")
}

main()
    .catch((error) => {
        console.error("[douban-import] failed:", error)
        process.exitCode = 1
    })
    .finally(async () => {
        if(dbPool) {
            await dbPool.end()
        }
    })

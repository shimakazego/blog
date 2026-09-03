import {db} from "../config/database.js"
import {toSlug} from "../utils/slug.js"

const DOUBAN_PROXY_HOSTS = new Set([
    "img1.doubanio.com",
    "img2.doubanio.com",
    "img3.doubanio.com",
    "img9.doubanio.com"
])

// 本地封面图主机：默认 loopback；额外主机（如 NAS 内网地址）由环境变量 LOCAL_COVER_HOST 提供（逗号分隔）
const EXTRA_LOCAL_COVER_HOSTS = (process.env.LOCAL_COVER_HOST || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

const LOCAL_COVER_HOSTS = new Set([
    "localhost",
    "127.0.0.1",
    "::1",
    ...EXTRA_LOCAL_COVER_HOSTS
])

/**
 * Expression that resolves the effective, displayable score for an entry:
 * prefers the curated yuri_entries.score, falls back to the latest douban snapshot rating.
 * Non-numeric / empty values collapse to NULL so they never match numeric filters.
 */
const SCORE_EXPR = "CAST(NULLIF(TRIM(COALESCE(NULLIF(TRIM(y.score), ''), NULLIF(TRIM(s.rating_value), ''))), '') AS DECIMAL(4,1))"

function buildRequestOrigin(req) {
    return `${req.protocol}://${req.get("host")}`
}

function shouldProxyCover(url) {
    try {
        const parsed = new URL(url)
        return DOUBAN_PROXY_HOSTS.has(parsed.hostname)
    }
    catch {
        return false
    }
}

function normalizeCoverUrl(req, url) {
    if(!url) {
        return url
    }

    if(url.startsWith("/")) {
        return url
    }

    try {
        const parsed = new URL(url)

        if(LOCAL_COVER_HOSTS.has(parsed.hostname)) {
            return `${parsed.pathname}${parsed.search}`
        }
    }
    catch {
        return url
    }

    if(shouldProxyCover(url)) {
        return `/api/yuri-entries/cover-proxy?url=${encodeURIComponent(url)}`
    }

    return url
}

/**
 * Escapes LIKE wildcards so user-provided search terms are matched literally.
 */
function escapeLike(value) {
    return String(value).replace(/[\\%_]/g, (char) => `\\${char}`)
}

export const listYuriEntries = async (req, res) => {
    const {search, year, minScore, maxScore} = req.query
    const status = req.query.status || "published"

    const conditions = ["y.status = ?"]
    const params = [status]

    const keyword = String(search || "").trim()
    if(keyword) {
        const pattern = `%${escapeLike(keyword)}%`
        conditions.push("(y.name LIKE ? ESCAPE '\\\\' OR y.title_zh LIKE ? ESCAPE '\\\\' OR y.title_original LIKE ? ESCAPE '\\\\')")
        params.push(pattern, pattern, pattern)
    }

    if(year !== undefined && year !== null && String(year).trim() !== "") {
        const yearNum = Number(year)
        if(Number.isInteger(yearNum) && yearNum >= 1900 && yearNum <= 2200) {
            conditions.push("y.release_year = ?")
            params.push(yearNum)
        }
    }

    if(minScore !== undefined && minScore !== null && String(minScore).trim() !== "") {
        const min = Number(minScore)
        if(Number.isFinite(min)) {
            conditions.push(`${SCORE_EXPR} >= ?`)
            params.push(min)
        }
    }

    if(maxScore !== undefined && maxScore !== null && String(maxScore).trim() !== "") {
        const max = Number(maxScore)
        if(Number.isFinite(max)) {
            conditions.push(`${SCORE_EXPR} <= ?`)
            params.push(max)
        }
    }

    const [rows] = await db.query(
        `SELECT
            y.id,
            y.name,
            y.slug,
            y.title_original AS titleOriginal,
            y.title_zh AS titleZh,
            y.kind,
            y.entry_type AS entryType,
            y.release_year AS releaseYear,
            y.origin_country AS originCountry,
            y.byline,
            y.summary,
            y.note,
            y.resource_url AS resourceUrl,
            y.external_cover_url AS externalCoverUrl,
            y.score,
            y.douban_subject_id AS doubanSubjectId,
            y.douban_url AS doubanUrl,
            y.is_curated AS isCurated,
            y.status,
            y.published_at AS publishedAt,
            s.rating_value AS ratingValue,
            s.rating_count AS ratingCount,
            s.directors_text AS directorsText,
            s.casts_text AS castsText,
            s.genres_text AS genresText,
            s.countries_text AS countriesText,
            s.year_text AS yearText,
            c.name AS categoryName,
            m.url AS coverUrl
        FROM yuri_entries y
        LEFT JOIN (
            SELECT yes.*
            FROM yuri_entry_source_snapshots yes
            INNER JOIN (
                SELECT yuri_entry_id, MAX(id) AS latest_id
                FROM yuri_entry_source_snapshots
                WHERE source_type = 'douban'
                GROUP BY yuri_entry_id
            ) latest ON latest.latest_id = yes.id
        ) s ON s.yuri_entry_id = y.id
        LEFT JOIN categories c ON c.id = y.category_id
        LEFT JOIN media_files m ON m.id = y.cover_media_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            y.release_year DESC,
            COALESCE(y.published_at, y.created_at) DESC,
            y.id DESC`,
        params
    )

    res.json(rows.map((row) => ({
        ...row,
        coverUrl: normalizeCoverUrl(req, row.coverUrl),
        externalCoverUrl: normalizeCoverUrl(req, row.externalCoverUrl)
    })))
}

export const proxyYuriCover = async (req, res) => {
    const targetUrl = String(req.query.url || "").trim()

    if(!shouldProxyCover(targetUrl)) {
        return res.status(400).json({message: "unsupported cover host"})
    }

    const response = await fetch(targetUrl, {
        headers: {
            "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
            "referer": "https://movie.douban.com/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
        }
    })

    if(!response.ok) {
        return res.status(response.status).json({message: `failed to fetch cover: ${response.status}`})
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const buffer = Buffer.from(await response.arrayBuffer())

    res.setHeader("content-type", contentType)
    res.setHeader("cache-control", "public, max-age=86400")
    res.send(buffer)
}

export const createYuriEntry = async (req, res) => {
    const {
        name,
        slug,
        titleOriginal = null,
        titleZh = null,
        kind = null,
        entryType = null,
        releaseYear = null,
        originCountry = null,
        byline = null,
        summary = null,
        note = null,
        resourceUrl = null,
        externalCoverUrl = null,
        score = null,
        doubanSubjectId = null,
        doubanUrl = null,
        isCurated = false,
        status = "draft",
        categoryId = null,
        coverMediaId = null,
        publishedAt = null
    } = req.body

    if(!name) {
        return res.status(400).json({message: "name is required"})
    }

    const finalSlug = slug || toSlug(name)

    const [result] = await db.query(
        `INSERT INTO yuri_entries
            (
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
                status,
                category_id,
                cover_media_id,
                published_at
            )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name,
            finalSlug,
            titleOriginal,
            titleZh,
            kind,
            entryType,
            releaseYear,
            originCountry,
            byline,
            summary,
            note,
            resourceUrl,
            externalCoverUrl,
            score,
            doubanSubjectId,
            doubanUrl,
            Number(Boolean(isCurated)),
            status,
            categoryId,
            coverMediaId,
            publishedAt
        ]
    )

    res.status(201).json({
        id: result.insertId,
        name,
        slug: finalSlug
    })
}

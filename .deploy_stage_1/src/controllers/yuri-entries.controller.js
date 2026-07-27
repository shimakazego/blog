import {db} from "../config/database.js"
import {toSlug} from "../utils/slug.js"

export const listYuriEntries = async (req, res) => {
    const status = req.query.status || "published"

    const [rows] = await db.query(
        `SELECT
            y.id,
            y.name,
            y.slug,
            y.kind,
            y.byline,
            y.note,
            y.resource_url AS resourceUrl,
            y.score,
            y.status,
            y.published_at AS publishedAt,
            c.name AS categoryName,
            m.url AS coverUrl
        FROM yuri_entries y
        LEFT JOIN categories c ON c.id = y.category_id
        LEFT JOIN media_files m ON m.id = y.cover_media_id
        WHERE y.status = ?
        ORDER BY COALESCE(y.published_at, y.created_at) DESC`,
        [status]
    )

    res.json(rows)
}

export const createYuriEntry = async (req, res) => {
    const {
        name,
        slug,
        kind = null,
        byline = null,
        note = null,
        resourceUrl = null,
        score = null,
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
            (name, slug, kind, byline, note, resource_url, score, status, category_id, cover_media_id, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, finalSlug, kind, byline, note, resourceUrl, score, status, categoryId, coverMediaId, publishedAt]
    )

    res.status(201).json({
        id: result.insertId,
        name,
        slug: finalSlug
    })
}

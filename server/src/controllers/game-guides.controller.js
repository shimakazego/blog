import {db} from "../config/database.js"
import {toSlug} from "../utils/slug.js"

export const listGameGuides = async (req, res) => {
    const status = req.query.status || "published"

    const [rows] = await db.query(
        `SELECT
            g.id,
            g.title,
            g.game,
            g.slug,
            g.source_name AS sourceName,
            g.source_url AS sourceUrl,
            g.summary,
            g.difficulty,
            g.version_label AS versionLabel,
            g.status,
            g.published_at AS publishedAt,
            c.name AS categoryName,
            m.url AS coverUrl
        FROM game_guides g
        LEFT JOIN categories c ON c.id = g.category_id
        LEFT JOIN media_files m ON m.id = g.cover_media_id
        WHERE g.status = ?
        ORDER BY COALESCE(g.published_at, g.created_at) DESC`,
        [status]
    )

    res.json(rows)
}

export const createGameGuide = async (req, res) => {
    const {
        title,
        game,
        slug,
        sourceName = null,
        sourceUrl = null,
        summary = null,
        difficulty = null,
        versionLabel = null,
        status = "draft",
        categoryId = null,
        coverMediaId = null,
        publishedAt = null
    } = req.body

    if(!title || !game) {
        return res.status(400).json({message: "title and game are required"})
    }

    const finalSlug = slug || toSlug(`${game}-${title}`)

    const [result] = await db.query(
        `INSERT INTO game_guides
            (title, game, slug, source_name, source_url, summary, difficulty, version_label, status, category_id, cover_media_id, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, game, finalSlug, sourceName, sourceUrl, summary, difficulty, versionLabel, status, categoryId, coverMediaId, publishedAt]
    )

    res.status(201).json({
        id: result.insertId,
        title,
        slug: finalSlug
    })
}

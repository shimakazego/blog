import {db} from "../config/database.js"
import {toSlug} from "../utils/slug.js"

export const listPosts = async (req, res) => {
    const status = req.query.status || "published"
    const type = req.query.type || null

    const conditions = ["p.status = ?"]
    const values = [status]

    if(type) {
        conditions.push("p.type = ?")
        values.push(type)
    }

    const [rows] = await db.query(
        `SELECT
            p.id,
            p.title,
            p.slug,
            p.summary,
            p.status,
            p.type,
            p.published_at AS publishedAt,
            p.created_at AS createdAt,
            c.name AS categoryName,
            m.url AS coverUrl
        FROM posts p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN media_files m ON m.id = p.cover_media_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY COALESCE(p.published_at, p.created_at) DESC`,
        values
    )

    res.json(rows)
}

export const getPostById = async (req, res) => {
    const postIdOrSlug = req.params.id
    const isNumericId = /^\d+$/.test(postIdOrSlug)

    const [rows] = await db.query(
        `SELECT
            p.id,
            p.title,
            p.slug,
            p.summary,
            p.content,
            p.status,
            p.type,
            p.published_at AS publishedAt,
            p.created_at AS createdAt,
            p.updated_at AS updatedAt,
            c.id AS categoryId,
            c.name AS categoryName,
            m.id AS coverMediaId,
            m.url AS coverUrl
        FROM posts p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN media_files m ON m.id = p.cover_media_id
        WHERE ${isNumericId ? "p.id = ?" : "p.slug = ?"}
        LIMIT 1`,
        [postIdOrSlug]
    )

    if(!rows.length) {
        return res.status(404).json({message: "Post not found"})
    }

    const [tagRows] = await db.query(
        `SELECT t.id, t.name, t.slug
        FROM post_tags pt
        INNER JOIN tags t ON t.id = pt.tag_id
        WHERE pt.post_id = ?`,
        [rows[0].id]
    )

    res.json({
        ...rows[0],
        tags: tagRows
    })
}

export const createPost = async (req, res) => {
    const {
        title,
        slug,
        summary = null,
        content = null,
        status = "draft",
        type = "article",
        categoryId = null,
        coverMediaId = null,
        publishedAt = null
    } = req.body

    if(!title) {
        return res.status(400).json({message: "title is required"})
    }

    const finalSlug = slug || toSlug(title)

    const [result] = await db.query(
        `INSERT INTO posts
            (title, slug, summary, content, status, type, category_id, cover_media_id, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, finalSlug, summary, content, status, type, categoryId, coverMediaId, publishedAt]
    )

    res.status(201).json({
        id: result.insertId,
        title,
        slug: finalSlug
    })
}

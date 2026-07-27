import {db} from "../config/database.js"
import {buildPublicFileUrl, resolveStoredExtension} from "../services/file-storage.service.js"

export const createUpload = async (req, res) => {
    if(!req.file) {
        return res.status(400).json({message: "file is required"})
    }

    const extension = resolveStoredExtension(req.file.originalname)
    const url = buildPublicFileUrl(req.file.filename)

    const [result] = await db.query(
        `INSERT INTO media_files
            (original_name, stored_name, mime_type, extension, size_bytes, relative_path, url, alt_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            req.file.originalname,
            req.file.filename,
            req.file.mimetype,
            extension || null,
            req.file.size,
            req.file.path,
            url,
            req.body.altText || null
        ]
    )

    res.status(201).json({
        id: result.insertId,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        url
    })
}

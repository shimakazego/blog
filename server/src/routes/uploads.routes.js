import {Router} from "express"
import multer from "multer"
import path from "node:path"
import {createUpload} from "../controllers/uploads.controller.js"
import {env} from "../config/env.js"
import {ensureUploadDir, resolveStoredExtension} from "../services/file-storage.service.js"
import {asyncHandler} from "../utils/async-handler.js"

ensureUploadDir()

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, env.uploadDir)
    },
    filename: (_req, file, callback) => {
        const timestamp = Date.now()
        const random = Math.round(Math.random() * 1e9)
        const extension = resolveStoredExtension(file.originalname)
        callback(null, `${timestamp}-${random}${extension}`)
    }
})

const upload = multer({
    storage,
    limits: {
        fileSize: env.maxFileSizeMb * 1024 * 1024
    },
    fileFilter: (_req, file, callback) => {
        const extension = path.extname(file.originalname || "").toLowerCase()
        const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".mp4", ".webm", ".pdf"]
        if(!allowedExtensions.includes(extension)) {
            return callback(new Error("Unsupported file type"))
        }

        callback(null, true)
    }
})

const router = Router()

router.post("/", upload.single("file"), asyncHandler(createUpload))

export default router

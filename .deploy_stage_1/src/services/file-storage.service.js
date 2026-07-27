import fs from "node:fs"
import path from "node:path"
import {env} from "../config/env.js"

export const ensureUploadDir = () => {
    if(!fs.existsSync(env.uploadDir)) {
        fs.mkdirSync(env.uploadDir, {recursive: true})
    }
}

export const buildPublicFileUrl = (fileName) => {
    return `/media/${fileName}`
}

export const resolveStoredExtension = (originalName) => {
    return path.extname(originalName || "").toLowerCase()
}

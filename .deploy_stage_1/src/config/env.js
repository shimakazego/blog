import dotenv from "dotenv"
import path from "node:path"

dotenv.config()

const rootDir = path.resolve(process.cwd())

export const env = {
    port: Number(process.env.PORT || 3001),
    appOrigin: process.env.APP_ORIGIN || "http://localhost:5173",
    mysqlHost: process.env.MYSQL_HOST || "127.0.0.1",
    mysqlPort: Number(process.env.MYSQL_PORT || 3306),
    mysqlUser: process.env.MYSQL_USER || "root",
    mysqlPassword: process.env.MYSQL_PASSWORD || "",
    mysqlDatabase: process.env.MYSQL_DATABASE || "blog_site",
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 10),
    uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR || "storage/uploads")
}

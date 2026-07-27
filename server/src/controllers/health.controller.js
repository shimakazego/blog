import {db} from "../config/database.js"

export const getHealth = async (_req, res) => {
    let database = "up"

    try {
        await db.query("SELECT 1")
    }
    catch {
        database = "down"
    }

    res.json({
        service: "blog-server",
        status: "ok",
        database,
        now: new Date().toISOString()
    })
}

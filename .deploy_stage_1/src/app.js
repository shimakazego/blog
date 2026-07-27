import cors from "cors"
import express from "express"
import path from "node:path"
import {env} from "./config/env.js"
import routes from "./routes/index.js"
import {errorHandler} from "./middleware/error-handler.js"
import {notFoundHandler} from "./middleware/not-found-handler.js"

const app = express()

app.use(cors({
    origin: env.appOrigin,
    credentials: true
}))
app.use(express.json({limit: "2mb"}))
app.use(express.urlencoded({extended: true}))
app.use("/media", express.static(path.resolve(env.uploadDir)))
app.use("/api", routes)
app.use(notFoundHandler)
app.use(errorHandler)

export default app

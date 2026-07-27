import app from "./app.js"
import {env} from "./config/env.js"
import {ensureUploadDir} from "./services/file-storage.service.js"

ensureUploadDir()

app.listen(env.port, () => {
    console.log(`[blog-server] listening on http://localhost:${env.port}`)
})

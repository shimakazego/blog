import {Router} from "express"
import gameGuideRoutes from "./game-guides.routes.js"
import healthRoutes from "./health.routes.js"
import postRoutes from "./posts.routes.js"
import uploadRoutes from "./uploads.routes.js"
import yuriEntryRoutes from "./yuri-entries.routes.js"

const router = Router()

router.use("/health", healthRoutes)
router.use("/posts", postRoutes)
router.use("/game-guides", gameGuideRoutes)
router.use("/yuri-entries", yuriEntryRoutes)
router.use("/uploads", uploadRoutes)

export default router

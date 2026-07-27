import {Router} from "express"
import {asyncHandler} from "../utils/async-handler.js"
import {getHealth} from "../controllers/health.controller.js"

const router = Router()

router.get("/", asyncHandler(getHealth))

export default router

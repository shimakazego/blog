import {Router} from "express"
import {createGameGuide, listGameGuides} from "../controllers/game-guides.controller.js"
import {asyncHandler} from "../utils/async-handler.js"

const router = Router()

router.get("/", asyncHandler(listGameGuides))
router.post("/", asyncHandler(createGameGuide))

export default router

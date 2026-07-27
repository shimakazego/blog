import {Router} from "express"
import {createYuriEntry, listYuriEntries} from "../controllers/yuri-entries.controller.js"
import {asyncHandler} from "../utils/async-handler.js"

const router = Router()

router.get("/", asyncHandler(listYuriEntries))
router.post("/", asyncHandler(createYuriEntry))

export default router

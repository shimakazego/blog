import {Router} from "express"
import {createYuriEntry, listYuriEntries, proxyYuriCover} from "../controllers/yuri-entries.controller.js"
import {asyncHandler} from "../utils/async-handler.js"

const router = Router()

router.get("/", asyncHandler(listYuriEntries))
router.get("/cover-proxy", asyncHandler(proxyYuriCover))
router.post("/", asyncHandler(createYuriEntry))

export default router

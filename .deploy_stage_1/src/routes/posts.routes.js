import {Router} from "express"
import {createPost, getPostById, listPosts} from "../controllers/posts.controller.js"
import {asyncHandler} from "../utils/async-handler.js"

const router = Router()

router.get("/", asyncHandler(listPosts))
router.get("/:id", asyncHandler(getPostById))
router.post("/", asyncHandler(createPost))

export default router

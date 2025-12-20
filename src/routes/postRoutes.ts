import express from 'express';
const router = express.Router();
import postController from '../controllers/postController';

// router.get("/", movieController.get.bind(movieController));

router.post('/', postController.createPost.bind(postController));

// router.delete("/:id", authMiddleware, movieController.del.bind(movieController));

// router.put("/:id", authMiddleware, movieController.put.bind(movieController));

export default router;

import express from 'express';
const router = express.Router();
import postController from '../controllers/postController';
import { authenticate } from '../middlewares/authMiddleware';

router.get('/', postController.getAllPosts.bind(postController));
router.get('/:id', postController.getPostById.bind(postController));

router.post('/', authenticate, postController.createPost.bind(postController));

router.put('/:id', authenticate, postController.updatePost.bind(postController));

export default router;

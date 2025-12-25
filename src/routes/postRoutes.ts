import express from 'express';
const router = express.Router();
import postController from '../controllers/postController';

router.get('/', postController.getAllPosts.bind(postController));
router.get('/:id', postController.getPostById.bind(postController));

router.post('/', postController.createPost.bind(postController));

router.put('/:id', postController.updatePost.bind(postController));

export default router;

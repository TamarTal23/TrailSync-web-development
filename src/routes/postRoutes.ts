import express from 'express';
const router = express.Router();
import postController from '../controllers/postController';
import { authenticate } from '../middlewares/authMiddleware';
import { uploadPostPhotos } from '../utilities/photoUpload';

router.get('/', postController.getAllPosts.bind(postController));
router.get('/:id', postController.getPostById.bind(postController));

router.post(
  '/',
  authenticate,
  uploadPostPhotos.array('photos', parseInt(process.env.MAX_PHOTO_UPLOAD || '10')),
  postController.createPost.bind(postController)
);

router.put(
  '/:id',
  authenticate,
  uploadPostPhotos.array('photos', parseInt(process.env.MAX_PHOTO_UPLOAD || '10')),
  postController.updatePost.bind(postController)
);

router.delete('/:id', authenticate, postController.deletePost.bind(postController));

export default router;

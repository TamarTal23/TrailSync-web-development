import express from 'express';
const router = express.Router();
import commentController from '../controllers/commentController';
import { authenticate } from '../middlewares/authMiddleware';

router.get('/', commentController.getAllComments.bind(commentController));
router.get('/:id', commentController.getCommentById.bind(commentController));

router.post('/', authenticate, commentController.createComment.bind(commentController));

router.put('/:id', authenticate, commentController.updateComment.bind(commentController));

router.delete('/:id', authenticate, commentController.deleteComment.bind(commentController));
export default router;

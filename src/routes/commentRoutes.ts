import express from 'express';
const router = express.Router();
import commentController from '../controllers/commentController';

router.get('/', commentController.getAllComments.bind(commentController));
router.get('/:id', commentController.getCommentById.bind(commentController));

router.post('/', commentController.createComment.bind(commentController));

router.put('/:id', commentController.updateComment.bind(commentController));

router.delete('/:id', commentController.deleteComment.bind(commentController));
export default router;

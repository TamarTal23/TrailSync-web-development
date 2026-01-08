import express from 'express';
const router = express.Router();
import commentController from '../controllers/commentController';
import { authenticate } from '../middlewares/authMiddleware';

/**
 * @swagger
 * /comment:
 *   get:
 *     summary: Get all comments (with optional filters)
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: post
 *         schema:
 *           type: string
 *         description: Filter by post id
 *       - in: query
 *         name: user
 *         schema:
 *           type: string
 *         description: Filter by user id
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       500:
 *         description: Server error
 */
router.get('/', commentController.getAllComments.bind(commentController));

/**
 * @swagger
 * /comment/{id}:
 *   get:
 *     summary: Get comment by id
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment id
 *     responses:
 *       200:
 *         description: Comment data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Server error
 */
router.get('/:id', commentController.getCommentById.bind(commentController));

/**
 * @swagger
 * /comment:
 *   post:
 *     summary: Create a new comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - post
 *               - text
 *             properties:
 *               post:
 *                 type: string
 *                 description: Post id
 *               text:
 *                 type: string
 *                 description: Comment text
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, commentController.createComment.bind(commentController));

/**
 * @swagger
 * /comment/{id}:
 *   put:
 *     summary: Update a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 */
router.put('/:id', authenticate, commentController.updateComment.bind(commentController));

/**
 * @swagger
 * /comment/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment id
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, commentController.deleteComment.bind(commentController));
export default router;

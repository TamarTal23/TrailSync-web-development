import express from 'express';
const router = express.Router();
import postController from '../controllers/postController';
import { authenticate } from '../middlewares/authMiddleware';
import { uploadPostPhotos } from '../utilities/photoUpload';

/**
 * @swagger
 * /post:
 *   get:
 *     summary: Get all posts (with optional filters and pagination)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: sender
 *         schema:
 *           type: string
 *         description: Filter by sender user id
 *       - in: query
 *         name: minDays
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Minimum number of days
 *       - in: query
 *         name: maxDays
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Maximum number of days
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city (exact match)
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country (exact match)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Page number
 *       - in: query
 *         name: batchSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of posts per batch (requires page parameter)
 *     responses:
 *       200:
 *         description: List of posts. Returns batched response if both page and batchSize are provided, otherwise returns all posts as an array.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 - $ref: '#/components/schemas/BatchedPostsResponse'
 *       500:
 *         description: Server error
 */
router.get('/', postController.getAllPosts.bind(postController));

/**
 * @swagger
 * /post/{id}:
 *   get:
 *     summary: Get post by id
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post id
 *     responses:
 *       200:
 *         description: Post data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.get('/:id', postController.getPostById.bind(postController));

/**
 * @swagger
 * /post:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - mapLink
 *               - price
 *               - numberOfDays
 *               - location[country]
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               mapLink:
 *                 type: string
 *               price:
 *                 type: number
 *               numberOfDays:
 *                 type: number
 *               location[city]:
 *                 type: string
 *               location[country]:
 *                 type: string
 *               description:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authenticate,
  uploadPostPhotos.array('photos', parseInt(process.env.MAX_PHOTO_UPLOAD || '10')),
  postController.createPost.bind(postController)
);

/**
 * @swagger
 * /post/{id}:
 *   put:
 *     summary: Update a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post id
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               mapLink:
 *                 type: string
 *               price:
 *                 type: number
 *               numberOfDays:
 *                 type: number
 *               location[city]:
 *                 type: string
 *               location[country]:
 *                 type: string
 *               description:
 *                 type: string
 *               photosToDelete:
 *                 type: string
 *                 description: JSON array of photo paths to delete
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: Bad request - invalid photosToDelete format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.put(
  '/:id',
  authenticate,
  uploadPostPhotos.array('photos', parseInt(process.env.MAX_PHOTO_UPLOAD || '10')),
  postController.updatePost.bind(postController)
);

/**
 * @swagger
 * /post/{id}:
 *   delete:
 *     summary: Delete a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post id
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 *     500:
 *         description: Server error
 */
router.delete('/:id', authenticate, postController.deletePost.bind(postController));
/**
 * @swagger
 * /post/search:
 *   post:
 *     summary: Search travel posts using natural language
 *     description: Search for travel posts using natural language queries powered by openAI api.
 *     tags: [Posts]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language search query
 *                 example: "trips to Italy under $3000"
 *     responses:
 *       200:
 *         description: Search completed successfully, a list of posts matching is returned
 *         content:
 *           application/json:
 *             schema:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/search', postController.search.bind(postController));

export default router;

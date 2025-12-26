import express from 'express';
const router = express.Router();
import userController from '../controllers/userController';
import { authenticate } from '../middlewares/authMiddleware';

router.get('/', userController.getAllUsers.bind(userController));
router.get('/:id', userController.getUserById.bind(userController));

router.put('/:id', authenticate, userController.updateUser.bind(userController));

router.delete('/:id', authenticate, userController.deleteUser.bind(userController));

export default router;

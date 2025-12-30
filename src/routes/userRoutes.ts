import express from 'express';
const router = express.Router();
import userController from '../controllers/userController';
import { authenticate } from '../middlewares/authMiddleware';
import { uploadProfile } from '../utilities/photoUpload';

router.get('/', userController.getAllUsers.bind(userController));
router.get('/:id', userController.getUserById.bind(userController));

router.put(
  '/:id',
  authenticate,
  uploadProfile.single('profilePicture'),
  userController.updateUser.bind(userController)
);

router.delete('/:id', authenticate, userController.deleteUser.bind(userController));

export default router;

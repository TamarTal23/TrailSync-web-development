import express from 'express';
const router = express.Router();
import authController from '../controllers/authController';
import { uploadProfile } from '../utilities/photoUpload';

router.post('/register', uploadProfile.single('profilePicture'), authController.register);

router.post('/login', authController.login);

router.post('/refresh-token', authController.refreshTokens);

router.post('/logout', authController.logout);

export default router;

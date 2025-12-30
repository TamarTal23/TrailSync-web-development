import User from '../model/userModel';
import { Request, Response } from 'express';
import BaseController from './baseController';
import { StatusCodes } from 'http-status-codes';
import { deleteFile, normalizeFilePath } from '../utilities/photoUpload';
import { AuthRequest } from '../middlewares/authMiddleware';

const FORBIDDEN_MESSAGE = 'Forbidden';

class UserController extends BaseController {
  constructor() {
    super(User);
  }

  getAllUsers = async (req: Request, res: Response) => super.get(req, res);

  getUserById = async (req: Request, res: Response) => super.getById(req, res);

  updateUser = async (req: AuthRequest, res: Response) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
      }

      if (user._id.toString() !== req.userId) {
        return res.status(StatusCodes.FORBIDDEN).json({ error: FORBIDDEN_MESSAGE });
      }

      if (req.file) {
        if (user.profilePicture) {
          deleteFile(user.profilePicture);
        }

        req.body.profilePicture = normalizeFilePath(req.file.path);
      }

      return super.put(req, res);
    } catch (error) {
      if (req.file) {
        deleteFile(req.file.path);
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  };

  deleteUser = async (req: AuthRequest, res: Response) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
      }

      if (user._id.toString() !== req.userId) {
        return res.status(StatusCodes.FORBIDDEN).json({ error: FORBIDDEN_MESSAGE });
      }

      if (user.profilePicture) {
        deleteFile(user.profilePicture);
      }

      return super.delete(req, res);
    } catch (error) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  };
}

export default new UserController();

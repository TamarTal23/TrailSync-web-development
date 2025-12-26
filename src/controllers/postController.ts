import Post from '../model/postModel';
import { Request, Response } from 'express';
import BaseController from './baseController';
import { AuthRequest } from '../middlewares/authMiddleware';
import { StatusCodes } from 'http-status-codes';

class PostController extends BaseController {
  constructor() {
    super(Post);
  }

  createPost = async (req: AuthRequest, res: Response) => {
    const userId = req.user?._id;
    req.body.sender = userId;

    return super.post(req, res);
  }; //todo pictures upload

  getAllPosts = async (req: Request, res: Response) => super.get(req, res);

  getPostById = async (req: Request, res: Response) => super.getById(req, res);

  updatePost = async (req: AuthRequest, res: Response) => {
    const userId = req.user?._id;
    const post = await Post.findById(req.params.id);

    if (post?.sender.toString() !== userId) {
      res.status(StatusCodes.FORBIDDEN).json({ error: 'Forbidden' });

      return;
    }

    return super.put(req, res);
  };
}

export default new PostController();

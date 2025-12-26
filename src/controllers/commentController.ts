import Comment from '../model/commentModel';
import { Request, Response } from 'express';
import BaseController from './baseController';
import { AuthRequest } from '../middlewares/authMiddleware';
import { StatusCodes } from 'http-status-codes';

const FORBIDDEN_MESSAGE = 'Forbidden';

class CommentController extends BaseController {
  constructor() {
    super(Comment);
  }

  createComment = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    req.body.user = userId;

    return super.post(req, res);
  };

  getAllComments = async (req: Request, res: Response) => super.get(req, res);

  getCommentById = async (req: Request, res: Response) => super.getById(req, res);

  updateComment = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const comment = await Comment.findById(req.params.id);

    if (comment?.user.toString() !== userId) {
      res.status(StatusCodes.FORBIDDEN).json({ error: FORBIDDEN_MESSAGE });

      return;
    }

    return super.put(req, res);
  };

  deleteComment = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const comment = await Comment.findById(req.params.id);

    if (comment?.user.toString() !== userId) {
      res.status(StatusCodes.FORBIDDEN).json({ error: FORBIDDEN_MESSAGE });

      return;
    }

    return super.delete(req, res);
  };
}

export default new CommentController();

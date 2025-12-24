import Comment from '../model/commentModel';
import { Request, Response } from 'express';
import BaseController from './baseController';

class CommentController extends BaseController {
  constructor() {
    super(Comment);
  }

  createComment = async (req: Request, res: Response) => super.post(req, res);

  getAllComments = async (req: Request, res: Response) => super.get(req, res);

  getCommentById = async (req: Request, res: Response) => super.getById(req, res);

  updateComment = async (req: Request, res: Response) => super.put(req, res);

  deleteComment = async (req: Request, res: Response) => super.delete(req, res);
}

export default new CommentController();

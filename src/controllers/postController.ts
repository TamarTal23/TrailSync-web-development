import Post from '../model/postModel';
import { Request, Response } from 'express';
import BaseController from './baseController';

class PostController extends BaseController {
  constructor() {
    super(Post);
  }

  createPost = async (req: Request, res: Response) => super.post(req, res);
}

export default new PostController();

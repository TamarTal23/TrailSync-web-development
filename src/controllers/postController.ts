import Post from '../model/postModel';
import { Request, Response } from 'express';
import BaseController from './baseController';

class PostController extends BaseController {
  constructor() {
    super(Post);
  }

  createPost = async (req: Request, res: Response) => super.post(req, res);

  getAllPosts = async (req: Request, res: Response) => super.get(req, res);

  getPostById = async (req: Request, res: Response) => super.getById(req, res);

  updatePost = async (req: Request, res: Response) => super.put(req, res);
}

export default new PostController();

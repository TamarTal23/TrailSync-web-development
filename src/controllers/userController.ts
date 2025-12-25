import User from '../model/userModel';
import { Request, Response } from 'express';
import BaseController from './baseController';

class UserController extends BaseController {
  constructor() {
    super(User);
  }

  getAllUsers = async (req: Request, res: Response) => super.get(req, res);

  getUserById = async (req: Request, res: Response) => super.getById(req, res);

  updateUser = async (req: Request, res: Response) => super.put(req, res);

  deleteUser = async (req: Request, res: Response) => super.delete(req, res);
}

export default new UserController();

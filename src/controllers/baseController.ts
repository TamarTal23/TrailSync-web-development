import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

class BaseController {
  model: any;

  constructor(dataModel: any) {
    this.model = dataModel;
  }

  async get(req: Request, res: Response) {
    const filter = req.query;

    try {
      const data = filter ? await this.model.find(filter) : await this.model.find();
      res.json(data);
    } catch (error) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  }

  async getById(req: Request, res: Response) {
    const id = req.params.id;

    try {
      const data = await this.model.findById(id);

      if (!data) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Data not found' });
      } else {
        res.json(data);
      }
    } catch (error) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  }

  async post(req: Request, res: Response) {
    const obj = req.body;

    try {
      const response = await this.model.create(obj);
      res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  }

  async delete(req: Request, res: Response) {
    const id = req.params.id;

    try {
      const response = await this.model.findByIdAndDelete(id);
      res.send(response);
    } catch (error) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  }

  async put(req: Request, res: Response) {
    const id = req.params.id;
    const body = req.body;

    try {
      const response = await this.model.findByIdAndUpdate(id, body, { new: true });
      res.json(response);
    } catch (error) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  }
}

export default BaseController;

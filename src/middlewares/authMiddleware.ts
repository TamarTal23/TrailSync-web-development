import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

export type AuthRequest = Request & { user?: { _id: string } };

const UNAUTHORIZED_MESSAGE = 'Unauthorized';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: UNAUTHORIZED_MESSAGE });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: UNAUTHORIZED_MESSAGE });
  }

  const secret = process.env.JWT_SECRET || 'default_secret';

  try {
    const decodedToken = jwt.verify(token, secret) as { _id: string };
    req.user = { _id: decodedToken._id };

    next();
  } catch (err) {
    // todo tamar check if this is how you want to handle errors
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: UNAUTHORIZED_MESSAGE });
  }
};

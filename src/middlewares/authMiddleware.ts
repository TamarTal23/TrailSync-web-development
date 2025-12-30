import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

export type AuthRequest = Request & { userId?: string };

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

  const secret = process.env.JWT_SECRET!;

  try {
    const decodedToken = jwt.verify(token, secret) as { userId: string };
    req.userId = decodedToken.userId;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    return res.status(StatusCodes.UNAUTHORIZED).json({ message: UNAUTHORIZED_MESSAGE });
  }
};

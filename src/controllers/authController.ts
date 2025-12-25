import { Request, Response } from 'express';
import User from '../model/userModel';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';

const sendError = (res: Response, message: string, code?: number) => {
  const errCode = code || StatusCodes.BAD_REQUEST;
  res.status(errCode).json({ error: message });
};

type Tokens = {
  token: string;
  refreshToken: string;
};

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN || '3600');
const JWT_REFRESH_EXPIRES_IN = parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '86400');

const generateToken = (userId: string): Tokens => {
  const token = jwt.sign({ userId: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId: userId }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });

  return { token, refreshToken };
};

const register = async (req: Request, res: Response) => {
  const { email, password, username } = req.body; //todo profile picture

  try {
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({ email, password: encryptedPassword, username });
    const tokens = generateToken(user._id.toString());

    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.status(StatusCodes.CREATED).json(tokens);
  } catch (error) {
    return sendError(res, 'Registration failed', StatusCodes.UNAUTHORIZED); // todo tamar more specific error handling
  }
};

const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 'Email and password are required');
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return sendError(res, 'Invalid email or password', StatusCodes.UNAUTHORIZED);
    }

    const tokens = generateToken(user._id.toString());

    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.status(StatusCodes.OK).json(tokens);
  } catch (error) {
    return sendError(res, 'Login failed'); // todo tamar more specific error handling
  }
};

const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendError(res, 'Refresh token is required');
  }

  try {
    const decoded: any = jwt.verify(refreshToken, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return sendError(res, 'Invalid refresh token', StatusCodes.UNAUTHORIZED);
    }

    if (!user.refreshTokens.includes(refreshToken)) {
      user.refreshTokens = [];
      await user.save();

      return sendError(res, 'Invalid refresh token', StatusCodes.UNAUTHORIZED);
    }

    const tokens = generateToken(user._id.toString());
    user.refreshTokens.push(tokens.refreshToken);

    user.refreshTokens = user.refreshTokens.filter(
      (currRefreshToken) => currRefreshToken !== refreshToken
    );
    await user.save();

    res.status(StatusCodes.OK).json(tokens);
  } catch (error) {
    return sendError(res, 'Invalid refresh token', StatusCodes.UNAUTHORIZED);
  }
};

export default {
  register,
  login,
  refreshToken,
};

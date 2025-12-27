import { Request, Response } from 'express';
import User from '../model/userModel';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { deleteFile, normalizeFilePath } from '../utilities/photoUpload';

const sendError = (res: Response, message: string, code?: number) => {
  const errCode = code || StatusCodes.BAD_REQUEST;
  res.status(errCode).json({ error: message });
};

type Tokens = {
  token: string;
  refreshToken: string;
};

const generateToken = (userId: string): Tokens => {
  const JWT_SECRET = process.env.JWT_SECRET!;
  const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN || '3600');
  const JWT_REFRESH_EXPIRES_IN = parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '86400');

  const token = jwt.sign({ userId: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId: userId }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });

  return { token, refreshToken };
};

const register = async (req: Request, res: Response) => {
  const { email, password, username } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);

    const userData: any = {
      email,
      password: encryptedPassword,
      username,
    };

    if (req.file) {
      userData.profilePicture = normalizeFilePath(req.file.path);
    }

    const createdUser = await User.create(userData);
    const user = Array.isArray(createdUser) ? createdUser[0] : createdUser;
    const tokens = generateToken(user._id.toString());

    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.status(StatusCodes.CREATED).json(tokens);
  } catch (error) {
    console.error('Registration error:', error);

    if (req.file) {
      deleteFile(req.file.path);
    }

    return sendError(res, 'Registration failed', StatusCodes.UNAUTHORIZED);
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
    console.error('Login error:', error);

    return sendError(res, 'Login failed');
  }
};

const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendError(res, 'Refresh token is required');
  }

  try {
    const decoded: any = jwt.verify(refreshToken, process.env.JWT_SECRET!);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return sendError(res, 'Invalid refresh token', StatusCodes.UNAUTHORIZED);
    }

    if (!user.refreshTokens.includes(refreshToken)) {
      return sendError(res, 'Invalid refresh token', StatusCodes.UNAUTHORIZED);
    }

    user.refreshTokens = user.refreshTokens.filter(
      (currRefreshToken) => currRefreshToken !== refreshToken
    );
    await user.save();

    res.status(StatusCodes.OK).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);

    return sendError(res, 'Logout failed', StatusCodes.UNAUTHORIZED);
  }
};

const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendError(res, 'Refresh token is required');
  }

  try {
    const decoded: any = jwt.verify(refreshToken, process.env.JWT_SECRET!);
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
    console.error('Refresh token error:', error);

    return sendError(res, 'Invalid refresh token', StatusCodes.UNAUTHORIZED);
  }
};

export default {
  register,
  login,
  logout,
  refreshToken,
};

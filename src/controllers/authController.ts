import { Request, Response } from 'express';
import User from '../model/userModel';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { deleteFile, renameProfileFile, NEW_IMAGE_PLACEHOLDER } from '../utilities/photoUpload';
import { handleCreateRes } from '../utilities/general';
import { randomUUID } from 'node:crypto';

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

    const createdUser = await User.create(userData);
    const user = handleCreateRes(createdUser);

    if (req.file) {
      const renamedPath = renameProfileFile(
        req.file.path,
        user._id.toString(),
        NEW_IMAGE_PLACEHOLDER
      );
      user.profilePicture = renamedPath;
    }

    const tokens = generateToken(user._id.toString());
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.status(StatusCodes.CREATED).json({ tokens, userId: user.id ?? user._id.toString() });
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

    res.status(StatusCodes.OK).json({ tokens, userId: user.id ?? user._id.toString() });
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

const refreshTokens = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendError(res, 'Refresh token is required');
  }

  try {
    const decodedUser: any = jwt.verify(refreshToken, process.env.JWT_SECRET!);
    const user = await User.findById(decodedUser.userId);

    if (!user) {
      return sendError(res, 'Invalid refresh token', StatusCodes.UNAUTHORIZED);
    }

    if (!user.refreshTokens.includes(refreshToken)) {
      user.refreshTokens = [];
      await user.save();

      return sendError(res, 'Invalid refresh token', StatusCodes.UNAUTHORIZED);
    }

    const newToken = generateToken(user._id.toString());
    user.refreshTokens.push(newToken.refreshToken);

    user.refreshTokens = user.refreshTokens.filter(
      (currRefreshToken) => currRefreshToken !== refreshToken
    );
    await user.save();

    res.status(StatusCodes.OK).json(newToken);
  } catch (error) {
    console.error('Refresh token error:', error);

    return sendError(res, 'Invalid refresh token', StatusCodes.UNAUTHORIZED);
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  const credentials = req.body.credentials;

  const googleOAuthUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';

  try {
    const googleLoginResponse = await fetch(googleOAuthUrl, {
      headers: { Authorization: `Bearer ${credentials}` },
    });

    if (!googleLoginResponse.ok) {
      throw new Error('Google login failed');
    }

    const payload = await googleLoginResponse.json();

    const email = payload?.email;

    req.body.email = email;

    let user = await User.findOne({ email: email });

    if (!user) {
      user = await User.create({
        email,
        profilePicture: payload?.picture,
        password: randomUUID(),
        username: payload?.name || email?.split('@')[0] || 'Google User',
      });
    }

    const tokens = generateToken(user.id);

    res.status(StatusCodes.OK).json({ tokens, userId: user.id ?? user._id.toString() });
  } catch (error) {
    console.error('Google login error:', error);

    res.status(400).send('error in google login');
  }
};

export default {
  register,
  login,
  logout,
  googleLogin,
  refreshTokens,
};

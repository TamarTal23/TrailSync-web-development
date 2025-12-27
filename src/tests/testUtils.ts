import { Express } from 'express';
import request from 'supertest';
import User from '../model/userModel';

type UserData = {
  email: string;
  password: string;
  username: string;
  _id?: string;
  token?: string;
  refreshTokens?: string;
};
export const userData: UserData = {
  email: 'test@test.com',
  username: 'testUser',
  password: 'testPassword',
};

export const registerTestUser = async (app: Express) => {
  await User.deleteMany({ email: userData.email });

  const res = await request(app).post('/auth/register').send(userData);

  userData._id = res.body._id;
  userData.token = res.body.token;
};

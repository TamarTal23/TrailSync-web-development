import request from 'supertest';
import { Express } from 'express';
import User from '../model/userModel';
import { initApp } from '..';
import { expect, test, beforeAll, describe, jest } from '@jest/globals';
import { postsList, userData } from './testUtils';
import { StatusCodes } from 'http-status-codes';

let app: Express;

const AUTH_URL = '/auth';

beforeAll(async () => {
  app = await initApp();
  await User.deleteMany();
});

describe('Test Auth', () => {
  test('test creating a post without token fails', async () => {
    const response = await request(app).post('/post').send(postsList[0]);
    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('test creating post with Bearer but no token', async () => {
    const response = await request(app)
      .post('/post')
      .set('Authorization', 'Bearer ')
      .send(postsList[0]);
    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('test Registration', async () => {
    const { email, password, username } = userData;
    const response = await request(app)
      .post(`${AUTH_URL}/register`)
      .send({ email, password, username });
    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body).toHaveProperty('token');
    userData.token = response.body.token;
    expect(response.body).toHaveProperty('refreshToken');
    userData.refreshTokens = response.body.refreshToken;
    userData._id = response.body._id;
  });

  test('test registration with profile picture', async () => {
    const path = require('path');
    const filePath = path.join(__dirname, 'assets', 'profile.jpg');

    const response = await request(app)
      .post(`${AUTH_URL}/register`)
      .field('email', 'withphoto@test.com')
      .field('password', 'password123')
      .field('username', 'PhotoUser')
      .attach('profilePicture', filePath);

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body).toHaveProperty('token');
  });

  test('register with invalid file type', async () => {
    const response = await request(app)
      .post(`${AUTH_URL}/register`)
      .field('email', 'invalidfile@test.com')
      .field('password', 'password123')
      .field('username', 'InvalidFileUser')
      .attach('profilePicture', Buffer.from('not an image'), 'test.txt');

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('test registration failure with profile picture cleanup', async () => {
    const path = require('path');
    const filePath = path.join(__dirname, 'assets', 'profile.jpg');

    const response = await request(app)
      .post(`${AUTH_URL}/register`)
      .field('email', userData.email)
      .field('password', 'password123')
      .field('username', 'DuplicateUser')
      .attach('profilePicture', filePath);

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('test registration with existing email', async () => {
    const response = await request(app).post(`${AUTH_URL}/register`).send({
      email: userData.email,
      password: 'anotherPass',
      username: 'AnotherUser',
    });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('test registration with missing fields', async () => {
    const response = await request(app)
      .post(`${AUTH_URL}/register`)
      .send({ email: 'test@test.com' });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('create a post with token succeeds', async () => {
    const postData = postsList[0];
    const response = await request(app)
      .post('/post')
      .set('Authorization', 'Bearer ' + userData.token)
      .send(postData);
    expect(response.status).toBe(StatusCodes.CREATED);
  });

  test('create a post with compromised token fails', async () => {
    const postData = postsList[0];
    const compromisedToken = userData.token + 'a';
    const response = await request(app)
      .post('/post')
      .set('Authorization', 'Bearer ' + compromisedToken)
      .send(postData);
    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('test Login', async () => {
    const email = userData.email;
    const password = userData.password;
    const response = await request(app)
      .post(`${AUTH_URL}/login`)
      .send({ email: email, password: password });
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('refreshToken');
    userData.token = response.body.token;
    userData.refreshTokens = response.body.refreshToken;
  });

  test('test login with wrong password fails', async () => {
    const response = await request(app).post(`${AUTH_URL}/login`).send({
      email: userData.email,
      password: 'wrongPassword',
    });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('test login with non-existing user fails', async () => {
    const response = await request(app).post(`${AUTH_URL}/login`).send({
      email: 'nouser@test.com',
      password: '123456',
    });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('login without email fails', async () => {
    const res = await request(app).post(`${AUTH_URL}/login`).send({ password: '123' });
    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  test('login without password fails', async () => {
    const res = await request(app).post(`${AUTH_URL}/login`).send({ email: 'a@b.com' });
    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  test('login DB error returns Login failed', async () => {
    jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post(`${AUTH_URL}/login`)
      .send({ email: 'test@test.com', password: '123456' });

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  test('test using token after expiration fails', async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const postData = postsList[0];

    const { _id, ...postDataWithoutId } = postData;
    const response = await request(app)
      .post('/post')
      .set('Authorization', 'Bearer ' + userData.token)
      .send(postData);
    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);

    //refresh the token
    const refreshResponse = await request(app)
      .post(`${AUTH_URL}/refresh-token`)
      .send({ refreshToken: userData.refreshTokens });

    expect(refreshResponse.status).toBe(StatusCodes.OK);
    expect(refreshResponse.body).toHaveProperty('token');
    userData.token = refreshResponse.body.token;
    userData.refreshTokens = refreshResponse.body.refreshToken;

    //try to create post again
    const retryResponse = await request(app)
      .post('/post')
      .set('Authorization', 'Bearer ' + userData.token)
      .send(postDataWithoutId);

    expect(retryResponse.status).toBe(StatusCodes.CREATED);
  });

  test('test refresh token with invalid token fails', async () => {
    const response = await request(app)
      .post(`${AUTH_URL}/refresh-token`)
      .send({ refreshToken: 'invalid.refresh.token' });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('test refresh token without token fails', async () => {
    const response = await request(app).post(`${AUTH_URL}/refresh-token`).send({});

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  test('test double use of refresh token fails', async () => {
    //use the current refresh token to get a new token
    const refreshResponse1 = await request(app)
      .post(`${AUTH_URL}/refresh-token`)
      .send({ refreshToken: userData.refreshTokens });
    expect(refreshResponse1.status).toBe(StatusCodes.OK);
    expect(refreshResponse1.body).toHaveProperty('token');
    const newRefreshToken = refreshResponse1.body.refreshToken;

    //try to use the same refresh token again
    const refreshResponse2 = await request(app)
      .post(`${AUTH_URL}/refresh-token`)
      .send({ refreshToken: userData.refreshTokens });
    expect(refreshResponse2.status).toBe(StatusCodes.UNAUTHORIZED);

    //try to use the new refresh token also fails
    const refreshResponse3 = await request(app)
      .post(`${AUTH_URL}/refresh-token`)
      .send({ refreshToken: newRefreshToken });
    expect(refreshResponse3.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('logout with valid refresh token succeeds', async () => {
    const loginRes = await request(app)
      .post(`${AUTH_URL}/login`)
      .send({ email: userData.email, password: userData.password });

    expect(loginRes.status).toBe(StatusCodes.OK);
    const validRefreshToken = loginRes.body.refreshToken;

    const logoutRes = await request(app)
      .post(`${AUTH_URL}/logout`)
      .send({ refreshToken: validRefreshToken });

    expect(logoutRes.status).toBe(StatusCodes.OK);
    expect(logoutRes.body).toHaveProperty('message', 'Logged out successfully');

    // Verify token was removed
    const retryLogout = await request(app)
      .post(`${AUTH_URL}/logout`)
      .send({ refreshToken: validRefreshToken });

    expect(retryLogout.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('logout without refresh token fails', async () => {
    const res = await request(app).post(`${AUTH_URL}/logout`).send({});
    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  test('logout with invalid refresh token fails', async () => {
    const res = await request(app)
      .post(`${AUTH_URL}/logout`)
      .send({ refreshToken: 'invalid.token.value' });

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('logout with valid token but user deleted', async () => {
    const jwt = require('jsonwebtoken');
    const deletedUserId = '507f1f77bcf86cd799439011';
    const fakeToken = jwt.sign({ userId: deletedUserId }, process.env.JWT_SECRET!, {
      expiresIn: '1h',
    });

    const res = await request(app).post(`${AUTH_URL}/logout`).send({ refreshToken: fakeToken });

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('logout with token not in user refreshTokens array', async () => {
    const jwt = require('jsonwebtoken');
    const validButNotInArrayToken = jwt.sign({ userId: userData._id }, process.env.JWT_SECRET!, {
      expiresIn: '1h',
    });

    const res = await request(app)
      .post(`${AUTH_URL}/logout`)
      .send({ refreshToken: validButNotInArrayToken });

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('logout with token not in user refreshTokens fails', async () => {
    const loginRes = await request(app)
      .post(`${AUTH_URL}/login`)
      .send({ email: userData.email, password: userData.password });

    const fakeRefreshToken = loginRes.body.refreshToken + 'x';

    const res = await request(app)
      .post(`${AUTH_URL}/logout`)
      .send({ refreshToken: fakeRefreshToken });
    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('refresh token when user not found', async () => {
    const jwt = require('jsonwebtoken');
    const fakeUserId = '507f1f77bcf86cd799439011';
    const fakeToken = jwt.sign({ userId: fakeUserId }, process.env.JWT_SECRET!, {
      expiresIn: '1h',
    });

    const res = await request(app)
      .post(`${AUTH_URL}/refresh-token`)
      .send({ refreshToken: fakeToken });

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
  });
});

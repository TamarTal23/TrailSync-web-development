import request from 'supertest';
import { Express } from 'express';
import User from '../model/userModel';
import { initApp } from '..';
import { expect, test, beforeAll, describe, jest } from '@jest/globals';
import { postsList, userData } from './testUtils';
import { StatusCodes } from 'http-status-codes';

let app: Express;

beforeAll(async () => {
  app = await initApp();
  await User.deleteMany();
});

describe('Test Auth', () => {
  test('Test creating a post without token fails', async () => {
    const response = await request(app).post('/post').send(postsList[0]);
    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('Test Registration', async () => {
    const { email, password, username } = userData;
    const response = await request(app).post('/auth/register').send({ email, password, username });
    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body).toHaveProperty('token');
    userData.token = response.body.token;
    expect(response.body).toHaveProperty('refreshToken');
    userData.refreshTokens = response.body.refreshToken;
    userData._id = response.body._id;
  });

  test('Test registration with existing email', async () => {
    const response = await request(app).post('/auth/register').send({
      email: userData.email, // already registered
      password: 'anotherPass',
      username: 'AnotherUser',
    });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('Test registration with missing fields', async () => {
    const response = await request(app).post('/auth/register').send({ email: 'test@test.com' }); // missing password & username

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

  test('Test Login', async () => {
    const email = userData.email;
    const password = userData.password;
    const response = await request(app)
      .post('/auth/login')
      .send({ email: email, password: password });
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('refreshToken');
    userData.token = response.body.token;
    userData.refreshTokens = response.body.refreshToken;
  });

  test('Test login with wrong password fails', async () => {
    const response = await request(app).post('/auth/login').send({
      email: userData.email,
      password: 'wrongPassword',
    });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('Test login with non-existing user fails', async () => {
    const response = await request(app).post('/auth/login').send({
      email: 'nouser@test.com',
      password: '123456',
    });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('Login without email fails', async () => {
    const res = await request(app).post('/auth/login').send({ password: '123' });
    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  test('Login without password fails', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  test('Login DB error returns Login failed', async () => {
    jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@test.com', password: '123456' });

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  test('Test using token after expiration fails', async () => {
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
      .post('/auth/refresh-token')
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

  test('Test refresh token with invalid token fails', async () => {
    const response = await request(app)
      .post('/auth/refresh-token')
      .send({ refreshToken: 'invalid.refresh.token' });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('Test refresh token without token fails', async () => {
    const response = await request(app).post('/auth/refresh-token').send({});

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  test('Test double use of refresh token fails', async () => {
    //use the current refresh token to get a new token
    const refreshResponse1 = await request(app)
      .post('/auth/refresh-token')
      .send({ refreshToken: userData.refreshTokens });
    expect(refreshResponse1.status).toBe(StatusCodes.OK);
    expect(refreshResponse1.body).toHaveProperty('token');
    const newRefreshToken = refreshResponse1.body.refreshToken;

    //try to use the same refresh token again
    const refreshResponse2 = await request(app)
      .post('/auth/refresh-token')
      .send({ refreshToken: userData.refreshTokens });
    expect(refreshResponse2.status).toBe(StatusCodes.UNAUTHORIZED);

    //try to use the new refresh token also fails
    const refreshResponse3 = await request(app)
      .post('/auth/refresh-token')
      .send({ refreshToken: newRefreshToken });
    expect(refreshResponse3.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('Logout with valid refresh token succeeds', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: userData.email, password: userData.password });

    expect(loginRes.status).toBe(StatusCodes.OK);
    const validRefreshToken = loginRes.body.refreshToken;

    const logoutRes = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: validRefreshToken });

    expect(logoutRes.status).toBe(StatusCodes.OK);
    expect(logoutRes.body).toHaveProperty('message', 'Logged out successfully');
  });

  test('Logout without refresh token fails', async () => {
    const res = await request(app).post('/auth/logout').send({});
    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  test('Logout with invalid refresh token fails', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: 'invalid.token.value' });

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('Logout with token not in user refreshTokens fails', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: userData.email, password: userData.password });

    const fakeRefreshToken = loginRes.body.refreshToken + 'x';

    const res = await request(app).post('/auth/logout').send({ refreshToken: fakeRefreshToken });

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
  });
});

import request from 'supertest';
import { Express } from 'express';
import User from '../model/userModel';
import { initApp } from '..';
import { expect, test, beforeAll, describe } from '@jest/globals';
import { postsList, userData } from './testUtils';
import { StatusCodes } from 'http-status-codes';

let app: Express;

beforeAll(async () => {
  app = await initApp();
  await User.deleteMany();
});

describe('Test Auth Suite', () => {
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

  test('Test using token after expiration fails', async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const postData = postsList[0];
    const response = await request(app)
      .post('/post')
      .set('Authorization', 'Bearer ' + userData.token)
      .send(postData);
    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);

    //refresh the token
    const refreshResponse = await request(app)
      .post('/auth/refresh-token')
      .send({ refreshToken: userData.refreshTokens });
    console.log('Refresh response body:', refreshResponse.body);
    expect(refreshResponse.status).toBe(StatusCodes.OK);
    expect(refreshResponse.body).toHaveProperty('token');
    userData.token = refreshResponse.body.token;
    userData.refreshTokens = refreshResponse.body.refreshToken;

    //try to create post again
    const retryResponse = await request(app)
      .post('/post')
      .set('Authorization', 'Bearer ' + userData.token)
      .send(postData);
    expect(retryResponse.status).toBe(StatusCodes.CREATED);
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
});

import request from 'supertest';
import { Express } from 'express';
import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import User from '../model/userModel';
import { initApp } from '..';
import {
  registerTestUser,
  userData,
  normalizeUser,
  registerOtherTestUser,
  secondUser,
} from './testUtils';
import path from 'node:path';

let app: Express;

const USER_URL = '/user';

beforeAll(async () => {
  app = await initApp();
  await User.deleteMany({});
  await registerTestUser(app);
  await registerOtherTestUser(app);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Users API tests', () => {
  test('update user without auth', async () => {
    const response = await request(app).put(`${USER_URL}/${userData._id}`).send({
      username: 'Hacker',
    });
    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('update user with duplicate email', async () => {
    const response = await request(app)
      .put(`${USER_URL}/${userData._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .send({ email: userData.email });

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('get all users', async () => {
    const response = await request(app).get(USER_URL);
    expect(response.statusCode).toBe(StatusCodes.OK);

    userData._id = response.body[0]._id;

    const normalizedResponse = response.body.map(normalizeUser);

    const testUserNormalized = {
      email: userData.email,
      username: userData.username,
      profilePicture: null,
    };

    expect(normalizedResponse).toContainEqual(expect.objectContaining(testUserNormalized));
  });

  test('test get users with db error', async () => {
    jest.spyOn(User, 'find').mockImplementationOnce(() => {
      throw new Error('DB failure');
    });

    const response = await request(app).get(USER_URL);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('get user with filter', async () => {
    const response = await request(app).get(USER_URL).query({ username: userData.username });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const normalizedUsers = response.body.map(normalizeUser);

    expect(normalizedUsers).toContainEqual(
      expect.objectContaining({
        _id: userData._id?.toString(),
        email: userData.email,
        username: userData.username,
        profilePicture: null,
      })
    );
  });

  test('get user by id', async () => {
    const response = await request(app).get(`${USER_URL}/${userData._id}`);
    expect(response.statusCode).toBe(StatusCodes.OK);

    const user = normalizeUser(response.body);

    expect(user).toMatchObject({
      _id: userData._id?.toString(),
      email: userData.email,
      username: userData.username,
      profilePicture: null,
    });
  });

  test('test getUserById with db error', async () => {
    jest.spyOn(User, 'findById').mockImplementationOnce(() => {
      throw new Error('DB failure');
    });

    const response = await request(app).get(`${USER_URL}/${userData._id}`);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('get user with non-existent id', async () => {
    const response = await request(app).get(`${USER_URL}/${new mongoose.Types.ObjectId()}`);
    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('update user by id', async () => {
    const newUsername = 'UpdatedUser';
    const response = await request(app)
      .put(`${USER_URL}/${userData._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .send({ username: newUsername });

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.username).toBe(newUsername);
  });

  test('update user with non existent id', async () => {
    const response = await request(app)
      .put(`${USER_URL}/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .send({ username: 'NoUser' });

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('test update user with fake token', async () => {
    const response = await request(app)
      .put(`${USER_URL}/${userData._id}`)
      .set('Authorization', `Bearer <fakeToken>`)
      .send({ username: 'Hacker' });
    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('update user profile picture', async () => {
    const filePath = path.join(__dirname, 'assets', 'profile.jpg');
    const response = await request(app)
      .put(`${USER_URL}/${userData._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .attach('profilePicture', filePath);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.profilePicture).toContain('uploads/profiles/');
  });

  test('update user with db error', async () => {
    jest.spyOn(User, 'findByIdAndUpdate').mockImplementationOnce(() => {
      throw new Error('DB failure');
    });

    const response = await request(app)
      .put(`${USER_URL}/${userData._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .send({ username: 'ShouldFail' });

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('update user by another user', async () => {
    const response = await request(app)
      .put(`${USER_URL}/${userData._id}`)
      .set('Authorization', `Bearer ${secondUser.token}`)
      .send({ username: 'Hacker' });

    expect(response.statusCode).toBe(StatusCodes.FORBIDDEN);
  });

  test('update user with duplicate email', async () => {
    const response = await request(app)
      .put(`${USER_URL}/${userData._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .send({ email: secondUser.email });

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('delete user with non-existent id', async () => {
    const response = await request(app)
      .delete(`${USER_URL}/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${userData.token}`);

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('delete user by another user', async () => {
    const response = await request(app)
      .delete(`${USER_URL}/${userData._id}`)
      .set('Authorization', `Bearer ${secondUser.token}`);

    expect(response.statusCode).toBe(StatusCodes.FORBIDDEN);
  });

  test('delete user without auth', async () => {
    const response = await request(app).delete(`${USER_URL}/${userData._id}`);

    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('delete user by id', async () => {
    const response = await request(app)
      .delete(`${USER_URL}/${userData._id}`)
      .set('Authorization', `Bearer ${userData.token}`);

    expect(response.statusCode).toBe(StatusCodes.OK);

    const getResponse = await request(app).get(`${USER_URL}/${userData._id}`);
    expect(getResponse.statusCode).toBe(StatusCodes.NOT_FOUND);
  });
});

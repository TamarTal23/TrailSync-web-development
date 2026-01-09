import request from 'supertest';
import { Express } from 'express';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import User from '../model/userModel';
import { initApp } from '..';
import { registerTestUser, userData, normalizeUser } from './testUtils';
import path from 'node:path';

let app: Express;
beforeAll(async () => {
  app = await initApp();
  await User.deleteMany({});
  await registerTestUser(app);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Users API tests', () => {
  test('update user without auth', async () => {
    const response = await request(app)
      .put('/user/' + userData._id)
      .send({
        username: 'Hacker',
      });
    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('get all users', async () => {
    const response = await request(app).get('/user');
    expect(response.statusCode).toBe(StatusCodes.OK);

    userData._id = response.body[0]._id;

    const normalizedResponse = response.body.map(normalizeUser);

    const testUserNormalized = {
      email: userData.email,
      username: userData.username,
      profilePicture: null, // default for new users without profilePicture
    };

    expect(normalizedResponse).toContainEqual(expect.objectContaining(testUserNormalized));
  });
});

test('get user with filter', async () => {
  const response = await request(app).get('/user').query({ username: userData.username });

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
  const response = await request(app).get('/user/' + userData._id);
  expect(response.statusCode).toBe(StatusCodes.OK);

  const user = normalizeUser(response.body);

  expect(user).toMatchObject({
    _id: userData._id?.toString(),
    email: userData.email,
    username: userData.username,
    profilePicture: null,
  });
});

test('update user by id', async () => {
  const newUsername = 'UpdatedUser';
  const response = await request(app)
    .put('/user/' + userData._id)
    .set('Authorization', `Bearer ${userData.token}`)
    .send({ username: newUsername });

  expect(response.statusCode).toBe(StatusCodes.OK);
  expect(response.body.username).toBe(newUsername);
});

test('update user with fake token', async () => {
  const response = await request(app)
    .put('/user/' + userData._id)
    .set('Authorization', `Bearer <fakeToken>`)
    .send({ username: 'Hacker' });
  expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
});

test('update user profile picture', async () => {
  const filePath = path.join(__dirname, 'assets', 'profile.jpg');
  const response = await request(app)
    .put('/user/' + userData._id)
    .set('Authorization', `Bearer ${userData.token}`)
    .attach('profilePicture', filePath);

  expect(response.statusCode).toBe(StatusCodes.OK);
  expect(response.body.profilePicture).toContain('uploads/profiles/');
});

test('delete user by id', async () => {
  const response = await request(app)
    .delete('/user/' + userData._id)
    .set('Authorization', `Bearer ${userData.token}`);

  expect(response.statusCode).toBe(StatusCodes.OK);

  const getResponse = await request(app).get('/user/' + userData._id);
  expect(getResponse.statusCode).toBe(StatusCodes.NOT_FOUND);
});

test('get non-existing user', async () => {
  const response = await request(app).get('/user/' + new mongoose.Types.ObjectId());
  expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
});

test('update non-existing user', async () => {
  const response = await request(app)
    .put('/user/' + new mongoose.Types.ObjectId())
    .set('Authorization', `Bearer ${userData.token}`)
    .send({ username: 'NoUser' });

  expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
});

test('delete non-existing user', async () => {
  const response = await request(app)
    .delete('/user/' + new mongoose.Types.ObjectId())
    .set('Authorization', `Bearer ${userData.token}`);

  expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
});

import request from 'supertest';
import { Express } from 'express';
import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

import Post from '../model/postModel';
import { initApp } from '..';
import {
  registerTestUser,
  userData,
  postsList,
  normalizePost,
  registerOtherTestUser,
  secondUser,
} from './testUtils';
import mongoose from 'mongoose';
import path from 'node:path';

let app: Express;

const POST_URL = '/post';

beforeAll(async () => {
  app = await initApp();
  await Post.deleteMany({});
  await registerTestUser(app);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Posts API tests', () => {
  test('post without auth', async () => {
    const response = await request(app).post(POST_URL).send(postsList[0]);
    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('get all posts empty db', async () => {
    const response = await request(app).get(POST_URL);
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body).toEqual([]);
  });

  test('create post with missing required fields', async () => {
    const response = await request(app)
      .post(POST_URL)
      .set('Authorization', `Bearer ${userData.token}`)
      .send({});

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('create posts', async () => {
    for (const post of postsList) {
      const { photos, ...postData } = post;

      const responsePromise = request(app)
        .post(POST_URL)
        .set('Authorization', 'Bearer ' + userData.token)
        .field('title', postData.title)
        .field('mapLink', postData.mapLink)
        .field('price', postData.price.toString())
        .field('numberOfDays', postData.numberOfDays.toString())
        .field('location[country]', postData.location.country)
        .field('description', postData.description);

      if (postData.location.city) {
        responsePromise.field('location[city]', postData.location.city);
      }

      photos.forEach((photo: string) => {
        const filePath = path.join(__dirname, 'assets', photo);

        responsePromise.attach('photos', filePath);
      });

      const response = await responsePromise;

      expect(response.statusCode).toBe(StatusCodes.CREATED);

      // Save the generated ID back to the postsList
      post._id = response.body._id;
      post.photos = post.photos.map((photo) => `uploads/posts/${response.body._id}-${photo}`);

      const normalized = normalizePost(response.body);
      expect(normalized).toMatchObject({
        title: post.title,
        mapLink: post.mapLink,
        price: post.price,
        numberOfDays: post.numberOfDays,
        location: post.location,
        description: post.description,
        photos: post.photos,
      });
    }
  });

  test('get all posts after create', async () => {
    const response = await request(app).get(POST_URL);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.length).toBe(postsList.length);

    const normalizedResponse = response.body.map(normalizePost);

    postsList.forEach((expectedPost) => {
      const expectedPostNormalized = {
        _id: expectedPost._id,
        title: expectedPost.title,
        mapLink: expectedPost.mapLink,
        price: expectedPost.price,
        numberOfDays: expectedPost.numberOfDays,
        location: expectedPost.location,
        description: expectedPost.description,
        photos: expectedPost.photos,
      };

      expect(normalizedResponse).toContainEqual(expectedPostNormalized);
    });
  });

  test('test get posts with db error', async () => {
    jest.spyOn(Post, 'find').mockImplementationOnce(() => {
      throw new Error('DB failure');
    });

    const response = await request(app).get(POST_URL);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('get posts with filter', async () => {
    const post = postsList[0];
    const response = await request(app)
      .get(POST_URL)
      .query({ 'location.country': post.location.country });
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].location.country).toBe(post.location.country);
    post._id = response.body[0]._id;
  });

  test('get post by id with existing id', async () => {
    const testedPost = postsList[0];

    const response = await request(app).get(`${POST_URL}/${testedPost._id}`);
    expect(response.statusCode).toBe(StatusCodes.OK);

    expect(response.body._id).toBe(testedPost._id.toString());
    expect(normalizePost(response.body)).toMatchObject({
      title: testedPost.title,
      mapLink: testedPost.mapLink,
      price: testedPost.price,
      numberOfDays: testedPost.numberOfDays,
      location: testedPost.location,
      description: testedPost.description,
      photos: testedPost.photos,
    });
  });

  test('test getPostById with fake id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(app).get(`${POST_URL}/${fakeId}`);
    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('test getPostById with db error', async () => {
    jest.spyOn(Post, 'findById').mockImplementationOnce(() => {
      throw new Error('DB failure');
    });

    const response = await request(app).get(`${POST_URL}/${postsList[0]._id}`);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('update post by id', async () => {
    const testedPost = postsList[1];

    const updatedData = {
      ...testedPost,
      title: 'Updated Post Title',
      price: 9999,
    };

    const response = await request(app)
      .put(`${POST_URL}/${testedPost._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .send(updatedData);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.title).toBe(updatedData.title);
    expect(response.body.price).toBe(updatedData.price);
  });

  test('update post with invalid fields', async () => {
    const testedPost = postsList[0];

    const response = await request(app)
      .put(`${POST_URL}/${testedPost._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .send({ price: 'invalid-price' });

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('update post with fake token', async () => {
    const response = await request(app)
      .put(`${POST_URL}/${postsList[0]._id}`)
      .set('Authorization', `Bearer <fakeToken>`)
      .send({ title: 'Hack Attempt' });

    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('update post with non-existing id', async () => {
    // generates a valid but non-existing ObjectId
    const nonExistingId = new mongoose.Types.ObjectId();

    const updatedData = {
      title: 'Non-existing Post Update',
      price: 100,
    };

    const response = await request(app)
      .put(`${POST_URL}/${nonExistingId}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .send(updatedData);

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('update post by non-owner', async () => {
    await registerOtherTestUser(app);

    const response = await request(app)
      .put(`${POST_URL}/${postsList[0]._id}`)
      .set('Authorization', `Bearer ${secondUser.token}`)
      .send({ title: 'Hack Attempt' });

    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('update post with invalid photosToDelete JSON', async () => {
    const response = await request(app)
      .put(`${POST_URL}/${postsList[0]._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .send({ photosToDelete: 'invalid-json' });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  test('delete post by id', async () => {
    const testedPost = postsList[2];

    const response = await request(app)
      .delete(`${POST_URL}/${testedPost._id}`)
      .set('Authorization', `Bearer ${userData.token}`);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body._id).toBe(testedPost._id);

    const getResponse = await request(app).get(`${POST_URL}/${testedPost._id}`);
    expect(getResponse.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('delete post with non-existing id', async () => {
    // valid but non-existing ID
    const nonExistingId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`${POST_URL}/${nonExistingId}`)
      .set('Authorization', `Bearer ${userData.token}`);

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('delete post by non-owner', async () => {
    await registerOtherTestUser(app);

    const response = await request(app)
      .delete(`${POST_URL}/${postsList[0]._id}`)
      .set('Authorization', `Bearer ${secondUser.token}`);

    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('delete post without auth', async () => {
    const response = await request(app).delete(`${POST_URL}/${postsList[0]._id}`);
    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });
});

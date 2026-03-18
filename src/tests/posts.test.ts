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
} from './utilities/testUtils';
import mongoose from 'mongoose';
import path from 'node:path';

let app: Express;

const POST_URL = '/post';

beforeAll(async () => {
  app = await initApp();
  await Post.deleteMany({});
  await registerTestUser(app);
  await registerOtherTestUser(app);
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
      post._id = response.body.id;
      post.photos = post.photos.map(
        (photo) => `http://127.0.0.1:5000/uploads/posts/${response.body.id}-${photo}`
      );

      const normalized = normalizePost(response.body);
      expect(normalized).toMatchObject({
        title: post.title,
        mapLink: post.mapLink,
        price: post.price,
        numberOfDays: post.numberOfDays,
        location: post.location,
        description: post.description,
        photos: post.photos,
        likes: [],
      });

      expect(Array.isArray(response.body.likes)).toBe(true);
      expect(response.body.likes).toEqual([]);
    }
  });

  test('get posts with pagination - first page', async () => {
    const batchSize = 3;
    const page = 1;

    const response = await request(app).get(POST_URL).query({ page, batchSize });

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('hasMore');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeLessThanOrEqual(batchSize);
    expect(response.body.hasMore).toBe(true);
  });

  test('get posts with pagination - last page', async () => {
    const batchSize = 3;
    const page = 2;

    const response = await request(app).get(POST_URL).query({ page, batchSize });

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('hasMore');
    expect(response.body.hasMore).toBe(false);
  });

  test('get posts with pagination - beyond last page returns empty', async () => {
    const batchSize = 10;
    const page = 100;

    const response = await request(app).get(POST_URL).query({ page, batchSize });

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.data).toEqual([]);
    expect(response.body.hasMore).toBe(false);
  });

  test('get posts with pagination and filter', async () => {
    const batchSize = 1;
    const page = 1;
    const country = postsList[0].location.country;

    const response = await request(app)
      .get(POST_URL)
      .query({ page, batchSize, 'location.country': country });

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.data.length).toBeLessThanOrEqual(batchSize);

    if (response.body.data.length > 0) {
      expect(response.body.data[0].location.country).toBe(country);
    }
  });

  test('get posts without pagination returns array directly', async () => {
    const response = await request(app).get(POST_URL);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).not.toHaveProperty('hasMore');
    expect(response.body[0]).toHaveProperty('likes');
    expect(Array.isArray(response.body[0].likes)).toBe(true);
  });

  test('get posts with only page parameter (no batchSize) returns all posts', async () => {
    const response = await request(app).get(POST_URL).query({ page: 1 });

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).not.toHaveProperty('hasMore');
  });

  test('get posts with only batchSize parameter (no page) returns all posts', async () => {
    const response = await request(app).get(POST_URL).query({ batchSize: 2 });

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).not.toHaveProperty('hasMore');
  });

  test('get all posts after create', async () => {
    const response = await request(app).get(POST_URL);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.length).toBe(postsList.length);

    const normalizedResponse = response.body.map(normalizePost);

    postsList.forEach((expectedPost) => {
      const expectedPostNormalized = {
        id: expectedPost._id,
        title: expectedPost.title,
        mapLink: expectedPost.mapLink,
        price: expectedPost.price,
        numberOfDays: expectedPost.numberOfDays,
        location: expectedPost.location,
        description: expectedPost.description,
        photos: expectedPost.photos,
        likes: [],
      };

      expect(normalizedResponse).toContainEqual(expect.objectContaining(expectedPostNormalized));
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
    post._id = response.body[0].id;
  });

  test('get post by id with existing id', async () => {
    const testedPost = postsList[0];

    const response = await request(app).get(`${POST_URL}/${testedPost._id}`);
    expect(response.statusCode).toBe(StatusCodes.OK);

    expect(response.body.id).toBe(testedPost._id.toString());
    expect(normalizePost(response.body)).toMatchObject({
      title: testedPost.title,
      mapLink: testedPost.mapLink,
      price: testedPost.price,
      numberOfDays: testedPost.numberOfDays,
      location: testedPost.location,
      description: testedPost.description,
      photos: testedPost.photos,
      likes: [],
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
    const response = await request(app)
      .put(`${POST_URL}/${postsList[0]._id}`)
      .set('Authorization', `Bearer ${secondUser.token}`)
      .send({ title: 'Hack Attempt' });

    expect(response.statusCode).toBe(StatusCodes.FORBIDDEN);
  });

  test('update post with valid photosToDelete', async () => {
    const testedPost = postsList[0];
    const photosToDelete = JSON.stringify([testedPost.photos[0]]);

    const response = await request(app)
      .put(`${POST_URL}/${testedPost._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .send({ photosToDelete });

    expect(response.statusCode).toBe(StatusCodes.OK);
  });

  test('update post with empty files array', async () => {
    const testedPost = postsList[1];

    const response = await request(app)
      .put(`${POST_URL}/${testedPost._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .field('title', 'No files uploaded');

    expect(response.statusCode).toBe(StatusCodes.OK);
  });

  test('update post with new photo', async () => {
    const testedPost = postsList[1];
    const filePath = path.join(__dirname, 'assets', 'profile.jpg');

    const response = await request(app)
      .put(`${POST_URL}/${testedPost._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .attach('photos', filePath);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.photos.length).toBeGreaterThan(0);
  });

  test('update post error with file cleanup', async () => {
    const filePath = path.join(__dirname, 'assets', 'profile.jpg');

    jest.spyOn(Post, 'findByIdAndUpdate').mockImplementationOnce(() => {
      throw new Error('Update failed');
    });

    const response = await request(app)
      .put(`${POST_URL}/${postsList[0]._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .attach('photos', filePath);

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('update post error without files', async () => {
    jest.spyOn(Post, 'findById').mockImplementationOnce(() => {
      throw new Error('DB error');
    });

    const response = await request(app)
      .put(`${POST_URL}/${postsList[0]._id}`)
      .set('Authorization', `Bearer ${userData.token}`)
      .send({ title: 'This will fail' });

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('delete post by id', async () => {
    const testedPost = postsList[2];

    const response = await request(app)
      .delete(`${POST_URL}/${testedPost._id}`)
      .set('Authorization', `Bearer ${userData.token}`);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.id).toBe(testedPost._id.toString());

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
    const response = await request(app)
      .delete(`${POST_URL}/${postsList[0]._id}`)
      .set('Authorization', `Bearer ${secondUser.token}`);

    expect(response.statusCode).toBe(StatusCodes.FORBIDDEN);
  });

  test('delete post without auth', async () => {
    const response = await request(app).delete(`${POST_URL}/${postsList[0]._id}`);
    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('delete post with database error', async () => {
    jest.spyOn(Post, 'findById').mockImplementationOnce(() => {
      throw new Error('DB error');
    });

    const response = await request(app)
      .delete(`${POST_URL}/${postsList[0]._id}`)
      .set('Authorization', `Bearer ${userData.token}`);

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('like post without auth', async () => {
    const response = await request(app).post(`${POST_URL}/${postsList[0]._id}/like`);

    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('like post adds user id to likes', async () => {
    const response = await request(app)
      .post(`${POST_URL}/${postsList[0]._id}/like`)
      .set('Authorization', `Bearer ${secondUser.token}`);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(Array.isArray(response.body.likes)).toBe(true);
    expect(response.body.likes).toContain(secondUser.id);
  });

  test('like post is idempotent for same user', async () => {
    const response = await request(app)
      .post(`${POST_URL}/${postsList[0]._id}/like`)
      .set('Authorization', `Bearer ${secondUser.token}`);

    expect(response.statusCode).toBe(StatusCodes.OK);

    const likesBySecondUser = response.body.likes.filter((userId: string) => userId === secondUser.id);
    expect(likesBySecondUser.length).toBe(1);
  });

  test('unlike post removes user id from likes', async () => {
    const response = await request(app)
      .delete(`${POST_URL}/${postsList[0]._id}/like`)
      .set('Authorization', `Bearer ${secondUser.token}`);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(Array.isArray(response.body.likes)).toBe(true);
    expect(response.body.likes).not.toContain(secondUser.id);
  });

  test('like post with non-existing id returns not found', async () => {
    const nonExistingId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .post(`${POST_URL}/${nonExistingId}/like`)
      .set('Authorization', `Bearer ${userData.token}`);

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('unlike post with non-existing id returns not found', async () => {
    const nonExistingId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`${POST_URL}/${nonExistingId}/like`)
      .set('Authorization', `Bearer ${userData.token}`);

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  // Post Search API Tests
  describe('Post Search API', () => {
    test('search with valid query returns 200 with post array', async () => {
      const searchQuery = { query: 'beach vacation' };

      const response = await request(app).post(`${POST_URL}/search`).send(searchQuery);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const post = response.body[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('sender');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('mapLink');
        expect(post).toHaveProperty('price');
        expect(post).toHaveProperty('numberOfDays');
        expect(post).toHaveProperty('location');
        expect(post.location).toHaveProperty('city');
        expect(post.location).toHaveProperty('country');
        expect(post).toHaveProperty('description');
        expect(post).toHaveProperty('photos');
        expect(Array.isArray(post.photos)).toBe(true);
        expect(post).toHaveProperty('likes');
        expect(Array.isArray(post.likes)).toBe(true);
      }
    });

    test('search with empty body returns 400 validation error', async () => {
      const response = await request(app).post(`${POST_URL}/search`).send({});

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Query is required and must be a string');
    });

    test('search with empty string query returns 400 validation error', async () => {
      const response = await request(app).post(`${POST_URL}/search`).send({ query: '   ' });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Query cannot be empty');
    });

    test('search with too long query returns 400 validation error', async () => {
      const longQuery = 'a'.repeat(501);
      const response = await request(app).post(`${POST_URL}/search`).send({ query: longQuery });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Query too long (max 500 characters)');
    });

    test('search endpoint accepts POST method only', async () => {
      const response = await request(app).get(`${POST_URL}/search`);

      expect([StatusCodes.NOT_FOUND, StatusCodes.INTERNAL_SERVER_ERROR]).toContain(
        response.statusCode
      );
    });

    test('search returns empty array if no matches found', async () => {
      const searchQuery = { query: 'query-that-will-match-nothing' };
      const response = await request(app).post(`${POST_URL}/search`).send(searchQuery);

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });
});

import request from 'supertest';
import { Express } from 'express';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

import Post from '../model/postModel';
import { initApp } from '..';
import { registerTestUser, userData, postsList, normalizePost } from './testUtils';
import mongoose from 'mongoose';
import path from 'node:path';

let app: Express;

beforeAll(async () => {
  app = await initApp();
  await Post.deleteMany({});
  await registerTestUser(app);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Posts API Auth', () => {
  test('post without auth', async () => {
    const response = await request(app).post('/post').send(postsList[0]);
    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('get all posts empty db', async () => {
    const response = await request(app).get('/post');
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body).toEqual([]);
  });

  test('create posts', async () => {
    for (const post of postsList) {
      const { photos, ...postData } = post;

      const responsePromise = request(app)
        .post('/post')
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

      post._id = response.body._id; // Save the generated ID back to the postsList
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
    const response = await request(app).get('/post');

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

  test('get posts with filter', async () => {
    const post = postsList[0];
    const response = await request(app)
      .get('/post')
      .query({ 'location.country': post.location.country });
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].location.country).toBe(post.location.country);
    post._id = response.body[0]._id;
  });

  test('get post by id', async () => {
    const testedPost = postsList[0];

    const response = await request(app).get('/post/' + testedPost._id);
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

  test('put post by id', async () => {
    const testedPost = postsList[1];

    const updatedData = {
      ...testedPost,
      title: 'Updated Post Title',
      price: 9999,
    };

    const response = await request(app)
      .put('/post/' + testedPost._id)
      .set('Authorization', `Bearer ${userData.token}`)
      .send(updatedData);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.title).toBe(updatedData.title);
    expect(response.body.price).toBe(updatedData.price);
  });

  test('delete post by id', async () => {
    const testedPost = postsList[2];

    const response = await request(app)
      .delete('/post/' + testedPost._id)
      .set('Authorization', `Bearer ${userData.token}`);

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body._id).toBe(testedPost._id);

    const getResponse = await request(app).get('/post/' + testedPost._id);
    expect(getResponse.statusCode).toBe(StatusCodes.NOT_FOUND);
  });
});

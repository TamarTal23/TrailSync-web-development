import request from 'supertest';
import Comments from '../model/commentModel';
import { Express } from 'express';
import {
  registerTestUser,
  userData,
  postsList,
  createCommentsData,
  CommentData,
  normalizeComment,
  registerOtherTestUser,
  secondUser,
} from './testUtils';
import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { initApp } from '..';
import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';

let app: Express;
let commentsData: Array<CommentData> = [];
let postIds: mongoose.Types.ObjectId[] = [];

const COMMENT_URL = '/comment';

beforeAll(async () => {
  app = await initApp();
  await Comments.deleteMany({});
  await registerTestUser(app);
  await registerOtherTestUser(app);

  const createdPosts = await Promise.all(
    postsList.map((post) =>
      request(app).post('/post').set('Authorization', `Bearer ${userData.token}`).send(post)
    )
  );

  postIds = createdPosts.map((res) => new mongoose.Types.ObjectId(res.body._id));
  commentsData = createCommentsData(postIds);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Comments API test', () => {
  test('post comment without auth', async () => {
    const response = await request(app).post(COMMENT_URL).send(commentsData[0]);
    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('test get all empty db', async () => {
    const response = await request(app).get(COMMENT_URL);
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body).toEqual([]);
  });

  test('get all comments without filters', async () => {
    const response = await request(app).get(COMMENT_URL);
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('create comment with missing required fields', async () => {
    const response = await request(app)
      .post(COMMENT_URL)
      .set('Authorization', `Bearer ${userData.token}`)
      .send({});

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('test post comments', async () => {
    for (const comment of commentsData) {
      const response = await request(app)
        .post(COMMENT_URL)
        .set('Authorization', 'Bearer ' + userData.token)
        .send(comment);

      expect(response.statusCode).toBe(StatusCodes.CREATED);
      expect(normalizeComment(response.body)).toEqual({
        _id: comment._id.toString(),
        post: comment.post.toString(),
        text: comment.text,
      });
    }
  });

  test('test get all comments after post', async () => {
    const response = await request(app).get(COMMENT_URL);
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.length).toBe(commentsData.length);

    const normalizedResponse = response.body.map(normalizeComment);

    commentsData.forEach((expectedComment) => {
      const expectedCommentNormalized = {
        _id: expectedComment._id.toString(),
        post: expectedComment.post.toString(),
        text: expectedComment.text,
      };

      expect(normalizedResponse).toContainEqual(expectedCommentNormalized);
    });
  });

  test('get comments for each postId', async () => {
    for (const postId of postIds) {
      const expected = commentsData.filter(
        (comments) => comments.post.toString() === postId.toString()
      );

      const res = await request(app).get(COMMENT_URL).query({ post: postId.toString() });

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(res.body).toHaveLength(expected.length);

      res.body.forEach((comment: CommentData) => {
        expect(comment.post).toBe(postId.toString());
      });
    }
  });

  test('test get comment by comment id', async () => {
    const testedComment = commentsData[3];

    const response = await request(app).get(`${COMMENT_URL}/${testedComment._id}`);
    expect(response.statusCode).toBe(StatusCodes.OK);

    expect(response.body._id).toBe(testedComment._id.toString());
    expect(normalizeComment(response.body)).toEqual({
      _id: testedComment._id.toString(),
      post: testedComment.post.toString(),
      text: testedComment.text,
    });
  });

  test('get comment with fake id', async () => {
    const response = await request(app).get(`${COMMENT_URL}/${new mongoose.Types.ObjectId()}`);
    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('test get comment by id with db error', async () => {
    jest.spyOn(Comments, 'findById').mockImplementationOnce(() => {
      throw new Error('DB failure');
    });

    const response = await request(app).get(`${COMMENT_URL}/${commentsData[0]._id}`);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('test get comments with db error', async () => {
    jest.spyOn(Comments, 'find').mockImplementationOnce(() => {
      throw new Error('DB failure');
    });

    const response = await request(app).get(COMMENT_URL);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('update comment by id', async () => {
    const testedComment = commentsData[4];

    testedComment.text = 'new comment text';
    const response = await request(app)
      .put(`${COMMENT_URL}/${testedComment._id}`)
      .set('Authorization', 'Bearer ' + userData.token)
      .send(testedComment);
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.text).toBe(testedComment.text);
  });

  test('update comment with fake token', async () => {
    const testedComment = commentsData[4];

    const response = await request(app)
      .put(`${COMMENT_URL}/${testedComment._id}`)
      .set('Authorization', `Bearer <fakeToken>`)
      .send({ text: 'Hack Attempt' });

    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('update comment with non-existing id', async () => {
    const nonExistingId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .put(`${COMMENT_URL}/${nonExistingId}`)
      .set('Authorization', 'Bearer ' + userData.token)
      .send({ text: 'Non-existing comment' });

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('update comment by non-owner', async () => {
    const testedComment = commentsData[0];

    const res = await request(app)
      .put(`${COMMENT_URL}/${testedComment._id}`)
      .set('Authorization', 'Bearer ' + secondUser.token)
      .send({ text: 'hacked' });

    expect(res.statusCode).toBe(StatusCodes.FORBIDDEN);
  });

  test('test delete comment by id', async () => {
    const testedComment = commentsData[4];

    const response = await request(app)
      .delete(`${COMMENT_URL}/${testedComment._id}`)
      .set('Authorization', 'Bearer ' + userData.token);
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(normalizeComment(response.body)).toEqual({
      _id: testedComment._id.toString(),
      post: testedComment.post.toString(),
      text: testedComment.text,
    });

    const getResponse = await request(app).get(`${COMMENT_URL}/${testedComment._id}`);
    expect(getResponse.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('delete comment with non-existing id', async () => {
    const nonExistingId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`${COMMENT_URL}/${nonExistingId}`)
      .set('Authorization', 'Bearer ' + userData.token);

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('test delete comment with db error', async () => {
    jest.spyOn(Comments, 'findByIdAndDelete').mockImplementationOnce(() => {
      throw new Error('DB failure');
    });

    const response = await request(app)
      .delete(`${COMMENT_URL}/${commentsData[0]._id}`)
      .set('Authorization', 'Bearer ' + userData.token);

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test('delete comment without auth', async () => {
    const res = await request(app).delete(`${COMMENT_URL}/${commentsData[0]._id}`);

    expect(res.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('test delete comment by non-owner', async () => {
    const res = await request(app)
      .delete(`${COMMENT_URL}/${commentsData[0]._id}`)
      .set('Authorization', `Bearer ${secondUser.token}`);

    expect(res.statusCode).toBe(StatusCodes.FORBIDDEN);
  });
});

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
} from './testUtils';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { initApp } from '..';
import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';

let app: Express;
let commentsData: Array<CommentData> = [];
let postIds: mongoose.Types.ObjectId[] = [];

beforeAll(async () => {
  app = await initApp();
  await Comments.deleteMany({});
  await registerTestUser(app);
  const createdPosts = await Promise.all(
    postsList.map((post) =>
      request(app).post('/post').set('Authorization', `Bearer ${userData.token}`).send(post)
    )
  );

  postIds = createdPosts.map((res) => new mongoose.Types.ObjectId(res.body._id));
  commentsData = createCommentsData(postIds);
});

afterAll((done) => {
  done();
});

describe('Comments API test', () => {
  test('post comment without auth', async () => {
    const response = await request(app).post('/comment').send(commentsData[0]);
    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('test get all empty db', async () => {
    const response = await request(app).get('/comment');
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body).toEqual([]);
  });

  test('test post comments', async () => {
    for (const comment of commentsData) {
      const response = await request(app)
        .post('/comment')
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

  test('test get comments after post', async () => {
    const response = await request(app).get('/comment');
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

      const res = await request(app).get('/comment').query({ post: postId.toString() });

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(res.body).toHaveLength(expected.length);

      res.body.forEach((comment: CommentData) => {
        expect(comment.post).toBe(postId.toString());
      });
    }
  });

  test('test get comment by comment id', async () => {
    const testedComment = commentsData[3];

    const response = await request(app).get('/comment/' + testedComment._id);
    expect(response.statusCode).toBe(StatusCodes.OK);

    expect(response.body._id).toBe(testedComment._id.toString());
    expect(normalizeComment(response.body)).toEqual({
      _id: testedComment._id.toString(),
      post: testedComment.post.toString(),
      text: testedComment.text,
    });
  });

  test('test update comment by id', async () => {
    const testedComment = commentsData[4];

    testedComment.text = 'new comment text';
    const response = await request(app)
      .put('/comment/' + testedComment._id)
      .set('Authorization', 'Bearer ' + userData.token)
      .send(testedComment);
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.body.text).toBe(testedComment.text);
  });

  test('update comment with fake token', async () => {
    const testedComment = commentsData[4];

    const response = await request(app)
      .put('/comment/' + testedComment._id)
      .set('Authorization', `Bearer <fakeToken>`)
      .send({ title: 'Hack Attempt' });

    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  test('test delete comment by id', async () => {
    const testedComment = commentsData[4];

    const response = await request(app)
      .delete('/comment/' + testedComment._id)
      .set('Authorization', 'Bearer ' + userData.token);
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(normalizeComment(response.body)).toEqual({
      _id: testedComment._id.toString(),
      post: testedComment.post.toString(),
      text: testedComment.text,
    });

    const getResponse = await request(app).get('/comment/' + testedComment._id);
    expect(getResponse.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('get non-existing comment', async () => {
    const response = await request(app).get('/comment/' + new mongoose.Types.ObjectId());
    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('update non-existing comment', async () => {
    const response = await request(app)
      .put('/comment/' + new mongoose.Types.ObjectId())
      .set('Authorization', 'Bearer ' + userData.token)
      .send({ text: 'texttt' });

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  test('delete non-existing post', async () => {
    const response = await request(app)
      .delete('/comment/' + new mongoose.Types.ObjectId())
      .set('Authorization', 'Bearer ' + userData.token);

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });
});

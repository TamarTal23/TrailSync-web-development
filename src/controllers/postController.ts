import Post from '../model/postModel';
import { Request, Response } from 'express';
import BaseController from './baseController';
import { AuthRequest } from '../middlewares/authMiddleware';
import { StatusCodes } from 'http-status-codes';
import { uniq } from 'lodash';
import { Express } from 'express';
import {
  deleteFiles,
  NEW_IMAGE_PLACEHOLDER,
  normalizeFilePath,
  renamePostFiles,
} from '../utilities/photoUpload';
import { handleCreateRes } from '../utilities/general';

class PostController extends BaseController {
  constructor() {
    super(Post);
  }

  createPost = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    const uploadedFiles: string[] =
      req.files && Array.isArray(req.files)
        ? req.files.map((file: Express.Multer.File) => normalizeFilePath(file.path))
        : [];

    try {
      const posts = await Post.create({
        ...req.body,
        sender: userId,
        photos: uploadedFiles,
      });

      const post = handleCreateRes(posts);

      const renamedPaths = renamePostFiles(
        uploadedFiles,
        post._id.toString(),
        NEW_IMAGE_PLACEHOLDER
      );

      post.photos = renamedPaths;
      await post.save();

      res.status(StatusCodes.CREATED).json(post);
    } catch (error) {
      deleteFiles(uploadedFiles);

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  };

  getAllPosts = async (req: Request, res: Response) => super.get(req, res);

  getPostById = async (req: Request, res: Response) => super.getById(req, res);

  updatePost = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const postId = req.params.id;

    try {
      const post = await Post.findById(postId);

      if (!post) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Post not found' });
      }

      if (post.sender.toString() !== userId) {
        return res.status(StatusCodes.FORBIDDEN).json({ error: 'Forbidden' });
      }

      let currentPhotos = [...post.photos];

      if (req.body.photosToDelete) {
        try {
          const photosToDelete: string[] = JSON.parse(req.body.photosToDelete);
          deleteFiles(photosToDelete);
          currentPhotos = currentPhotos.filter((photo) => !photosToDelete.includes(photo));
        } catch (error) {
          console.error('Error parsing photosToDelete:', error);

          return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ error: 'Invalid photosToDelete format' });
        }
      }

      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const newPhotoPaths = req.files.map((file: Express.Multer.File) =>
          normalizeFilePath(file.path)
        );

        currentPhotos = uniq([...currentPhotos, ...newPhotoPaths]);
      }

      const updatedPost = await this.model.findByIdAndUpdate(
        postId,
        { ...req.body, photos: currentPhotos },
        { new: true }
      );

      res.json(updatedPost);
    } catch (error) {
      if (req.files && Array.isArray(req.files)) {
        const uploadedPaths = req.files.map((file: Express.Multer.File) => file.path);
        deleteFiles(uploadedPaths);
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  };

  deletePost = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const postId = req.params.id;

    try {
      const post = await Post.findById(postId);

      if (!post) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Post not found' });
      }

      if (post.sender.toString() !== userId) {
        return res.status(StatusCodes.FORBIDDEN).json({ error: 'Forbidden' });
      }

      deleteFiles(post.photos);

      return super.delete(req, res);
    } catch (error) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  };
}

export default new PostController();

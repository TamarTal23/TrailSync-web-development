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
import { handleCreateRes, buildFilterQuery } from '../utilities/general';
import PostSearchService from '../services/PostSearchService';

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

  getAllPosts = async (req: Request, res: Response) => {
    const { page, batchSize, ...filterParams } = req.query;

    try {
      const filter = buildFilterQuery(filterParams);

      let query = this.model
        .find(filter)
        .populate({
          path: 'sender',
          select: 'username email profilePicture',
        })
        .populate({
          path: 'comments',
        })
        .sort({ updatedAt: -1 });

      if (batchSize && page) {
        const pageNum = parseInt(page as string) - 1;
        const currBatchSize = parseInt(batchSize as string);

        const skip = pageNum * currBatchSize;
        query = query.skip(skip).limit(currBatchSize);

        const data = await query;
        const total = await this.model.countDocuments(filter);

        return res.json({
          data,
          hasMore: (pageNum + 1) * currBatchSize < total,
        });
      }

      const data = await query;
      res.json(data);
    } catch (error) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  };

  async search(req: Request, res: Response): Promise<void> {
    try {
      if (!req.body.query || typeof req.body.query !== 'string') {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: 'Query is required and must be a string' });
        return;
      }

      const query = req.body.query.trim();
      if (query.length === 0) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: 'Query cannot be empty' });
        return;
      }

      if (query.length > 500) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: 'Query too long (max 500 characters)' });
        return;
      }

      const matchingPosts = await PostSearchService.search({
        query,
      });

      res.status(StatusCodes.OK).json(matchingPosts);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Search error:', error);

        if (error.name === 'ValidationError') {
          res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
          return;
        }

        if (error.name === 'LLMServiceError') {
          res
            .status(StatusCodes.SERVICE_UNAVAILABLE)
            .json({ error: 'Search service temporarily unavailable' });
          return;
        }
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
  }

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
          const rawPhotosToDelete = req.body.photosToDelete;

          const photosToDelete: string[] =
            typeof rawPhotosToDelete === 'string'
              ? [rawPhotosToDelete]
              : Array.isArray(rawPhotosToDelete)
                ? rawPhotosToDelete
                : [];

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
        const newPhotoPaths = renamePostFiles(
          req.files.map((file: Express.Multer.File) => file.path),
          postId,
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

  likePost = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const postId = req.params.id;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }

    try {
      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $addToSet: { likes: userId } },
        { new: true }
      );

      if (!updatedPost) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Post not found' });
      }

      return res.status(StatusCodes.OK).json(updatedPost);
    } catch (error) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  };

  unlikePost = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const postId = req.params.id;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }

    try {
      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $pull: { likes: userId } },
        { new: true }
      );

      if (!updatedPost) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Post not found' });
      }

      return res.status(StatusCodes.OK).json(updatedPost);
    } catch (error) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: (error as Error)?.message ?? 'An unknown error occurred' });
    }
  };
}

export default new PostController();

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Express } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';

const defaultMaxFileSize = 5 * 1024 * 1024; // 5 MB

export const NEW_IMAGE_PLACEHOLDER = 'new';

const uploadDirs = ['uploads/profiles', 'uploads/posts'];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const profileStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, 'uploads/profiles/');
  },
  filename: (req: AuthRequest, file, callback) => {
    callback(null, `${req.userId}-${file.originalname}`);
  },
});

const postStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, 'uploads/posts/');
  },
  filename: (req: Request, file, callback) => {
    // For new posts use 'new' as placeholder and rename after post creation
    const postId = req.params.id || NEW_IMAGE_PLACEHOLDER;

    callback(null, `${postId}-${file.originalname}`);
  },
});

const validateImageType = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return callback(null, true);
  } else {
    callback(new Error('File type not allowed'));
  }
};

const createMulterUpload = (storage: multer.StorageEngine) =>
  multer({
    storage,
    fileFilter: validateImageType,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || defaultMaxFileSize.toString()) },
  });

export const uploadProfile = createMulterUpload(profileStorage);

export const uploadPostPhotos = createMulterUpload(postStorage);

export const deleteFile = (filePath: string): void => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export const deleteFiles = (filePaths: string[]): void => {
  filePaths.forEach((filePath) => deleteFile(filePath));
};

export const normalizeFilePath = (filePath: string) => filePath.replace(/\\/g, '/');

export const renamePostFiles = (
  oldPaths: string[],
  createdId: string,
  placeholder: string
): string[] => {
  return oldPaths.map((oldPath) => {
    const filename = path.basename(oldPath);
    const newFilename = filename.replace(placeholder, createdId);
    const newPath = path.join(path.dirname(oldPath), newFilename);

    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }

    return normalizeFilePath(newPath);
  });
};

import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import {
  deleteFile,
  deleteFiles,
  NEW_IMAGE_PLACEHOLDER,
  normalizeFilePath,
  renamePostFiles,
  renameProfileFile,
} from '../../utilities/photoUpload';

describe('fileUpload utilities', () => {
  const testDir = path.join(__dirname, 'temp');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('deleteFile', () => {
    test('should delete a file that exists', () => {
      const filePath = path.join(testDir, 'test-delete.txt');
      fs.writeFileSync(filePath, 'test');

      deleteFile(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    test('should not throw if file does not exist', () => {
      expect(() => deleteFile('/nonexistent/path/file.jpg')).not.toThrow();
    });
  });

  describe('deleteFiles', () => {
    test('should delete multiple files', () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');
      fs.writeFileSync(file1, 'a');
      fs.writeFileSync(file2, 'b');

      deleteFiles([file1, file2]);

      expect(fs.existsSync(file1)).toBe(false);
      expect(fs.existsSync(file2)).toBe(false);
    });

    test('should handle empty array without throwing', () => {
      expect(() => deleteFiles([])).not.toThrow();
    });

    test('should not throw if some files do not exist', () => {
      expect(() => deleteFiles(['/fake/path/a.jpg', '/fake/path/b.jpg'])).not.toThrow();
    });
  });

  describe('normalizeFilePath', () => {
    test('should replace backslashes with forward slashes', () => {
      const result = normalizeFilePath('uploads\\posts\\image.jpg');
      expect(result).toBe('uploads/posts/image.jpg');
    });

    test('should leave forward slashes unchanged', () => {
      const result = normalizeFilePath('uploads/posts/image.jpg');
      expect(result).toBe('uploads/posts/image.jpg');
    });
  });

  describe('renamePostFiles', () => {
    test('should rename file and return new URL', () => {
      const filePath = path.join(testDir, `${NEW_IMAGE_PLACEHOLDER}-photo.jpg`);
      fs.writeFileSync(filePath, 'image');

      const result = renamePostFiles([filePath], 'post123', NEW_IMAGE_PLACEHOLDER);

      expect(result[0]).toContain('post123-photo.jpg');
    });

    test('should return new path even if file does not exist', () => {
      const result = renamePostFiles(
        [path.join(testDir, `${NEW_IMAGE_PLACEHOLDER}-missing.jpg`)],
        'post123',
        NEW_IMAGE_PLACEHOLDER
      );
      expect(result[0]).toContain('post123-missing.jpg');
    });

    test('should handle empty array', () => {
      const result = renamePostFiles([], 'post123', NEW_IMAGE_PLACEHOLDER);
      expect(result).toEqual([]);
    });
  });

  describe('renameProfileFile', () => {
    test('should rename profile file with userId', () => {
      const filePath = path.join(testDir, `${NEW_IMAGE_PLACEHOLDER}-avatar.jpg`);
      fs.writeFileSync(filePath, 'image');

      const result = renameProfileFile(filePath, 'user123');

      expect(result).toContain('user123-avatar.jpg');
    });

    test('should use NEW_IMAGE_PLACEHOLDER as default placeholder', () => {
      const filePath = path.join(testDir, `${NEW_IMAGE_PLACEHOLDER}-pic.jpg`);
      fs.writeFileSync(filePath, 'image');

      const result = renameProfileFile(filePath, 'user456');

      expect(result).toContain('user456-pic.jpg');
    });

    test('should return new path even if file does not exist', () => {
      const result = renameProfileFile(
        path.join(testDir, `${NEW_IMAGE_PLACEHOLDER}-ghost.jpg`),
        'user789'
      );
      expect(result).toContain('user789-ghost.jpg');
    });
  });
});

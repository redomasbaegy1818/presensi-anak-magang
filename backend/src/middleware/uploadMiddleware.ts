import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../utils/appError.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
  },
});

function detectImageMimeByMagicBytes(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

export function uploadSingleFaceImage(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single('image')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(
          AppError.badRequest(
            'Ukuran gambar terlalu besar. Maksimal 5 MB.',
            'IMAGE_TOO_LARGE',
          ),
        );
        return;
      }
      next(
        AppError.badRequest(
          'Unggahan gambar tidak valid.',
          'INVALID_UPLOAD',
        ),
      );
      return;
    }

    if (err) {
      next(err);
      return;
    }

    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      next(
        AppError.badRequest(
          'Gambar wajah wajib dikirimkan.',
          'IMAGE_REQUIRED',
        ),
      );
      return;
    }

    const detectedMime = detectImageMimeByMagicBytes(req.file.buffer);
    if (!detectedMime) {
      next(
        AppError.badRequest(
          'Format gambar tidak didukung. Gunakan gambar JPEG, PNG, atau WebP.',
          'UNSUPPORTED_IMAGE_FORMAT',
        ),
      );
      return;
    }

    req.file.mimetype = detectedMime;
    next();
  });
}

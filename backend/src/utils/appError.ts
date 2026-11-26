export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;
  readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(
    message: string,
    code = 'BAD_REQUEST',
    details?: Record<string, string[]>,
  ) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = 'Silakan masuk terlebih dahulu.') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Anda tidak memiliki izin untuk mengakses fitur ini.') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Data atau endpoint tidak ditemukan.') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(
    message: string,
    code = 'CONFLICT',
    details?: Record<string, string[]>,
  ) {
    return new AppError(409, code, message, details);
  }

  static tooManyRequests(
    message = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat lagi.',
  ) {
    return new AppError(429, 'RATE_LIMIT_EXCEEDED', message);
  }
}

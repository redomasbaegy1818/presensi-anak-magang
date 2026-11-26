import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Forwards rejections from async Express route handlers to the centralized error middleware.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

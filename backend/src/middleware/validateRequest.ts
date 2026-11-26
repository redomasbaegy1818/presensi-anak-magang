import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/appError.js';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates request body, query, and route params against Zod schemas,
 * replacing them with parsed values and throwing a structured 400 AppError on failure.
 */
export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const fieldErrors: Record<string, string[]> = {};

    const collectErrors = (flattened: {
      formErrors: string[];
      fieldErrors: Record<string, string[] | undefined>;
    }) => {
      for (const [key, messages] of Object.entries(flattened.fieldErrors)) {
        if (messages && messages.length > 0) {
          fieldErrors[key] = [...(fieldErrors[key] ?? []), ...messages];
        }
      }
      if (flattened.formErrors.length > 0) {
        fieldErrors._root = [
          ...(fieldErrors._root ?? []),
          ...flattened.formErrors,
        ];
      }
    };

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        collectErrors(result.error.flatten());
      } else {
        req.params = result.data as Request['params'];
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        collectErrors(result.error.flatten());
      } else {
        req.query = result.data as Request['query'];
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        collectErrors(result.error.flatten());
      } else {
        req.body = result.data;
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      next(
        AppError.badRequest(
          'Data permintaan tidak valid. Periksa kembali isian Anda.',
          'VALIDATION_ERROR',
          fieldErrors,
        ),
      );
      return;
    }

    next();
  };
}

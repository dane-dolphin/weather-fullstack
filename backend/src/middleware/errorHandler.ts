import type { MiddlewareObj } from '@middy/core';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/observability.js';
import { config } from '../lib/config.js';

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': config.CORS_ALLOW_ORIGIN,
};

export function errorHandler(): MiddlewareObj {
  return {
    onError: (request) => {
      const err: unknown = request.error;
      if (err instanceof AppError) {
        logger.warn('app_error', { code: err.code, status: err.status });
        request.response = {
          statusCode: err.status,
          headers: baseHeaders,
          body: JSON.stringify({ code: err.code, message: err.message }),
        };
        return;
      }
      const errObj = err instanceof Error ? err : null;
      logger.error('unhandled_error', {
        err: { message: errObj?.message, stack: errObj?.stack },
      });
      request.response = {
        statusCode: 500,
        headers: baseHeaders,
        body: JSON.stringify({ code: 'internal_error', message: 'Internal server error' }),
      };
    },
  };
}

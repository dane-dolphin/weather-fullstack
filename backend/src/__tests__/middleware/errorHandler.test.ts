import { describe, test, expect, jest, beforeAll, afterEach } from '@jest/globals';
import middy from '@middy/core';
import type { Context } from 'aws-lambda';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  UpstreamError,
} from '../../lib/errors.js';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.unstable_mockModule('../../lib/observability.js', () => ({
  logger: mockLogger,
  tracer: {},
  metrics: {},
}));

let errorHandlerFn: typeof import('../../middleware/errorHandler.js')['errorHandler'];

beforeAll(async () => {
  ({ errorHandler: errorHandlerFn } = await import('../../middleware/errorHandler.js'));
});

afterEach(() => {
  jest.clearAllMocks();
});

type HandlerResult = { statusCode: number; body: string; headers?: Record<string, string> };

const mockContext = {} as Context;

function buildHandler(throwFn: () => void) {
  return middy<unknown, HandlerResult>(async () => {
    throwFn();
    return { statusCode: 200, body: '' };
  }).use(errorHandlerFn());
}

describe('errorHandler middleware', () => {
  test('AppError → correct statusCode and body', async () => {
    const handler = buildHandler(() => {
      throw new NotFoundError('resource missing');
    });
    const response = await handler({}, mockContext);
    expect(response).toMatchObject({
      statusCode: 404,
      body: JSON.stringify({ code: 'not_found', message: 'resource missing' }),
    });
  });

  test('ValidationError → 400', async () => {
    const handler = buildHandler(() => {
      throw new ValidationError('bad input');
    });
    const response = await handler({}, mockContext);
    expect(response).toMatchObject({ statusCode: 400 });
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe('invalid_query');
  });

  test('UnauthorizedError → 401', async () => {
    const handler = buildHandler(() => {
      throw new UnauthorizedError();
    });
    const response = await handler({}, mockContext);
    expect(response).toMatchObject({ statusCode: 401 });
  });

  test('UpstreamError → correct code and status', async () => {
    const handler = buildHandler(() => {
      throw new UpstreamError('nws_error', 502, 'upstream down');
    });
    const response = await handler({}, mockContext);
    expect(response).toMatchObject({ statusCode: 502 });
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe('nws_error');
  });

  test('AppError → warn logged, not error', async () => {
    const handler = buildHandler(() => {
      throw new NotFoundError();
    });
    await handler({}, mockContext);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'app_error',
      expect.objectContaining({ code: 'not_found', status: 404 }),
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  test('unknown error → 500 with generic body', async () => {
    const handler = buildHandler(() => {
      throw new Error('something internal');
    });
    const response = await handler({}, mockContext);
    expect(response).toMatchObject({ statusCode: 500 });
    const body = JSON.parse(response.body) as { code: string; message: string };
    expect(body.code).toBe('internal_error');
    expect(body.message).toBe('Internal server error');
  });

  test('unknown error → stack not leaked in response body', async () => {
    const handler = buildHandler(() => {
      throw new Error('internal details here');
    });
    const response = await handler({}, mockContext);
    expect(response.body).not.toContain('internal details here');
  });

  test('unknown error → logged via logger.error', async () => {
    const handler = buildHandler(() => {
      throw new Error('boom');
    });
    await handler({}, mockContext);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'unhandled_error',
      expect.objectContaining({ err: expect.objectContaining({ message: 'boom' }) }),
    );
  });

  test('response has Content-Type header', async () => {
    const handler = buildHandler(() => {
      throw new AppError('x', 418, 'teapot');
    });
    const response = await handler({}, mockContext);
    expect(response.headers?.['Content-Type']).toBe('application/json');
  });
});

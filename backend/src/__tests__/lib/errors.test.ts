import { describe, test, expect } from '@jest/globals';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  UpstreamError,
  ConfigError,
} from '../../lib/errors.js';

describe('error hierarchy', () => {
  test('AppError has correct fields', () => {
    const err = new AppError('test_code', 418, 'test message');
    expect(err.code).toBe('test_code');
    expect(err.status).toBe(418);
    expect(err.message).toBe('test message');
    expect(err instanceof Error).toBe(true);
    expect(err instanceof AppError).toBe(true);
  });

  test('NotFoundError', () => {
    const err = new NotFoundError();
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof NotFoundError).toBe(true);
    expect(err.code).toBe('not_found');
    expect(err.status).toBe(404);
  });

  test('NotFoundError with custom message', () => {
    const err = new NotFoundError('custom');
    expect(err.message).toBe('custom');
  });

  test('UnauthorizedError', () => {
    const err = new UnauthorizedError();
    expect(err instanceof AppError).toBe(true);
    expect(err.code).toBe('unauthorized');
    expect(err.status).toBe(401);
  });

  test('ValidationError', () => {
    const err = new ValidationError('bad input');
    expect(err instanceof AppError).toBe(true);
    expect(err.code).toBe('invalid_query');
    expect(err.status).toBe(400);
    expect(err.message).toBe('bad input');
  });

  test('UpstreamError', () => {
    const err = new UpstreamError('nws_error', 502, 'upstream failed');
    expect(err instanceof AppError).toBe(true);
    expect(err.code).toBe('nws_error');
    expect(err.status).toBe(502);
  });

  test('ConfigError', () => {
    const err = new ConfigError('bad config');
    expect(err instanceof AppError).toBe(true);
    expect(err.code).toBe('config_error');
    expect(err.status).toBe(500);
  });

  test('instanceof chain works for all subclasses', () => {
    const errors: AppError[] = [
      new NotFoundError(),
      new UnauthorizedError(),
      new ValidationError('x'),
      new UpstreamError('u', 502, 'y'),
      new ConfigError('z'),
    ];
    for (const err of errors) {
      expect(err instanceof Error).toBe(true);
      expect(err instanceof AppError).toBe(true);
    }
  });
});

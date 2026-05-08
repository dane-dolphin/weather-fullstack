export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    msg: string,
  ) {
    super(msg);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(msg = 'Not found') {
    super('not_found', 404, msg);
  }
}

export class UnauthorizedError extends AppError {
  constructor(msg = 'Unauthorized') {
    super('unauthorized', 401, msg);
  }
}

export class ValidationError extends AppError {
  constructor(msg: string) {
    super('invalid_query', 400, msg);
  }
}

export class UpstreamError extends AppError {
  constructor(code: string, status: number, msg: string) {
    super(code, status, msg);
  }
}

export class ConfigError extends AppError {
  constructor(msg: string) {
    super('config_error', 500, msg);
  }
}

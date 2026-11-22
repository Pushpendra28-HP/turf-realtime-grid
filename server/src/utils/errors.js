import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(code, message, status = 400, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

// One place that turns any thrown value into a safe, client-facing shape.
// Used by both the HTTP error middleware and the socket acknowledgements.
export function toClientError(err) {
  if (err instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: err.issues[0]?.message ?? 'Invalid input',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    };
  }
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, ...err.extra };
  }
  if (err?.type === 'entity.parse.failed') {
    return { status: 400, code: 'INVALID_JSON', message: 'Request body is not valid JSON' };
  }
  if (err?.type === 'entity.too.large') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' };
  }
  return { status: 500, code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' };
}

import { toClientError } from '../utils/errors.js';

export function notFound(_req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const { status, ...body } = toClientError(err);
  if (status >= 500) console.error('[http]', err);
  res.status(status).json({ error: body });
}

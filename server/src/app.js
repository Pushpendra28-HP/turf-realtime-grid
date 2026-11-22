import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // behind a proxy (Render, Railway, Nginx...) req.ip must come from X-Forwarded-For for rate limiting
  if (config.isProd) app.set('trust proxy', 1);

  // CSP is left off so the bundled client can load its web fonts and open the websocket
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.clientOrigins }));
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', routes);
  app.use('/api', notFound);

  // single-command deployment: if the client was built, serve it from here too
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

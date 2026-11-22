import http from 'node:http';
import { config } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { seedGrid } from './services/gridService.js';
import { createApp } from './app.js';
import { createSocketServer } from './sockets/index.js';

async function main() {
  await connectDb();
  await seedGrid();

  const server = http.createServer(createApp());
  const io = createSocketServer(server);

  server.listen(config.port, () => {
    console.log(`[server] listening on http://localhost:${config.port} (${config.env})`);
    console.log(`[server] grid ${config.cols}x${config.rows}, cooldown ${config.cooldownMs}ms, lock ${config.lockMs}ms`);
  });

  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    console.log(`[server] ${signal} received, shutting down`);
    const force = setTimeout(() => process.exit(1), 8000);
    force.unref();
    io.close();
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => console.error('[server] unhandled rejection:', reason));

main().catch((err) => {
  console.error('[fatal]', err.message);
  process.exit(1);
});

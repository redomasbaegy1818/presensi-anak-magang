import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(
    `Backend berjalan pada http://${env.HOST}:${env.PORT} (${env.NODE_ENV})`,
  );
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Menerima sinyal ${signal}, menutup server backend...`);

  const forceExitTimer = setTimeout(() => {
    console.error('Shutdown melebihi batas waktu, menghentikan proses paksa.');
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined);
    clearTimeout(forceExitTimer);
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { validateEnv } from './common/env.validation.js';
validateEnv();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';

async function bootstrapWorker() {
  const logger = new Logger('ThreatSyncWorker');
  logger.log('Initializing ThreatSync OS BullMQ Standalone Worker Process...');

  // Ensure worker does NOT disable its own queue processing
  delete process.env.DISABLE_QUEUE_WORKER;

  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  logger.log('ThreatSync OS Background Worker is active and listening for telemetry/escalation queue jobs.');

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Shutting down worker gracefully...`);
    try {
      await app.close();
      logger.log('Worker context cleanly terminated.');
      process.exit(0);
    } catch (err) {
      logger.error(`Error during worker shutdown: ${err}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrapWorker().catch((err) => {
  console.error('Fatal error starting ThreatSync Worker:', err);
  process.exit(1);
});

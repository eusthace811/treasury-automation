import { Client } from '@upstash/qstash';

export const QUEUE_NAME = 'treasury-queue';

if (!process.env.QSTASH_TOKEN) {
  throw new Error('QSTASH_TOKEN environment variable is required');
}

export const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN,
});

export const qstashQueue = qstashClient.queue({
  queueName: QUEUE_NAME,
});

// Re-export types for convenience
export type { Schedule, Message } from '@upstash/qstash';

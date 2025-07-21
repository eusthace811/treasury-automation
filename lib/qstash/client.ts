import { Client } from '@upstash/qstash';

if (!process.env.QSTASH_TOKEN) {
  throw new Error('QSTASH_TOKEN environment variable is required');
}

export const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN,
});

// Re-export types for convenience
export type { Schedule, Message } from '@upstash/qstash';
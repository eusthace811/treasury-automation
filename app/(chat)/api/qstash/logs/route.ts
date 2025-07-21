import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { qstashClient, QUEUE_NAME } from '@/lib/qstash/client';
import { auth } from '@/app/(auth)/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all logs from QStash using pagination
    const logs = [];
    let cursor = null;

    while (true) {
      const res = await qstashClient.logs({
        cursor: cursor ?? undefined,
        filter: { queueName: QUEUE_NAME },
      });
      logs.push(...res.logs);
      cursor = res.cursor;
      if (!cursor) {
        break;
      }
    }

    return NextResponse.json({
      logs: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);

    // Handle specific QStash errors
    if (error instanceof Error) {
      if (
        error.message.includes('unauthorized') ||
        error.message.includes('401')
      ) {
        return NextResponse.json(
          {
            error:
              'QStash authentication failed. Please check your QSTASH_TOKEN.',
          },
          { status: 401 },
        );
      }

      if (error.message.includes('QSTASH_TOKEN')) {
        return NextResponse.json(
          {
            error:
              'QStash is not configured. Please set the QSTASH_TOKEN environment variable.',
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

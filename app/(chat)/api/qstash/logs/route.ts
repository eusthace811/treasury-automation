import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { qstashClient } from '@/lib/qstash/client';
import { auth } from '@/app/(auth)/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Note: QStash does not provide a messages.list() API method
    // For now, return empty array. In the future, we could track messages in our database
    const messages: any[] = [];

    return NextResponse.json({
      messages: messages,
      count: messages.length,
      note: 'QStash does not provide a messages.list() API method. Messages would need to be tracked separately in the application database.',
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

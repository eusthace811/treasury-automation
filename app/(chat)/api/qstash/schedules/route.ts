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

    // Fetch schedules from QStash
    const allSchedules = await qstashClient.schedules.list();

    return NextResponse.json({
      schedules: allSchedules,
      count: allSchedules.length,
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);

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
        error: 'Failed to fetch schedules',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

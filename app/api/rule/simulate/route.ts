import { auth } from '@/app/(auth)/auth';
import { simulateRule } from '@/lib/utils/rule-simulation';
import type { TreasuryRuleData } from '@/lib/treasury/schema';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { ruleData } = (await request.json()) as {
      ruleData: TreasuryRuleData;
    };

    if (!ruleData) {
      return new Response('Rule data is required', { status: 400 });
    }

    // Run simulation
    const result = await simulateRule(ruleData);

    return Response.json(result);
  } catch (error) {
    console.error('Rule simulation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        payments: [],
        conditions: [],
        errors: ['Failed to run simulation'],
        warnings: [],
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

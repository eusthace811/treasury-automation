import { NextRequest, NextResponse } from 'next/server';
import { ruleValidator } from '@/lib/ai/tools/rule-validator';

export async function POST(request: NextRequest) {
  try {
    const { ruleData } = await request.json();

    if (!ruleData) {
      return NextResponse.json(
        { error: 'Rule data is required' },
        { status: 400 }
      );
    }

    // Use the existing ruleValidator tool
    const result = await ruleValidator.execute({ rule: ruleData });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Validation failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Rule validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate rule' },
      { status: 500 }
    );
  }
}
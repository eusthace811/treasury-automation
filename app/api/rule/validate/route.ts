import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidCron } from 'cron-validator';
import { treasuryRuleSchema } from '@/lib/treasury/schema';
// import { treasuryContextResolver } from '@/lib/treasury/context-resolver';
// import { safeFormulaEvaluator } from '@/lib/treasury/formula-evaluator';
// import { beneficiariesData, accountsData } from '@/data/mockup';

export async function POST(request: NextRequest) {
  try {
    const { ruleData } = await request.json();

    if (!ruleData) {
      return NextResponse.json(
        { error: 'Rule data is required' },
        { status: 400 },
      );
    }

    // Validate treasury rule
    try {
      // Validate against Zod schema
      treasuryRuleSchema.parse(ruleData);

      // Additional business logic validation
      const validationErrors: string[] = [];

      // Validate cron expression if it's a scheduled rule
      if (
        ruleData.execution?.timing === 'schedule' &&
        ruleData.execution?.cron
      ) {
        if (!isValidCron(ruleData.execution.cron)) {
          validationErrors.push(
            `execution.cron: Invalid cron expression "${ruleData.execution.cron}". Must be a valid UNIX cron format (5 fields).`,
          );
        }
      }

      // Validate UNIX timestamp if it's a one-time rule
      if (ruleData.execution?.timing === 'once' && ruleData.execution?.at) {
        const timestamp = ruleData.execution.at;
        if (typeof timestamp !== 'number' || !Number.isInteger(timestamp)) {
          validationErrors.push(
            `execution.at: Invalid timestamp format. Must be a valid UNIX timestamp (integer).`,
          );
        } else {
          const now = Math.floor(Date.now() / 1000);
          const oneYearFromNow = now + 365 * 24 * 60 * 60;
          if (timestamp < now) {
            validationErrors.push(
              `execution.at: Timestamp ${timestamp} is in the past. Must be a future timestamp.`,
            );
          } else if (timestamp > oneYearFromNow) {
            validationErrors.push(
              `execution.at: Timestamp ${timestamp} is too far in the future (more than 1 year).`,
            );
          }
        }
      }

      // Return validation results
      if (validationErrors.length > 0) {
        return NextResponse.json({
          isValid: false,
          errors: validationErrors,
          message: 'Rule validation failed',
        });
      }

      return NextResponse.json({
        isValid: true,
        message: 'Rule is valid and conforms to schema',
      });
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        return NextResponse.json({
          isValid: false,
          errors: zodError.errors.map(
            (err) => `${err.path.join('.')}: ${err.message}`,
          ),
          message: 'Rule validation failed',
        });
      }
      throw zodError;
    }
  } catch (error) {
    console.error('Rule validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate rule' },
      { status: 500 },
    );
  }
}

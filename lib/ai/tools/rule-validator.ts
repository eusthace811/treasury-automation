import { tool } from 'ai';
import { z } from 'zod';
import { isValidCron } from 'cron-validator';
import { treasuryRuleSchema } from '@/lib/treasury/schema';
import { treasuryContextResolver } from '@/lib/treasury/context-resolver';
import { safeFormulaEvaluator } from '@/lib/treasury/formula-evaluator';

export const ruleValidator = tool({
  description:
    'Validate treasury rule object against the schema and business logic',
  inputSchema: z.object({
    rule: z.any().describe('The treasury rule object to validate'),
  }),
  execute: async ({ rule }) => {
    try {
      // Validate against Zod schema
      treasuryRuleSchema.parse(rule);

      // Additional business logic validation
      const validationErrors: string[] = [];

      // Validate cron expression if it's a scheduled rule
      if (rule.execution?.timing === 'schedule' && rule.execution?.cron) {
        // Validate cron expression using cron-validator
        if (!isValidCron(rule.execution.cron)) {
          validationErrors.push(
            `execution.cron: Invalid cron expression "${rule.execution.cron}". Must be a valid UNIX cron format (5 fields).`,
          );
        }
      }

      // Validate UNIX timestamp if it's a one-time rule
      if (rule.execution?.timing === 'once' && rule.execution?.at) {
        const timestamp = rule.execution.at;

        // Check if it's a valid number
        if (typeof timestamp !== 'number' || !Number.isInteger(timestamp)) {
          validationErrors.push(
            `execution.at: Invalid timestamp format. Must be a valid UNIX timestamp (integer).`,
          );
        } else {
          // Check if timestamp is in a reasonable range (not in the past, not too far in future)
          const now = Math.floor(Date.now() / 1000);
          const oneYearFromNow = now + 365 * 24 * 60 * 60; // 1 year in seconds

          if (timestamp < now) {
            validationErrors.push(
              `execution.at: Timestamp ${timestamp} is in the past. Must be a future timestamp.`,
            );
          } else if (timestamp > oneYearFromNow) {
            validationErrors.push(
              `execution.at: Timestamp ${timestamp} is too far in the future (more than 1 year). Please use a reasonable future date.`,
            );
          }
        }
      }

      // Validate payment amounts with new source + formula structure
      if (rule.payment?.amount && typeof rule.payment.amount === 'object') {
        const amountConfig = rule.payment.amount;

        // Validate source field if present (new structure)
        if ('source' in amountConfig && amountConfig.source) {
          // Check if source is a valid path that can be resolved
          if (!treasuryContextResolver.validateSource(amountConfig.source)) {
            validationErrors.push(
              `payment.amount.source: Invalid source path "${amountConfig.source}". Must be a valid data source path.`,
            );
          }

          // Validate formula if present
          if ('formula' in amountConfig && amountConfig.formula) {
            if (!safeFormulaEvaluator.validateFormula(amountConfig.formula)) {
              validationErrors.push(
                `payment.amount.formula: Invalid formula "${amountConfig.formula}". Must be a safe mathematical expression.`,
              );
            }
          }
        }
      }

      // Return validation results
      if (validationErrors.length > 0) {
        return {
          success: true,
          data: {
            isValid: false,
            errors: validationErrors,
            message: 'Rule validation failed',
          },
        };
      }

      return {
        success: true,
        data: {
          isValid: true,
          message: 'Rule is valid and conforms to schema',
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: true,
          data: {
            isValid: false,
            errors: error.errors.map(
              (err) => `${err.path.join('.')}: ${err.message}`,
            ),
            message: 'Rule validation failed',
          },
        };
      }

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to validate rule',
      };
    }
  },
});

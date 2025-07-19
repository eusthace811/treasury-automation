import { tool } from 'ai';
import { z } from 'zod';
import { treasuryRuleSchema } from '@/lib/treasury/schema';

export const ruleValidator = tool({
  description: 'Validate treasury rule object against the schema and business logic',
  inputSchema: z.object({
    rule: z.any().describe('The treasury rule object to validate'),
  }),
  execute: async ({ rule }) => {
    try {
      // Validate against Zod schema
      treasuryRuleSchema.parse(rule);
      
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
            errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
            message: 'Rule validation failed',
          },
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate rule',
      };
    }
  },
});
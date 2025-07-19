import { tool } from 'ai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { treasuryRuleSchema } from '@/lib/treasury/schema';

import { chatModels } from '../models';
import { myProvider } from '../providers';

export const ruleParser = tool({
  description: 'Parse natural language treasury rules into structured format',
  inputSchema: z.object({
    naturalLanguageRule: z
      .string()
      .describe('The natural language treasury rule to parse'),
  }),
  execute: async ({ naturalLanguageRule }) => {
    try {
      const result = await generateObject({
        model: myProvider.languageModel(chatModels[0]?.id),
        prompt: `Parse the following natural language treasury rule into a structured format:

"${naturalLanguageRule}"

Instructions:
- execution.timing: "once" for single execution, "schedule" for recurring, "hook" for event-based
- execution.at: UNIX timestamp if timing is "once"
- execution.cron: cron expression if timing is "schedule"  
- execution.hooks: array of {type, target} if timing is "hook"
- payment.action: "simple" for single payment, "split" for percentage-based distribution, "leftover" for remaining balance
- payment.beneficiary: array of recipient addresses/identifiers
- payment.amount: string amount or {type, value} object for dynamic amounts
- payment.currency: currency symbol (USDC, ETH, etc.)
- payment.percentages: array of percentages (must sum to 100) if action is "split"
- conditions: array of conditions that must be met
- original: the exact original rule text
- memo: optional human-readable description

Extract timing information, payment details, conditions, and any other relevant information.
Be precise with amounts, percentages, and conditions.`,
        schema: treasuryRuleSchema,
      });

      return {
        success: true,
        data: result.object,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse rule',
      };
    }
  },
});

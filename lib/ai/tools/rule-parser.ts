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
    existingRule: z
      .any()
      .optional()
      .describe(
        'Existing rule data for editing scenarios - preserve unchanged fields',
      ),
  }),
  execute: async ({ naturalLanguageRule, existingRule }) => {
    try {
      const currentTime = new Date().toISOString();
      const result = await generateObject({
        model: myProvider.languageModel(chatModels[0]?.id),
        prompt: `${existingRule ? 'UPDATE' : 'PARSE'} the following natural language treasury rule into a structured format:

"${naturalLanguageRule}"

${
  existingRule
    ? `
EXISTING RULE DATA TO UPDATE:
${JSON.stringify(existingRule, null, 2)}

IMPORTANT: This is an UPDATE operation. Only modify the fields that the user specifically wants to change. 
Preserve all other fields from the existing rule data exactly as they are.
The user's request should be interpreted as modifications to the existing rule, not a complete replacement.`
    : ''
}

Instructions:
- execution.timing: "once" for single execution, "schedule" for recurring, "hook" for event-based
- execution.at: UNIX timestamp (future timestamp) if timing is "once" - use current time ${currentTime ? ` (${currentTime}, which is ${Math.floor(new Date(currentTime).getTime() / 1000)} in UNIX format)` : ''} + delay in seconds (at least 1 minute)
- execution.cron: standard 5-field UNIX cron expression (minute hour day month weekday) when timing is "schedule" - do NOT include seconds field
- execution.hooks: array of {type, target} if timing is "hook"
- payment.action: "simple" for single payment, "split" for percentage-based distribution, "leftover" for remaining balance
- payment.source: REQUIRED - where the money comes from. Use context info for available accounts or wallet addresses
- payment.beneficiary: array of recipient identifiers - internal accounts, employee/contractor names, wallet addresses, or collection names for multiple recipients (use context for available accounts and beneficiaries)
- payment.amount: string amount or {type, value} object for dynamic amounts
- payment.currency: currency symbol ("USDC", "ETH", etc.) - if not specified, preserve existing or default to "USDC"
- payment.percentages: array of percentages (must sum to 100) if action is "split"
- conditions: array of conditions that must be met
- conditions.source: data collection to query ("accounts", "employees", "treasury") - NOT the payment source
- original: ${existingRule ? 'update this with the new user request' : 'the exact original rule text'}
- memo: optional human-readable description

${existingRule ? 'PRESERVE all existing field values unless the user specifically requests changes to those fields.' : 'Extract timing information, payment details, conditions, and any other relevant information.'}
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

import { tool, generateObject } from 'ai';
import { z } from 'zod';
import { treasuryRuleSchema } from '@/lib/treasury/schema';
import {
  generateAvailableSources,
  generateAvailableCollections,
  generateAvailableTags,
  generateAvailableAccountSlugs,
} from '@/lib/utils/source-generator';

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

      // Generate dynamic context
      const availableSources = generateAvailableSources();
      const availableCollections = generateAvailableCollections();
      const availableTags = generateAvailableTags();
      const availableAccountSlugs = generateAvailableAccountSlugs();

      const result = await generateObject({
        model: myProvider.languageModel(chatModels[0]?.id),
        prompt: `${existingRule ? 'UPDATE' : 'PARSE'} the following natural language treasury rule into a structured format:

"${naturalLanguageRule}"

${
  existingRule
    ? `
## EXISTING RULE DATA TO UPDATE:
${JSON.stringify(existingRule, null, 2)}

## IMPORTANT: This is an UPDATE operation. Only modify the fields that the user specifically wants to change. 
Preserve all other fields from the existing rule data exactly as they are.
The user's request should be interpreted as modifications to the existing rule, not a complete replacement.`
    : ''
}

## Instructions:
- execution.timing: "once" for single execution, "schedule" for recurring, "hook" for event-based
- execution.at: UNIX timestamp (future timestamp) if timing is "once" - use current time ${currentTime ? ` (${currentTime}, which is ${Math.floor(new Date(currentTime).getTime() / 1000)} in UNIX format)` : ''} + delay in seconds (at least 5 minutes)
- execution.cron: standard 5-field UNIX cron expression (minute hour day month weekday) when timing is "schedule" - do NOT include seconds field
- execution.hooks: array of {type, target} if timing is "hook"
- payment.action: "simple" for single payment, "split" for percentage-based distribution, "calculation" for computed amounts based on formulas or conditions, "leftover" for remaining balance transfers, "batch" for processing collections of invoices or payments
- payment.source: Source of funds for the payment. Use only verified account slugs: ${availableAccountSlugs.join(', ')}. Default to "operating-account" only when no source is specified by the user
- payment.beneficiary: Recipients of the payment (array format). Use only verified collection names: ${availableCollections.join(', ')}. Do NOT use individual names, only collection references
- payment.amount: Fixed string amount ("1000.00") or dynamic object with source and optional formula { source, formula }:
  * Fixed: "1000.00", "500.50"
  * Dynamic: {"source": "treasury.revenue"} 
  * Dynamic with formula: {"source": "treasury.revenue", "formula": "* 0.1"}
  * Dynamic with complex formula: {"source": "accounts.operating-account.balance", "formula": "* 0.05 + 100"}
  * ${availableSources}
- payment.currency: currency symbol ("USDC", "ETH", etc.) - if not specified, preserve existing or default to "USDC"
- payment.percentages: array of percentages (must sum to 100) if action is "split"  
- payment.tags: array of tags for filtering beneficiaries or items. REQUIRED for batch payments to filter invoices/items. OPTIONAL for split payments to filter beneficiaries within collections (e.g., employees with tag "founder"). Available tags: ${availableTags.join(', ')}
- conditions [optional]: array of conditions that must be met
- conditions.source: data collection to query. Available collections: ${availableCollections.join(', ')} - NOT the payment source
- original: ${existingRule ? 'update this with the new user request' : 'the exact original rule text'}
- memo: human-readable description of the rule

## Examples of VALID rules:
### Example 1:
- Input: "Split profits 60/40 between founders after expenses"
- Output:
{
    "original": "Split profits 60/40 between founders after expenses.",
    "memo": "Split profits after expenses between founders: 60% to founder1, 40% to founder2. Beneficiaries are employees with tags 'founder'. Profits default to being split from the 'profit-pool-sharing' account unless stated otherwise. One-time action.",
    "payment":
    {
        "action": "split",
        "amount":
        {
            "source": "accounts.balance"
        },
        "source": "profit-sharing-pool", 
        "currency": "USDC",
        "beneficiary": ["employees"],
        "percentages": [60, 40],
        "tags": ["founder"]
    },
    "execution":
    {
        "at": ${Math.floor(new Date(currentTime).getTime() / 1000) + 300}, // 5 minutes from now,
        "timing": "once"
    },
    "conditions":
    [
        {
            "source": "treasury",
            "field": "snapshot.netProfit",
            "operator": ">",
            "value": "0",
            "description": "There must be positive profits after expenses before splitting"
        }
    ]
}

### Example 2:
- Input: "Send 10% of revenue above $50k to our growth fund monthly"
- Output: 
{
    "original": "Send 10% of revenue above $50k to our growth fund monthly.",
    "memo": "Send 10% of monthly revenue above $50,000 to the growth fund at 00:00 AM UTC on the 1st of each month.",
    "payment": 
    {
        "action": "calculation",
        "amount":
        {
            "source": "treasury.revenue",
            "formula": "* 0.1"
        },
        "source": "sales-revenue",
        "currency": "USDC",
        "beneficiary": ["growth-fund"]
    },
    "execution":
    {
        "cron": "0 0 1 * *",
        "timing": "schedule"
    },
    "conditions":
    [
        {
            "source": "treasury",     
            "field": "revenue",
            "operator": ">",
            "value": 50000,
            "description": "Monthly revenue must be above $50,000"
        }
    ]
}

### Example 3: 
- Input: "Pay our contractors every Friday if their invoice is approved"
- Output: 
{
    "original": "Pay our contractors every Friday if their invoice is approved.",
    "memo": "Pay all approved contractor invoices every Friday at 0:00 AM UTC.",
    "payment":
    {
        "action": "batch",
        "amount":
        {
            "source": "invoices.amount"
        },
        "source": "operating-account",
        "currency": "USDC",
        "beneficiary": ["contractors"],
        "tags": ["contractor"]
    },
    "execution":
    {
        "cron": "0 0 * * 5",
        "timing": "schedule"
    },
    "conditions":
    [
        {
            "source": "invoices",
            "field": "status",
            "operator": "==",
            "value": "approved",
            "description": "Invoice must be approved"
        }
    ]
}

### Example 4: 
- Input: "Send $1000 USDC to Mike in 11 hours"
- Output:
{
    "original": "Send $1000 USDC to Mike Torres in 11 hours",
    "memo": "Send $1000 USDC to Mike Torres in 11 hours from now as a one-time payment. Based on the provided context, Mike Torres's wallet address is: 0x2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C.",
    "payment":
    {
        "action": "simple",
        "amount": "1000",
        "source": "operating-account",
        "currency": "USDC",
        "beneficiary": ["0x2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C"]
    },
    "execution":
    {
        "at": ${Math.floor(new Date(currentTime).getTime() / 1000) + 300}, // 5 minutes from now,
        "timing": "once"
    },
    "conditions": []
}

### Example 5: 
- Input: "Transfer any funds left over from paying our vendors and rent into our reserve fund—unless that brings reserves above 200k, then skip."
- Output:
{
    "original": "Transfer any funds left over from paying our vendors and rent into our reserve fund—unless that brings reserves above 200k, then skip.",
    "memo": "Transfer leftover funds after vendor and rent payments to the reserve fund, unless it would bring reserves above $200,000.",
    "payment":
    {
        "action": "leftover",
        "amount":
        {
            "source": "accounts.balance"
        },
        "source": "operating-account",
        "currency": "USDC",
        "beneficiary": ["reserve-fund"]
    },
    "execution":
    {
        "at": ${Math.floor(new Date(currentTime).getTime() / 1000) + 300}, // 5 minutes from now,
        "timing": "once"
    },
    "conditions": [
        {
            "source": "accounts",
            "field": "balance",
            "operator": "<=",
            "value": 200000,
            "when": 'after',
            "description": "Reserve balance after transfer must not exceed $200,000"
        }
    ]
}

${existingRule ? 'PRESERVE all existing field values unless the user specifically requests changes to those fields.' : 'Extract timing information, payment details, conditions, and any other relevant information.'}

## IMPORTANT PARSING RULES:
1. For phrases like "X% of revenue above $Y", interpret as:
   - Amount: X% of total revenue (formula: "* 0.X")  
   - Condition: revenue > Y
   - NOT as X% of (revenue - Y)

2. For phrases like "X above Y", create separate condition and calculation:
   - Calculation uses the full source value
   - Condition checks if source > threshold

3. Always separate conditional logic from calculation logic.
`,
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

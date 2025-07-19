import { tool } from 'ai';
import { generateObject } from 'ai';
import { z } from 'zod';

import { getRulesByUserId } from '@/lib/db/queries';
import { chatModels } from '../models';
import { myProvider } from '../providers';

export const conflictAnalysisSchema = z.object({
  hasConflicts: z.boolean().describe('Whether conflicts were detected'),
  conflictDetails: z
    .array(
      z.object({
        ruleId: z.string().describe('ID of conflicting rule'),
        ruleName: z.string().describe('Name of conflicting rule'),
        conflictType: z
          .enum(['schedule', 'payment', 'condition', 'beneficiary'])
          .describe('Type of conflict detected'),
        description: z
          .string()
          .describe('Detailed description of the conflict'),
        severity: z
          .enum(['low', 'medium', 'high'])
          .describe('Severity of the conflict'),
      }),
    )
    .describe('Detailed list of conflicts found'),
  suggestions: z.array(z.string()).describe('Suggestions to resolve conflicts'),
});

export type ConflictAnalysis = z.infer<typeof conflictAnalysisSchema>;

export const ruleEvaluator = tool({
  description:
    'Check for conflicts between a new treasury rule and existing rules in the database',
  inputSchema: z.object({
    rule: z.any().describe('The parsed treasury rule to check for conflicts'),
    userId: z
      .string()
      .describe('User ID to fetch existing rules for comparison'),
  }),
  execute: async ({ rule, userId }) => {
    try {
      // Fetch existing rules from database
      const existingRules = await getRulesByUserId({ userId });

      if (existingRules.length === 0) {
        return {
          success: true,
          data: {
            hasConflicts: false,
            conflictDetails: [],
            suggestions: [
              'No existing rules found - this rule can be created without conflicts.',
            ],
          },
        };
      }

      // Prepare conflict analysis prompt
      const conflictPrompt = `Analyze the following NEW treasury rule for conflicts with EXISTING rules:

NEW RULE to check:
${JSON.stringify(rule, null, 2)}

EXISTING RULES in database:
${JSON.stringify(
  existingRules.map((r) => ({
    id: r.id,
    name: r.name,
    ruleData: r.ruleData,
    createdAt: r.createdAt,
  })),
  null,
  2,
)}

Analyze for the following types of conflicts:

1. **Schedule Conflicts**: 
   - Overlapping execution times for similar operations
   - Competing cron schedules that might cause resource conflicts
   - Hook triggers that could fire simultaneously

2. **Payment Conflicts**:
   - Same beneficiaries receiving duplicate payments
   - Conflicting split percentages for the same revenue source
   - Competing leftover distribution rules

3. **Condition Conflicts**:
   - Contradictory conditions that could never be satisfied together
   - Overlapping condition triggers for the same resources
   - Mutually exclusive condition logic

4. **Beneficiary Conflicts**:
   - Same beneficiary in multiple conflicting rules
   - Percentage allocations that exceed 100% when combined
   - Competing payment priorities to the same addresses

Focus ONLY on actual conflicts that would cause problems, not just similarities.
Provide specific, actionable suggestions to resolve any conflicts found.`;

      const result = await generateObject({
        model: myProvider.languageModel(chatModels[0]?.id),
        prompt: conflictPrompt,
        schema: conflictAnalysisSchema,
      });

      return {
        success: true,
        data: result.object,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check rule conflicts',
      };
    }
  },
});

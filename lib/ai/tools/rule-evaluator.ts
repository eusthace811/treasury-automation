import { tool, generateObject } from 'ai';
import { z } from 'zod';

import { getActiveRulesByUserId } from '@/lib/db/queries';
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
    excludeRuleId: z
      .string()
      .optional()
      .describe('Chat ID to exclude from conflict check (for editing existing rules in current chat)'),
  }),
  execute: async ({ rule, userId, excludeRuleId }) => {
    try {
      // Fetch existing active rules from database (Chat-as-Rule-Storage)
      const allExistingRules = await getActiveRulesByUserId({ userId });
      
      // Filter out the rule being edited if excludeRuleId is provided
      const existingRules = excludeRuleId 
        ? allExistingRules.filter(r => r.id !== excludeRuleId)
        : allExistingRules;

      if (existingRules.length === 0) {
        const message = excludeRuleId 
          ? 'No other rules found - this rule can be updated without conflicts.'
          : 'No existing rules found - this rule can be created without conflicts.';
        
        return {
          success: true,
          data: {
            hasConflicts: false,
            conflictDetails: [],
            suggestions: [message],
          },
        };
      }

      // Prepare conflict analysis prompt
      const isEditing = !!excludeRuleId;
      const conflictPrompt = `Analyze the following ${isEditing ? 'UPDATED' : 'NEW'} treasury rule for conflicts with EXISTING rules:

${isEditing ? 'UPDATED' : 'NEW'} RULE to check:
${JSON.stringify(rule, null, 2)}

${isEditing ? `(Note: This is an update to an existing rule. The rule with ID ${excludeRuleId} has been excluded from conflict analysis.)` : ''}

EXISTING RULES in database${isEditing ? ' (excluding the rule being edited)' : ''}:
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

import { tool } from 'ai';
import { generateObject } from 'ai';
import { z } from 'zod';
// import type { TreasuryRuleData } from '@/lib/treasury/schema';
import { chatModels } from '../models';
import { myProvider } from '../providers';

export const evaluationResultSchema = z.object({
  analysis: z.string().describe('Comprehensive analysis of the rule'),
  riskLevel: z
    .enum(['low', 'medium', 'high'])
    .describe('Overall risk assessment'),
  suggestions: z
    .array(z.string())
    .describe('Actionable improvement suggestions'),
  potentialIssues: z
    .array(z.string())
    .describe('Identified problems or concerns'),
  optimizations: z
    .array(z.string())
    .describe('Performance and efficiency improvements'),
  conflicts: z
    .array(z.string())
    .optional()
    .describe('Conflicts with existing rules'),
  securityConcerns: z
    .array(z.string())
    .describe('Security-related considerations'),
});

export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

export const ruleEvaluator = tool({
  description:
    'Analyze and evaluate treasury rules for potential issues, optimizations, and improvements',
  inputSchema: z.object({
    rule: z.any().describe('The parsed treasury rule to evaluate'),
    existingRules: z
      .array(z.object({}).passthrough())
      .optional()
      .describe('Array of existing rules to check for conflicts'),
  }),
  execute: async ({ rule, existingRules = [] }) => {
    try {
      const evaluationPrompt = `Analyze the following treasury rule for potential issues, optimizations, and improvements:

Rule to analyze:
${JSON.stringify(rule, null, 2)}

${
  existingRules.length > 0
    ? `
Existing rules to check for conflicts:
${JSON.stringify(existingRules, null, 2)}
`
    : ''
}

Provide a comprehensive analysis covering:

1. **Risk Assessment**: Evaluate the risk level (low/medium/high) based on:
   - Amount and frequency of payments
   - Complexity of conditions
   - Potential for errors or misuse
   - Security implications

2. **Potential Issues**: Identify any problems such as:
   - Ambiguous conditions
   - Missing edge case handling
   - Timing conflicts
   - Amount calculation issues
   - Currency or precision problems

3. **Optimization Suggestions**: Recommend improvements for:
   - Performance optimization
   - Condition simplification
   - Better error handling
   - More efficient execution patterns

4. **Conflict Detection**: Check for conflicts with existing rules:
   - Overlapping conditions
   - Competing beneficiaries
   - Resource conflicts
   - Timing collisions

5. **Security Considerations**: Assess security aspects:
   - Authorization requirements
   - Audit trail needs
   - Data validation gaps
   - Potential attack vectors

Provide specific, actionable recommendations in structured format.`;

      const result = await generateObject({
        model: myProvider.languageModel(chatModels[0]?.id),
        prompt: evaluationPrompt,
        schema: evaluationResultSchema,
      });

      return {
        success: true,
        data: result.object,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to evaluate rule',
      };
    }
  },
});

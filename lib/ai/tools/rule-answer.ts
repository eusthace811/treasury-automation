import { tool } from 'ai';
import { z } from 'zod';

export const ruleAnswer = tool({
  description: 'A tool for providing the final rule answer.',
  inputSchema: z.object({
    steps: z.array(
      z.object({
        thought: z.string(),
        reasoning: z.string(),
      }),
    ),
    answer: z.string(),
  }),
  execute: async ({ steps, answer }) => {
    return {
      success: true,
      data: {
        steps,
        answer,
        message: 'Treasury rule process completed successfully.'
      }
    };
  },
});

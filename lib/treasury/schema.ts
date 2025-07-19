import { z } from 'zod';

export const hookSchema = z.object({
  type: z.string(),
  target: z.string(),
});

export const executionSchema = z.object({
  timing: z.enum(['once', 'schedule', 'hook']),
  at: z.number().optional(),
  cron: z.string().optional(),
  hooks: z.array(hookSchema).optional(),
}).refine((data) => {
  if (data.timing === 'once' && !data.at) {
    return false;
  }
  if (data.timing === 'schedule' && !data.cron) {
    return false;
  }
  if (data.timing === 'hook' && (!data.hooks || data.hooks.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Required fields missing for timing type",
});

export const amountSchema = z.union([
  z.string(),
  z.object({
    type: z.string(),
    value: z.union([z.string(), z.number()]),
  }),
]);

export const paymentSchema = z.object({
  action: z.enum(['simple', 'split', 'leftover']),
  beneficiary: z.array(z.string()).min(1),
  amount: amountSchema,
  currency: z.string(),
  percentages: z.array(z.number()).optional(),
}).refine((data) => {
  if (data.action === 'split') {
    if (!data.percentages || data.percentages.length !== data.beneficiary.length) {
      return false;
    }
    const sum = data.percentages.reduce((acc, pct) => acc + pct, 0);
    return Math.abs(sum - 100) < 0.01; // Allow for floating point precision
  }
  return true;
}, {
  message: "Split payments require percentages that sum to 100 and match beneficiary count",
});

export const conditionSchema = z.object({
  source: z.string(),
  field: z.string(),
  operator: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  logic: z.enum(['AND', 'OR']).optional(),
  description: z.string().optional(),
});

export const treasuryRuleSchema = z.object({
  execution: executionSchema,
  payment: paymentSchema,
  conditions: z.array(conditionSchema),
  original: z.string(),
  memo: z.string().optional(),
});

export type TreasuryRuleData = z.infer<typeof treasuryRuleSchema>;
export type ExecutionConfig = z.infer<typeof executionSchema>;
export type PaymentConfig = z.infer<typeof paymentSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Hook = z.infer<typeof hookSchema>;
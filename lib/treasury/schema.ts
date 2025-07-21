import { z } from 'zod';

export const hookSchema = z.object({
  type: z.string(),
  target: z.string(),
});

export const executionSchema = z
  .object({
    timing: z.enum(['once', 'schedule', 'hook']),
    at: z.number().optional(),
    cron: z.string().optional(),
    hooks: z.array(hookSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.timing === 'once') {
        if (!data.at) return false;
        const isValidTimestamp = !Number.isNaN(
          new Date(data.at * 1000).getTime(),
        );
        return isValidTimestamp;
      }
      if (data.timing === 'schedule' && !data.cron) {
        return false;
      }
      if (data.timing === 'hook' && (!data.hooks || data.hooks.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Required fields missing for timing type',
    },
  );

export const amountSchema = z.union([
  z.string(),
  z.object({
    type: z.string(),
    value: z.union([z.string(), z.number()]),
  }),
]);

export const paymentSchema = z
  .object({
    action: z.enum(['simple', 'split', 'calculation', 'leftover']),
    source: z.string().min(1, 'Payment source is required'),
    beneficiary: z.array(z.string()).min(1),
    amount: amountSchema,
    currency: z.string(),
    percentages: z.array(z.number()).optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'split') {
        if (
          !data.percentages ||
          data.percentages.length !== data.beneficiary.length
        ) {
          return false;
        }
        const sum = data.percentages.reduce((acc, pct) => acc + pct, 0);
        return Math.abs(sum - 100) < 0.01; // Allow for floating point precision
      }
      return true;
    },
    {
      message:
        'Split payments require percentages that sum to 100 and match beneficiary count',
    },
  );

export const conditionSchema = z.object({
  source: z.string(),
  field: z.string(),
  operator: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  when: z.enum(['before', 'after']).optional().default('before'),
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

// Policy and governance schema extensions
export const policyResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  checks: z.array(z.string()),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  details: z.record(z.any()),
});

export const auditTrailEntrySchema = z.object({
  timestamp: z.number(),
  step: z.string(),
  status: z.enum(['passed', 'failed', 'warning']),
  message: z.string(),
  details: z.any().optional(),
});

export const governanceDecisionSchema = z.object({
  step: z.string(),
  passed: z.boolean(),
  checks: z.array(z.string()),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  risk_score: z.number().optional(),
});

export const complianceSummarySchema = z.object({
  overall_status: z.enum(['COMPLIANT', 'NON_COMPLIANT', 'SYSTEM_ERROR']),
  risk_level: z.enum(['MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  total_checks: z.number(),
  passed_checks: z.number(),
  failed_checks: z.number(),
  warnings: z.number(),
  risk_score: z.number(),
});

export const executionResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  transactions: z.array(z.any()),
  balance_changes: z.array(z.any()),
  errors: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
  details: z.record(z.any()),
});

export const auditRecordSchema = z.object({
  id: z.string(),
  chat_id: z.string(),
  execution_timestamp: z.number(),
  execution_date: z.string(),
  governance_framework_version: z.string(),
  audit_trail: z.array(auditTrailEntrySchema),
  governance_decisions: z.array(governanceDecisionSchema),
  compliance_summary: complianceSummarySchema,
  execution_metadata: z.record(z.any()),
});

export const executionCertificateSchema = z.object({
  certificate_id: z.string(),
  issued_at: z.number(),
  valid_until: z.number(),
  governance_compliance: z.string(),
  digital_signature: z.string(),
  verification_hash: z.string(),
});

// Policy definitions schema
export const policyLimitSchema = z.object({
  type: z.enum(['amount', 'percentage', 'count', 'rate']),
  value: z.number(),
  period: z.enum(['transaction', 'hourly', 'daily', 'weekly', 'monthly']).optional(),
  currency: z.string().optional(),
});

export const accountPolicySchema = z.object({
  account_id: z.string(),
  minimum_balance: z.number(),
  withdrawal_limits: policyLimitSchema.array().optional(),
  usage_restrictions: z.array(z.string()).optional(),
  requires_approval: z.boolean().default(false),
  approval_threshold: z.number().optional(),
});

export const globalPolicySchema = z.object({
  max_single_payment: z.number(),
  max_daily_spending: z.number(),
  require_approval_threshold: z.number(),
  minimum_reserve_ratio: z.number(),
  max_burn_rate_multiplier: z.number(),
  velocity_limits: z.object({
    max_hourly_transactions: z.number(),
    max_daily_transactions: z.number(),
    max_hourly_amount: z.number(),
    max_daily_amount: z.number(),
  }),
});

export const transactionPolicySchema = z.object({
  velocity_limits: z.object({
    max_hourly_transactions: z.number(),
    max_daily_transactions: z.number(),
    max_hourly_amount: z.number(),
    max_daily_amount: z.number(),
  }),
  suspicious_activity: z.object({
    unusual_amount_threshold: z.number(),
    rapid_succession_limit: z.number(),
    rapid_succession_window: z.number(),
  }),
  beneficiary_limits: z.object({
    max_daily_per_beneficiary: z.number(),
    max_monthly_per_beneficiary: z.number(),
  }),
  pattern_analysis: z.object({
    off_hours_threshold: z.object({
      start: z.number(),
      end: z.number(),
    }),
    weekend_enabled: z.boolean(),
  }),
});

// Enhanced payment processing schemas
export const paymentItemSchema = z.object({
  beneficiaryId: z.string(),
  beneficiaryName: z.string(),
  beneficiaryAddress: z.string(),
  amount: z.number().positive(),
  currency: z.string(),
  context: z.object({
    source: z.enum(['invoice', 'salary', 'calculation', 'split', 'leftover', 'simple']),
    referenceId: z.string().optional(),
    description: z.string(),
    originalAmount: z.number().optional(),
    percentage: z.number().optional(),
  }),
});

export const batchPaymentResultSchema = z.object({
  success: z.boolean(),
  totalAmount: z.number(),
  itemCount: z.number(),
  successfulPayments: z.array(paymentItemSchema),
  failedPayments: z.array(z.object({
    item: paymentItemSchema,
    reason: z.string(),
    policyViolation: z.string().optional(),
  })),
  policyViolations: z.array(z.object({
    itemId: z.string(),
    policyType: z.enum(['global', 'account', 'transaction', 'rule']),
    violation: z.string(),
    details: z.record(z.any()),
  })),
  executionTimeMs: z.number(),
  auditTrail: z.object({
    resolutionSteps: z.array(z.string()),
    policyChecks: z.array(z.string()),
    executionSteps: z.array(z.string()),
  }),
});

export const paymentResolutionSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  paymentItems: z.array(paymentItemSchema),
  totalAmount: z.number(),
  errors: z.array(z.string()),
  resolutionSteps: z.array(z.string()),
  details: z.object({
    originalRule: treasuryRuleSchema,
    collectionResolution: z.object({
      success: z.boolean(),
      message: z.string(),
      resolvedItemCount: z.number(),
      errors: z.array(z.string()),
    }).optional(),
    amountCalculation: z.object({
      method: z.string(),
      totalCalculated: z.number(),
      breakdown: z.record(z.any()),
    }),
  }),
});

export const individualPolicyResultSchema = z.object({
  paymentItemId: z.string(),
  beneficiaryName: z.string(),
  amount: z.number(),
  globalPolicy: policyResultSchema,
  accountPolicy: policyResultSchema,
  transactionPolicy: policyResultSchema,
  rulePolicy: policyResultSchema,
  overallSuccess: z.boolean(),
  firstFailure: z.string().optional(),
});

export const enhancedAuditTrailSchema = z.object({
  execution_id: z.string(),
  chat_id: z.string(),
  timestamp: z.number(),
  execution_date: z.string(),
  payment_resolution: paymentResolutionSchema,
  individual_policy_results: z.array(individualPolicyResultSchema),
  batch_payment_result: batchPaymentResultSchema,
  total_execution_time_ms: z.number(),
  status: z.enum(['SUCCESS', 'PARTIAL_SUCCESS', 'POLICY_VIOLATION', 'RESOLUTION_FAILED', 'EXECUTION_FAILED', 'INVALID_REQUEST']),
  summary: z.object({
    totalRequested: z.number(),
    totalProcessed: z.number(),
    successfulPayments: z.number(),
    failedPayments: z.number(),
    policyViolations: z.number(),
  }),
});

// Type exports
export type TreasuryRuleData = z.infer<typeof treasuryRuleSchema>;
export type ExecutionConfig = z.infer<typeof executionSchema>;
export type PaymentConfig = z.infer<typeof paymentSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Hook = z.infer<typeof hookSchema>;

// Policy and governance types
export type PolicyResult = z.infer<typeof policyResultSchema>;
export type AuditTrailEntry = z.infer<typeof auditTrailEntrySchema>;
export type GovernanceDecision = z.infer<typeof governanceDecisionSchema>;
export type ComplianceSummary = z.infer<typeof complianceSummarySchema>;
export type ExecutionResult = z.infer<typeof executionResultSchema>;
export type AuditRecord = z.infer<typeof auditRecordSchema>;
export type ExecutionCertificate = z.infer<typeof executionCertificateSchema>;
export type AccountPolicy = z.infer<typeof accountPolicySchema>;
export type GlobalPolicy = z.infer<typeof globalPolicySchema>;
export type TransactionPolicy = z.infer<typeof transactionPolicySchema>;
export type PolicyLimit = z.infer<typeof policyLimitSchema>;

// Enhanced payment processing types
export type PaymentItem = z.infer<typeof paymentItemSchema>;
export type BatchPaymentResult = z.infer<typeof batchPaymentResultSchema>;
export type PaymentResolution = z.infer<typeof paymentResolutionSchema>;
export type IndividualPolicyResult = z.infer<typeof individualPolicyResultSchema>;
export type EnhancedAuditTrail = z.infer<typeof enhancedAuditTrailSchema>;

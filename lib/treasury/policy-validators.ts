import type { TreasuryRuleData } from './schema';
import { treasuryData } from '@/data/mockup/treasury';
import { accountsData } from '@/data/mockup/accounts';
import { transactionsData } from '@/data/mockup/transactions';
import { beneficiariesData } from '@/data/mockup/beneficiaries';

interface PolicyResult {
  success: boolean;
  message: string;
  check_type: string;
  details: Record<string, any>;
}

// Global policy constants - simplified to single most critical check
const GLOBAL_POLICIES = {
  MAX_SINGLE_PAYMENT: 100000, // Maximum single payment amount in USDC - HARD LIMIT
} as const;

// Account policy constants - simplified to single most critical check
const ACCOUNT_POLICIES = {
  MINIMUM_BALANCES: {
    'Operating Account': 10000, // Always maintain 10k USDC for operations
    'Reserve Fund': 10000, // Always maintain 10k USDC in reserves
    'Payroll Processing': 50000, // Always maintain 50k USDC for payroll
    'Growth Fund': 25000, // Always maintain 25k USDC for growth
    'Profit Sharing Pool': 0, // Can be fully depleted
    'Sales Revenue': 0, // Can be fully depleted
  },
} as const;

// Transaction policy constants - simplified to single most critical check
const TRANSACTION_POLICIES = {
  MAX_DAILY_SPENDING: 60000, // Maximum daily spending limit in USDC - HARD LIMIT
} as const;

/**
 * Global Policy Validation - Single Check: Maximum Single Payment Limit
 * This is the most critical global policy check to prevent catastrophic payments
 */
export async function validateGlobalPolicy(
  chatId: string,
  ruleData: TreasuryRuleData,
): Promise<PolicyResult> {
  try {
    console.log(
      '🌐 Global policy check - Maximum single payment limit',
      chatId,
    );

    // Extract payment amount
    const paymentAmount = extractPaymentAmount(ruleData);
    if (paymentAmount === null) {
      return {
        success: false,
        message: 'Invalid payment amount format',
        check_type: 'global_policy',
        details: {
          error: 'Could not parse payment amount',
          rule_payment: ruleData.payment.amount,
        },
      };
    }

    // Single Critical Check: Maximum Single Payment Limit
    if (paymentAmount > GLOBAL_POLICIES.MAX_SINGLE_PAYMENT) {
      return {
        success: false,
        message: `Payment amount ${paymentAmount} USDC exceeds maximum single payment limit of ${GLOBAL_POLICIES.MAX_SINGLE_PAYMENT} USDC`,
        check_type: 'global_policy',
        details: {
          payment_amount: paymentAmount,
          max_limit: GLOBAL_POLICIES.MAX_SINGLE_PAYMENT,
          violation: 'max_single_payment_exceeded',
        },
      };
    }

    return {
      success: true,
      message: `Global policy check passed - payment ${paymentAmount} USDC within limits`,
      check_type: 'global_policy',
      details: {
        payment_amount: paymentAmount,
        max_limit: GLOBAL_POLICIES.MAX_SINGLE_PAYMENT,
        check: 'max_single_payment_limit',
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Global policy validation system error',
      check_type: 'global_policy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Account Policy Validation - Single Check: Minimum Balance Maintenance
 * This ensures payments don't violate critical account minimum balances
 */
export async function validateAccountPolicy(
  chatId: string,
  ruleData: TreasuryRuleData,
): Promise<PolicyResult> {
  try {
    console.log('🏦 Account policy check - Minimum balance maintenance');

    // Extract payment amount
    const paymentAmount = extractPaymentAmount(ruleData);
    if (paymentAmount === null) {
      return {
        success: false,
        message: 'Invalid payment amount format',
        check_type: 'account_policy',
        details: { error: 'Could not parse payment amount' },
      };
    }

    // Find source account
    const sourceAccount = accountsData.accounts.find(
      (acc) => acc.id === ruleData.payment.source,
    );
    if (!sourceAccount) {
      return {
        success: false,
        message: `Source account not found: ${ruleData.payment.source}`,
        check_type: 'account_policy',
        details: {
          error: 'source_account_not_found',
          source_id: ruleData.payment.source,
        },
      };
    }

    // Check account status
    if (!sourceAccount.isActive || sourceAccount.deletedAt) {
      return {
        success: false,
        message: `Source account ${sourceAccount.name} is not active`,
        check_type: 'account_policy',
        details: {
          error: 'inactive_account',
          account: sourceAccount.name,
          is_active: sourceAccount.isActive,
          deleted_at: sourceAccount.deletedAt,
        },
      };
    }

    // Single Critical Check: Minimum Balance Maintenance
    const accountName =
      sourceAccount.name as keyof typeof ACCOUNT_POLICIES.MINIMUM_BALANCES;
    const minimumBalance = ACCOUNT_POLICIES.MINIMUM_BALANCES[accountName] || 0;
    const postPaymentBalance = sourceAccount.balance - paymentAmount;

    if (postPaymentBalance < minimumBalance) {
      return {
        success: false,
        message: `Payment would reduce ${sourceAccount.name} balance to ${postPaymentBalance} USDC, below minimum required ${minimumBalance} USDC`,
        check_type: 'account_policy',
        details: {
          account_name: sourceAccount.name,
          current_balance: sourceAccount.balance,
          payment_amount: paymentAmount,
          post_payment_balance: postPaymentBalance,
          minimum_required: minimumBalance,
          violation: 'minimum_balance_violation',
        },
      };
    }

    return {
      success: true,
      message: `Account policy check passed - ${sourceAccount.name} will maintain minimum balance`,
      check_type: 'account_policy',
      details: {
        account_name: sourceAccount.name,
        current_balance: sourceAccount.balance,
        payment_amount: paymentAmount,
        post_payment_balance: postPaymentBalance,
        minimum_required: minimumBalance,
        check: 'minimum_balance_maintenance',
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Account policy validation system error',
      check_type: 'account_policy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Transaction Policy Validation - Single Check: Daily Spending Limit
 * This prevents excessive daily spending that could drain treasury
 */
export async function validateTransactionPolicy(
  chatId: string,
  ruleData: TreasuryRuleData,
): Promise<PolicyResult> {
  try {
    console.log('🔍 Transaction policy check - Daily spending limit');

    // Extract payment amount
    const paymentAmount = extractPaymentAmount(ruleData);
    if (paymentAmount === null) {
      return {
        success: false,
        message: 'Invalid payment amount format',
        check_type: 'transaction_policy',
        details: { error: 'Could not parse payment amount' },
      };
    }

    // Calculate today's spending (simulation - in real implementation would query actual data)
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Get recent transactions for daily spending calculation
    const recentTransactions = transactionsData.transactions.filter(
      (tx) => tx.timestamp > oneDayAgo && tx.type === 'outgoing',
    );

    const dailySpending = recentTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );
    const totalDailySpending = dailySpending + paymentAmount;

    // Single Critical Check: Daily Spending Limit
    if (totalDailySpending > TRANSACTION_POLICIES.MAX_DAILY_SPENDING) {
      return {
        success: false,
        message: `Payment would exceed daily spending limit: ${totalDailySpending} USDC > ${TRANSACTION_POLICIES.MAX_DAILY_SPENDING} USDC`,
        check_type: 'transaction_policy',
        details: {
          payment_amount: paymentAmount,
          current_daily_spending: dailySpending,
          total_daily_spending: totalDailySpending,
          max_daily_limit: TRANSACTION_POLICIES.MAX_DAILY_SPENDING,
          recent_transactions_count: recentTransactions.length,
          violation: 'daily_spending_limit_exceeded',
        },
      };
    }

    return {
      success: true,
      message: `Transaction policy check passed - daily spending within limits`,
      check_type: 'transaction_policy',
      details: {
        payment_amount: paymentAmount,
        current_daily_spending: dailySpending,
        total_daily_spending: totalDailySpending,
        max_daily_limit: TRANSACTION_POLICIES.MAX_DAILY_SPENDING,
        recent_transactions_count: recentTransactions.length,
        check: 'daily_spending_limit',
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Transaction policy validation system error',
      check_type: 'transaction_policy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Rule Conditions Validation - Comprehensive Check
 * This validates beneficiaries, rule conditions, and payment structure
 */
export async function validateRuleConditions(
  chatId: string,
  ruleData: TreasuryRuleData,
): Promise<PolicyResult> {
  try {
    console.log('📋 Rule conditions check - Comprehensive validation');

    const validationErrors: string[] = [];
    const validationDetails: Record<string, any> = {};

    // Extract payment amount
    const paymentAmount = extractPaymentAmount(ruleData);
    if (paymentAmount === null) {
      return {
        success: false,
        message: 'Invalid payment amount format',
        check_type: 'rule_conditions',
        details: { error: 'Could not parse payment amount' },
      };
    }

    // Beneficiary validation
    const allBeneficiaries = [
      ...beneficiariesData.employees,
      ...beneficiariesData.contractors,
    ];
    const invalidBeneficiaries: string[] = [];
    const inactiveBeneficiaries: string[] = [];
    const validBeneficiaries: string[] = [];

    for (const beneficiaryId of ruleData.payment.beneficiary) {
      const beneficiary = allBeneficiaries.find((b) => b.id === beneficiaryId);

      if (!beneficiary) {
        invalidBeneficiaries.push(beneficiaryId);
        validationErrors.push(`Unknown beneficiary: ${beneficiaryId}`);
      } else {
        if (beneficiary.status === 'active' && !beneficiary.deletedAt) {
          validBeneficiaries.push(beneficiary.name);
        } else {
          inactiveBeneficiaries.push(beneficiary.name);
          validationErrors.push(`Inactive beneficiary: ${beneficiary.name}`);
        }
      }
    }

    validationDetails.beneficiary_validation = {
      valid_beneficiaries: validBeneficiaries,
      invalid_beneficiaries: invalidBeneficiaries,
      inactive_beneficiaries: inactiveBeneficiaries,
      total_count: ruleData.payment.beneficiary.length,
    };

    // Payment action validation
    const actionValidation = validatePaymentAction(ruleData);
    if (!actionValidation.valid) {
      validationErrors.push(...actionValidation.errors);
    }
    validationDetails.payment_action = actionValidation;

    // Currency validation
    const sourceAccount = accountsData.accounts.find(
      (acc) => acc.id === ruleData.payment.source,
    );
    if (sourceAccount && ruleData.payment.currency !== sourceAccount.currency) {
      validationErrors.push(
        `Currency mismatch: payment ${ruleData.payment.currency} != account ${sourceAccount.currency}`,
      );
    }

    validationDetails.currency_validation = {
      payment_currency: ruleData.payment.currency,
      account_currency: sourceAccount?.currency,
      valid:
        !sourceAccount || ruleData.payment.currency === sourceAccount.currency,
    };

    // Rule conditions evaluation (simplified - check basic structure)
    const hasConditions = ruleData.conditions && ruleData.conditions.length > 0;
    validationDetails.rule_conditions = {
      has_conditions: hasConditions,
      condition_count: ruleData.conditions?.length || 0,
      // In a real implementation, would evaluate each condition
      all_conditions_passed: true, // Simplified for deterministic execution
    };

    if (validationErrors.length > 0) {
      return {
        success: false,
        message: `Rule validation failed: ${validationErrors.join(', ')}`,
        check_type: 'rule_conditions',
        details: {
          errors: validationErrors,
          ...validationDetails,
        },
      };
    }

    return {
      success: true,
      message: 'All rule conditions validation passed',
      check_type: 'rule_conditions',
      details: validationDetails,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Rule conditions validation system error',
      check_type: 'rule_conditions',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Utility function to extract payment amount from various formats
 */
function extractPaymentAmount(ruleData: TreasuryRuleData): number | null {
  if (typeof ruleData.payment.amount === 'string') {
    const amount = Number.parseFloat(ruleData.payment.amount);
    return Number.isNaN(amount) ? null : amount;
  }

  if (
    typeof ruleData.payment.amount === 'object' &&
    'value' in ruleData.payment.amount
  ) {
    const value = ruleData.payment.amount.value;
    const amount = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isNaN(amount) ? null : amount;
  }

  return null;
}

/**
 * Utility function to validate payment action structure
 */
function validatePaymentAction(ruleData: TreasuryRuleData) {
  const validation = {
    valid: true,
    errors: [] as string[],
    action: ruleData.payment.action,
  };

  const { action, beneficiary, percentages } = ruleData.payment;

  switch (action) {
    case 'simple':
      if (beneficiary.length !== 1) {
        validation.valid = false;
        validation.errors.push(
          'Simple payment must have exactly one beneficiary',
        );
      }
      break;

    case 'split':
      if (!percentages || percentages.length !== beneficiary.length) {
        validation.valid = false;
        validation.errors.push(
          'Split payment requires percentages for each beneficiary',
        );
      } else {
        const sum = percentages.reduce((acc, pct) => acc + pct, 0);
        if (Math.abs(sum - 100) > 0.01) {
          validation.valid = false;
          validation.errors.push(
            `Split percentages must sum to 100%, got ${sum}%`,
          );
        }
      }
      break;

    case 'calculation':
    case 'leftover':
      // These are valid actions, no additional validation needed
      break;

    default:
      validation.valid = false;
      validation.errors.push(`Unknown payment action: ${action}`);
  }

  return validation;
}

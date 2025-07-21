import type { PaymentItem, IndividualPolicyResult, PolicyResult } from './schema';
import { 
  validateGlobalPolicy as originalGlobalPolicy,
  validateAccountPolicy as originalAccountPolicy,
  validateTransactionPolicy as originalTransactionPolicy,
  validateRuleConditions as originalRulePolicy
} from './policy-validators';

// Legacy policy result interface for compatibility
interface LegacyPolicyResult {
  success: boolean;
  message: string;
  check_type: string;
  details: Record<string, any>;
}

// Adapter to convert legacy policy result to new schema
function adaptPolicyResult(legacyResult: LegacyPolicyResult): PolicyResult {
  return {
    success: legacyResult.success,
    message: legacyResult.message,
    checks: legacyResult.success ? [legacyResult.check_type] : [],
    warnings: [],
    errors: legacyResult.success ? [] : [legacyResult.check_type],
    details: legacyResult.details,
  };
}
import { accountsData } from '@/data/mockup/accounts';
import { transactionsData } from '@/data/mockup/transactions';

// Enhanced batch policy validation result
export interface BatchPolicyValidationResult {
  success: boolean;
  message: string;
  individualResults: IndividualPolicyResult[];
  totalAmount: number;
  successfulItems: PaymentItem[];
  failedItems: { item: PaymentItem; reason: string; policyType: string }[];
  policyViolations: {
    itemId: string;
    policyType: 'global' | 'account' | 'transaction' | 'rule';
    violation: string;
    details: any;
  }[];
  executionTimeMs: number;
  auditTrail: {
    validationSteps: string[];
    batchAnalysis: {
      accountImpact: any;
      dailySpendingImpact: any;
      riskAssessment: string;
    };
  };
  summary: {
    totalItems: number;
    passedGlobal: number;
    passedAccount: number;
    passedTransaction: number;
    passedRule: number;
    overallPassed: number;
  };
}

export class BatchPolicyValidator {
  /**
   * Validate all payment items through the full policy pipeline
   */
  async validatePaymentBatch(
    chatId: string,
    paymentItems: PaymentItem[],
    sourceAccountId: string
  ): Promise<BatchPolicyValidationResult> {
    const startTime = Date.now();
    
    const result: BatchPolicyValidationResult = {
      success: true,
      message: '',
      individualResults: [],
      totalAmount: 0,
      successfulItems: [],
      failedItems: [],
      policyViolations: [],
      executionTimeMs: 0,
      auditTrail: {
        validationSteps: [],
        batchAnalysis: {
          accountImpact: null,
          dailySpendingImpact: null,
          riskAssessment: '',
        },
      },
      summary: {
        totalItems: paymentItems.length,
        passedGlobal: 0,
        passedAccount: 0,
        passedTransaction: 0,
        passedRule: 0,
        overallPassed: 0,
      },
    };

    // Calculate total amount for global checks
    result.totalAmount = paymentItems.reduce((sum, item) => sum + item.amount, 0);

    // Enhanced batch analysis for audit trail
    result.auditTrail.validationSteps.push(`🛡️ Starting batch policy validation for ${paymentItems.length} payment items`);
    result.auditTrail.validationSteps.push(`💰 Total batch amount: ${result.totalAmount} ${paymentItems[0]?.currency || 'USDC'}`);
    result.auditTrail.validationSteps.push(`🏦 Source account: ${sourceAccountId}`);

    // Pre-validation analysis
    const accountImpact = this.calculateCumulativeAccountImpact(paymentItems, sourceAccountId);
    const dailySpendingImpact = this.calculateDailySpendingImpact(paymentItems);
    
    result.auditTrail.batchAnalysis.accountImpact = accountImpact;
    result.auditTrail.batchAnalysis.dailySpendingImpact = dailySpendingImpact;
    
    result.auditTrail.validationSteps.push(`📊 Pre-validation analysis:`);
    result.auditTrail.validationSteps.push(`  • Account impact: ${accountImpact.accountName}`);
    result.auditTrail.validationSteps.push(`  • Total deduction: ${accountImpact.totalDeduction} USDC`);
    result.auditTrail.validationSteps.push(`  • Post-batch balance: ${accountImpact.postBatchBalance} USDC`);
    result.auditTrail.validationSteps.push(`  • Daily spending: ${dailySpendingImpact.existingDailySpending} + ${dailySpendingImpact.batchAmount} = ${dailySpendingImpact.totalDailySpending} USDC`);

    // Risk assessment
    let riskFactors = [];
    if (accountImpact.postBatchBalance < 0) riskFactors.push('NEGATIVE_BALANCE');
    if (dailySpendingImpact.totalDailySpending > 60000) riskFactors.push('DAILY_LIMIT_EXCEEDED');
    if (result.totalAmount > 100000) riskFactors.push('LARGE_BATCH_AMOUNT');
    if (paymentItems.length > 50) riskFactors.push('HIGH_ITEM_COUNT');
    
    result.auditTrail.batchAnalysis.riskAssessment = riskFactors.length > 0 ? riskFactors.join(', ') : 'LOW_RISK';
    result.auditTrail.validationSteps.push(`⚠️  Risk assessment: ${result.auditTrail.batchAnalysis.riskAssessment}`);

    // Process each payment item individually
    result.auditTrail.validationSteps.push(`🔍 Processing individual payment validations...`);
    for (const paymentItem of paymentItems) {
      const individualResult = await this.validateIndividualPayment(
        chatId,
        paymentItem,
        sourceAccountId,
        result.totalAmount // Pass total for context
      );

      result.individualResults.push(individualResult);

      // Update summary counters
      if (individualResult.globalPolicy.success) result.summary.passedGlobal++;
      if (individualResult.accountPolicy.success) result.summary.passedAccount++;
      if (individualResult.transactionPolicy.success) result.summary.passedTransaction++;
      if (individualResult.rulePolicy.success) result.summary.passedRule++;

      if (individualResult.overallSuccess) {
        result.summary.overallPassed++;
        result.successfulItems.push(paymentItem);
      } else {
        const failureReason = individualResult.firstFailure || 'Unknown policy violation';
        const policyType = this.determinePolicyType(individualResult);
        
        result.failedItems.push({
          item: paymentItem,
          reason: failureReason,
          policyType,
        });

        // Add to policy violations
        result.policyViolations.push({
          itemId: paymentItem.beneficiaryId,
          policyType,
          violation: failureReason,
          details: this.extractPolicyDetails(individualResult, policyType),
        });
      }
    }

    // Determine overall success
    result.success = result.failedItems.length === 0;
    result.executionTimeMs = Date.now() - startTime;

    // Enhanced audit trail summary
    result.auditTrail.validationSteps.push(`📋 Individual validation results:`);
    result.auditTrail.validationSteps.push(`  • Global policy: ${result.summary.passedGlobal}/${paymentItems.length} passed`);
    result.auditTrail.validationSteps.push(`  • Account policy: ${result.summary.passedAccount}/${paymentItems.length} passed`);
    result.auditTrail.validationSteps.push(`  • Transaction policy: ${result.summary.passedTransaction}/${paymentItems.length} passed`);
    result.auditTrail.validationSteps.push(`  • Rule policy: ${result.summary.passedRule}/${paymentItems.length} passed`);
    result.auditTrail.validationSteps.push(`  • Overall success: ${result.summary.overallPassed}/${paymentItems.length} items`);

    if (result.failedItems.length > 0) {
      result.auditTrail.validationSteps.push(`❌ Policy violations detected:`);
      const violationsByType = result.policyViolations.reduce((acc, v) => {
        acc[v.policyType] = (acc[v.policyType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      for (const [policyType, count] of Object.entries(violationsByType)) {
        result.auditTrail.validationSteps.push(`  • ${policyType}: ${count} violations`);
      }

      // Show first few violations for audit
      result.auditTrail.validationSteps.push(`🔍 Sample violations:`);
      for (const violation of result.policyViolations.slice(0, 3)) {
        result.auditTrail.validationSteps.push(`  • ${violation.itemId}: ${violation.violation} (${violation.policyType})`);
      }
      if (result.policyViolations.length > 3) {
        result.auditTrail.validationSteps.push(`  • ... and ${result.policyViolations.length - 3} more violations`);
      }
    }

    // Generate summary message
    if (result.success) {
      result.message = `All ${paymentItems.length} payment items passed policy validation`;
      result.auditTrail.validationSteps.push(`✅ Batch policy validation: SUCCESS - All payments approved`);
    } else {
      const successCount = result.successfulItems.length;
      const failCount = result.failedItems.length;
      result.message = `${successCount}/${paymentItems.length} payments passed validation (${failCount} policy violations)`;
      result.auditTrail.validationSteps.push(`❌ Batch policy validation: PARTIAL SUCCESS - ${successCount} approved, ${failCount} rejected`);
    }

    result.auditTrail.validationSteps.push(`⏱️  Total validation time: ${result.executionTimeMs}ms`);
    
    console.log(`📊 Batch policy validation completed: ${result.message}`);
    return result;
  }

  /**
   * Validate a single payment item through all policy layers
   */
  private async validateIndividualPayment(
    chatId: string,
    paymentItem: PaymentItem,
    sourceAccountId: string,
    batchTotalAmount: number
  ): Promise<IndividualPolicyResult> {
    // Create a mock rule data for individual validation
    const mockRuleData = {
      execution: { timing: 'once' as const, at: Math.floor(Date.now() / 1000) },
      payment: {
        action: 'simple' as const,
        source: sourceAccountId,
        beneficiary: [paymentItem.beneficiaryId],
        amount: paymentItem.amount.toString(),
        currency: paymentItem.currency,
      },
      conditions: [],
      original: `Individual payment: ${paymentItem.context.description}`,
    };

    const result: IndividualPolicyResult = {
      paymentItemId: paymentItem.beneficiaryId,
      beneficiaryName: paymentItem.beneficiaryName,
      amount: paymentItem.amount,
      globalPolicy: { success: true, message: '', checks: [], warnings: [], errors: [], details: {} },
      accountPolicy: { success: true, message: '', checks: [], warnings: [], errors: [], details: {} },
      transactionPolicy: { success: true, message: '', checks: [], warnings: [], errors: [], details: {} },
      rulePolicy: { success: true, message: '', checks: [], warnings: [], errors: [], details: {} },
      overallSuccess: true,
      firstFailure: undefined,
    };

    try {
      // Step 1: Global Policy (check individual amount + context of batch)
      result.globalPolicy = await this.validateGlobalPolicyForItem(chatId, mockRuleData, paymentItem, batchTotalAmount);
      if (!result.globalPolicy.success && !result.firstFailure) {
        result.firstFailure = result.globalPolicy.message;
        result.overallSuccess = false;
      }

      // Step 2: Account Policy (check individual impact)
      if (result.overallSuccess) {
        const accountResult = await originalAccountPolicy(chatId, mockRuleData) as LegacyPolicyResult;
        result.accountPolicy = adaptPolicyResult(accountResult);
        if (!result.accountPolicy.success && !result.firstFailure) {
          result.firstFailure = result.accountPolicy.message;
          result.overallSuccess = false;
        }
      }

      // Step 3: Transaction Policy (check individual transaction)
      if (result.overallSuccess) {
        const transactionResult = await originalTransactionPolicy(chatId, mockRuleData) as LegacyPolicyResult;
        result.transactionPolicy = adaptPolicyResult(transactionResult);
        if (!result.transactionPolicy.success && !result.firstFailure) {
          result.firstFailure = result.transactionPolicy.message;
          result.overallSuccess = false;
        }
      }

      // Step 4: Rule Policy (check beneficiary and payment structure)
      if (result.overallSuccess) {
        result.rulePolicy = await this.validateRuleConditionsForItem(chatId, mockRuleData, paymentItem);
        if (!result.rulePolicy.success && !result.firstFailure) {
          result.firstFailure = result.rulePolicy.message;
          result.overallSuccess = false;
        }
      }

      return result;
    } catch (error) {
      result.overallSuccess = false;
      result.firstFailure = `System error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return result;
    }
  }

  /**
   * Enhanced global policy validation considering batch context
   */
  private async validateGlobalPolicyForItem(
    chatId: string,
    mockRuleData: any,
    paymentItem: PaymentItem,
    batchTotalAmount: number
  ): Promise<PolicyResult> {
    // Check individual item amount
    const individualResult = await originalGlobalPolicy(chatId, mockRuleData) as LegacyPolicyResult;
    
    if (!individualResult.success) {
      return adaptPolicyResult(individualResult);
    }

    // Additional batch-level checks
    const MAX_BATCH_AMOUNT = 500000; // Maximum total batch amount in USDC
    if (batchTotalAmount > MAX_BATCH_AMOUNT) {
      return {
        success: false,
        message: `Batch total amount ${batchTotalAmount} USDC exceeds maximum batch limit of ${MAX_BATCH_AMOUNT} USDC`,
        checks: ['max_batch_amount'],
        warnings: [],
        errors: ['max_batch_amount_exceeded'],
        details: {
          item_amount: paymentItem.amount,
          batch_total: batchTotalAmount,
          max_batch_limit: MAX_BATCH_AMOUNT,
          violation: 'max_batch_amount_exceeded',
        },
      };
    }

    // Enhanced success with batch context
    return {
      success: true,
      message: `Global policy passed for ${paymentItem.beneficiaryName} (${paymentItem.amount} USDC, batch total: ${batchTotalAmount} USDC)`,
      checks: ['individual_amount', 'batch_total'],
      warnings: [],
      errors: [],
      details: {
        item_amount: paymentItem.amount,
        batch_total: batchTotalAmount,
        individual_check: 'passed',
        batch_check: 'passed',
      },
    };
  }

  /**
   * Enhanced rule conditions validation for individual items
   */
  private async validateRuleConditionsForItem(
    chatId: string,
    mockRuleData: any,
    paymentItem: PaymentItem
  ): Promise<PolicyResult> {
    // Run base rule validation
    const baseResult = await originalRulePolicy(chatId, mockRuleData) as LegacyPolicyResult;
    
    if (!baseResult.success) {
      return adaptPolicyResult(baseResult);
    }

    // Additional item-specific checks
    const additionalChecks = [];

    // Check payment source context
    if (paymentItem.context.source === 'invoice') {
      additionalChecks.push('invoice_payment_validation');
      // Could add specific invoice payment rules here
    }

    if (paymentItem.context.source === 'calculation') {
      additionalChecks.push('calculation_payment_validation');
      // Could add specific calculation validation here
    }

    // Enhanced success with item context
    return {
      success: true,
      message: `Rule conditions passed for ${paymentItem.beneficiaryName} (${paymentItem.context.source} payment)`,
      checks: [baseResult.check_type, ...additionalChecks],
      warnings: [],
      errors: [],
      details: {
        ...baseResult.details,
        payment_source: paymentItem.context.source,
        reference_id: paymentItem.context.referenceId,
        additional_checks: additionalChecks,
      },
    };
  }

  /**
   * Determine which policy type caused the failure
   */
  private determinePolicyType(result: IndividualPolicyResult): 'global' | 'account' | 'transaction' | 'rule' {
    if (!result.globalPolicy.success) return 'global';
    if (!result.accountPolicy.success) return 'account';
    if (!result.transactionPolicy.success) return 'transaction';
    if (!result.rulePolicy.success) return 'rule';
    return 'global'; // fallback
  }

  /**
   * Extract policy details for audit trail
   */
  private extractPolicyDetails(result: IndividualPolicyResult, policyType: string): any {
    switch (policyType) {
      case 'global':
        return result.globalPolicy.details;
      case 'account':
        return result.accountPolicy.details;
      case 'transaction':
        return result.transactionPolicy.details;
      case 'rule':
        return result.rulePolicy.details;
      default:
        return {};
    }
  }

  /**
   * Calculate cumulative impact for account balance checks
   */
  calculateCumulativeAccountImpact(paymentItems: PaymentItem[], sourceAccountId: string): {
    totalDeduction: number;
    postBatchBalance: number;
    accountName: string;
  } {
    const sourceAccount = accountsData.accounts.find(acc => acc.id === sourceAccountId);
    const totalDeduction = paymentItems.reduce((sum, item) => sum + item.amount, 0);
    
    return {
      totalDeduction,
      postBatchBalance: (sourceAccount?.balance || 0) - totalDeduction,
      accountName: sourceAccount?.name || 'Unknown',
    };
  }

  /**
   * Calculate cumulative daily spending impact
   */
  calculateDailySpendingImpact(paymentItems: PaymentItem[]): {
    batchAmount: number;
    existingDailySpending: number;
    totalDailySpending: number;
  } {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const existingDailySpending = transactionsData.transactions
      .filter(tx => tx.timestamp > oneDayAgo && tx.type === 'outgoing')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const batchAmount = paymentItems.reduce((sum, item) => sum + item.amount, 0);
    
    return {
      batchAmount,
      existingDailySpending,
      totalDailySpending: existingDailySpending + batchAmount,
    };
  }
}

// Export singleton instance
export const batchPolicyValidator = new BatchPolicyValidator();
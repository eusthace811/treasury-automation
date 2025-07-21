import type { PaymentItem, BatchPaymentResult } from './schema';
import { accountsData } from '@/data/mockup/accounts';
import { transactionsData, type Transaction } from '@/data/mockup/transactions';
import { treasurySimulator } from './simulator';

// Individual payment execution result
export interface PaymentExecutionResult {
  success: boolean;
  paymentItem: PaymentItem;
  transactionId?: string;
  transactionHash?: string;
  error?: string;
  executionTime: number;
}

// Batch execution summary
export interface BatchExecutionSummary {
  totalItems: number;
  successfulPayments: number;
  failedPayments: number;
  totalAmountProcessed: number;
  totalExecutionTime: number;
  balanceChanges: {
    accountId: string;
    accountName: string;
    originalBalance: number;
    newBalance: number;
    totalDeducted: number;
  }[];
}

export class BatchPaymentProcessor {
  /**
   * Execute a batch of validated payment items
   */
  async executeBatch(
    chatId: string,
    validPaymentItems: PaymentItem[],
    sourceAccountId: string
  ): Promise<BatchPaymentResult> {
    const startTime = Date.now();
    
    const result: BatchPaymentResult = {
      success: true,
      totalAmount: 0,
      itemCount: validPaymentItems.length,
      successfulPayments: [],
      failedPayments: [],
      policyViolations: [], // This should be empty since items are pre-validated
      executionTimeMs: 0,
      auditTrail: {
        resolutionSteps: [],
        policyChecks: [],
        executionSteps: [],
      },
    };

    // Find source account
    const sourceAccount = accountsData.accounts.find(acc => acc.id === sourceAccountId);
    if (!sourceAccount) {
      result.success = false;
      result.auditTrail.executionSteps.push(`ERROR: Source account ${sourceAccountId} not found`);
      return result;
    }

    console.log(`💳 Starting batch payment execution: ${validPaymentItems.length} items from ${sourceAccount.name}`);
    result.auditTrail.executionSteps.push(`🚀 Batch execution initiated: ${validPaymentItems.length} payments from ${sourceAccount.name}`);
    result.auditTrail.executionSteps.push(`💰 Source account balance: ${sourceAccount.balance} ${sourceAccount.currency}`);
    
    // Enhanced payment breakdown for audit
    const paymentsBySource = validPaymentItems.reduce((acc, item) => {
      acc[item.context.source] = (acc[item.context.source] || []).concat(item);
      return acc;
    }, {} as Record<string, PaymentItem[]>);
    
    result.auditTrail.executionSteps.push(`📊 Payment breakdown by source:`);
    for (const [source, items] of Object.entries(paymentsBySource)) {
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      result.auditTrail.executionSteps.push(`  • ${source}: ${items.length} payments, ${total} ${items[0]?.currency || 'USDC'}`);
    }

    // Calculate total amount and verify final balance check
    const totalAmount = validPaymentItems.reduce((sum, item) => sum + item.amount, 0);
    result.totalAmount = totalAmount;

    const finalBalance = sourceAccount.balance - totalAmount;
    result.auditTrail.executionSteps.push(`Total batch amount: ${totalAmount} ${validPaymentItems[0]?.currency || 'USDC'}`);
    result.auditTrail.executionSteps.push(`Account balance check: ${sourceAccount.balance} → ${finalBalance} ${sourceAccount.currency}`);

    // Execute each payment individually
    const executionResults: PaymentExecutionResult[] = [];
    let successfulCount = 0;
    let totalProcessedAmount = 0;

    for (const paymentItem of validPaymentItems) {
      const executionResult = await this.executeIndividualPayment(
        chatId,
        paymentItem,
        sourceAccount
      );

      executionResults.push(executionResult);

      if (executionResult.success) {
        successfulCount++;
        totalProcessedAmount += paymentItem.amount;
        result.successfulPayments.push(paymentItem);
        result.auditTrail.executionSteps.push(
          `✅ Payment executed: ${paymentItem.amount} ${paymentItem.currency} to ${paymentItem.beneficiaryName} (${executionResult.transactionId})`
        );
      } else {
        result.failedPayments.push({
          item: paymentItem,
          reason: executionResult.error || 'Execution failed',
          policyViolation: undefined, // Execution failures, not policy violations
        });
        result.auditTrail.executionSteps.push(
          `❌ Payment failed: ${paymentItem.beneficiaryName} - ${executionResult.error}`
        );
      }
    }

    // Update source account balance (only deduct successful payments)
    const originalBalance = sourceAccount.balance;
    sourceAccount.balance -= totalProcessedAmount;
    sourceAccount.updatedAt = Math.floor(Date.now() / 1000);

    result.auditTrail.executionSteps.push(
      `Account balance updated: ${originalBalance} → ${sourceAccount.balance} ${sourceAccount.currency} (deducted: ${totalProcessedAmount})`
    );

    // Set overall success status
    result.success = result.failedPayments.length === 0;
    result.executionTimeMs = Date.now() - startTime;

    // Generate comprehensive final audit summary
    result.auditTrail.executionSteps.push(`🎯 Batch execution summary:`);
    result.auditTrail.executionSteps.push(`  • Success rate: ${successfulCount}/${validPaymentItems.length} (${Math.round(successfulCount / validPaymentItems.length * 100)}%)`);
    result.auditTrail.executionSteps.push(`  • Total processed: ${totalProcessedAmount} ${validPaymentItems[0]?.currency || 'USDC'}`);
    result.auditTrail.executionSteps.push(`  • Failed payments: ${result.failedPayments.length}`);
    result.auditTrail.executionSteps.push(`  • Final account balance: ${sourceAccount.balance} ${sourceAccount.currency}`);
    result.auditTrail.executionSteps.push(`  • Average payment size: ${Math.round((totalProcessedAmount / successfulCount) * 100) / 100 || 0} ${validPaymentItems[0]?.currency || 'USDC'}`);
    result.auditTrail.executionSteps.push(`  • Processing time: ${result.executionTimeMs}ms (${Math.round(result.executionTimeMs / validPaymentItems.length)}ms per payment)`);
    
    if (result.failedPayments.length > 0) {
      result.auditTrail.executionSteps.push(`❌ Failed payment details:`);
      for (const failed of result.failedPayments.slice(0, 3)) {
        result.auditTrail.executionSteps.push(`  • ${failed.item.beneficiaryName}: ${failed.reason}`);
      }
      if (result.failedPayments.length > 3) {
        result.auditTrail.executionSteps.push(`  • ... and ${result.failedPayments.length - 3} more failures`);
      }
    }

    console.log(`💳 Batch execution completed: ${successfulCount}/${validPaymentItems.length} successful, ${totalProcessedAmount} ${validPaymentItems[0]?.currency || 'USDC'} processed`);

    return result;
  }

  /**
   * Execute a single payment item
   */
  private async executeIndividualPayment(
    chatId: string,
    paymentItem: PaymentItem,
    sourceAccount: any
  ): Promise<PaymentExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Generate transaction ID and hash
      const transactionId = this.generateTransactionId(chatId, paymentItem.beneficiaryId);
      const transactionHash = this.generateTransactionHash();

      // Create transaction record
      const transaction: Transaction = {
        id: transactionId,
        type: 'outgoing',
        amount: paymentItem.amount,
        currency: paymentItem.currency,
        fromAddress: sourceAccount.address,
        toAddress: paymentItem.beneficiaryAddress,
        description: paymentItem.context.description,
        category: this.determineTransactionCategory(paymentItem),
        timestamp: Date.now(),
        status: 'confirmed', // Simulation always succeeds
        createdAt: Date.now(),
        updatedAt: Date.now(),
        transactionHash: transactionHash,
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
        gasUsed: Math.floor(Math.random() * 21000) + 21000,
        gasFee: Math.floor(Math.random() * 50) + 10,
      };

      // Add to transaction history
      transactionsData.transactions.push(transaction);

      // Log successful execution
      console.log(`💸 Payment executed: ${paymentItem.amount} ${paymentItem.currency} to ${paymentItem.beneficiaryName} (${transactionId})`);

      return {
        success: true,
        paymentItem,
        transactionId,
        transactionHash,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`❌ Payment execution failed for ${paymentItem.beneficiaryName}:`, error);
      
      return {
        success: false,
        paymentItem,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate deterministic transaction ID
   */
  private generateTransactionId(chatId: string, beneficiaryId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `batch_${chatId}_${beneficiaryId.substring(0, 8)}_${timestamp}_${random}`;
  }

  /**
   * Generate transaction hash (simulated)
   */
  private generateTransactionHash(): string {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  /**
   * Determine transaction category based on payment context
   */
  private determineTransactionCategory(paymentItem: PaymentItem): string {
    const categoryMap: Record<string, string> = {
      invoice: 'contractor_payment',
      salary: 'payroll',
      calculation: 'calculated_payment',
      split: 'split_payment',
      leftover: 'balance_distribution',
      simple: 'general_payment',
    };
    
    return categoryMap[paymentItem.context.source] || 'batch_payment';
  }

  /**
   * Execute batch with dry run capability
   */
  async executeBatchWithDryRun(
    chatId: string,
    validPaymentItems: PaymentItem[],
    sourceAccountId: string,
    dryRun: boolean = false
  ): Promise<BatchPaymentResult> {
    if (dryRun) {
      return this.simulateBatchExecution(chatId, validPaymentItems, sourceAccountId);
    } else {
      return this.executeBatch(chatId, validPaymentItems, sourceAccountId);
    }
  }

  /**
   * Simulate batch execution without actually processing payments
   */
  private async simulateBatchExecution(
    chatId: string,
    validPaymentItems: PaymentItem[],
    sourceAccountId: string
  ): Promise<BatchPaymentResult> {
    const startTime = Date.now();
    const totalAmount = validPaymentItems.reduce((sum, item) => sum + item.amount, 0);
    
    const result: BatchPaymentResult = {
      success: true,
      totalAmount,
      itemCount: validPaymentItems.length,
      successfulPayments: [...validPaymentItems], // All would succeed in simulation
      failedPayments: [],
      policyViolations: [],
      executionTimeMs: 0,
      auditTrail: {
        resolutionSteps: [],
        policyChecks: [],
        executionSteps: [
          'DRY RUN MODE: Simulating batch execution',
          `Would execute ${validPaymentItems.length} payments`,
          `Total amount: ${totalAmount} ${validPaymentItems[0]?.currency || 'USDC'}`,
          'No actual payments processed',
        ],
      },
    };

    result.executionTimeMs = Date.now() - startTime;

    return result;
  }

  /**
   * Get execution summary for reporting
   */
  generateExecutionSummary(
    batchResult: BatchPaymentResult,
    sourceAccount: any
  ): BatchExecutionSummary {
    return {
      totalItems: batchResult.itemCount,
      successfulPayments: batchResult.successfulPayments.length,
      failedPayments: batchResult.failedPayments.length,
      totalAmountProcessed: batchResult.successfulPayments.reduce((sum, item) => sum + item.amount, 0),
      totalExecutionTime: batchResult.executionTimeMs,
      balanceChanges: [{
        accountId: sourceAccount.id,
        accountName: sourceAccount.name,
        originalBalance: sourceAccount.balance + batchResult.totalAmount, // Approximate original
        newBalance: sourceAccount.balance,
        totalDeducted: batchResult.totalAmount,
      }],
    };
  }

  /**
   * Rollback failed batch execution (in a real system)
   */
  async rollbackBatchExecution(
    chatId: string,
    partialResults: PaymentExecutionResult[]
  ): Promise<{ success: boolean; message: string }> {
    console.log(`🔄 Rollback requested for chat ${chatId} - ${partialResults.length} partial results`);
    
    // In a real system, this would reverse any successful transactions
    // For simulation, we just log the rollback
    const successfulTransactions = partialResults.filter(r => r.success);
    
    if (successfulTransactions.length === 0) {
      return {
        success: true,
        message: 'No transactions to rollback',
      };
    }

    // Simulate rollback by removing transactions and restoring balance
    for (const result of successfulTransactions) {
      // Remove from transaction history
      const txIndex = transactionsData.transactions.findIndex(tx => tx.id === result.transactionId);
      if (txIndex !== -1) {
        transactionsData.transactions.splice(txIndex, 1);
      }
    }

    return {
      success: true,
      message: `Rolled back ${successfulTransactions.length} transactions`,
    };
  }
}

// Export singleton instance
export const batchPaymentProcessor = new BatchPaymentProcessor();
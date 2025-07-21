import type { TreasuryRuleData } from './schema';
import { accountsData, type Account } from '@/data/mockup/accounts';
import { beneficiariesData, type Employee, type Contractor } from '@/data/mockup/beneficiaries';
import { transactionsData, type Transaction } from '@/data/mockup/transactions';
import { treasuryData } from '@/data/mockup/treasury';
import { treasuryContextResolver, type AmountResolutionContext } from './context-resolver';
import { safeFormulaEvaluator } from './formula-evaluator';

export interface SimulationResult {
  success: boolean;
  message: string;
  transactions: SimulatedTransaction[];
  balance_changes: BalanceChange[];
  errors: string[];
  warnings: string[];
  metadata: SimulationMetadata;
}

export interface SimulatedTransaction {
  id: string;
  type: 'outgoing';
  amount: number;
  currency: string;
  from_account: string;
  to_beneficiary: string;
  beneficiary_address: string;
  description: string;
  category: string;
  timestamp: number;
  hash: string;
  block_number: number;
  gas_used: number;
  gas_fee: number;
  status: 'confirmed';
}

export interface BalanceChange {
  account_id: string;
  account_name: string;
  original_balance: number;
  new_balance: number;
  change_amount: number;
  currency: string;
}

export interface SimulationMetadata {
  execution_id: string;
  chat_id: string;
  rule_original: string;
  simulation_timestamp: number;
  total_amount: number;
  beneficiary_count: number;
  transaction_count: number;
  estimated_gas_cost: number;
  treasury_impact: TreasuryImpact;
}

export interface TreasuryImpact {
  total_balance_before: number;
  total_balance_after: number;
  runway_before_months: number;
  runway_after_months: number;
  runway_reduction_days: number;
  burn_rate_impact_percent: number;
}

export class TreasurySimulator {
  private static instance: TreasurySimulator;
  
  public static getInstance(): TreasurySimulator {
    if (!TreasurySimulator.instance) {
      TreasurySimulator.instance = new TreasurySimulator();
    }
    return TreasurySimulator.instance;
  }

  /**
   * Simulate a complete payment execution
   */
  async simulatePayment(
    chatId: string,
    ruleData: TreasuryRuleData
  ): Promise<SimulationResult> {
    try {
      console.log('🎭 Starting payment simulation for chat:', chatId);
      
      const result: SimulationResult = {
        success: true,
        message: '',
        transactions: [],
        balance_changes: [],
        errors: [],
        warnings: [],
        metadata: {} as SimulationMetadata,
      };

      // Build context for amount resolution
      const context: AmountResolutionContext = {};
      
      // Validate and extract payment amount
      const paymentAmount = this.extractPaymentAmount(ruleData, context);
      if (!paymentAmount || paymentAmount <= 0) {
        result.success = false;
        result.errors.push('Invalid payment amount');
        return result;
      }

      // Find source account
      const sourceAccount = this.findAccount(ruleData.payment.source);
      if (!sourceAccount) {
        result.success = false;
        result.errors.push(`Source account not found: ${ruleData.payment.source}`);
        return result;
      }

      // Validate sufficient funds
      if (sourceAccount.balance < paymentAmount) {
        result.success = false;
        result.errors.push(
          `Insufficient funds: ${sourceAccount.balance} < ${paymentAmount} USDC`
        );
        return result;
      }

      // Calculate treasury impact before execution
      const treasuryBefore = this.calculateTreasurySnapshot();

      // Execute payment breakdown
      const paymentBreakdown = this.calculatePaymentBreakdown(ruleData, paymentAmount);
      if (!paymentBreakdown.success) {
        result.success = false;
        result.errors.push(...paymentBreakdown.errors);
        return result;
      }

      const timestamp = Date.now();
      let totalExecuted = 0;

      // Process each payment
      for (const payment of paymentBreakdown.payments) {
        const beneficiary = this.findBeneficiary(payment.beneficiaryId);
        if (!beneficiary) {
          result.errors.push(`Beneficiary not found: ${payment.beneficiaryId}`);
          continue;
        }

        // Create simulated transaction
        const transaction = this.createSimulatedTransaction(
          sourceAccount,
          beneficiary,
          payment.amount,
          ruleData,
          timestamp
        );

        // Add to transaction history
        transactionsData.transactions.push({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          fromAddress: sourceAccount.address,
          toAddress: transaction.beneficiary_address,
          description: transaction.description,
          category: transaction.category,
          timestamp: transaction.timestamp,
          status: transaction.status,
          createdAt: transaction.timestamp,
          updatedAt: transaction.timestamp,
          transactionHash: transaction.hash,
          blockNumber: transaction.block_number,
          gasUsed: transaction.gas_used,
          gasFee: transaction.gas_fee,
        });

        result.transactions.push(transaction);
        totalExecuted += payment.amount;
      }

      // Update account balance
      const originalBalance = sourceAccount.balance;
      sourceAccount.balance -= totalExecuted;
      sourceAccount.updatedAt = Math.floor(timestamp / 1000);

      result.balance_changes.push({
        account_id: sourceAccount.id,
        account_name: sourceAccount.name,
        original_balance: originalBalance,
        new_balance: sourceAccount.balance,
        change_amount: -totalExecuted,
        currency: sourceAccount.currency,
      });

      // Calculate treasury impact after execution
      const treasuryAfter = this.calculateTreasurySnapshot();
      const treasuryImpact = this.calculateTreasuryImpact(treasuryBefore, treasuryAfter);

      // Generate metadata
      result.metadata = {
        execution_id: `sim_${chatId}_${timestamp}`,
        chat_id: chatId,
        rule_original: ruleData.original,
        simulation_timestamp: timestamp,
        total_amount: totalExecuted,
        beneficiary_count: ruleData.payment.beneficiary.length,
        transaction_count: result.transactions.length,
        estimated_gas_cost: result.transactions.reduce((sum, tx) => sum + tx.gas_fee, 0),
        treasury_impact: treasuryImpact,
      };

      result.success = result.errors.length === 0;
      result.message = result.success 
        ? `Successfully simulated ${totalExecuted} USDC payment to ${result.transactions.length} beneficiaries`
        : `Simulation failed: ${result.errors.join(', ')}`;

      console.log('🎭 Payment simulation completed:', result.success ? 'SUCCESS' : 'FAILED');
      return result;
      
    } catch (error) {
      console.error('❌ Payment simulation failed:', error);
      return {
        success: false,
        message: 'Simulation failed due to system error',
        transactions: [],
        balance_changes: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        metadata: {} as SimulationMetadata,
      };
    }
  }

  private extractPaymentAmount(ruleData: TreasuryRuleData, context?: AmountResolutionContext): number | null {
    // Handle simple string amounts
    if (typeof ruleData.payment.amount === 'string') {
      const amount = parseFloat(ruleData.payment.amount);
      return isNaN(amount) ? null : amount;
    }
    
    // Handle dynamic amounts with source + formula structure
    if (typeof ruleData.payment.amount === 'object' && 'source' in ruleData.payment.amount) {
      const { source, formula } = ruleData.payment.amount;
      
      // Resolve the source value using context resolver
      const sourceValue = treasuryContextResolver.resolve(source, context);
      if (sourceValue === null) {
        console.warn(`Failed to resolve payment amount source: ${source}`);
        return null;
      }
      
      // Apply formula if provided
      if (formula) {
        const evaluatedAmount = safeFormulaEvaluator.evaluate(formula, sourceValue);
        if (evaluatedAmount === null) {
          console.warn(`Failed to evaluate payment amount formula: ${formula}`);
          return null;
        }
        return evaluatedAmount;
      }
      
      return sourceValue;
    }
    
    return null;
  }

  private findAccount(accountIdentifier: string): Account | undefined {
    return accountsData.accounts.find(acc => 
      acc.id === accountIdentifier || 
      acc.name === accountIdentifier || 
      acc.slug === accountIdentifier ||
      acc.address === accountIdentifier
    );
  }

  private findBeneficiary(beneficiaryId: string): Employee | Contractor | undefined {
    return [...beneficiariesData.employees, ...beneficiariesData.contractors].find(b => b.id === beneficiaryId);
  }

  private calculatePaymentBreakdown(ruleData: TreasuryRuleData, totalAmount: number) {
    const result = {
      success: true,
      errors: [] as string[],
      payments: [] as { beneficiaryId: string; amount: number }[],
    };

    switch (ruleData.payment.action) {
      case 'simple':
        if (ruleData.payment.beneficiary.length !== 1) {
          result.success = false;
          result.errors.push('Simple payment must have exactly one beneficiary');
        } else {
          result.payments.push({
            beneficiaryId: ruleData.payment.beneficiary[0],
            amount: totalAmount,
          });
        }
        break;

      case 'split':
        if (!ruleData.payment.percentages || ruleData.payment.percentages.length !== ruleData.payment.beneficiary.length) {
          result.success = false;
          result.errors.push('Split payment requires percentages for each beneficiary');
        } else {
          ruleData.payment.beneficiary.forEach((beneficiaryId, index) => {
            const percentage = ruleData.payment.percentages![index];
            const amount = (totalAmount * percentage) / 100;
            result.payments.push({
              beneficiaryId,
              amount: Math.round(amount * 100) / 100,
            });
          });
        }
        break;

      case 'calculation':
      case 'leftover':
        const equalAmount = totalAmount / ruleData.payment.beneficiary.length;
        ruleData.payment.beneficiary.forEach(beneficiaryId => {
          result.payments.push({
            beneficiaryId,
            amount: Math.round(equalAmount * 100) / 100,
          });
        });
        break;

      default:
        result.success = false;
        result.errors.push(`Unknown payment action: ${ruleData.payment.action}`);
    }

    return result;
  }

  private createSimulatedTransaction(
    sourceAccount: Account,
    beneficiary: Employee | Contractor,
    amount: number,
    ruleData: TreasuryRuleData,
    timestamp: number
  ): SimulatedTransaction {
    return {
      id: `sim_tx_${timestamp}_${Math.random().toString(36).substring(2, 8)}`,
      type: 'outgoing',
      amount,
      currency: ruleData.payment.currency,
      from_account: sourceAccount.name,
      to_beneficiary: beneficiary.name,
      beneficiary_address: beneficiary.walletAddress,
      description: `Simulated payment: ${ruleData.original}`,
      category: this.determineCategory(ruleData, beneficiary),
      timestamp,
      hash: this.generateTransactionHash(),
      block_number: Math.floor(Math.random() * 1000000) + 18000000,
      gas_used: Math.floor(Math.random() * 21000) + 21000,
      gas_fee: Math.floor(Math.random() * 50) + 10,
      status: 'confirmed',
    };
  }

  private determineCategory(ruleData: TreasuryRuleData, beneficiary: Employee | Contractor): string {
    const original = ruleData.original.toLowerCase();
    
    // Category mapping based on keywords
    const categoryMap = {
      salary: 'payroll',
      payroll: 'payroll',
      contractor: 'contractor',
      freelance: 'contractor',
      bonus: 'bonus',
      reward: 'bonus',
      refund: 'reimbursement',
      reimburse: 'reimbursement',
      vendor: 'vendor',
      supplier: 'vendor',
      marketing: 'marketing',
      advertising: 'marketing',
    };

    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (original.includes(keyword)) {
        return category;
      }
    }

    // Fallback to beneficiary type - check if contractor by checking for specific contractor properties
    const isContractor = 'hourlyRate' in beneficiary || 'projectType' in beneficiary;
    return isContractor ? 'contractor_payment' : 'employee_payment';
  }

  private generateTransactionHash(): string {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  private calculateTreasurySnapshot() {
    const totalBalance = accountsData.accounts
      .filter(acc => acc.isActive && !acc.deletedAt)
      .reduce((sum, acc) => sum + acc.balance, 0);
    
    return {
      total_balance: totalBalance,
      monthly_burn_rate: treasuryData.treasury.monthlyBurnRate,
      runway_months: totalBalance / treasuryData.treasury.monthlyBurnRate,
    };
  }

  private calculateTreasuryImpact(before: any, after: any): TreasuryImpact {
    const runwayReductionMonths = before.runway_months - after.runway_months;
    const runwayReductionDays = runwayReductionMonths * 30;
    
    return {
      total_balance_before: before.total_balance,
      total_balance_after: after.total_balance,
      runway_before_months: before.runway_months,
      runway_after_months: after.runway_months,
      runway_reduction_days: Math.round(runwayReductionDays * 10) / 10,
      burn_rate_impact_percent: ((before.total_balance - after.total_balance) / before.monthly_burn_rate) * 100,
    };
  }

  /**
   * Reset simulation state (useful for testing)
   */
  resetSimulation(): void {
    // Note: In a real implementation, this might reset to original state
    // For now, we don't modify the original mockup data
    console.log('🔄 Simulation state reset requested');
  }

  /**
   * Get current treasury status
   */
  getTreasuryStatus() {
    return this.calculateTreasurySnapshot();
  }

  /**
   * Validate simulation environment
   */
  validateEnvironment(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (accountsData.accounts.length === 0) {
      issues.push('No accounts available for simulation');
    }
    
    if (beneficiariesData.employees.length === 0 && beneficiariesData.contractors.length === 0) {
      issues.push('No beneficiaries available for simulation');
    }
    
    const activeAccounts = accountsData.accounts.filter(acc => acc.isActive && !acc.deletedAt);
    if (activeAccounts.length === 0) {
      issues.push('No active accounts available for simulation');
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// Export singleton instance
export const treasurySimulator = TreasurySimulator.getInstance();
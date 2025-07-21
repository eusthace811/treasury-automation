import type { TreasuryRuleData } from './schema';
import { accountsData } from '@/data/mockup/accounts';
import { beneficiariesData } from '@/data/mockup/beneficiaries';
import { invoicesData } from '@/data/mockup/invoices';

// Individual payment item after resolution and calculation
export interface PaymentItem {
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryAddress: string;
  amount: number;
  currency: string;
  context: {
    source:
      | 'invoice'
      | 'salary'
      | 'calculation'
      | 'split'
      | 'leftover'
      | 'simple';
    referenceId?: string; // invoice ID, employee ID, etc.
    description: string;
    originalAmount?: number; // For splits/calculations
    percentage?: number; // For split payments
  };
}

// Resolution map item for audit trail
export interface ResolutionMapItem {
  type: 'direct' | 'collection';
  resolvedCount: number;
  beneficiaryName?: string;
  baseAmount?: number;
  items?: { name: string; amount?: number }[];
}

// Collection resolution result
export interface CollectionResolution {
  success: boolean;
  message: string;
  resolvedItems: ResolvedCollectionItem[];
  errors: string[];
  details: {
    processingSteps: string[];
    resolutionMap: Record<string, ResolutionMapItem>;
    originalBeneficiaryIds?: string[];
    totalResolved?: number;
    filteredInactive?: number;
    finalActiveCount?: number;
    summary?: {
      directResolutions: number;
      collectionResolutions: number;
      totalBeneficiariesFromCollections: number;
    };
  };
}

// Resolved collection item (before amount calculation)
export interface ResolvedCollectionItem {
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryAddress: string;
  baseAmount?: number; // For invoice amounts, salary amounts, etc.
  metadata: Record<string, any>; // Invoice data, employee data, etc.
}

// Payment resolution result
export interface PaymentResolution {
  success: boolean;
  message: string;
  paymentItems: PaymentItem[];
  totalAmount: number;
  errors: string[];
  resolutionSteps: string[];
  details: {
    originalRule: TreasuryRuleData;
    collectionResolution?: CollectionResolution;
    amountCalculation: {
      method: string;
      totalCalculated: number;
      breakdown: Record<string, any>;
    };
  };
}

export class PaymentResolver {
  /**
   * Main entry point: resolve a treasury rule into individual payment items
   */
  async resolvePayments(
    ruleData: TreasuryRuleData,
  ): Promise<PaymentResolution> {
    const result: PaymentResolution = {
      success: true,
      message: '',
      paymentItems: [],
      totalAmount: 0,
      errors: [],
      resolutionSteps: [],
      details: {
        originalRule: ruleData,
        amountCalculation: {
          method: ruleData.payment.action,
          totalCalculated: 0,
          breakdown: {},
        },
      },
    };

    try {
      // Step 1: Resolve collections (beneficiaries)
      result.resolutionSteps.push(
        '🔍 Starting beneficiary collection resolution',
      );
      result.resolutionSteps.push(
        `📋 Input beneficiaries: [${ruleData.payment.beneficiary.join(', ')}]`,
      );

      const collectionResult = await this.resolveCollections(ruleData);
      result.details.collectionResolution = collectionResult;

      // Enhanced collection resolution audit
      result.resolutionSteps.push(
        `🎯 Collection resolution ${collectionResult.success ? 'SUCCESS' : 'FAILED'}: ${collectionResult.message}`,
      );
      if (collectionResult.resolvedItems.length > 0) {
        result.resolutionSteps.push(
          `👥 Resolved ${collectionResult.resolvedItems.length} beneficiaries:`,
        );
        for (const item of collectionResult.resolvedItems.slice(0, 5)) {
          // Show first 5 to prevent log spam
          const baseAmtStr = item.baseAmount
            ? ` (base: ${item.baseAmount})`
            : '';
          result.resolutionSteps.push(
            `  • ${item.beneficiaryName} (${item.beneficiaryId})${baseAmtStr}`,
          );
        }
        if (collectionResult.resolvedItems.length > 5) {
          result.resolutionSteps.push(
            `  • ... and ${collectionResult.resolvedItems.length - 5} more`,
          );
        }
      }

      if (!collectionResult.success) {
        result.success = false;
        result.errors.push(...collectionResult.errors);
        result.message = `Collection resolution failed: ${collectionResult.message}`;
        result.resolutionSteps.push(
          `❌ Terminating due to collection resolution failure`,
        );
        return result;
      }

      // Step 2: Calculate amounts based on payment action
      result.resolutionSteps.push(
        `💰 Calculating payment amounts using ${ruleData.payment.action} action`,
      );
      result.resolutionSteps.push(`💱 Currency: ${ruleData.payment.currency}`);

      const paymentItems = await this.calculatePaymentAmounts(
        ruleData,
        collectionResult.resolvedItems,
      );

      if (paymentItems.length === 0) {
        result.success = false;
        result.errors.push('No payment items generated from calculation');
        result.message = 'Amount calculation resulted in no valid payments';
        result.resolutionSteps.push(
          `❌ Amount calculation produced zero valid payments`,
        );
        return result;
      }

      // Enhanced amount calculation audit
      result.resolutionSteps.push(
        `✅ Generated ${paymentItems.length} individual payment items:`,
      );
      let totalCalculated = 0;
      for (const item of paymentItems.slice(0, 5)) {
        // Show first 5 to prevent log spam
        totalCalculated += item.amount;
        result.resolutionSteps.push(
          `  • ${item.beneficiaryName}: ${item.amount} ${item.currency} (${item.context.source})`,
        );
      }
      if (paymentItems.length > 5) {
        // Calculate remaining total
        const remainingTotal = paymentItems
          .slice(5)
          .reduce((sum, item) => sum + item.amount, 0);
        totalCalculated += remainingTotal;
        result.resolutionSteps.push(
          `  • ... and ${paymentItems.length - 5} more items (${remainingTotal} ${ruleData.payment.currency})`,
        );
      }

      // Step 3: Validate and finalize
      result.paymentItems = paymentItems;
      result.totalAmount = paymentItems.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      result.details.amountCalculation.totalCalculated = result.totalAmount;

      // Enhanced breakdown information
      const itemsBySource = paymentItems.reduce(
        (acc, item) => {
          acc[item.context.source] = (acc[item.context.source] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      result.details.amountCalculation.breakdown = {
        itemCount: paymentItems.length,
        averageAmount: result.totalAmount / paymentItems.length,
        currency: ruleData.payment.currency,
        sourceBreakdown: itemsBySource,
        totalAmountVerification:
          totalCalculated === result.totalAmount ? 'VERIFIED' : 'MISMATCH',
      };

      result.resolutionSteps.push(`📊 Payment calculation summary:`);
      result.resolutionSteps.push(
        `  • Total amount: ${result.totalAmount} ${ruleData.payment.currency}`,
      );
      result.resolutionSteps.push(
        `  • Average per payment: ${Math.round((result.totalAmount / paymentItems.length) * 100) / 100} ${ruleData.payment.currency}`,
      );
      result.resolutionSteps.push(
        `  • Payment sources: ${Object.entries(itemsBySource)
          .map(([source, count]) => `${source}(${count})`)
          .join(', ')}`,
      );
      result.resolutionSteps.push(
        `✅ Payment resolution completed successfully`,
      );

      result.message = `Successfully resolved ${paymentItems.length} individual payments totaling ${result.totalAmount} ${ruleData.payment.currency}`;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown resolution error',
      );
      result.message = 'Payment resolution system error';
      return result;
    }
  }

  /**
   * Resolve beneficiary collections based on rule data
   */
  private async resolveCollections(
    ruleData: TreasuryRuleData,
  ): Promise<CollectionResolution> {
    const result: CollectionResolution = {
      success: true,
      message: '',
      resolvedItems: [],
      errors: [],
      details: {
        processingSteps: [],
        resolutionMap: {} as Record<string, ResolutionMapItem>,
      },
    };

    try {
      const allBeneficiaries = [
        ...beneficiariesData.employees,
        ...beneficiariesData.contractors,
      ];
      result.details.processingSteps.push(
        `📊 Available beneficiaries: ${beneficiariesData.employees.length} employees, ${beneficiariesData.contractors.length} contractors`,
      );

      // Process each beneficiary ID in the rule
      for (const beneficiaryId of ruleData.payment.beneficiary) {
        result.details.processingSteps.push(
          `🔍 Processing identifier: "${beneficiaryId}"`,
        );

        // Check if it's a direct beneficiary ID
        const directBeneficiary = allBeneficiaries.find(
          (b) => b.id === beneficiaryId,
        );

        if (directBeneficiary) {
          // Direct beneficiary reference
          result.details.processingSteps.push(
            `✅ Found direct beneficiary: ${directBeneficiary.name} (${directBeneficiary.id})`,
          );
          const baseAmount = this.getBeneficiaryBaseAmount(
            directBeneficiary,
            ruleData,
          );

          result.resolvedItems.push({
            beneficiaryId: directBeneficiary.id,
            beneficiaryName: directBeneficiary.name,
            beneficiaryAddress: directBeneficiary.walletAddress,
            baseAmount,
            metadata: { type: 'direct', beneficiaryData: directBeneficiary },
          });

          result.details.resolutionMap[beneficiaryId] = {
            type: 'direct',
            resolvedCount: 1,
            beneficiaryName: directBeneficiary.name,
            baseAmount,
          };
        } else {
          // Check for collection identifiers
          result.details.processingSteps.push(
            `🔍 Checking collection identifier: "${beneficiaryId}"`,
          );
          const collectionItems = await this.resolveCollectionIdentifier(
            beneficiaryId,
            ruleData,
          );

          if (collectionItems.length > 0) {
            result.details.processingSteps.push(
              `✅ Collection "${beneficiaryId}" resolved to ${collectionItems.length} beneficiaries`,
            );
            result.details.resolutionMap[beneficiaryId] = {
              type: 'collection',
              resolvedCount: collectionItems.length,
              items: collectionItems.map((item) => ({
                name: item.beneficiaryName,
                amount: item.baseAmount,
              })),
            };
          } else {
            result.details.processingSteps.push(
              `❌ Unknown identifier: "${beneficiaryId}" - not a direct beneficiary or recognized collection`,
            );
            result.errors.push(
              `Unknown beneficiary identifier: ${beneficiaryId}`,
            );
          }

          result.resolvedItems.push(...collectionItems);
        }
      }

      // Filter out inactive beneficiaries
      result.details.processingSteps.push(
        `🧹 Filtering for active beneficiaries`,
      );
      const activeItems = result.resolvedItems.filter((item) => {
        const beneficiary = allBeneficiaries.find(
          (b) => b.id === item.beneficiaryId,
        );
        const isActive =
          beneficiary?.status === 'active' && !beneficiary?.deletedAt;

        if (!isActive) {
          const reason = beneficiary?.deletedAt
            ? 'deleted'
            : beneficiary?.status !== 'active'
              ? `status: ${beneficiary?.status}`
              : 'not found';
          result.details.processingSteps.push(
            `  ❌ Filtering out ${item.beneficiaryName}: ${reason}`,
          );
        }

        return isActive;
      });

      const inactiveCount = result.resolvedItems.length - activeItems.length;
      if (inactiveCount > 0) {
        result.errors.push(
          `Filtered out ${inactiveCount} inactive beneficiaries`,
        );
        result.details.processingSteps.push(
          `⚠️  Filtered out ${inactiveCount} inactive/deleted beneficiaries`,
        );
      }

      result.resolvedItems = activeItems;

      // Enhance details with comprehensive audit information
      const summary = {
        directResolutions: Object.values(result.details.resolutionMap).filter(
          (r) => r.type === 'direct',
        ).length,
        collectionResolutions: Object.values(
          result.details.resolutionMap,
        ).filter((r) => r.type === 'collection').length,
        totalBeneficiariesFromCollections: Object.values(
          result.details.resolutionMap,
        )
          .filter((r) => r.type === 'collection')
          .reduce((sum, r) => sum + r.resolvedCount, 0),
      };

      result.details = {
        ...result.details,
        originalBeneficiaryIds: ruleData.payment.beneficiary,
        totalResolved: result.resolvedItems.length,
        filteredInactive: inactiveCount,
        finalActiveCount: activeItems.length,
        summary,
      };

      result.details.processingSteps.push(`📊 Resolution summary:`);
      result.details.processingSteps.push(
        `  • Direct beneficiaries: ${summary.directResolutions}`,
      );
      result.details.processingSteps.push(
        `  • Collection identifiers: ${summary.collectionResolutions}`,
      );
      result.details.processingSteps.push(
        `  • Total from collections: ${summary.totalBeneficiariesFromCollections}`,
      );
      result.details.processingSteps.push(
        `  • Final active count: ${activeItems.length}`,
      );

      if (result.resolvedItems.length === 0) {
        result.success = false;
        result.message =
          'No active beneficiaries resolved from the provided identifiers';
        result.details.processingSteps.push(
          `❌ Collection resolution failed: no active beneficiaries found`,
        );
      } else {
        result.message = `Resolved ${result.resolvedItems.length} active beneficiaries`;
        result.details.processingSteps.push(
          `✅ Collection resolution successful`,
        );
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Collection resolution error',
      );
      result.message = 'Failed to resolve beneficiary collections';
      return result;
    }
  }

  /**
   * Resolve collection identifiers (e.g., "approved-invoices", "active-contractors")
   */
  private async resolveCollectionIdentifier(
    identifier: string,
    ruleData: TreasuryRuleData,
  ): Promise<ResolvedCollectionItem[]> {
    const items: ResolvedCollectionItem[] = [];

    switch (identifier.toLowerCase()) {
      case 'approved-invoices':
      case 'approved_invoices': {
        // Get all approved invoices and resolve to their vendor addresses
        const approvedInvoices = invoicesData.invoices.filter(
          (invoice) => invoice.status === 'approved' && !invoice.deletedAt,
        );

        for (const invoice of approvedInvoices) {
          // Find beneficiary by wallet address matching invoice vendor address
          const beneficiary = [
            ...beneficiariesData.employees,
            ...beneficiariesData.contractors,
          ].find(
            (b) =>
              b.walletAddress.toLowerCase() ===
              invoice.vendorAddress.toLowerCase(),
          );

          if (beneficiary) {
            items.push({
              beneficiaryId: beneficiary.id,
              beneficiaryName: beneficiary.name,
              beneficiaryAddress: beneficiary.walletAddress,
              baseAmount: invoice.amount,
              metadata: { type: 'invoice', invoiceData: invoice },
            });
          }
        }
        break;
      }

      case 'active-contractors':
      case 'active_contractors': {
        // Get all active contractors
        const activeContractors = beneficiariesData.contractors.filter(
          (contractor) =>
            contractor.status === 'active' && !contractor.deletedAt,
        );

        for (const contractor of activeContractors) {
          items.push({
            beneficiaryId: contractor.id,
            beneficiaryName: contractor.name,
            beneficiaryAddress: contractor.walletAddress,
            baseAmount: this.getContractorBaseAmount(contractor, ruleData),
            metadata: { type: 'contractor', contractorData: contractor },
          });
        }
        break;
      }

      case 'all-employees':
      case 'active-employees': {
        // Get all active employees
        const activeEmployees = beneficiariesData.employees.filter(
          (employee) => employee.status === 'active' && !employee.deletedAt,
        );

        for (const employee of activeEmployees) {
          items.push({
            beneficiaryId: employee.id,
            beneficiaryName: employee.name,
            beneficiaryAddress: employee.walletAddress,
            baseAmount: employee.salary,
            metadata: { type: 'employee', employeeData: employee },
          });
        }
        break;
      }

      case 'founders': {
        // Get employees/contractors with founder tag
        const allBeneficiaries = [
          ...beneficiariesData.employees,
          ...beneficiariesData.contractors,
        ];
        const founders = allBeneficiaries.filter(
          (b) =>
            b.tags?.includes('founder') &&
            b.status === 'active' &&
            !b.deletedAt,
        );

        for (const founder of founders) {
          items.push({
            beneficiaryId: founder.id,
            beneficiaryName: founder.name,
            beneficiaryAddress: founder.walletAddress,
            baseAmount: this.getBeneficiaryBaseAmount(founder, ruleData),
            metadata: { type: 'founder', beneficiaryData: founder },
          });
        }
        break;
      }

      default:
        // Not a recognized collection identifier - might be handled elsewhere
        break;
    }

    return items;
  }

  /**
   * Get base amount for a beneficiary based on context
   */
  private getBeneficiaryBaseAmount(
    beneficiary: any,
    ruleData: TreasuryRuleData,
  ): number {
    // For employees, use salary
    if ('salary' in beneficiary) {
      return beneficiary.salary;
    }

    // For contractors, calculate based on hourly rate (default to 40 hours for example)
    if ('hourlyRate' in beneficiary) {
      return beneficiary.hourlyRate * 40; // Default assumption
    }

    // Fallback: try to extract from rule amount if it's a fixed amount
    if (typeof ruleData.payment.amount === 'string') {
      const amount = Number.parseFloat(ruleData.payment.amount);
      return Number.isNaN(amount) ? 0 : amount;
    }

    return 0;
  }

  /**
   * Get base amount for contractor (could be enhanced with actual hours worked)
   */
  private getContractorBaseAmount(
    contractor: any,
    ruleData: TreasuryRuleData,
  ): number {
    // In a real implementation, this would fetch actual hours worked
    // For now, use hourly rate * standard hours
    const standardHours = 40; // Default assumption
    return contractor.hourlyRate * standardHours;
  }

  /**
   * Calculate individual payment amounts based on payment action
   */
  private async calculatePaymentAmounts(
    ruleData: TreasuryRuleData,
    resolvedItems: ResolvedCollectionItem[],
  ): Promise<PaymentItem[]> {
    const paymentItems: PaymentItem[] = [];

    switch (ruleData.payment.action) {
      case 'simple':
        // Simple: Each beneficiary gets the specified amount (or their base amount)
        for (const item of resolvedItems) {
          const amount = item.baseAmount || this.extractRuleAmount(ruleData);
          if (amount > 0) {
            paymentItems.push({
              beneficiaryId: item.beneficiaryId,
              beneficiaryName: item.beneficiaryName,
              beneficiaryAddress: item.beneficiaryAddress,
              amount,
              currency: ruleData.payment.currency,
              context: {
                source: 'simple',
                referenceId:
                  item.metadata?.invoiceData?.id || item.beneficiaryId,
                description: `Simple payment to ${item.beneficiaryName}`,
                originalAmount: amount,
              },
            });
          }
        }
        break;

      case 'split': {
        // Split: Divide total amount by percentages
        const totalAmount = this.extractRuleAmount(ruleData);
        if (
          ruleData.payment.percentages &&
          ruleData.payment.percentages.length === resolvedItems.length
        ) {
          for (let i = 0; i < resolvedItems.length; i++) {
            const item = resolvedItems[i];
            const percentage = ruleData.payment.percentages[i];
            const amount = (totalAmount * percentage) / 100;

            paymentItems.push({
              beneficiaryId: item.beneficiaryId,
              beneficiaryName: item.beneficiaryName,
              beneficiaryAddress: item.beneficiaryAddress,
              amount: Math.round(amount * 100) / 100, // Round to cents
              currency: ruleData.payment.currency,
              context: {
                source: 'split',
                referenceId: item.beneficiaryId,
                description: `Split payment (${percentage}%) to ${item.beneficiaryName}`,
                originalAmount: totalAmount,
                percentage,
              },
            });
          }
        }
        break;
      }

      case 'calculation':
        // Calculation: Use base amounts from resolved items (invoices, salaries, etc.)
        for (const item of resolvedItems) {
          const amount = item.baseAmount || 0;
          if (amount > 0) {
            paymentItems.push({
              beneficiaryId: item.beneficiaryId,
              beneficiaryName: item.beneficiaryName,
              beneficiaryAddress: item.beneficiaryAddress,
              amount,
              currency: ruleData.payment.currency,
              context: {
                source: 'calculation',
                referenceId:
                  item.metadata?.invoiceData?.id || item.beneficiaryId,
                description: `Calculated payment to ${item.beneficiaryName}`,
                originalAmount: amount,
              },
            });
          }
        }
        break;

      case 'leftover': {
        // Leftover: Calculate remaining balance after minimum requirements
        const sourceAccount = accountsData.accounts.find(
          (acc) => acc.id === ruleData.payment.source,
        );
        if (sourceAccount) {
          const minimumBalance = this.getAccountMinimumBalance(
            sourceAccount.name,
          );
          const availableAmount = Math.max(
            0,
            sourceAccount.balance - minimumBalance,
          );

          if (availableAmount > 0 && resolvedItems.length > 0) {
            const amountPerBeneficiary = availableAmount / resolvedItems.length;

            for (const item of resolvedItems) {
              paymentItems.push({
                beneficiaryId: item.beneficiaryId,
                beneficiaryName: item.beneficiaryName,
                beneficiaryAddress: item.beneficiaryAddress,
                amount: Math.round(amountPerBeneficiary * 100) / 100,
                currency: ruleData.payment.currency,
                context: {
                  source: 'leftover',
                  referenceId: item.beneficiaryId,
                  description: `Leftover balance payment to ${item.beneficiaryName}`,
                  originalAmount: availableAmount,
                },
              });
            }
          }
        }
        break;
      }
    }

    return paymentItems;
  }

  /**
   * Extract payment amount from rule data
   */
  private extractRuleAmount(ruleData: TreasuryRuleData): number {
    if (typeof ruleData.payment.amount === 'string') {
      const amount = Number.parseFloat(ruleData.payment.amount);
      return Number.isNaN(amount) ? 0 : amount;
    }

    if (
      typeof ruleData.payment.amount === 'object' &&
      'value' in ruleData.payment.amount
    ) {
      const value = ruleData.payment.amount.value;
      const amount =
        typeof value === 'string' ? Number.parseFloat(value) : value;
      return Number.isNaN(amount) ? 0 : amount;
    }

    return 0;
  }

  /**
   * Get minimum balance for account (simplified version)
   */
  private getAccountMinimumBalance(accountName: string): number {
    const minimums: Record<string, number> = {
      'Operating Account': 10000,
      'Reserve Fund': 10000,
      'Payroll Processing': 50000,
      'Growth Fund': 25000,
      'Profit Sharing Pool': 0,
      'Sales Revenue': 0,
    };

    return minimums[accountName] || 0;
  }
}

// Export singleton instance
export const paymentResolver = new PaymentResolver();

import type { TreasuryRuleData } from '@/lib/treasury/schema';
import {
  accountsData,
  beneficiariesData,
  treasuryData,
  invoicesData,
} from '@/data/mockup';
import { treasuryContextResolver, type AmountResolutionContext } from '@/lib/treasury/context-resolver';
import { safeFormulaEvaluator } from '@/lib/treasury/formula-evaluator';

interface SimulationResult {
  success: boolean;
  payments: Array<{
    from: string;
    fromAccount: {
      name: string;
      slug: string;
      balance: number;
      balanceAfter: number;
    };
    to: string[];
    toDetails: Array<{
      id: string;
      name: string;
      type: 'invoice' | 'employee' | 'contractor' | 'account';
      amount: number;
      description?: string;
      // Additional details for enhanced display
      beneficiaryId?: string;
      walletAddress?: string;
      tags?: string[];
      email?: string;
      role?: string;
    }>;
    amount: string;
    currency: string;
    action: string;
    breakdown?: {
      totalAmount: number;
      itemCount: number;
      description: string;
    };
  }>;
  conditions: Array<{
    description: string;
    passed: boolean;
    value: any;
  }>;
  collections: Array<{
    name: string;
    type: string;
    items: Array<{
      id: string;
      name: string;
      details: any;
    }>;
  }>;
  errors: string[];
  warnings: string[];
}

interface SimulationContext {
  accounts: typeof accountsData.accounts;
  beneficiaries: Array<any>; // Combined employees and contractors
  treasury: typeof treasuryData;
  invoices: typeof invoicesData.invoices;
}

export async function simulateRule(
  ruleData: TreasuryRuleData,
): Promise<SimulationResult> {
  const result: SimulationResult = {
    success: false,
    payments: [],
    conditions: [],
    collections: [],
    errors: [],
    warnings: [],
  };

  try {
    // Create simulation context
    const context: SimulationContext = {
      accounts: accountsData?.accounts || [],
      beneficiaries: [
        ...(beneficiariesData?.employees || []),
        ...(beneficiariesData?.contractors || []),
      ],
      treasury: treasuryData,
      invoices: invoicesData?.invoices || [],
    };

    // Validate rule data
    if (!ruleData.execution || !ruleData.payment) {
      result.errors.push(
        'Invalid rule data: missing execution or payment configuration',
      );
      return result;
    }

    // Validate context data
    if (!context.accounts || context.accounts.length === 0) {
      result.errors.push('No accounts data available for simulation');
      return result;
    }

    if (!context.beneficiaries || context.beneficiaries.length === 0) {
      result.errors.push('No beneficiaries data available for simulation');
      return result;
    }

    // Find source account (by name, ID, slug, or wallet address)
    const sourceAccount = context.accounts.find(
      (account) =>
        account &&
        (account.name === ruleData.payment.source ||
          account.id === ruleData.payment.source ||
          account.slug === ruleData.payment.source ||
          account.address === ruleData.payment.source),
    );

    if (!sourceAccount) {
      result.errors.push(
        `Source account '${ruleData.payment.source}' not found`,
      );
      return result;
    }

    // For batch payments, skip traditional beneficiary resolution
    // as we'll resolve directly from invoices using tags
    let beneficiaries: Array<{ id: string; data: any }> = [];
    
    if (ruleData.payment.action !== 'batch') {
      // Resolve beneficiaries (can be collections, individuals, or addresses)
      beneficiaries = resolveBeneficiaries(
        ruleData.payment.beneficiary,
        context,
        result,
        ruleData.payment.tags,
      );
    }

    // Evaluate conditions
    for (const condition of ruleData.conditions) {
      const conditionResult = await evaluateCondition(
        condition,
        context,
        result,
        ruleData.payment, // Pass payment data for tag-aware filtering
      );
      result.conditions.push(conditionResult);

      if (!conditionResult.passed && condition.when === 'before') {
        result.errors.push(
          `Pre-condition failed: ${condition.description || condition.field}`,
        );
      }
    }

    // Stop if pre-conditions failed
    if (result.errors.length > 0) {
      return result;
    }

    // Calculate payment amounts
    const paymentResult = calculatePayments(
      ruleData.payment,
      sourceAccount,
      beneficiaries,
      context,
    );

    if (paymentResult.error) {
      result.errors.push(paymentResult.error);
      return result;
    }

    result.payments = paymentResult.payments;
    if (paymentResult.collections) {
      result.collections.push(...paymentResult.collections);
    }

    // Check account balance sufficiency
    const totalAmount = result.payments.reduce((sum, payment) => {
      return sum + Number.parseFloat(payment.amount);
    }, 0);

    if (totalAmount > sourceAccount.balance) {
      result.errors.push(
        `Insufficient balance: ${sourceAccount.balance} ${sourceAccount.currency} available, ${totalAmount} ${ruleData.payment.currency} required`,
      );
      return result;
    }

    if (totalAmount > sourceAccount.balance * 0.8) {
      result.warnings.push(
        `High balance usage: Using ${((totalAmount / sourceAccount.balance) * 100).toFixed(1)}% of available balance`,
      );
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    result.errors.push(
      `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  return result;
}

function resolveBeneficiaries(
  beneficiaryIds: string[],
  context: SimulationContext,
  result: SimulationResult,
  paymentTags?: string[],
) {
  const resolvedBeneficiaries: Array<{ id: string; data: any }> = [];

  for (const beneficiaryId of beneficiaryIds) {
    // Handle collections
    if (beneficiaryId === 'contractors') {
      let contractors = beneficiariesData?.contractors || [];

      // Apply tag filtering if payment has tags
      if (paymentTags && paymentTags.length > 0) {
        contractors = contractors.filter(contractor => 
          contractor.tags && paymentTags.some((tag: string) => contractor.tags.includes(tag))
        );
      }

      // Add to collections for display
      result.collections.push({
        name: 'contractors',
        type: paymentTags && paymentTags.length > 0 
          ? `Contractors (filtered by ${paymentTags.join(', ')} tags)`
          : 'Contractors',
        items: contractors.map((contractor) => ({
          id: contractor.id,
          name: contractor.name,
          details: {
            email: contractor.email,
            role: contractor.role,
            walletAddress: contractor.walletAddress,
            status: contractor.status,
            tags: contractor.tags?.join(', ') || 'none',
          },
        })),
      });

      contractors.forEach((contractor) => {
        resolvedBeneficiaries.push({ id: contractor.id, data: contractor });
      });
      continue;
    }

    if (beneficiaryId === 'employees') {
      let employees = beneficiariesData?.employees || [];

      // Apply tag filtering if payment has tags
      if (paymentTags && paymentTags.length > 0) {
        employees = employees.filter(employee => 
          employee.tags && paymentTags.some((tag: string) => employee.tags.includes(tag))
        );
      }

      // Add to collections for display
      result.collections.push({
        name: 'employees',
        type: paymentTags && paymentTags.length > 0 
          ? `Employees (filtered by ${paymentTags.join(', ')} tags)`
          : 'Employees',
        items: employees.map((employee) => ({
          id: employee.id,
          name: employee.name,
          details: {
            email: employee.email,
            role: employee.role,
            department: employee.department,
            walletAddress: employee.walletAddress,
            status: employee.status,
            tags: employee.tags?.join(', ') || 'none',
          },
        })),
      });

      employees.forEach((employee) => {
        resolvedBeneficiaries.push({ id: employee.id, data: employee });
      });
      continue;
    }

    if (beneficiaryId === 'approved_invoices' || beneficiaryId === 'invoices') {
      const allInvoices = context.invoices;
      const approvedInvoices = allInvoices.filter(
        (invoice) => invoice.status === 'approved',
      );

      // Add to collections for display
      result.collections.push({
        name: 'invoices',
        type: 'Invoices',
        items: allInvoices.map((invoice) => ({
          id: invoice.id,
          name: `${invoice.vendorName} - ${invoice.description}`,
          details: {
            amount: invoice.amount,
            currency: invoice.currency,
            status: invoice.status,
            approvedBy: invoice.approvedBy,
            vendorAddress: invoice.vendorAddress,
            dueDate: new Date(invoice.dueDate * 1000).toLocaleDateString(),
          },
        })),
      });

      // Only process approved invoices for payments
      approvedInvoices.forEach((invoice) => {
        // Try to find the beneficiary by vendor name or address
        const beneficiary = context.beneficiaries.find(
          (b) =>
            b &&
            (b.name === invoice.vendorName ||
              b.walletAddress === invoice.vendorAddress ||
              b.email === invoice.vendorName),
        );

        if (beneficiary) {
          resolvedBeneficiaries.push({ id: beneficiary.id, data: beneficiary });
        } else {
          // Create a temporary beneficiary from invoice data
          resolvedBeneficiaries.push({
            id: invoice.id,
            data: {
              id: invoice.id,
              name: invoice.vendorName,
              walletAddress: invoice.vendorAddress,
              invoiceAmount: invoice.amount,
              currency: invoice.currency,
              description: invoice.description,
              type: 'invoice',
            },
          });
        }
      });
      continue;
    }

    // Handle individual lookups - try ID, name, email, wallet address
    const beneficiary = context.beneficiaries.find(
      (b) =>
        b &&
        (b.id === beneficiaryId ||
          b.name === beneficiaryId ||
          b.email === beneficiaryId ||
          b.walletAddress === beneficiaryId),
    );

    if (beneficiary) {
      resolvedBeneficiaries.push({ id: beneficiary.id, data: beneficiary });
    } else {
      // Check if it's an account (by slug, name, or ID)
      const account = context.accounts.find(
        (a) =>
          a &&
          (a.slug === beneficiaryId ||
            a.name === beneficiaryId ||
            a.id === beneficiaryId ||
            a.name.toLowerCase().replace(/\s+/g, '-') === beneficiaryId),
      );

      if (account) {
        resolvedBeneficiaries.push({ 
          id: account.id, 
          data: {
            ...account,
            type: 'account',
          }
        });
      } else if (beneficiaryId.startsWith('0x')) {
        // Check if it's a wallet address without matching beneficiary
        resolvedBeneficiaries.push({
          id: beneficiaryId,
          data: {
            id: beneficiaryId,
            name: `Wallet ${beneficiaryId.slice(0, 8)}...`,
            walletAddress: beneficiaryId,
          },
        });
      } else {
        result.warnings.push(
          `Beneficiary '${beneficiaryId}' not found in data`,
        );
        // Still add it so payment calculation can proceed
        resolvedBeneficiaries.push({ id: beneficiaryId, data: null });
      }
    }
  }

  return resolvedBeneficiaries;
}

async function evaluateCondition(
  condition: any,
  context: SimulationContext,
  simulationResult: SimulationResult,
  paymentData?: any,
) {
  const result = {
    description:
      condition.description ||
      `${condition.source}.${condition.field} ${condition.operator} ${condition.value}`,
    passed: false,
    value: null as any,
  };

  try {
    let sourceData: any = null;

    // Find source data and add to collections
    switch (condition.source) {
      case 'treasury':
        sourceData = context.treasury.treasury;
        break;
      case 'accounts':
        // When checking account conditions, filter to the specific account used in payment
        if (paymentData?.source) {
          const targetAccount = context.accounts.find(
            (account) =>
              account &&
              (account.name === paymentData.source ||
                account.id === paymentData.source ||
                account.slug === paymentData.source ||
                account.address === paymentData.source),
          );
          sourceData = targetAccount || context.accounts;
        } else {
          sourceData = context.accounts;
        }
        break;
      case 'beneficiaries':
        sourceData = context.beneficiaries;
        break;
      case 'invoices':
        sourceData = context.invoices;
        
        // Apply tag filtering if payment is batch with tags
        if (paymentData?.action === 'batch' && paymentData?.tags && Array.isArray(paymentData.tags)) {
          sourceData = context.invoices.filter(invoice => 
            paymentData.tags.some((tag: string) => invoice.tags && invoice.tags.includes(tag))
          );
          
          result.description = `${condition.description || `${condition.source}.${condition.field} ${condition.operator} ${condition.value}`} (filtered by tags: ${paymentData.tags.join(', ')})`;
        }
        
        // Add invoices collection for condition evaluation
        simulationResult.collections.push({
          name: 'invoices_for_condition',
          type: paymentData?.action === 'batch' && paymentData?.tags 
            ? `Invoices (filtered by ${paymentData.tags.join('/')} tags)`
            : 'Invoices (for condition check)',
          items: sourceData.map((invoice) => ({
            id: invoice.id,
            name: `${invoice.vendorName} - ${invoice.description}`,
            details: {
              amount: invoice.amount,
              currency: invoice.currency,
              status: invoice.status,
              approvedBy: invoice.approvedBy,
              vendorAddress: invoice.vendorAddress,
              tags: invoice.tags ? invoice.tags.join(', ') : 'none',
              dueDate: new Date(invoice.dueDate * 1000).toLocaleDateString(),
            },
          })),
        });
        break;
      case 'contractors':
        sourceData = beneficiariesData?.contractors || [];
        // Add contractors collection for condition evaluation
        simulationResult.collections.push({
          name: 'contractors_for_condition',
          type: 'Contractors (for condition check)',
          items: sourceData.map((contractor: any) => ({
            id: contractor.id,
            name: contractor.name,
            details: {
              email: contractor.email,
              role: contractor.role,
              walletAddress: contractor.walletAddress,
              status: contractor.status,
            },
          })),
        });
        break;
      case 'employees':
        sourceData = beneficiariesData?.employees || [];
        // Add employees collection for condition evaluation
        simulationResult.collections.push({
          name: 'employees_for_condition',
          type: 'Employees (for condition check)',
          items: sourceData.map((employee: any) => ({
            id: employee.id,
            name: employee.name,
            details: {
              email: employee.email,
              role: employee.role,
              department: employee.department,
              walletAddress: employee.walletAddress,
              status: employee.status,
            },
          })),
        });
        break;
      default:
        // Try to find specific account, beneficiary, or invoice
        sourceData =
          context.accounts.find(
            (a) =>
              a && (a.name === condition.source || a.id === condition.source),
          ) ||
          context.beneficiaries.find(
            (b) =>
              b && (b.name === condition.source || b.id === condition.source),
          ) ||
          context.invoices.find(
            (i) =>
              i &&
              (i.id === condition.source || i.vendorName === condition.source),
          );
    }

    if (!sourceData) {
      result.description = `Source '${condition.source}' not found`;
      return result;
    }

    // Extract field value with special handling for complex conditions
    let fieldValue: any;

    // Filter collections based on conditions first
    if (Array.isArray(sourceData)) {
      let filteredData = sourceData;

      // Apply filtering based on field and value
      if (condition.field === 'status' && condition.value === 'approved') {
        filteredData = sourceData.filter(
          (item) => item && item.status === 'approved',
        );
      } else if (
        condition.field === 'approved' ||
        condition.description?.toLowerCase().includes('approved')
      ) {
        filteredData = sourceData.filter(
          (item) => item && item.status === 'approved',
        );
      } else {
        // For other fields, filter based on the condition
        filteredData = sourceData.filter((item) => {
          if (!item) return false;
          const itemValue = getNestedValue(item, condition.field);

          switch (condition.operator) {
            case '==':
            case '===':
              return itemValue === condition.value;
            case '!=':
              return itemValue !== condition.value;
            case '>':
              return Number(itemValue) > Number(condition.value);
            case '<':
              return Number(itemValue) < Number(condition.value);
            case '>=':
              return Number(itemValue) >= Number(condition.value);
            case '<=':
              return Number(itemValue) <= Number(condition.value);
            case 'contains':
              return String(itemValue)
                .toLowerCase()
                .includes(String(condition.value).toLowerCase());
            default:
              return true;
          }
        });
      }

      // Update the collection to show only filtered items
      const collectionIndex = simulationResult.collections.findIndex(
        (c) =>
          c.name.includes(condition.source) && c.name.includes('condition'),
      );

      if (collectionIndex !== -1) {
        const filteredItems = filteredData.map((item) => ({
          id: item.id,
          name:
            condition.source === 'invoices'
              ? `${item.vendorName} - ${item.description}`
              : item.name,
          details:
            condition.source === 'invoices'
              ? {
                  amount: item.amount,
                  currency: item.currency,
                  status: item.status,
                  approvedBy: item.approvedBy,
                  vendorAddress: item.vendorAddress,
                  dueDate: new Date(item.dueDate * 1000).toLocaleDateString(),
                }
              : {
                  email: item.email,
                  role: item.role,
                  walletAddress: item.walletAddress,
                  status: item.status,
                  ...(item.department && { department: item.department }),
                },
        }));

        simulationResult.collections[collectionIndex] = {
          ...simulationResult.collections[collectionIndex],
          type: `${simulationResult.collections[collectionIndex].type.replace(' (for condition check)', '')} (filtered: ${condition.field} ${condition.operator} ${condition.value})`,
          items: filteredItems,
        };
      }

      // Evaluate the condition based on filtered results
      result.value = `Found ${filteredData.length} matching items: ${filteredData.map((i) => i.vendorName || i.name).join(', ')}`;
      result.passed = filteredData.length > 0;

      return result;
    }

    // Handle single item conditions
    if (
      sourceData &&
      typeof sourceData === 'object' &&
      !Array.isArray(sourceData)
    ) {
      // Handle account-specific field paths like "operating-account.balance"
      let fieldPath = condition.field;
      if (condition.source === 'accounts' && fieldPath.includes('.')) {
        // Extract just the field name after the dot (e.g., "operating-account.balance" -> "balance")
        fieldPath = fieldPath.split('.').pop() || fieldPath;
      }
      
      fieldValue = getNestedValue(sourceData, fieldPath);
      result.value = `${sourceData.vendorName || sourceData.name || 'Item'}: ${fieldValue}`;

      // Evaluate single item condition
      switch (condition.operator) {
        case '==':
        case '===':
          result.passed = fieldValue === condition.value;
          break;
        case '!=':
          result.passed = fieldValue !== condition.value;
          break;
        case '>':
          result.passed = Number(fieldValue) > Number(condition.value);
          break;
        case '<':
          result.passed = Number(fieldValue) < Number(condition.value);
          break;
        case '>=':
          result.passed = Number(fieldValue) >= Number(condition.value);
          break;
        case '<=':
          result.passed = Number(fieldValue) <= Number(condition.value);
          break;
        case 'contains':
          result.passed = String(fieldValue)
            .toLowerCase()
            .includes(String(condition.value).toLowerCase());
          break;
        default:
          result.passed = Boolean(fieldValue);
      }

      return result;
    }

    // Default field extraction
    fieldValue = getNestedValue(sourceData, condition.field);
    result.value = fieldValue;

    // Evaluate condition
    switch (condition.operator) {
      case '>':
        result.passed = Number(fieldValue) > Number(condition.value);
        break;
      case '<':
        result.passed = Number(fieldValue) < Number(condition.value);
        break;
      case '>=':
        result.passed = Number(fieldValue) >= Number(condition.value);
        break;
      case '<=':
        result.passed = Number(fieldValue) <= Number(condition.value);
        break;
      case '==':
      case '===':
        result.passed = fieldValue === condition.value;
        break;
      case '!=':
        result.passed = fieldValue !== condition.value;
        break;
      case 'contains':
        result.passed = String(fieldValue)
          .toLowerCase()
          .includes(String(condition.value).toLowerCase());
        break;
      default:
        result.description = `Unknown operator: ${condition.operator}`;
    }
  } catch (error) {
    result.description = `Condition evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

function calculatePayments(
  payment: any,
  sourceAccount: any,
  beneficiaries: any[],
  context: SimulationContext,
) {
  const result = {
    payments: [] as any[],
    collections: [] as any[],
    error: null as string | null,
  };

  try {
    // Check if this is an invoice payment - if so, use individual invoice amounts
    const invoiceBeneficiaries = beneficiaries.filter(b => b.data && b.data.invoiceAmount);
    let totalAmount = 0;

    // Skip total amount validation for batch payments as they calculate amounts per invoice
    if (payment.action === 'batch') {
      totalAmount = 1; // Set to valid value to pass validation
    } else if (invoiceBeneficiaries.length > 0) {
      // For invoice payments, use the sum of individual invoice amounts
      totalAmount = invoiceBeneficiaries.reduce((sum, b) => sum + (b.data.invoiceAmount || 0), 0);
    } else {
      // Calculate base amount for non-invoice payments
      if (typeof payment.amount === 'string') {
        totalAmount = Number.parseFloat(payment.amount);
      } else if (typeof payment.amount === 'object') {
        // Handle dynamic amounts (calculations)
        totalAmount = calculateDynamicAmount(payment.amount, sourceAccount, context);
      }
    }
    if (Number.isNaN(totalAmount) || totalAmount <= 0) {
      result.error = 'Invalid payment amount';
      return result;
    }

    // Create payment based on action type
    switch (payment.action) {
      case 'batch':
        // Batch payments use tag-based filtering for deterministic results
        if (!payment.tags || payment.tags.length === 0) {
          result.error = 'Batch payments require tags for filtering';
          return result;
        }

        // Filter approved invoices by tags
        const taggedInvoices = context.invoices.filter(invoice => 
          invoice.status === 'approved' && 
          payment.tags.some(tag => invoice.tags.includes(tag))
        );

        if (taggedInvoices.length === 0) {
          result.error = `No approved invoices found with tags: ${payment.tags.join(', ')}`;
          return result;
        }

        // Add to collections for display
        result.collections.push({
          name: `batch_${payment.tags.join('_')}_invoices`,
          type: `Batch ${payment.tags.join('/')} Invoices`,
          items: taggedInvoices.map(invoice => ({
            id: invoice.id,
            name: `${invoice.vendorName} - ${invoice.description}`,
            details: {
              amount: invoice.amount,
              currency: invoice.currency,
              status: invoice.status,
              approvedBy: invoice.approvedBy,
              vendorAddress: invoice.vendorAddress,
              tags: invoice.tags.join(', '),
              dueDate: new Date(invoice.dueDate * 1000).toLocaleDateString(),
            },
          })),
        });

        const batchToDetails = taggedInvoices.map(invoice => {
          // Find the actual beneficiary (contractor/employee) for this invoice
          const beneficiary = context.beneficiaries.find(b => 
            b.name === invoice.vendorName || b.walletAddress === invoice.vendorAddress
          );
          
          // Calculate payment amount - apply formula if specified
          let paymentAmount = invoice.amount;
          if (typeof payment.amount === 'object' && payment.amount.formula) {
            // Use the treasury context resolver and formula evaluator for each invoice
            const resolutionContext = { account: sourceAccount, invoice };
            try {
              const evaluatedAmount = safeFormulaEvaluator.evaluate(
                payment.amount.formula.replace('invoices.amount', invoice.amount.toString()),
                invoice.amount
              );
              if (evaluatedAmount !== null && evaluatedAmount > 0) {
                paymentAmount = evaluatedAmount;
              }
            } catch (error) {
              console.warn(`Failed to evaluate formula for invoice ${invoice.id}:`, error);
            }
          }
          
          return {
            id: invoice.id,
            name: invoice.vendorName,
            type: 'invoice' as const,
            amount: paymentAmount,
            description: invoice.description,
            // Add beneficiary details if found
            beneficiaryId: beneficiary?.id,
            walletAddress: invoice.vendorAddress || beneficiary?.walletAddress,
            tags: invoice.tags,
            email: beneficiary?.email,
            role: beneficiary?.role,
          };
        });

        const batchTotal = batchToDetails.reduce((sum, detail) => sum + detail.amount, 0);

        result.payments.push({
          from: sourceAccount.name,
          fromAccount: {
            name: sourceAccount.name,
            slug: sourceAccount.slug,
            balance: sourceAccount.balance,
            balanceAfter: sourceAccount.balance - batchTotal,
          },
          to: batchToDetails.map(detail => detail.id),
          toDetails: batchToDetails,
          amount: batchTotal.toLocaleString(),
          currency: payment.currency,
          action: payment.action,
          breakdown: {
            totalAmount: batchTotal,
            itemCount: batchToDetails.length,
            description: `Batch payment for ${batchToDetails.length} ${payment.tags.join('/')} invoices`,
          },
        });
        break;

      case 'simple':
        // For invoice payments, create detailed breakdown by checking actual resolved beneficiaries
        const invoiceBeneficiaries = beneficiaries.filter(b => b.data && b.data.invoiceAmount);
        
        if (invoiceBeneficiaries.length > 0) {
          // This is an invoice payment - create detailed breakdown
          const toDetails = invoiceBeneficiaries.map(beneficiary => ({
            id: beneficiary.id,
            name: beneficiary.data.name || beneficiary.data.vendorName || beneficiary.id,
            type: 'invoice' as const,
            amount: beneficiary.data.invoiceAmount,
            description: beneficiary.data.description || `Payment to ${beneficiary.data.name || beneficiary.data.vendorName}`,
          }));

          const actualTotal = toDetails.reduce((sum, detail) => sum + detail.amount, 0);

          result.payments.push({
            from: sourceAccount.name,
            fromAccount: {
              name: sourceAccount.name,
              slug: sourceAccount.slug,
              balance: sourceAccount.balance,
              balanceAfter: sourceAccount.balance - actualTotal,
            },
            to: toDetails.map(detail => detail.id),
            toDetails,
            amount: actualTotal.toLocaleString(),
            currency: payment.currency,
            action: payment.action,
            breakdown: {
              totalAmount: actualTotal,
              itemCount: toDetails.length,
              description: `Payment to ${toDetails.length} recipients`,
            },
          });
        } else {
          // Default behavior for other beneficiaries
          const toDetails = beneficiaries.map(beneficiary => {
            // Determine type based on data structure
            let type: 'invoice' | 'employee' | 'contractor' | 'account' = 'contractor';
            
            if (beneficiary.data?.type) {
              type = beneficiary.data.type;
            } else if (beneficiary.data?.salary && beneficiary.data?.department) {
              // Has salary and department = employee
              type = 'employee';
            } else if (beneficiary.data?.hourlyRate) {
              // Has hourly rate = contractor
              type = 'contractor';
            } else if (beneficiary.data?.invoiceAmount) {
              // Has invoice amount = invoice
              type = 'invoice';
            }

            return {
              id: beneficiary.id,
              name: beneficiary.data?.name || beneficiary.data?.vendorName || beneficiary.id,
              type,
              amount: totalAmount / beneficiaries.length,
              description: `Payment to ${beneficiary.data?.name || beneficiary.data?.vendorName || beneficiary.id}`,
              // Add beneficiary details
              beneficiaryId: beneficiary.id,
              walletAddress: beneficiary.data?.walletAddress,
              email: beneficiary.data?.email,
              role: beneficiary.data?.role,
              tags: beneficiary.data?.tags,
            };
          });

          result.payments.push({
            from: sourceAccount.name,
            fromAccount: {
              name: sourceAccount.name,
              slug: sourceAccount.slug,
              balance: sourceAccount.balance,
              balanceAfter: sourceAccount.balance - totalAmount,
            },
            to: beneficiaries.map((b) => b.id),
            toDetails,
            amount: totalAmount.toLocaleString(),
            currency: payment.currency,
            action: payment.action,
            breakdown: {
              totalAmount: totalAmount,
              itemCount: beneficiaries.length,
              description: `Payment to ${beneficiaries.length} recipients`,
            },
          });
        }
        break;

      case 'split':
        if (
          !payment.percentages ||
          payment.percentages.length !== beneficiaries.length
        ) {
          result.error =
            'Split payments require percentages matching beneficiary count';
          return result;
        }

        const splitToDetails = beneficiaries.map((beneficiary, index) => {
          const splitAmount = (totalAmount * payment.percentages[index]) / 100;
          
          // Determine beneficiary type
          let type: 'invoice' | 'employee' | 'contractor' | 'account' = 'contractor';
          if (beneficiary.data?.type) {
            type = beneficiary.data.type;
          } else if (beneficiary.data?.salary && beneficiary.data?.department) {
            type = 'employee';
          } else if (beneficiary.data?.hourlyRate) {
            type = 'contractor';
          } else if (beneficiary.data?.invoiceAmount) {
            type = 'invoice';
          }

          return {
            id: beneficiary.id,
            name: beneficiary.data?.name || beneficiary.data?.vendorName || beneficiary.id,
            type,
            amount: splitAmount,
            description: `${payment.percentages[index]}% split payment to ${beneficiary.data?.name || beneficiary.data?.vendorName || beneficiary.id}`,
            // Add beneficiary details
            beneficiaryId: beneficiary.id,
            walletAddress: beneficiary.data?.walletAddress,
            email: beneficiary.data?.email,
            role: beneficiary.data?.role,
            tags: beneficiary.data?.tags,
          };
        });

        result.payments.push({
          from: sourceAccount.name,
          fromAccount: {
            name: sourceAccount.name,
            slug: sourceAccount.slug,
            balance: sourceAccount.balance,
            balanceAfter: sourceAccount.balance - totalAmount,
          },
          to: beneficiaries.map((b) => b.id),
          toDetails: splitToDetails,
          amount: totalAmount.toLocaleString(),
          currency: payment.currency,
          action: payment.action,
          breakdown: {
            totalAmount: totalAmount,
            itemCount: beneficiaries.length,
            description: `Split payment: ${payment.percentages.join('% / ')}%`,
          },
        });
        break;

      case 'calculation':
        const calculationToDetails = beneficiaries.map((beneficiary) => {
          // For calculation actions, use the pre-calculated totalAmount
          const calculatedAmount = totalAmount;
          
          // Determine beneficiary type
          let type: 'invoice' | 'employee' | 'contractor' | 'account' = 'contractor';
          if (beneficiary.data?.type) {
            type = beneficiary.data.type;
          } else if (beneficiary.data?.salary && beneficiary.data?.department) {
            type = 'employee';
          } else if (beneficiary.data?.hourlyRate) {
            type = 'contractor';
          } else if (beneficiary.data?.invoiceAmount) {
            type = 'invoice';
          }

          return {
            id: beneficiary.id,
            name: beneficiary.data?.name || beneficiary.data?.vendorName || beneficiary.id,
            type,
            amount: calculatedAmount,
            description: `Calculated payment to ${beneficiary.data?.name || beneficiary.data?.vendorName || beneficiary.id}`,
            // Add beneficiary details
            beneficiaryId: beneficiary.id,
            walletAddress: beneficiary.data?.walletAddress,
            email: beneficiary.data?.email,
            role: beneficiary.data?.role,
            tags: beneficiary.data?.tags,
          };
        });

        const calculationTotal = calculationToDetails.reduce((sum, detail) => sum + detail.amount, 0);

        result.payments.push({
          from: sourceAccount.name,
          fromAccount: {
            name: sourceAccount.name,
            slug: sourceAccount.slug,
            balance: sourceAccount.balance,
            balanceAfter: sourceAccount.balance - calculationTotal,
          },
          to: beneficiaries.map((b) => b.id),
          toDetails: calculationToDetails,
          amount: calculationTotal.toLocaleString(),
          currency: payment.currency,
          action: payment.action,
          breakdown: {
            totalAmount: calculationTotal,
            itemCount: beneficiaries.length,
            description: `Calculated payments to ${beneficiaries.length} recipients`,
          },
        });
        break;

      case 'leftover': {
        // Calculate leftover amount after other operations
        const leftoverAmount = calculateLeftoverAmount(
          totalAmount,
          sourceAccount,
        );

        const leftoverToDetails = beneficiaries.map((beneficiary) => {
          // Determine beneficiary type
          let type: 'invoice' | 'employee' | 'contractor' | 'account' = 'contractor';
          if (beneficiary.data?.type) {
            type = beneficiary.data.type;
          } else if (beneficiary.data?.salary && beneficiary.data?.department) {
            type = 'employee';
          } else if (beneficiary.data?.hourlyRate) {
            type = 'contractor';
          } else if (beneficiary.data?.invoiceAmount) {
            type = 'invoice';
          }

          // Split leftover amount equally among beneficiaries
          const shareAmount = leftoverAmount / beneficiaries.length;

          return {
            id: beneficiary.id,
            name: beneficiary.data?.name || beneficiary.data?.vendorName || beneficiary.id,
            type,
            amount: shareAmount,
            description: `Leftover funds transfer to ${beneficiary.data?.name || beneficiary.data?.vendorName || beneficiary.id}`,
            // Add beneficiary details
            beneficiaryId: beneficiary.id,
            walletAddress: beneficiary.data?.walletAddress,
            email: beneficiary.data?.email,
            role: beneficiary.data?.role,
            tags: beneficiary.data?.tags,
          };
        });

        result.payments.push({
          from: sourceAccount.name,
          fromAccount: {
            name: sourceAccount.name,
            slug: sourceAccount.slug,
            balance: sourceAccount.balance,
            balanceAfter: sourceAccount.balance - leftoverAmount,
          },
          to: beneficiaries.map((b) => b.id),
          toDetails: leftoverToDetails,
          amount: leftoverAmount.toLocaleString(),
          currency: payment.currency,
          action: payment.action,
          breakdown: {
            totalAmount: leftoverAmount,
            itemCount: beneficiaries.length,
            description: `Leftover funds (after ${(100 - (leftoverAmount / sourceAccount.balance * 100)).toFixed(1)}% reserve) to ${beneficiaries.length} recipients`,
          },
        });
        break;
      }

      default:
        result.error = `Unknown payment action: ${payment.action}`;
    }
  } catch (error) {
    result.error = `Payment calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

function calculateDynamicAmount(amountConfig: any, sourceAccount: any, context?: SimulationContext): number {
  
  // Handle new source + formula structure
  if (typeof amountConfig === 'object' && 'source' in amountConfig) {
    const { source, formula } = amountConfig;
    
    // Build context for resolution (include source account for reference)
    const resolutionContext: AmountResolutionContext = {
      account: sourceAccount,
    };
    
    // Resolve the source value
    const sourceValue = treasuryContextResolver.resolve(source, resolutionContext);
    if (sourceValue === null) {
      console.warn(`Failed to resolve dynamic amount source: ${source}`);
      return 0;
    }
    
    // Apply formula if provided
    if (formula) {
      const evaluatedAmount = safeFormulaEvaluator.evaluate(formula, sourceValue);
      if (evaluatedAmount === null) {
        console.warn(`Failed to evaluate dynamic amount formula: ${formula}`);
        return 0;
      }
      return evaluatedAmount;
    }
    
    return sourceValue;
  }
  
  return Number.parseFloat(amountConfig.value) || 0;
}

function calculateBeneficiaryAmount(
  amountConfig: any,
  beneficiary: any,
): number {
  // Calculate amount based on beneficiary data (e.g., salary, hours worked)
  if (beneficiary?.salary) {
    return beneficiary.salary;
  }
  return 0;
}

function calculateLeftoverAmount(
  totalAmount: number,
  sourceAccount: any,
): number {
  // Calculate leftover amount after reserving some balance
  const reservePercentage = 0.1; // Keep 10% as reserve
  return Math.max(
    0,
    sourceAccount.balance - sourceAccount.balance * reservePercentage,
  );
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

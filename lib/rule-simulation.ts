import type { TreasuryRuleData } from '@/lib/treasury/schema';
import { accountsData, beneficiariesData, treasuryData, invoicesData } from '@/data/mockup';

interface SimulationResult {
  success: boolean;
  payments: Array<{
    from: string;
    to: string[];
    amount: string;
    currency: string;
    action: string;
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

export async function simulateRule(ruleData: TreasuryRuleData): Promise<SimulationResult> {
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
        ...(beneficiariesData?.contractors || [])
      ],
      treasury: treasuryData,
      invoices: invoicesData?.invoices || [],
    };

    // Validate rule data
    if (!ruleData.execution || !ruleData.payment) {
      result.errors.push('Invalid rule data: missing execution or payment configuration');
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

    // Find source account (by name, ID, or wallet address)
    const sourceAccount = context.accounts.find(
      (account) => account && (
        account.name === ruleData.payment.source || 
        account.id === ruleData.payment.source ||
        account.address === ruleData.payment.source
      )
    );

    if (!sourceAccount) {
      result.errors.push(`Source account '${ruleData.payment.source}' not found`);
      return result;
    }

    // Resolve beneficiaries (can be collections, individuals, or addresses)
    const beneficiaries = resolveBeneficiaries(ruleData.payment.beneficiary, context, result);

    // Evaluate conditions
    for (const condition of ruleData.conditions) {
      const conditionResult = await evaluateCondition(condition, context, result);
      result.conditions.push(conditionResult);
      
      if (!conditionResult.passed && condition.when === 'before') {
        result.errors.push(`Pre-condition failed: ${condition.description || condition.field}`);
      }
    }

    // Stop if pre-conditions failed
    if (result.errors.length > 0) {
      return result;
    }

    // Calculate payment amounts
    const paymentResult = calculatePayments(ruleData.payment, sourceAccount, beneficiaries);
    
    if (paymentResult.error) {
      result.errors.push(paymentResult.error);
      return result;
    }

    result.payments = paymentResult.payments;

    // Check account balance sufficiency
    const totalAmount = result.payments.reduce((sum, payment) => {
      return sum + parseFloat(payment.amount);
    }, 0);

    if (totalAmount > sourceAccount.balance) {
      result.errors.push(
        `Insufficient balance: ${sourceAccount.balance} ${sourceAccount.currency} available, ${totalAmount} ${ruleData.payment.currency} required`
      );
      return result;
    }

    if (totalAmount > sourceAccount.balance * 0.8) {
      result.warnings.push(
        `High balance usage: Using ${((totalAmount / sourceAccount.balance) * 100).toFixed(1)}% of available balance`
      );
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    result.errors.push(`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

function resolveBeneficiaries(beneficiaryIds: string[], context: SimulationContext, result: SimulationResult) {
  const resolvedBeneficiaries: Array<{ id: string; data: any }> = [];

  for (const beneficiaryId of beneficiaryIds) {
    // Handle collections
    if (beneficiaryId === 'contractors') {
      const contractors = beneficiariesData?.contractors || [];
      
      // Add to collections for display
      result.collections.push({
        name: 'contractors',
        type: 'Contractors',
        items: contractors.map(contractor => ({
          id: contractor.id,
          name: contractor.name,
          details: {
            email: contractor.email,
            role: contractor.role,
            walletAddress: contractor.walletAddress,
            status: contractor.status
          }
        }))
      });

      contractors.forEach(contractor => {
        resolvedBeneficiaries.push({ id: contractor.id, data: contractor });
      });
      continue;
    }

    if (beneficiaryId === 'employees') {
      const employees = beneficiariesData?.employees || [];
      
      // Add to collections for display
      result.collections.push({
        name: 'employees',
        type: 'Employees',
        items: employees.map(employee => ({
          id: employee.id,
          name: employee.name,
          details: {
            email: employee.email,
            role: employee.role,
            department: employee.department,
            walletAddress: employee.walletAddress,
            status: employee.status
          }
        }))
      });

      employees.forEach(employee => {
        resolvedBeneficiaries.push({ id: employee.id, data: employee });
      });
      continue;
    }

    if (beneficiaryId === 'approved_invoices' || beneficiaryId === 'invoices') {
      const allInvoices = context.invoices;
      const approvedInvoices = allInvoices.filter(invoice => invoice.status === 'approved');
      
      // Add to collections for display
      result.collections.push({
        name: 'invoices',
        type: 'Invoices',
        items: allInvoices.map(invoice => ({
          id: invoice.id,
          name: `${invoice.vendorName} - ${invoice.description}`,
          details: {
            amount: invoice.amount,
            currency: invoice.currency,
            status: invoice.status,
            approvedBy: invoice.approvedBy,
            vendorAddress: invoice.vendorAddress,
            dueDate: new Date(invoice.dueDate * 1000).toLocaleDateString()
          }
        }))
      });

      // Only process approved invoices for payments
      approvedInvoices.forEach(invoice => {
        // Try to find the beneficiary by vendor name or address
        const beneficiary = context.beneficiaries.find(b => 
          b && (
            b.name === invoice.vendorName || 
            b.walletAddress === invoice.vendorAddress ||
            b.email === invoice.vendorName
          )
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
              currency: invoice.currency
            } 
          });
        }
      });
      continue;
    }

    // Handle individual lookups - try ID, name, email, wallet address
    const beneficiary = context.beneficiaries.find(b => 
      b && (
        b.id === beneficiaryId || 
        b.name === beneficiaryId || 
        b.email === beneficiaryId ||
        b.walletAddress === beneficiaryId
      )
    );

    if (beneficiary) {
      resolvedBeneficiaries.push({ id: beneficiary.id, data: beneficiary });
    } else {
      // Check if it's a wallet address without matching beneficiary
      if (beneficiaryId.startsWith('0x')) {
        resolvedBeneficiaries.push({ 
          id: beneficiaryId, 
          data: { 
            id: beneficiaryId, 
            name: `Wallet ${beneficiaryId.slice(0, 8)}...`, 
            walletAddress: beneficiaryId 
          } 
        });
      } else {
        result.warnings.push(`Beneficiary '${beneficiaryId}' not found in data`);
        // Still add it so payment calculation can proceed
        resolvedBeneficiaries.push({ id: beneficiaryId, data: null });
      }
    }
  }

  return resolvedBeneficiaries;
}

async function evaluateCondition(condition: any, context: SimulationContext, simulationResult: SimulationResult) {
  const result = {
    description: condition.description || `${condition.source}.${condition.field} ${condition.operator} ${condition.value}`,
    passed: false,
    value: null,
  };

  try {
    let sourceData: any = null;

    // Find source data and add to collections
    switch (condition.source) {
      case 'treasury':
        sourceData = context.treasury;
        break;
      case 'accounts':
        sourceData = context.accounts;
        break;
      case 'beneficiaries':
        sourceData = context.beneficiaries;
        break;
      case 'invoices':
        sourceData = context.invoices;
        // Add invoices collection for condition evaluation
        simulationResult.collections.push({
          name: 'invoices_for_condition',
          type: 'Invoices (for condition check)',
          items: context.invoices.map(invoice => ({
            id: invoice.id,
            name: `${invoice.vendorName} - ${invoice.description}`,
            details: {
              amount: invoice.amount,
              currency: invoice.currency,
              status: invoice.status,
              approvedBy: invoice.approvedBy,
              vendorAddress: invoice.vendorAddress,
              dueDate: new Date(invoice.dueDate * 1000).toLocaleDateString()
            }
          }))
        });
        break;
      case 'contractors':
        sourceData = beneficiariesData?.contractors || [];
        // Add contractors collection for condition evaluation
        simulationResult.collections.push({
          name: 'contractors_for_condition',
          type: 'Contractors (for condition check)',
          items: sourceData.map(contractor => ({
            id: contractor.id,
            name: contractor.name,
            details: {
              email: contractor.email,
              role: contractor.role,
              walletAddress: contractor.walletAddress,
              status: contractor.status
            }
          }))
        });
        break;
      case 'employees':
        sourceData = beneficiariesData?.employees || [];
        // Add employees collection for condition evaluation
        simulationResult.collections.push({
          name: 'employees_for_condition',
          type: 'Employees (for condition check)',
          items: sourceData.map(employee => ({
            id: employee.id,
            name: employee.name,
            details: {
              email: employee.email,
              role: employee.role,
              department: employee.department,
              walletAddress: employee.walletAddress,
              status: employee.status
            }
          }))
        });
        break;
      default:
        // Try to find specific account, beneficiary, or invoice
        sourceData = 
          context.accounts.find(a => a && (a.name === condition.source || a.id === condition.source)) ||
          context.beneficiaries.find(b => b && (b.name === condition.source || b.id === condition.source)) ||
          context.invoices.find(i => i && (i.id === condition.source || i.vendorName === condition.source));
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
        filteredData = sourceData.filter(item => item && item.status === 'approved');
      } else if (condition.field === 'approved' || (condition.description?.toLowerCase().includes('approved'))) {
        filteredData = sourceData.filter(item => item && item.status === 'approved');
      } else {
        // For other fields, filter based on the condition
        filteredData = sourceData.filter(item => {
          if (!item) return false;
          const itemValue = getNestedValue(item, condition.field);
          
          switch (condition.operator) {
            case '==':
            case '=':
              return itemValue == condition.value;
            case '!=':
              return itemValue != condition.value;
            case '>':
              return Number(itemValue) > Number(condition.value);
            case '<':
              return Number(itemValue) < Number(condition.value);
            case '>=':
              return Number(itemValue) >= Number(condition.value);
            case '<=':
              return Number(itemValue) <= Number(condition.value);
            case 'contains':
              return String(itemValue).toLowerCase().includes(String(condition.value).toLowerCase());
            default:
              return true;
          }
        });
      }

      // Update the collection to show only filtered items
      const collectionIndex = simulationResult.collections.findIndex(c => 
        c.name.includes(condition.source) && c.name.includes('condition')
      );
      
      if (collectionIndex !== -1) {
        const filteredItems = filteredData.map(item => ({
          id: item.id,
          name: condition.source === 'invoices' ? `${item.vendorName} - ${item.description}` : item.name,
          details: condition.source === 'invoices' ? {
            amount: item.amount,
            currency: item.currency,
            status: item.status,
            approvedBy: item.approvedBy,
            vendorAddress: item.vendorAddress,
            dueDate: new Date(item.dueDate * 1000).toLocaleDateString()
          } : {
            email: item.email,
            role: item.role,
            walletAddress: item.walletAddress,
            status: item.status,
            ...(item.department && { department: item.department })
          }
        }));

        simulationResult.collections[collectionIndex] = {
          ...simulationResult.collections[collectionIndex],
          type: `${simulationResult.collections[collectionIndex].type.replace(' (for condition check)', '')} (filtered: ${condition.field} ${condition.operator} ${condition.value})`,
          items: filteredItems
        };
      }

      // Evaluate the condition based on filtered results
      result.value = `Found ${filteredData.length} matching items: ${filteredData.map(i => i.vendorName || i.name).join(', ')}`;
      result.passed = filteredData.length > 0;
      
      return result;
    }
    
    // Handle single item conditions
    if (sourceData && typeof sourceData === 'object' && !Array.isArray(sourceData)) {
      fieldValue = getNestedValue(sourceData, condition.field);
      result.value = `${sourceData.vendorName || sourceData.name || 'Item'}: ${fieldValue}`;
      
      // Evaluate single item condition
      switch (condition.operator) {
        case '==':
        case '=':
          result.passed = fieldValue == condition.value;
          break;
        case '!=':
          result.passed = fieldValue != condition.value;
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
          result.passed = String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
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
      case '=':
        result.passed = fieldValue == condition.value;
        break;
      case '!=':
        result.passed = fieldValue != condition.value;
        break;
      case 'contains':
        result.passed = String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
        break;
      default:
        result.description = `Unknown operator: ${condition.operator}`;
    }
  } catch (error) {
    result.description = `Condition evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

function calculatePayments(payment: any, sourceAccount: any, beneficiaries: any[]) {
  const result = {
    payments: [] as any[],
    error: null as string | null,
  };

  try {
    let totalAmount = 0;

    // Calculate base amount
    if (typeof payment.amount === 'string') {
      totalAmount = parseFloat(payment.amount);
    } else if (typeof payment.amount === 'object') {
      // Handle dynamic amounts (calculations)
      totalAmount = calculateDynamicAmount(payment.amount, sourceAccount);
    }

    if (isNaN(totalAmount) || totalAmount <= 0) {
      result.error = 'Invalid payment amount';
      return result;
    }

    // Create payment based on action type
    switch (payment.action) {
      case 'simple':
        result.payments.push({
          from: sourceAccount.name,
          to: beneficiaries.map(b => b.id),
          amount: totalAmount.toString(),
          currency: payment.currency,
          action: payment.action,
        });
        break;

      case 'split':
        if (!payment.percentages || payment.percentages.length !== beneficiaries.length) {
          result.error = 'Split payments require percentages matching beneficiary count';
          return result;
        }

        beneficiaries.forEach((beneficiary, index) => {
          const splitAmount = (totalAmount * payment.percentages[index]) / 100;
          result.payments.push({
            from: sourceAccount.name,
            to: [beneficiary.id],
            amount: splitAmount.toString(),
            currency: payment.currency,
            action: `${payment.action} (${payment.percentages[index]}%)`,
          });
        });
        break;

      case 'calculation':
        // For calculations, create individual payments based on calculation logic
        beneficiaries.forEach((beneficiary) => {
          const calculatedAmount = calculateBeneficiaryAmount(payment.amount, beneficiary.data);
          result.payments.push({
            from: sourceAccount.name,
            to: [beneficiary.id],
            amount: calculatedAmount.toString(),
            currency: payment.currency,
            action: payment.action,
          });
        });
        break;

      case 'leftover':
        // Calculate leftover amount after other operations
        const leftoverAmount = calculateLeftoverAmount(totalAmount, sourceAccount);
        result.payments.push({
          from: sourceAccount.name,
          to: beneficiaries.map(b => b.id),
          amount: leftoverAmount.toString(),
          currency: payment.currency,
          action: payment.action,
        });
        break;

      default:
        result.error = `Unknown payment action: ${payment.action}`;
    }
  } catch (error) {
    result.error = `Payment calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

function calculateDynamicAmount(amountConfig: any, sourceAccount: any): number {
  // Handle dynamic amount calculations
  if (amountConfig.type === 'percentage') {
    return (sourceAccount.balance * parseFloat(amountConfig.value)) / 100;
  } else if (amountConfig.type === 'calculation') {
    // Simple calculation support
    const expression = amountConfig.value.replace(/balance/g, sourceAccount.balance.toString());
    try {
      // Basic expression evaluation (only for safe math operations)
      return Function(`"use strict"; return (${expression})`)();
    } catch {
      return 0;
    }
  }
  return parseFloat(amountConfig.value) || 0;
}

function calculateBeneficiaryAmount(amountConfig: any, beneficiary: any): number {
  // Calculate amount based on beneficiary data (e.g., salary, hours worked)
  if (beneficiary?.salary) {
    return beneficiary.salary;
  }
  return 0;
}

function calculateLeftoverAmount(totalAmount: number, sourceAccount: any): number {
  // Calculate leftover amount after reserving some balance
  const reservePercentage = 0.1; // Keep 10% as reserve
  return Math.max(0, sourceAccount.balance - (sourceAccount.balance * reservePercentage));
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
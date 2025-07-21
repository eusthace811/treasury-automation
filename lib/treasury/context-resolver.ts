import {
  treasuryData,
  accountsData,
  invoicesData,
  beneficiariesData,
  transactionsData,
  type Treasury,
  type Account,
  type Invoice,
  type Employee,
  type Contractor,
  type Transaction,
} from '@/data/mockup';

/**
 * Dynamic context resolution system for payment amounts.
 * Resolves source paths like "treasury.revenue", "accounts.{slug}.balance", "invoices.total"
 * Uses actual data structures to provide accurate field resolution.
 */

export interface ContextResolver {
  resolve(source: string, context?: Record<string, any>): number | null;
  validateSource(source: string): boolean;
  getAvailableSources(): string[];
  getCollectionFields(collectionName: string): string[];
}

export class TreasuryContextResolver implements ContextResolver {
  // Hardcoded collection names
  private readonly COLLECTIONS = ['treasury', 'accounts', 'employees', 'contractors', 'invoices', 'transactions'] as const;
  
  private treasury: Treasury;
  private accounts: Account[];
  private invoices: Invoice[];
  private employees: Employee[];
  private contractors: Contractor[];
  private transactions: Transaction[];

  constructor() {
    this.treasury = treasuryData.treasury;
    this.accounts = accountsData.accounts;
    this.invoices = invoicesData.invoices;
    this.employees = beneficiariesData.employees;
    this.contractors = beneficiariesData.contractors;
    this.transactions = transactionsData.transactions;
  }

  /**
   * Resolve a source path to its numeric value
   */
  resolve(source: string, context?: Record<string, any>): number | null {
    try {
      const parts = source.split('.');
      const collectionName = parts[0];

      switch (collectionName) {
        case 'treasury':
          return this.resolveTreasuryField(parts.slice(1));
        
        case 'accounts':
          return this.resolveAccountsField(parts.slice(1), context);
        
        case 'invoices':
          return this.resolveInvoicesField(parts.slice(1), context);
        
        case 'employees':
          return this.resolveEmployeesField(parts.slice(1), context);
        
        case 'contractors':
          return this.resolveContractorsField(parts.slice(1), context);
          
        case 'transactions':
          return this.resolveTransactionsField(parts.slice(1), context);
        
        // Singular forms for specific item access
        case 'account':
          return this.resolveSpecificAccount(parts.slice(1), context);
        case 'invoice':
          return this.resolveSpecificInvoice(parts.slice(1), context);
        case 'employee':
          return this.resolveSpecificEmployee(parts.slice(1), context);
        case 'contractor':
          return this.resolveSpecificContractor(parts.slice(1), context);
        case 'transaction':
          return this.resolveSpecificTransaction(parts.slice(1), context);
        
        default:
          console.warn(`Unknown collection: ${collectionName}`);
          return null;
      }
    } catch (error) {
      console.error(`Error resolving source "${source}":`, error);
      return null;
    }
  }

  /**
   * Validate if a source path is potentially resolvable
   */
  validateSource(source: string): boolean {
    const parts = source.split('.');
    const collectionName = parts[0];
    
    const validCollections = [...this.COLLECTIONS, 'account', 'invoice', 'employee', 'contractor', 'transaction'];
    if (!validCollections.includes(collectionName as any)) {
      return false;
    }
    
    return parts.length >= 2;
  }

  /**
   * Get all available source patterns based on actual data
   */
  getAvailableSources(): string[] {
    const sources: string[] = [];
    
    // Treasury fields (get from actual object keys)
    const treasuryFields = this.getNumericFields(this.treasury);
    sources.push(...treasuryFields.map(field => `treasury.${field}`));
    
    // Account-specific fields (get from actual account slugs)
    const accountFields = this.accounts.length > 0 ? this.getNumericFields(this.accounts[0]) : [];
    this.accounts.forEach(account => {
      accountFields.forEach(field => {
        sources.push(`accounts.${account.slug}.${field}`);
      });
    });
    
    // Account aggregations
    if (this.accounts.length > 0) {
      sources.push('accounts.total-balance', 'accounts.active.total-balance');
    }
    
    // Invoice fields and aggregations
    if (this.invoices.length > 0) {
      const invoiceFields = this.getNumericFields(this.invoices[0]);
      sources.push(...invoiceFields.map(field => `invoice.${field}`));
      sources.push(
        'invoices.amount', 'invoices.total-amount', 
        'invoices.approved.amount', 'invoices.approved.total-amount', 
        'invoices.pending.amount', 'invoices.pending.total-amount'
      );
    }
    
    // Employee fields and aggregations  
    if (this.employees.length > 0) {
      const employeeFields = this.getNumericFields(this.employees[0]);
      sources.push(...employeeFields.map(field => `employee.${field}`));
      sources.push('employees.total-salary', 'employees.active.total-salary');
    }
    
    // Contractor fields and aggregations
    if (this.contractors.length > 0) {
      const contractorFields = this.getNumericFields(this.contractors[0]);
      sources.push(...contractorFields.map(field => `contractor.${field}`));
      sources.push('contractors.total-hourly-rate', 'contractors.active.total-hourly-rate');
    }
    
    // Transaction aggregations
    if (this.transactions.length > 0) {
      sources.push('transactions.total-amount', 'transactions.incoming.total', 'transactions.outgoing.total');
    }
    
    return sources.sort();
  }

  /**
   * Get available fields for a specific collection
   */
  getCollectionFields(collectionName: string): string[] {
    switch (collectionName) {
      case 'treasury':
        return this.getNumericFields(this.treasury);
      case 'accounts':
        return this.accounts.length > 0 ? this.getNumericFields(this.accounts[0]) : [];
      case 'invoices':
        return this.invoices.length > 0 ? this.getNumericFields(this.invoices[0]) : [];
      case 'employees':
        return this.employees.length > 0 ? this.getNumericFields(this.employees[0]) : [];
      case 'contractors':
        return this.contractors.length > 0 ? this.getNumericFields(this.contractors[0]) : [];
      case 'transactions':
        return this.transactions.length > 0 ? this.getNumericFields(this.transactions[0]) : [];
      default:
        return [];
    }
  }

  /**
   * Extract numeric field names from an object
   */
  private getNumericFields(obj: any): string[] {
    if (!obj || typeof obj !== 'object') return [];
    
    return Object.keys(obj).filter(key => {
      const value = obj[key];
      return typeof value === 'number' && !isNaN(value);
    });
  }

  /**
   * Resolve treasury fields dynamically
   */
  private resolveTreasuryField(fieldPath: string[]): number | null {
    if (fieldPath.length === 0) return null;
    
    const field = fieldPath[0];
    const value = this.treasury[field as keyof Treasury];
    
    return typeof value === 'number' ? value : null;
  }

  /**
   * Resolve account fields with slug-based lookup
   */
  private resolveAccountsField(fieldPath: string[], context?: Record<string, any>): number | null {
    if (fieldPath.length < 2) {
      if (fieldPath.length === 1) {
        return this.resolveAccountsAggregation(fieldPath[0]);
      }
      return null;
    }
    
    const accountSlug = fieldPath[0];
    const field = fieldPath[1];
    
    // Handle nested aggregations like accounts.active.total-balance
    if (accountSlug === 'active' && fieldPath.length === 2) {
      return this.resolveAccountsAggregation(`${accountSlug}.${field}`);
    }
    
    // Find account by slug
    const account = this.accounts.find(acc => 
      acc.slug === accountSlug || acc.slug === accountSlug.replace('_', '-')
    );
    
    if (!account) {
      console.warn(`Account not found: ${accountSlug}`);
      return null;
    }
    
    const value = account[field as keyof Account];
    return typeof value === 'number' ? value : null;
  }

  /**
   * Handle account aggregations
   */
  private resolveAccountsAggregation(aggregationType: string): number | null {
    switch (aggregationType) {
      case 'total-balance':
        return this.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      case 'active.total-balance':
        return this.accounts
          .filter(acc => acc.isActive)
          .reduce((sum, acc) => sum + (acc.balance || 0), 0);
      default:
        return null;
    }
  }

  /**
   * Resolve invoice fields and aggregations
   */
  private resolveInvoicesField(fieldPath: string[], context?: Record<string, any>): number | null {
    if (fieldPath.length === 0) return null;
    
    const field = fieldPath[0];
    
    switch (field) {
      case 'amount':
      case 'total-amount':
        return this.invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      case 'approved':
        if (fieldPath[1] === 'total-amount' || fieldPath[1] === 'amount') {
          return this.invoices
            .filter(inv => inv.status === 'approved')
            .reduce((sum, inv) => sum + (inv.amount || 0), 0);
        }
        return null;
      case 'pending':
        if (fieldPath[1] === 'total-amount' || fieldPath[1] === 'amount') {
          return this.invoices
            .filter(inv => inv.status === 'pending')
            .reduce((sum, inv) => sum + (inv.amount || 0), 0);
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * Resolve employee fields and aggregations
   */
  private resolveEmployeesField(fieldPath: string[], context?: Record<string, any>): number | null {
    if (fieldPath.length === 0) return null;
    
    const field = fieldPath[0];
    
    switch (field) {
      case 'total-salary':
        return this.employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
      case 'active':
        if (fieldPath[1] === 'total-salary') {
          return this.employees
            .filter(emp => emp.status === 'active')
            .reduce((sum, emp) => sum + (emp.salary || 0), 0);
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * Resolve contractor fields and aggregations
   */
  private resolveContractorsField(fieldPath: string[], context?: Record<string, any>): number | null {
    if (fieldPath.length === 0) return null;
    
    const field = fieldPath[0];
    
    switch (field) {
      case 'total-hourly-rate':
        return this.contractors.reduce((sum, con) => sum + (con.hourlyRate || 0), 0);
      case 'active':
        if (fieldPath[1] === 'total-hourly-rate') {
          return this.contractors
            .filter(con => con.status === 'active')
            .reduce((sum, con) => sum + (con.hourlyRate || 0), 0);
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * Resolve transaction fields and aggregations
   */
  private resolveTransactionsField(fieldPath: string[], context?: Record<string, any>): number | null {
    if (fieldPath.length === 0) return null;
    
    const field = fieldPath[0];
    
    switch (field) {
      case 'total-amount':
        return this.transactions.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
      case 'incoming':
        if (fieldPath[1] === 'total') {
          return this.transactions
            .filter(tx => tx.type === 'incoming')
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);
        }
        return null;
      case 'outgoing':
        if (fieldPath[1] === 'total') {
          return this.transactions
            .filter(tx => tx.type === 'outgoing')
            .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * Resolve specific account by slug/id from context
   */
  private resolveSpecificAccount(fieldPath: string[], context?: Record<string, any>): number | null {
    if (fieldPath.length < 2) return null;
    
    const accountIdentifier = fieldPath[0];
    const field = fieldPath[1];
    
    let account: Account | undefined;
    
    if (context?.account) {
      account = context.account;
    } else {
      account = this.accounts.find(acc => 
        acc.slug === accountIdentifier || 
        acc.id === accountIdentifier ||
        acc.slug === accountIdentifier.replace('_', '-')
      );
    }
    
    if (!account) return null;
    
    const value = account[field as keyof Account];
    return typeof value === 'number' ? value : null;
  }

  /**
   * Resolve specific invoice from context
   */
  private resolveSpecificInvoice(fieldPath: string[], context?: Record<string, any>): number | null {
    if (fieldPath.length === 0) return null;
    
    const field = fieldPath[0];
    
    if (context?.invoice) {
      const value = context.invoice[field as keyof Invoice];
      return typeof value === 'number' ? value : null;
    }
    
    // Default to first approved invoice if no context
    const approvedInvoice = this.invoices.find(inv => inv.status === 'approved');
    if (approvedInvoice) {
      const value = approvedInvoice[field as keyof Invoice];
      return typeof value === 'number' ? value : null;
    }
    
    return null;
  }

  /**
   * Resolve specific employee from context
   */
  private resolveSpecificEmployee(fieldPath: string[], context?: Record<string, any>): number | null {
    if (fieldPath.length === 0) return null;
    
    const field = fieldPath[0];
    
    if (context?.employee) {
      const value = context.employee[field as keyof Employee];
      return typeof value === 'number' ? value : null;
    }
    
    return null;
  }

  /**
   * Resolve specific contractor from context
   */
  private resolveSpecificContractor(fieldPath: string[], context?: Record<string, any>): number | null {
    if (fieldPath.length === 0) return null;
    
    const field = fieldPath[0];
    
    if (context?.contractor) {
      const value = context.contractor[field as keyof Contractor];
      return typeof value === 'number' ? value : null;
    }
    
    return null;
  }

  /**
   * Resolve specific transaction from context
   */
  private resolveSpecificTransaction(fieldPath: string[], context?: Record<string, any>): number | null {
    if (fieldPath.length === 0) return null;
    
    const field = fieldPath[0];
    
    if (context?.transaction) {
      const value = context.transaction[field as keyof Transaction];
      return typeof value === 'number' ? value : null;
    }
    
    return null;
  }
}

// Export singleton instance for convenience
export const treasuryContextResolver = new TreasuryContextResolver();

// Export type for amount resolution with context
export interface AmountResolutionContext {
  // Specific items for context-sensitive resolution
  account?: Account;
  invoice?: Invoice;
  employee?: Employee;
  contractor?: Contractor;
  transaction?: Transaction;
  
  // Additional metadata
  [key: string]: any;
}
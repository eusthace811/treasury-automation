import {
  treasuryData,
  accountsData,
  invoicesData,
  beneficiariesData,
  transactionsData,
} from '@/data/mockup';

interface CollectionField {
  name: string;
  type: string;
  example?: string | number | boolean;
}

interface Collection {
  name: string;
  fields: CollectionField[];
}

/**
 * Analyzes an object to extract field information
 */
function analyzeObject(obj: any, exclude: string[] = ['id', 'createdAt', 'updatedAt', 'deletedAt']): CollectionField[] {
  if (!obj || typeof obj !== 'object') return [];

  return Object.keys(obj)
    .filter(key => !exclude.includes(key))
    .map(key => {
      const value = obj[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      
      return {
        name: key,
        type,
        example: Array.isArray(value) ? `[${value.length} items]` : value,
      };
    });
}

/**
 * Extracts available fields from mockup data collections
 */
function extractCollections(): Collection[] {
  const collections: Collection[] = [];

  // Treasury collection
  if (treasuryData?.treasury) {
    collections.push({
      name: 'treasury',
      fields: analyzeObject(treasuryData.treasury),
    });
  }

  // Accounts collection  
  if (accountsData?.accounts && accountsData.accounts.length > 0) {
    collections.push({
      name: 'accounts.{slug}',
      fields: analyzeObject(accountsData.accounts[0]),
    });
  }

  // Invoices collection
  if (invoicesData?.invoices && invoicesData.invoices.length > 0) {
    collections.push({
      name: 'invoices',
      fields: analyzeObject(invoicesData.invoices[0]),
    });
  }

  // Employees collection
  if (beneficiariesData?.employees && beneficiariesData.employees.length > 0) {
    collections.push({
      name: 'employees',
      fields: analyzeObject(beneficiariesData.employees[0]),
    });
  }

  // Contractors collection
  if (beneficiariesData?.contractors && beneficiariesData.contractors.length > 0) {
    collections.push({
      name: 'contractors',
      fields: analyzeObject(beneficiariesData.contractors[0]),
    });
  }

  // Transactions collection
  if (transactionsData?.transactions) {
    // Use interface definition since transactions array might be empty
    const sampleTransaction = {
      type: 'incoming',
      amount: 1000,
      currency: 'USDC',
      fromAddress: '0x...',
      toAddress: '0x...',
      description: 'Payment',
      category: 'payment',
      timestamp: Date.now(),
      status: 'confirmed',
      tags: ['example'],
    };
    
    collections.push({
      name: 'transactions',
      fields: analyzeObject(sampleTransaction),
    });
  }

  return collections;
}

/**
 * Generates formatted source documentation for the rule parser
 */
export function generateAvailableSources(): string {
  const collections = extractCollections();
  
  const sourceLines = collections.map(collection => {
    const fieldNames = collection.fields
      .map(field => field.name)
      .join(', ');
    
    return `  * ${collection.name}: ${fieldNames}`;
  });

  return `Available data sources for dynamic amounts:\n${sourceLines.join('\n')}`;
}

/**
 * Generates formatted collection names for beneficiary reference
 */
export function generateAvailableCollections(): string[] {
  return ['treasury', 'accounts', 'invoices', 'employees', 'contractors', 'transactions'];
}

/**
 * Extracts all available tags from the mockup data
 */
export function generateAvailableTags(): string[] {
  const tags = new Set<string>();

  // Extract tags from invoices
  if (invoicesData?.invoices) {
    invoicesData.invoices.forEach(invoice => {
      if (invoice.tags) {
        invoice.tags.forEach(tag => tags.add(tag));
      }
    });
  }

  // Extract tags from employees
  if (beneficiariesData?.employees) {
    beneficiariesData.employees.forEach(employee => {
      if (employee.tags) {
        employee.tags.forEach(tag => tags.add(tag));
      }
    });
  }

  // Extract tags from contractors
  if (beneficiariesData?.contractors) {
    beneficiariesData.contractors.forEach(contractor => {
      if (contractor.tags) {
        contractor.tags.forEach(tag => tags.add(tag));
      }
    });
  }

  // Extract tags from transactions
  if (transactionsData?.transactions) {
    transactionsData.transactions.forEach(transaction => {
      if (transaction.tags) {
        transaction.tags.forEach(tag => tags.add(tag));
      }
    });
  }

  return Array.from(tags).sort();
}

/**
 * Generates formatted account slugs for payment sources
 */
export function generateAvailableAccountSlugs(): string[] {
  if (!accountsData?.accounts) return [];
  
  return accountsData.accounts
    .filter(account => account.isActive)
    .map(account => account.slug)
    .sort();
}

/**
 * Gets detailed collection information for debugging
 */
export function getCollectionDetails(): Collection[] {
  return extractCollections();
}
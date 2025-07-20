// Export all interfaces and data from mockup files
export * from './accounts';
export * from './beneficiaries';
export * from './invoices';
export * from './transactions';
export * from './treasury';

// Re-export all data objects for convenience
export { accountsData } from './accounts';
export { beneficiariesData } from './beneficiaries';
export { invoicesData } from './invoices';
export { transactionsData } from './transactions';
export { treasuryData } from './treasury';

// Keep employeesData for backward compatibility
export { beneficiariesData as employeesData } from './beneficiaries';
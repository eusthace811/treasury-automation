export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function formatAmount(amount: string | object): string {
  if (typeof amount === 'string') {
    const num = Number.parseFloat(amount);
    if (!Number.isNaN(num)) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return amount;
  }

  if (typeof amount === 'object' && amount !== null) {
    const amountObj = amount as any;
    
    // Handle new dynamic amount structure with source/formula
    if (amountObj.source) {
      if (amountObj.formula) {
        return `${amountObj.source} ${amountObj.formula}`;
      }
      return `${amountObj.source}`;
    }
    
    // Handle legacy amount structures
    if (amountObj.type === 'percentage') {
      return `${amountObj.value}% of source balance`;
    }
    if (amountObj.type === 'calculation') {
      return `Calculated: ${amountObj.value}`;
    }
    if (amountObj.value !== undefined) {
      return `${amountObj.value}`;
    }
    
    // Fallback for unknown object structures
    return JSON.stringify(amountObj);
  }

  return String(amount);
}

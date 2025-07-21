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
    const amountObj = amount as { type: string; value: string | number };
    if (amountObj.type === 'percentage') {
      return `${amountObj.value}% of source balance`;
    }
    if (amountObj.type === 'calculation') {
      return `Calculated: ${amountObj.value}`;
    }
    return `${amountObj.value}`;
  }

  return String(amount);
}

import cronstrue from 'cronstrue';

/**
 * Convert cron expressions to human-readable descriptions
 */
export function cronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  
  // Handle Unix cron format (5 fields)
  if (parts.length !== 5) {
    return `Custom schedule: ${cron}`;
  }

  try {
    // Use cronstrue library for accurate human-readable descriptions
    return cronstrue.toString(cron, {
      throwExceptionOnParseError: true,
      verbose: false,
      dayOfWeekStartIndexZero: true, // Sunday = 0 (Unix standard)
      use24HourTimeFormat: true
    });
  } catch (error) {
    // Fallback if cronstrue fails to parse
    return `Custom schedule: ${cron}`;
  }
}


/**
 * Format condition for human reading
 */
export function formatCondition(condition: {
  field: string;
  operator: string;
  value: any;
  source?: string;
  description?: string;
}): string {
  if (condition.description) {
    return condition.description;
  }

  const { field, operator, value, source } = condition;
  const sourceText = source ? `${source} ` : '';
  
  const operatorMap: Record<string, string> = {
    '==': 'equals',
    '!=': 'does not equal',
    '>': 'is greater than',
    '>=': 'is greater than or equal to',
    '<': 'is less than',
    '<=': 'is less than or equal to',
    'contains': 'contains',
    'not_contains': 'does not contain',
    'in': 'is in',
    'not_in': 'is not in',
  };

  const operatorText = operatorMap[operator] || operator;
  const valueText = typeof value === 'boolean' 
    ? (value ? 'true' : 'false')
    : Array.isArray(value) 
      ? value.join(', ')
      : String(value);

  return `${sourceText}${field} ${operatorText} ${valueText}`;
}

/**
 * Format payment for human reading
 */
export function formatPayment(payment: {
  action: 'simple' | 'split' | 'leftover';
  source: string;
  amount: any;
  currency: string;
  beneficiary: string[];
  percentages?: number[];
}): string {
  const { action, source, amount, currency, beneficiary } = payment;
  
  // Format amount
  let amountText = '';
  if (typeof amount === 'string') {
    amountText = amount;
  } else if (typeof amount === 'object' && amount !== null) {
    if (amount.type === 'dynamic' && amount.value) {
      amountText = amount.value;
    } else if (amount.type === 'fixed' && amount.value) {
      amountText = `${amount.value} ${currency}`;
    } else if (amount.type === 'string' && amount.value) {
      amountText = amount.value === 'unspecified' ? 'the specified amount' : amount.value;
    } else {
      amountText = 'the amount';
    }
  } else if (typeof amount === 'number') {
    amountText = `${amount} ${currency}`;
  } else {
    amountText = 'the amount';
  }

  // Format beneficiaries
  const beneficiaryText = beneficiary.length === 1 
    ? beneficiary[0] 
    : beneficiary.length === 2
      ? `${beneficiary[0]} and ${beneficiary[1]}`
      : `${beneficiary.slice(0, -1).join(', ')}, and ${beneficiary[beneficiary.length - 1]}`;

  // Format based on action type
  switch (action) {
    case 'simple':
      return `Pay ${amountText} in ${currency} from ${source} to ${beneficiaryText}`;
    
    case 'split':
      if (payment.percentages && payment.percentages.length === beneficiary.length) {
        const splits = beneficiary.map((b, i) => `${b} (${payment.percentages![i]}%)`).join(', ');
        return `Split ${amountText} in ${currency} from ${source} between: ${splits}`;
      }
      return `Split ${amountText} in ${currency} from ${source} between ${beneficiaryText}`;
    
    case 'leftover':
      return `Distribute remaining ${currency} from ${source} to ${beneficiaryText}`;
    
    default:
      return `Pay ${amountText} in ${currency} from ${source} to ${beneficiaryText}`;
  }
}
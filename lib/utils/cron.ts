/**
 * Convert cron expressions to human-readable descriptions
 */
export function cronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  
  // Handle Unix cron format (5 fields)
  if (parts.length !== 5) {
    return `Custom schedule: ${cron}`;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Common patterns
  const patterns = [
    // Every Friday patterns (5-field Unix cron)
    { pattern: /^0 12 \* \* 5$/, description: 'Every Friday at 12:00 PM' },
    { pattern: /^0 0 \* \* 5$/, description: 'Every Friday at midnight' },
    
    // Every Monday
    { pattern: /^0 0 \* \* 1$/, description: 'Every Monday at midnight' },
    { pattern: /^0 0 \* \* MON$/, description: 'Every Monday at midnight' },
    
    // Daily patterns
    { pattern: /^0 0 \* \* \*$/, description: 'Daily at midnight' },
    { pattern: /^0 (\d+) \* \* \*$/, description: (m: RegExpMatchArray) => `Daily at ${m[1]}:00` },
    { pattern: /^0 (\d+) (\d+) \* \*$/, description: (m: RegExpMatchArray) => `Daily at ${m[2].padStart(2, '0')}:${m[1].padStart(2, '0')}` },
    
    // Weekly patterns
    { pattern: /^0 0 \* \* (\d)$/, description: (m: RegExpMatchArray) => `Every ${getDayName(parseInt(m[1]))} at midnight` },
    { pattern: /^0 (\d+) (\d+) \* \* (\d)$/, description: (m: RegExpMatchArray) => `Every ${getDayName(parseInt(m[3]))} at ${m[2].padStart(2, '0')}:${m[1].padStart(2, '0')}` },
    
    // Monthly patterns
    { pattern: /^0 0 (\d+) \* \*$/, description: (m: RegExpMatchArray) => `Monthly on the ${getOrdinal(parseInt(m[1]))} at midnight` },
    { pattern: /^0 (\d+) (\d+) (\d+) \* \*$/, description: (m: RegExpMatchArray) => `Monthly on the ${getOrdinal(parseInt(m[3]))} at ${m[2].padStart(2, '0')}:${m[1].padStart(2, '0')}` },
  ];

  for (const { pattern, description } of patterns) {
    const match = cron.match(pattern);
    if (match) {
      return typeof description === 'function' ? description(match) : description;
    }
  }

  // Fallback for common time patterns
  if (parts.length === 5) {
    const [min, hr, dom, mon, dow] = parts;
    
    // Try to build a human description
    let result = 'Runs ';
    
    // Frequency
    if (dow !== '*' && dow !== '?') {
      if (dow.includes(',')) {
        const days = dow.split(',').map(d => getDayName(parseInt(d))).join(', ');
        result += `on ${days} `;
      } else {
        result += `every ${getDayName(parseInt(dow))} `;
      }
    } else if (dom !== '*' && dom !== '?') {
      result += `on the ${getOrdinal(parseInt(dom))} of each month `;
    } else {
      result += 'daily ';
    }
    
    // Time
    if (hr !== '*' && min !== '*') {
      result += `at ${hr.padStart(2, '0')}:${min.padStart(2, '0')}`;
    } else if (hr !== '*') {
      result += `at ${hr}:00`;
    }
    
    return result;
  }

  return `Custom schedule: ${cron}`;
}

function getDayName(dayNum: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum] || `Day ${dayNum}`;
}

function getOrdinal(num: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const value = num % 100;
  return num + (suffix[(value - 20) % 10] || suffix[value] || suffix[0]);
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
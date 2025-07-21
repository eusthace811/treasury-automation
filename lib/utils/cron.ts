import { toString as cronToString } from 'cronstrue';

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
    return cronToString(cron, {
      throwExceptionOnParseError: true,
      verbose: false,
      dayOfWeekStartIndexZero: true, // Sunday = 0 (Unix standard)
      use24HourTimeFormat: true,
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
    contains: 'contains',
    not_contains: 'does not contain',
    in: 'is in',
    not_in: 'is not in',
  };

  const operatorText = operatorMap[operator] || operator;
  const valueText =
    typeof value === 'boolean'
      ? value
        ? 'true'
        : 'false'
      : Array.isArray(value)
        ? value.join(', ')
        : String(value);

  return `${sourceText}${field} ${operatorText} ${valueText}`;
}

/**
 * Format payment for human reading
 */
export function formatPayment(payment: {
  action: 'simple' | 'split' | 'calculation' | 'leftover';
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
    // Handle new source + formula structure
    if ('source' in amount && amount.source) {
      if ('formula' in amount && amount.formula) {
        amountText = `${amount.source} ${amount.formula}`;
      } else {
        amountText = `${amount.source}`;
      }
    } else {
      // Invalid object structure - log warning and show structure
      console.warn('Invalid amount object structure:', amount);
      amountText = `invalid amount (${JSON.stringify(amount)})`;
    }
  } else if (typeof amount === 'number') {
    amountText = `${amount}`;
  } else {
    // Log warning for completely invalid amount types
    console.warn('Invalid amount type:', typeof amount, amount);
    amountText = `invalid amount (${typeof amount})`;
  }

  // Format beneficiaries
  const beneficiaryText =
    beneficiary.length === 1
      ? beneficiary[0]
      : beneficiary.length === 2
        ? `${beneficiary[0]} and ${beneficiary[1]}`
        : `${beneficiary.slice(0, -1).join(', ')}, and ${beneficiary[beneficiary.length - 1]}`;

  // Format based on action type
  switch (action) {
    case 'simple':
      return `Pay ${amountText} in ${currency} from ${source} to ${beneficiaryText}`;

    case 'split':
      if (
        payment.percentages &&
        payment.percentages.length === beneficiary.length
      ) {
        const splits = beneficiary
          .map((b, i) => `${b} (${payment.percentages?.[i] ?? 0}%)`)
          .join(', ');
        return `Split ${amountText} in ${currency} from ${source} between: ${splits}`;
      }
      return `Split ${amountText} in ${currency} from ${source} between ${beneficiaryText}`;

    case 'calculation':
      // For calculation actions, show the detailed calculation formula
      return `Calculate and pay ${amountText} in ${currency} from ${source} to ${beneficiaryText}`;

    case 'leftover':
      return `Distribute remaining ${currency} from ${source} to ${beneficiaryText}`;

    default:
      return `Pay ${amountText} in ${currency} from ${source} to ${beneficiaryText}`;
  }
}

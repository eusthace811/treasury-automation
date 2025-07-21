export function parseCronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  
  if (parts.length !== 5) {
    return cron; // Return original if not standard 5-part cron
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Handle some common patterns
  if (cron === '0 0 * * 5') {
    return 'Every Friday at midnight';
  }
  
  if (cron === '0 9 * * 1-5') {
    return 'Every weekday at 9:00 AM';
  }
  
  if (cron === '0 0 1 * *') {
    return 'First day of every month at midnight';
  }
  
  if (cron === '0 0 * * 0') {
    return 'Every Sunday at midnight';
  }

  // Build human readable string
  let result = '';
  
  // Frequency
  if (dayOfWeek !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (dayOfWeek.includes('-')) {
      const [start, end] = dayOfWeek.split('-').map(d => parseInt(d));
      result += `Every ${days[start]} to ${days[end]}`;
    } else if (dayOfWeek.includes(',')) {
      const dayNumbers = dayOfWeek.split(',').map(d => parseInt(d));
      const dayNames = dayNumbers.map(d => days[d]);
      result += `Every ${dayNames.join(', ')}`;
    } else {
      result += `Every ${days[parseInt(dayOfWeek)]}`;
    }
  } else if (dayOfMonth !== '*') {
    if (dayOfMonth === '1') {
      result += 'First day of the month';
    } else if (dayOfMonth === '15') {
      result += '15th of the month';
    } else {
      result += `${dayOfMonth}${getOrdinalSuffix(parseInt(dayOfMonth))} of the month`;
    }
  } else if (hour !== '*' && minute !== '*') {
    result += 'Every day';
  } else {
    result += 'Multiple times';
  }

  // Time
  if (hour !== '*' && minute !== '*') {
    const h = parseInt(hour);
    const m = parseInt(minute);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const minuteStr = m === 0 ? '' : `:${m.toString().padStart(2, '0')}`;
    result += ` at ${hour12}${minuteStr} ${ampm}`;
  } else if (hour !== '*') {
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    result += ` at ${hour12}:00 ${ampm}`;
  }

  return result || cron;
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function formatAmount(amount: string | object): string {
  if (typeof amount === 'string') {
    const num = parseFloat(amount);
    if (!isNaN(num)) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
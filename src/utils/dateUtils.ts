// Format dates using date-fns
import {
  format,
  formatDistanceToNow,
  parse,
  isValid,
  differenceInDays,
} from 'date-fns';

export const dateUtils = {
  // Format date to readable string
  formatDate: (date: Date | string, formatStr: string = 'PPP') => {
    const dateObj = typeof date === 'string' ? parse(date, 'yyyy-MM-dd', new Date()) : date;
    return isValid(dateObj) ? format(dateObj, formatStr) : 'Invalid date';
  },

  // Format date to ISO string
  toISO: (date: Date) => {
    return date.toISOString();
  },

  // Get relative time (e.g., "2 days ago")
  getRelativeTime: (date: Date | string) => {
    const dateObj = typeof date === 'string' ? parse(date, 'yyyy-MM-dd', new Date()) : date;
    return isValid(dateObj) ? formatDistanceToNow(dateObj, { addSuffix: true }) : 'Unknown';
  },

  // Get days difference
  getDaysDifference: (startDate: Date, endDate: Date) => {
    return differenceInDays(endDate, startDate);
  },

  // Format currency
  formatCurrency: (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  // Parse date string
  parseDate: (dateString: string, dateFormat: string = 'yyyy-MM-dd') => {
    return parse(dateString, dateFormat, new Date());
  },
};

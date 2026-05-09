// Utility functions for formatting data

/**
 * Get display name from user data
 * @param user - User object with first_name, last_name, or email
 * @returns Formatted display name
 */
export const getDisplayName = (user: any): string => {
  if (!user) return 'Unknown User';

  const firstName = user.first_name || user.firstName || '';
  const lastName = user.last_name || user.lastName || '';

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  if (firstName) return firstName;
  if (lastName) return lastName;

  return user.email || user.name || 'Unknown User';
};

/**
 * Format currency values
 * @param amount - Amount to format (number or string)
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number | string,
  currency: string = 'USD'
): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(numAmount);
};

/**
 * Format date for display
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

/**
 * Format time for display
 * @param time - Time string or Date object
 * @returns Formatted time string
 */
export const formatTime = (time: string | Date): string => {
  if (!time) return '';

  const t = typeof time === 'string' ? new Date(time) : time;

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(t);
};

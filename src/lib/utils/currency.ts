export function formatCurrency(amount: number, currency: string): string {
  if (currency === 'SAT') {
    return `${amount.toLocaleString()} sats`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
} 
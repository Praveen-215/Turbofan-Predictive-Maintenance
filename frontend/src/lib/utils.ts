/**
 * Utility helpers for TURBOGUARD AI Dashboard
 */

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('en-US').format(val);
}

export function formatCycles(cycles: number): string {
  return `${formatNumber(cycles)} ${cycles === 1 ? 'cycle' : 'cycles'}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

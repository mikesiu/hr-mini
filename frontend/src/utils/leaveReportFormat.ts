/** Display helpers for leave taken category groups. */

export function formatLeaveDays(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function leaveGroupHeading(group: {
  group_value?: string;
  group_count?: number;
  group_summary?: Record<string, unknown> | null;
}): string {
  const base = `${group.group_value ?? ''} (${group.group_count ?? 0} records)`;
  const days = group.group_summary?.total_days;
  if (days === undefined || days === null || days === '') return base;
  return `${base} - Subtotal: ${formatLeaveDays(Number(days))} days`;
}

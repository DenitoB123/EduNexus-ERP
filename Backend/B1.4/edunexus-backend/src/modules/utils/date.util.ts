export function toStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function diffInDays(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isExpired(date: Date): boolean {
  return date < new Date();
}

export function formatDate(date: Date, locale = 'en-US'): string {
  return date.toLocaleDateString(locale);
}

export function parseIsoDate(iso: string): Date {
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new Error(`Invalid ISO date string: ${iso}`);
  return d;
}

export function currentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

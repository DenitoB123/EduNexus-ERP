export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (txt) => capitalize(txt));
}

export function truncate(value: string, maxLength: number, suffix = '…'): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - suffix.length) + suffix;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function maskPhone(phone: string): string {
  return phone.replace(/\d(?=\d{4})/g, '*');
}

export function generateCode(length = 6): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase();
}

export function generateNumericCode(length = 6): string {
  const max = Math.pow(10, length);
  const min = Math.pow(10, length - 1);
  return String(Math.floor(Math.random() * (max - min)) + min);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function interpolate(
  template: string,
  variables: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`,
  );
}

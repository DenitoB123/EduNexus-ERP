export const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'sw-KE'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en-US';
export const DEFAULT_CURRENCY = 'KES';

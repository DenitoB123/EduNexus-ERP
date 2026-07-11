export interface BrandingConfig {
  institutionName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
  addressLines?: string[];
}

export interface ReportLayoutConfig {
  orientation?: 'portrait' | 'landscape';
  showHeader?: boolean;
  showFooter?: boolean;
  showPageNumbers?: boolean;
  showGeneratedTimestamp?: boolean;
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
}

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  [ExportFormat.PDF]: 'application/pdf',
  [ExportFormat.EXCEL]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  [ExportFormat.CSV]: 'text/csv',
  [ExportFormat.JSON]: 'application/json',
  [ExportFormat.XML]: 'application/xml',
};

export const EXPORT_FILE_EXTENSIONS: Record<ExportFormat, string> = {
  [ExportFormat.PDF]: 'pdf',
  [ExportFormat.EXCEL]: 'xlsx',
  [ExportFormat.CSV]: 'csv',
  [ExportFormat.JSON]: 'json',
  [ExportFormat.XML]: 'xml',
};

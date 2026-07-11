/**
 * Injection token for the multi-provider array of IReportExporter
 * implementations. ExportService injects `REPORT_EXPORTERS` and
 * indexes them by `.format`, so adding a new export format is just
 * adding another provider to this token in reporting.module.ts.
 */
export const REPORT_EXPORTERS = 'REPORT_EXPORTERS';

export const REPORT_EXPORT_FORMATS = Object.freeze(['csv', 'xlsx', 'pdf']);

const CONTENT_TYPES = Object.freeze({
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
});

export class ReportingExportError extends Error {
  constructor(message, status = 400, code = 'report_export_error') {
    super(message);
    this.name = 'ReportingExportError';
    this.status = status;
    this.code = code;
  }
}

export function exportFormat(value = 'csv') {
  const format = String(value).trim().toLowerCase();
  if (!REPORT_EXPORT_FORMATS.includes(format)) {
    throw new ReportingExportError('format must be csv, xlsx, or pdf', 400, 'invalid_export_format');
  }
  return format;
}

export function exportPlan({ report, format = 'csv', filters = {} }) {
  const normalizedReport = String(report || '').trim();
  if (!normalizedReport) throw new ReportingExportError('report is required', 400, 'report_required');
  const normalizedFormat = exportFormat(format);
  return {
    report: normalizedReport,
    format: normalizedFormat,
    content_type: CONTENT_TYPES[normalizedFormat],
    delivery: normalizedFormat === 'csv' ? 'stream' : 'document',
    filters,
    status: 'planned',
  };
}

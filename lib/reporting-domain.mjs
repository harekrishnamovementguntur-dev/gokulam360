export const REPORTING_CONTRACT_VERSION = '1.0';
export const REPORT_NAMES = Object.freeze([
  'members',
  'memberships',
  'payments',
  'ledger',
  'attendance',
  'attendance-summary',
]);
export const DASHBOARD_NAMES = Object.freeze(['organization', 'teacher', 'finance']);
export const REPORTING_READ_ROLES = Object.freeze(['super_admin', 'org_admin', 'teacher']);

export class ReportingError extends Error {
  constructor(message, status = 400, code = 'reporting_error') {
    super(message);
    this.name = 'ReportingError';
    this.status = status;
    this.code = code;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SORT_FIELDS = new Set(['created_at', 'effective_at', 'recorded_at', 'posted_at', 'date', 'id']);
const DIRECTIONS = new Set(['asc', 'desc']);
const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

function searchParamsOf(input) {
  if (input instanceof URL) return input.searchParams;
  if (input instanceof URLSearchParams) return input;
  if (typeof input === 'string') return new URL(input, 'http://reporting.local').searchParams;
  if (input && typeof input.get === 'function') return input;
  throw new ReportingError('A URL or URLSearchParams value is required', 400, 'invalid_filter_input');
}

function dateValue(value, field) {
  if (!value) return null;
  if (!DATE_RE.test(value) || Number.isNaN(Date.parse(value + 'T00:00:00.000Z'))) {
    throw new ReportingError(field + ' must be YYYY-MM-DD', 400, 'invalid_date');
  }
  return value;
}

function optionalText(value, field) {
  if (value == null || value === '') return null;
  const result = String(value).trim();
  if (!result || result.length > 200) throw new ReportingError(field + ' must be 1 to 200 characters', 400, 'invalid_filter');
  return result;
}

export function parseReportFilters(input) {
  const params = searchParamsOf(input);
  if (params.get('organization_id')) {
    throw new ReportingError(
      'organization_id must not be supplied; organization scope is derived from authentication',
      400,
      'organization_scope_forbidden',
    );
  }

  const from = dateValue(params.get('from'), 'from');
  const to = dateValue(params.get('to'), 'to');
  if (from && to && from > to) throw new ReportingError('from must not be after to', 400, 'invalid_date_range');

  const rawPageSize = params.get('page_size');
  const pageSize = rawPageSize == null || rawPageSize === '' ? DEFAULT_PAGE_SIZE : Number(rawPageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new ReportingError('page_size must be an integer from 1 to ' + MAX_PAGE_SIZE, 400, 'invalid_page_size');
  }

  const sort = params.get('sort') || 'created_at';
  if (!SORT_FIELDS.has(sort)) throw new ReportingError('Unsupported report sort field', 400, 'invalid_sort');
  const direction = params.get('direction') || 'desc';
  if (!DIRECTIONS.has(direction)) throw new ReportingError('direction must be asc or desc', 400, 'invalid_direction');

  return {
    from,
    to,
    program_id: optionalText(params.get('program_id'), 'program_id'),
    program_offering_id: optionalText(params.get('program_offering_id'), 'program_offering_id'),
    term_id: optionalText(params.get('term_id'), 'term_id'),
    session_id: optionalText(params.get('session_id'), 'session_id'),
    membership_id: optionalText(params.get('membership_id'), 'membership_id'),
    student_id: optionalText(params.get('student_id'), 'student_id'),
    status: optionalText(params.get('status'), 'status'),
    kind: optionalText(params.get('kind'), 'kind'),
    payment_method: optionalText(params.get('payment_method'), 'payment_method'),
    reason_code: optionalText(params.get('reason_code'), 'reason_code'),
    source_type: optionalText(params.get('source_type'), 'source_type'),
    page_size: pageSize,
    cursor: decodeCursor(params.get('cursor')),
    sort,
    direction,
  };
}

function encodeBase64Url(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeBase64Url(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export function encodeCursor({ value, id, sort = 'created_at', direction = 'desc' }) {
  if (value == null || !id) throw new ReportingError('Cursor value and id are required', 400, 'invalid_cursor');
  if (!SORT_FIELDS.has(sort) || !DIRECTIONS.has(direction)) throw new ReportingError('Invalid cursor sort metadata', 400, 'invalid_cursor');
  return encodeBase64Url({ version: 1, value: String(value), id: String(id), sort, direction });
}

export function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const decoded = decodeBase64Url(String(cursor));
    if (
      decoded?.version !== 1 ||
      typeof decoded.value !== 'string' ||
      typeof decoded.id !== 'string' ||
      !SORT_FIELDS.has(decoded.sort) ||
      !DIRECTIONS.has(decoded.direction)
    ) throw new Error('invalid');
    return decoded;
  } catch {
    throw new ReportingError('cursor is invalid or expired', 400, 'invalid_cursor');
  }
}

export function cursorPredicate(cursor, field = 'created_at', direction = 'desc') {
  if (!cursor) return {};
  if (cursor.sort !== field || cursor.direction !== direction) {
    throw new ReportingError('cursor does not match the requested sort', 400, 'cursor_sort_mismatch');
  }
  const operator = direction === 'asc' ? '$gt' : '$lt';
  return {
    $or: [
      { [field]: { [operator]: cursor.value } },
      { [field]: cursor.value, id: { [operator]: cursor.id } },
    ],
  };
}

export function organizationScope(user) {
  if (!user || !user.organization_id) {
    throw new ReportingError('An authenticated organization context is required', 422, 'organization_context_required');
  }
  return { organization_id: user.organization_id };
}

export function assertReportingAccess(user, roles = REPORTING_READ_ROLES) {
  if (!user) throw new ReportingError('Unauthorized', 401, 'unauthorized');
  if (!roles.includes(user.role)) throw new ReportingError('Forbidden', 403, 'forbidden');
  return organizationScope(user);
}

export function reportResponse({ items = [], summary = {}, page = {}, filters = {} } = {}) {
  return {
    items,
    summary,
    page: {
      page_size: page.page_size ?? filters.page_size ?? DEFAULT_PAGE_SIZE,
      next_cursor: page.next_cursor ?? null,
      has_more: page.has_more === true,
    },
    filters,
    meta: { contract_version: REPORTING_CONTRACT_VERSION, generated_at: new Date().toISOString() },
  };
}

export function reportCatalog(kind, names) {
  return {
    kind,
    contract_version: REPORTING_CONTRACT_VERSION,
    reports: names.map((name) => ({ name, status: 'planned' })),
  };
}

export const constants = Object.freeze({ DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SORT_FIELDS, DIRECTIONS });

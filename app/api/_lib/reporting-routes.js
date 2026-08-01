import { getDb, json, requireUser } from './server.js';
import {
  DASHBOARD_NAMES,
  REPORTING_READ_ROLES,
  REPORT_NAMES,
  ReportingError,
  assertReportingAccess,
  parseReportFilters,
  reportCatalog,
} from '../../../lib/reporting-domain.mjs';
import { listMembers, listMemberships } from './reporting-members.mjs';
import { listLedgerReports, listPaymentReports } from './reporting-finance.mjs';

function reportingErrorResponse(error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const payload = {
    error: {
      code: error?.code || 'reporting_error',
      message: status >= 500 ? 'Unable to complete the reporting request' : error.message,
    },
  };
  if (status >= 500) console.error('Reporting API error', error);
  return json(payload, status);
}

function responseFromAuthError(auth) {
  return auth.error || null;
}

export async function reportCatalogResponse(req, kind) {
  try {
    const auth = requireUser(req, REPORTING_READ_ROLES);
    const authError = responseFromAuthError(auth);
    if (authError) return authError;
    assertReportingAccess(auth.user);
    return json(reportCatalog(kind, kind === 'reports' ? REPORT_NAMES : DASHBOARD_NAMES));
  } catch (error) {
    return reportingErrorResponse(error);
  }
}

export async function reportEndpointResponse(req, name, kind) {
  try {
    const auth = requireUser(req, REPORTING_READ_ROLES);
    const authError = responseFromAuthError(auth);
    if (authError) return authError;

    const financial = kind === 'reports' && ['payments', 'ledger'].includes(name);
    const scope = assertReportingAccess(auth.user, financial ? ['super_admin', 'org_admin'] : REPORTING_READ_ROLES);
    const filters = parseReportFilters(new URL(req.url).searchParams);
    const names = kind === 'reports' ? REPORT_NAMES : DASHBOARD_NAMES;
    if (!names.includes(name)) {
      throw new ReportingError(
        'Unknown ' + kind.slice(0, -1) + ': ' + name,
        404,
        'unknown_reporting_resource',
      );
    }

    if (kind === 'reports' && name === 'members') {
      return json(await listMembers({ db: await getDb(), scope, filters }));
    }
    if (kind === 'reports' && name === 'memberships') {
      return json(await listMemberships({ db: await getDb(), scope, filters }));
    }
    if (kind === 'reports' && name === 'payments') {
      return json(await listPaymentReports({ db: await getDb(), scope, filters }));
    }
    if (kind === 'reports' && name === 'ledger') {
      return json(await listLedgerReports({ db: await getDb(), scope, filters }));
    }

    throw new ReportingError(
      'This reporting resource is not implemented in the foundation phase',
      501,
      'reporting_resource_not_implemented',
    );
  } catch (error) {
    return reportingErrorResponse(error);
  }
}

import { apiErrorResponse, getDb, json, requireUser } from '../../_lib/server.js';
import { parseReportFilters, REPORTING_READ_ROLES } from '../../../lib/reporting-domain.mjs';
import { listSessionAttendanceSummary } from '../../_lib/attendance-reporting.js';

export async function GET(req) {
  const auth = requireUser(req, REPORTING_READ_ROLES);
  if (auth.error) return auth.error;
  try {
    const filters = parseReportFilters(new URL(req.url).searchParams);
    const db = await getDb();
    return json(await listSessionAttendanceSummary({ db, user: auth.user, filters }));
  } catch (error) {
    return apiErrorResponse(error, 'Session Attendance Summary');
  }
}

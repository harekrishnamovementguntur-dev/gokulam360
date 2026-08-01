import { apiErrorResponse, getDb, requireUser } from '../../../_lib/server.js';
import { parseReportFilters, REPORTING_READ_ROLES } from '../../../../lib/reporting-domain.mjs';
import { attendanceCsv, listAttendanceReport } from '../../../_lib/attendance-reporting.js';

export async function GET(req) {
  const auth = requireUser(req, REPORTING_READ_ROLES);
  if (auth.error) return auth.error;
  try {
    const filters = parseReportFilters(new URL(req.url).searchParams);
    const result = await listAttendanceReport({ db: await getDb(), user: auth.user, filters });
    const body = attendanceCsv(result.items);
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="attendance-report.csv"',
        'X-Report-Contract-Version': '1.0',
      },
    });
  } catch (error) {
    return apiErrorResponse(error, 'Attendance Report Export');
  }
}

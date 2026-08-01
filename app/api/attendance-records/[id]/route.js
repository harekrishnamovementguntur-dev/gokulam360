import { apiErrorResponse, getDb, json, requireUser, resolveOrganizationId } from '../../_lib/server.js';
import { ensureAttendanceInfrastructure, getAttendanceRecord } from '../../_lib/attendance.js';

export async function GET(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
  if (auth.error) return auth.error;
  try {
    const organizationId = resolveOrganizationId(auth.user, new URL(req.url).searchParams.get('organization_id'));
    const db = await getDb();
    await ensureAttendanceInfrastructure(db);
    return json(await getAttendanceRecord({ db, organizationId, id: params.id }));
  } catch (error) {
    return apiErrorResponse(error, 'Attendance Record');
  }
}

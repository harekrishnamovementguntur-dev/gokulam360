import { apiErrorResponse, getDb, json, requireUser, resolveOrganizationId } from '../_lib/server.js';
import { ensureCreditLedgerInfrastructure } from '../_lib/credit-ledger.js';
import { ensureAttendanceInfrastructure, listAttendanceRecords, createAttendanceCommand } from '../_lib/attendance.js';

const roles = ['super_admin', 'org_admin', 'teacher'];

export async function GET(req) {
  const auth = requireUser(req, roles);
  if (auth.error) return auth.error;
  try {
    const params = new URL(req.url).searchParams;
    const organizationId = resolveOrganizationId(auth.user, params.get('organization_id'));
    const db = await getDb();
    await ensureAttendanceInfrastructure(db);
    const filters = {};
    for (const key of ['session_id', 'membership_term_participation_id', 'membership_id', 'term_id', 'event_type']) {
      if (params.get(key)) filters[key] = params.get(key);
    }
    const items = await listAttendanceRecords({ db, organizationId, filters });
    return json({ items });
  } catch (error) {
    return apiErrorResponse(error, 'Attendance Records');
  }
}

export async function POST(req) {
  const auth = requireUser(req, roles);
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const organizationId = resolveOrganizationId(auth.user, body.organization_id);
    const db = await getDb();
    await ensureAttendanceInfrastructure(db);
    await ensureCreditLedgerInfrastructure(db);
    const result = await createAttendanceCommand({
      db,
      user: auth.user,
      organizationId,
      body,
      requestIdempotencyKey: req.headers.get('idempotency-key'),
    });
    return json(result, 201);
  } catch (error) {
    return apiErrorResponse(error, 'Attendance Records');
  }
}

import { apiErrorResponse, getDb, json, requireUser, resolveOrganizationId } from '../../../_lib/server.js';
import { ensureCreditLedgerInfrastructure } from '../../../_lib/credit-ledger.js';
import { ensureAttendanceInfrastructure, correctAttendanceCommand } from '../../../_lib/attendance.js';

export async function POST(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const organizationId = resolveOrganizationId(auth.user, body.organization_id);
    const db = await getDb();
    await ensureAttendanceInfrastructure(db);
    await ensureCreditLedgerInfrastructure(db);
    const result = await correctAttendanceCommand({
      db,
      user: auth.user,
      organizationId,
      id: params.id,
      body,
      requestIdempotencyKey: req.headers.get('idempotency-key'),
      voidRecord: true,
    });
    return json(result);
  } catch (error) {
    return apiErrorResponse(error, 'Attendance Void');
  }
}

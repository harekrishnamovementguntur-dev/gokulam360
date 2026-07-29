import { apiErrorResponse, getDb, json, requireUser, resolveOrganizationId, scopeFor } from '../_lib/server.js';
import { ensureCreditLedgerInfrastructure, createManualAdjustment } from '../_lib/credit-ledger.js';

export async function GET(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
  if (auth.error) return auth.error;
  try {
    const db = await getDb();
    await ensureCreditLedgerInfrastructure(db);
    const url = new URL(req.url);
    const membershipId = url.searchParams.get('membership_id');
    if (!membershipId) return json({ error: 'membership_id is required' }, 422);
    const organizationId = resolveOrganizationId(auth.user, url.searchParams.get('organization_id'));
    return json(await (await import('../_lib/credit-ledger.js')).getMembershipLedger({
      db,
      organizationId,
      membershipId,
    }));
  } catch (error) {
    return apiErrorResponse(error, 'Credit Ledger');
  }
}

export async function POST(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;
  try {
    const db = await getDb();
    await ensureCreditLedgerInfrastructure(db);
    const body = await req.json();
    const organizationId = resolveOrganizationId(auth.user, body.organization_id);
    return json(await createManualAdjustment({
      db,
      user: auth.user,
      organizationId,
      body,
      idempotencyKey: req.headers.get('idempotency-key'),
    }), 201);
  } catch (error) {
    return apiErrorResponse(error, 'Credit Ledger');
  }
}

import { apiErrorResponse, getDb, json, requireUser, resolveOrganizationId, scopeFor } from '../_lib/server.js';
import { ensurePaymentInfrastructure, createPaymentCommand, listPayments } from '../_lib/payments.js';

export async function GET(req) {
  const auth = requireUser(req, ['super_admin','org_admin']);
  if (auth.error) return auth.error;
  try { const db = await getDb(); const organizationId = resolveOrganizationId(auth.user, new URL(req.url).searchParams.get('organization_id')); await ensurePaymentInfrastructure(db); return json({ items: await listPayments({ db, organizationId }) }); }
  catch (error) { return apiErrorResponse(error, 'Payments'); }
}
export async function POST(req) {
  const auth = requireUser(req, ['super_admin','org_admin']);
  if (auth.error) return auth.error;
  try { const db = await getDb(); const body = await req.json(); const organizationId = resolveOrganizationId(auth.user, body.organization_id); await ensurePaymentInfrastructure(db); return json(await createPaymentCommand({ db, user: auth.user, organizationId, body, idempotencyKey:req.headers.get('idempotency-key') }), 201); }
  catch (error) { return apiErrorResponse(error, 'Payments'); }
}

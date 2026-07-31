import { apiErrorResponse, getDb, json, requireUser, resolveOrganizationId } from '../../_lib/server.js';
import { getPaymentDetails, postPaymentCommand, refundPaymentCommand } from '../../_lib/payments.js';

export async function GET(req, { params }) {
  const auth = requireUser(req, ['super_admin','org_admin']);
  if (auth.error) return auth.error;
  try { const db = await getDb(); const organizationId = resolveOrganizationId(auth.user, new URL(req.url).searchParams.get('organization_id')); return json(await getPaymentDetails({ db, organizationId, id: params.id })); }
  catch (error) { return apiErrorResponse(error, 'Payment Transaction'); }
}
export async function POST(req, { params }) {
  const auth = requireUser(req, ['super_admin','org_admin']);
  if (auth.error) return auth.error;
  try {
    const body = await req.json(); const db = await getDb(); const organizationId = resolveOrganizationId(auth.user, body.organization_id);
    const command = body.command || 'post';
    if (command === 'refund') return json(await refundPaymentCommand({ db, user: auth.user, organizationId, id: params.id, body, idempotencyKey:req.headers.get('idempotency-key') }), 201);
    return json(await postPaymentCommand({ db, user: auth.user, organizationId, id: params.id, body, idempotencyKey:req.headers.get('idempotency-key') }));
  } catch (error) { return apiErrorResponse(error, 'Payment Transaction'); }
}

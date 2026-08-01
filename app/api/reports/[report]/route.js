import { reportEndpointResponse } from '../../_lib/reporting-routes.js';

export async function GET(req, { params }) {
  const resolvedParams = params && typeof params.then === 'function' ? await params : params;
  return reportEndpointResponse(req, resolvedParams?.report, 'reports');
}

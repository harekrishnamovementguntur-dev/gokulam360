import { reportCatalogResponse } from '../_lib/reporting-routes.js';

export async function GET(req) {
  return reportCatalogResponse(req, 'dashboards');
}

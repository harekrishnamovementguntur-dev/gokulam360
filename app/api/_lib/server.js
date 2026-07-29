import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'gokulam360';
const JWT_SECRET = process.env.JWT_SECRET;

let client;

export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function getDb() {
  if (!MONGO_URL) throw new Error('MONGO_URL must be configured');
  if (!client) {
    client = new MongoClient(MONGO_URL);
    await client.connect();
  }
  return client.db(DB_NAME);
}

export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiErrorResponse(error, context = 'request') {
  if (error?.code === 11000) return json({ error: 'A record with these values already exists' }, 409);
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) return json({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return json({ error: 'Request body must contain valid JSON' }, 400);
  console.error(context + ' API error', error);
  return json({ error: 'Unable to complete the request' }, 500);
}

export function membershipErrorResponse(error) {
  if (error?.code === 11000) return json({ error: 'A non-archived Membership already exists for this Student and Program' }, 409);
  return apiErrorResponse(error, 'Membership');
}

export function requireUser(req, roles = null) {
  if (!JWT_SECRET) return { error: json({ error: 'JWT_SECRET must be configured' }, 500) };
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { error: json({ error: 'Unauthorized' }, 401) };

  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (roles && !roles.includes(user.role)) return { error: json({ error: 'Forbidden' }, 403) };
    return { user };
  } catch {
    return { error: json({ error: 'Unauthorized' }, 401) };
  }
}

export function resolveOrganizationId(user, requestedOrganizationId) {
  if (user.role === 'super_admin') {
    if (!requestedOrganizationId) throw new ApiError('organization_id is required for super_admin', 422);
    return requestedOrganizationId;
  }
  if (!user.organization_id) throw new ApiError('Authenticated user has no organization', 422);
  return user.organization_id;
}

export function scopeFor(user) {
  return user.role === 'super_admin' ? {} : { organization_id: user.organization_id };
}

export function stripId(doc) {
  if (!doc) return doc;
  const { _id, current_marker, ...rest } = doc;
  return rest;
}

export async function runInTransaction(db, operation) {
  const session = db.client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

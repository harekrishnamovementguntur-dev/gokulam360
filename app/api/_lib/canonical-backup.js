const CANONICAL_BACKUP_VERSION = 'canonical-v1';
const TARGET_ORGANIZATION_COLLECTION = 'organizations';

export const CANONICAL_BACKUP_COLLECTIONS = [
  'students',
  'academic_programs',
  'program_offerings',
  'academic_terms',
  'academic_sessions',
  'memberships',
  'membership_term_participations',
  'payment_transactions',
  'payment_allocations',
  'credit_ledger_entries',
  'attendance_records',
  'audit_logs',
  'outbox_events',
];

const LEGACY_COLLECTION_KEYS = ['enrollments', 'fees', 'attendance', 'programs', 'teachers', 'events', 'notifications', 'activity'];

export class BackupValidationError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function stripMongoId(document) {
  if (!document) return document;
  const { _id, ...rest } = document;
  return rest;
}

function organizationIdFor(user, requestedOrganizationId) {
  if (user.role === 'super_admin') {
    if (!requestedOrganizationId) throw new BackupValidationError(422, 'organization_context_required', 'Super Admin backup operations require an explicit organization_id');
    return requestedOrganizationId;
  }
  return user.organization_id;
}

function validateOrganizationDocuments(documents, organizationId, collectionName) {
  for (const document of documents) {
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      throw new BackupValidationError(422, 'invalid_backup_document', `Invalid document in ${collectionName}`);
    }
    if (document.organization_id !== organizationId) {
      throw new BackupValidationError(422, 'organization_scope_mismatch', `Document in ${collectionName} does not belong to the target organization`);
    }
  }
}

export async function exportCanonicalBackup({ db, user, requestedOrganizationId }) {
  const organizationId = organizationIdFor(user, requestedOrganizationId);
  const organization = await db.collection(TARGET_ORGANIZATION_COLLECTION).findOne({ id: organizationId });
  if (!organization) throw new BackupValidationError(404, 'organization_not_found', 'Target organization was not found');
  const entries = await Promise.all(CANONICAL_BACKUP_COLLECTIONS.map(async (name) => [
    name,
    await db.collection(name).find({ organization_id: organizationId }).toArray(),
  ]));
  const data = Object.fromEntries(entries);
  return {
    backup_version: CANONICAL_BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    exported_by: user.email,
    organization_id: organizationId,
    collections: [...CANONICAL_BACKUP_COLLECTIONS],
    counts: Object.fromEntries(Object.entries(data).map(([name, documents]) => [name, documents.length])),
    data: {
      organization: stripMongoId(organization),
      ...Object.fromEntries(Object.entries(data).map(([name, documents]) => [name, documents.map(stripMongoId)])),
    },
  };
}

function validateBackupShape(backup, organizationId) {
  if (!backup || backup.backup_version !== CANONICAL_BACKUP_VERSION) {
    throw new BackupValidationError(422, 'unsupported_backup_version', `Expected backup_version ${CANONICAL_BACKUP_VERSION}`);
  }
  if (backup.organization_id !== organizationId) {
    throw new BackupValidationError(422, 'organization_scope_mismatch', 'Backup organization does not match the target organization');
  }
  const data = backup.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new BackupValidationError(422, 'invalid_backup_data', 'Backup data must be an object');
  }
  const legacyKeys = LEGACY_COLLECTION_KEYS.filter((name) => Array.isArray(data[name]) && data[name].length > 0);
  if (legacyKeys.length) {
    throw new BackupValidationError(422, 'legacy_backup_data_not_supported', `Legacy collections are not accepted: ${legacyKeys.join(', ')}`);
  }
  const documents = {};
  for (const name of CANONICAL_BACKUP_COLLECTIONS) {
    if (!Array.isArray(data[name])) throw new BackupValidationError(422, 'invalid_backup_collection', `Backup collection ${name} must be an array`);
    documents[name] = data[name].map((document) => ({ ...document }));
    validateOrganizationDocuments(documents[name], organizationId, name);
  }
  if (!data.organization || data.organization.id !== organizationId) throw new BackupValidationError(422, 'organization_scope_mismatch', 'Backup must contain the target organization');
  return { organization: { ...data.organization }, documents };
}

async function replaceCollection(collection, documents, organizationId, session) {
  await collection.deleteMany({ organization_id: organizationId }, { session });
  if (documents.length) await collection.insertMany(documents, { session, ordered: true });
}

export async function restoreCanonicalBackup({ db, client, user, requestedOrganizationId, backup }) {
  const organizationId = organizationIdFor(user, requestedOrganizationId);
  const { organization, documents } = validateBackupShape(backup, organizationId);
  if (!client || typeof client.startSession !== 'function') {
    throw new BackupValidationError(503, 'transactions_unavailable', 'Canonical restore requires a transaction-capable MongoDB deployment');
  }
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      await db.collection(TARGET_ORGANIZATION_COLLECTION).replaceOne({ id: organizationId }, organization, { upsert: true, session });
      for (const name of CANONICAL_BACKUP_COLLECTIONS) await replaceCollection(db.collection(name), documents[name], organizationId, session);
      const now = new Date().toISOString();
      await db.collection('audit_logs').insertOne({ id: `backup-restore-${organizationId}-${Date.now()}`, organization_id: organizationId, entity_type: 'backup', entity_id: organizationId, action: 'backup.restored', actor_id: user.id, details: { backup_version: backup.backup_version }, created_at: now }, { session });
      await db.collection('outbox_events').insertOne({ id: `backup-restore-${organizationId}-${Date.now()}-event`, organization_id: organizationId, aggregate_type: 'backup', aggregate_id: organizationId, event_type: 'backup.restored', payload: { organization_id: organizationId, backup_version: backup.backup_version }, status: 'pending', occurred_at: now, created_at: now }, { session });
    });
  } catch (error) {
    if (error?.codeName === 'IllegalOperation' || error?.codeName === 'OperationNotSupportedInTransaction' || /transaction/i.test(error?.message || '')) {
      throw new BackupValidationError(503, 'transactions_unavailable', 'Canonical restore requires a transaction-capable MongoDB deployment');
    }
    throw error;
  } finally {
    await session.endSession();
  }
  return { restored: true, backup_version: backup.backup_version, organization_id: organizationId, counts: Object.fromEntries(Object.entries(documents).map(([name, values]) => [name, values.length])) };
}

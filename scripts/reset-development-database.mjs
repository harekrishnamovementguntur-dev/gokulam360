import { MongoClient } from 'mongodb';

const REQUIRED_CONFIRMATION = 'reset-gokulam360-v1';
const DEVELOPMENT_DATABASE = 'gokulam360';
const SYSTEM_COLLECTIONS = new Set(['system_config', 'system_settings', 'configuration']);

function fail(message) {
  throw new Error(message);
}

function assertSafeEnvironment() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    fail('Development reset is disabled in production.');
  }
  if (process.env.ALLOW_DEVELOPMENT_RESET !== 'true') {
    fail('Set ALLOW_DEVELOPMENT_RESET=true to enable the development reset.');
  }
  if (process.env.DEVELOPMENT_RESET_CONFIRM !== REQUIRED_CONFIRMATION) {
    fail(`Set DEVELOPMENT_RESET_CONFIRM=${REQUIRED_CONFIRMATION} to confirm the reset.`);
  }

  const configuredDbName = process.env.DB_NAME;
  const resetDbName = process.env.RESET_DB_NAME || (
    configuredDbName === DEVELOPMENT_DATABASE ? DEVELOPMENT_DATABASE : null
  );

  if (!resetDbName || (
    resetDbName !== DEVELOPMENT_DATABASE &&
    !/^gokulam360_[a-z0-9_-]+$/i.test(resetDbName)
  )) {
    fail('The reset database must be gokulam360 or a dedicated database beginning with gokulam360_.');
  }
  if (resetDbName === DEVELOPMENT_DATABASE && configuredDbName && configuredDbName !== DEVELOPMENT_DATABASE) {
    fail('RESET_DB_NAME=gokulam360 requires DB_NAME=gokulam360.');
  }
  if (resetDbName === configuredDbName && resetDbName !== DEVELOPMENT_DATABASE) {
    fail('RESET_DB_NAME must not equal DB_NAME except for the explicitly approved development database gokulam360.');
  }
  if (!process.env.MONGO_URL) fail('MONGO_URL must be configured.');
  if (!process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL) fail('BOOTSTRAP_SUPER_ADMIN_EMAIL must be configured.');

  return resetDbName;
}

async function resetDevelopmentDatabase() {
  const resetDbName = assertSafeEnvironment();

  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(resetDbName);
  const bootstrapEmail = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const summary = { database: resetDbName, removed: {}, preserved: [] };
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const bootstrap = await db.collection('users').findOne({
        email: bootstrapEmail,
        role: 'super_admin',
        organization_id: null,
      }, { session });

      if (!bootstrap) {
        fail('Bootstrap Super Admin was not found; refusing to reset this database.');
      }

      const collections = await db.listCollections({}, { nameOnly: true }).toArray();
      for (const { name } of collections) {
        if (name === 'users') {
          const result = await db.collection(name).deleteMany({ id: { $ne: bootstrap.id } }, { session });
          summary.removed[name] = result.deletedCount;
        } else if (SYSTEM_COLLECTIONS.has(name)) {
          summary.preserved.push(name);
        } else {
          const result = await db.collection(name).deleteMany({}, { session });
          summary.removed[name] = result.deletedCount;
        }
      }
      summary.preserved.push('users:' + bootstrap.email);
    });
  } finally {
    await session.endSession();
    await client.close();
  }

  return summary;
}

resetDevelopmentDatabase()
  .then((summary) => {
    console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
  })
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });

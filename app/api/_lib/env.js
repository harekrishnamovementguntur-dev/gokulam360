const REQUIRED_RUNTIME_ENV = ['MONGO_URL', 'JWT_SECRET'];

export function getMissingRuntimeEnv(env = process.env) {
  return REQUIRED_RUNTIME_ENV.filter((name) => !env[name]);
}

export function getRuntimeEnvStatus(env = process.env) {
  const missing = getMissingRuntimeEnv(env);
  return {
    ok: missing.length === 0,
    missing,
  };
}

export function requireRuntimeEnv(env = process.env) {
  const missing = getMissingRuntimeEnv(env);
  if (missing.length) {
    throw new Error(`Missing required runtime environment variables: ${missing.join(', ')}`);
  }
  return {
    MONGO_URL: env.MONGO_URL,
    JWT_SECRET: env.JWT_SECRET,
    DB_NAME: env.DB_NAME || 'gokulam360',
  };
}

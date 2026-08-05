const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'password_hash',
  'token',
  'secret',
  'access_token',
  'refresh_token',
]);

function redact(value, key = '') {
  if (SENSITIVE_KEYS.has(String(key).toLowerCase())) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      redact(childValue, childKey),
    ]));
  }
  return value;
}

function normalizeError(error) {
  if (!error) return undefined;
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  };
}

export function log(level, event, metadata = {}) {
  const entry = redact({
    timestamp: new Date().toISOString(),
    service: 'gokulam360',
    level,
    event,
    ...metadata,
  });

  const output = JSON.stringify(entry);
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
}

export const logger = {
  info(event, metadata) {
    log('info', event, metadata);
  },
  warn(event, metadata) {
    log('warn', event, metadata);
  },
  error(event, error, metadata = {}) {
    log('error', event, { ...metadata, error: normalizeError(error) });
  },
};

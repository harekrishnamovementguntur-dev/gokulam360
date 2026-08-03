const buckets = new Map();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 10;

function settings() {
  const windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || DEFAULT_WINDOW_MS);
  const maxRequests = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || DEFAULT_MAX_REQUESTS);

  return {
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : DEFAULT_WINDOW_MS,
    maxRequests: Number.isFinite(maxRequests) && maxRequests > 0 ? Math.floor(maxRequests) : DEFAULT_MAX_REQUESTS,
  };
}

export function allowRequest(scope, key) {
  const now = Date.now();
  const { windowMs, maxRequests } = settings();
  const bucketKey = `${scope}:${key}`;
  const current = buckets.get(bucketKey);

  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(bucketKey, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimitForTests() {
  buckets.clear();
}

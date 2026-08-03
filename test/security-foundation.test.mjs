import test from 'node:test';
import assert from 'node:assert/strict';
import { getMissingRuntimeEnv, getRuntimeEnvStatus } from '../app/api/_lib/env.js';
import { allowRequest, resetRateLimitForTests } from '../app/api/_lib/rate-limit.js';

test('runtime environment reports missing required configuration', () => {
  assert.deepEqual(getMissingRuntimeEnv({}), ['MONGO_URL', 'JWT_SECRET']);
  assert.deepEqual(getRuntimeEnvStatus({ MONGO_URL: 'mongodb://example', JWT_SECRET: 'secret' }), {
    ok: true,
    missing: [],
  });
});

test('login rate limiter rejects requests after the configured threshold', () => {
  const previousWindow = process.env.AUTH_RATE_LIMIT_WINDOW_MS;
  const previousMax = process.env.AUTH_RATE_LIMIT_MAX_REQUESTS;
  process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
  process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '2';

  try {
    resetRateLimitForTests();
    assert.equal(allowRequest('auth.login', 'test-client').allowed, true);
    assert.equal(allowRequest('auth.login', 'test-client').allowed, true);
    assert.equal(allowRequest('auth.login', 'test-client').allowed, false);
  } finally {
    resetRateLimitForTests();
    if (previousWindow === undefined) delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
    else process.env.AUTH_RATE_LIMIT_WINDOW_MS = previousWindow;
    if (previousMax === undefined) delete process.env.AUTH_RATE_LIMIT_MAX_REQUESTS;
    else process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = previousMax;
  }
});

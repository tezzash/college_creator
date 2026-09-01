import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseHealthService } from './database-health.service';

test('DatabaseHealthService connectivity check', async (t) => {
  await t.test('returns isHealthy: true when queryRaw succeeds', async () => {
    const mockClient = {
      $queryRawUnsafe: async (_query: string) => [{ '?column?': 1 }],
    } as any;

    const healthService = new DatabaseHealthService(() => mockClient);
    const result = await healthService.checkHealth();

    assert.equal(result.isHealthy, true);
    assert.equal(result.error, undefined);
    assert.ok(typeof result.latencyMs === 'number');
    assert.ok(typeof result.timestamp === 'string');
  });

  await t.test('returns isHealthy: false and sanitized error when query fails', async () => {
    const mockClient = {
      $queryRawUnsafe: async () => {
        throw new Error('Can not connect to postgresql://user:myDbPass123@db.internal:5432/campus');
      },
    } as any;

    const healthService = new DatabaseHealthService(() => mockClient);
    const result = await healthService.checkHealth();

    assert.equal(result.isHealthy, false);
    assert.ok(result.error);
    assert.ok(!result.error.includes('myDbPass123'), 'Error output must not expose credentials');
  });

  await t.test('returns isHealthy: false when PrismaClient is uninitialized/null', async () => {
    const healthService = new DatabaseHealthService(() => null);
    const result = await healthService.checkHealth();

    assert.equal(result.isHealthy, false);
    assert.equal(result.error, 'PrismaClient is not initialized');
  });
});

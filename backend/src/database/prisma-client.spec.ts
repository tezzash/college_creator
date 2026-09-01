import test from 'node:test';
import assert from 'node:assert/strict';
import {
  disconnectPrismaClient,
  getPrismaClient,
  resetPrismaClientInstanceForTesting,
  sanitizeDatabaseUrl,
} from './prisma-client';

test('PrismaClient Infrastructure & URL Sanitization', async (t) => {
  await t.test('sanitizeDatabaseUrl hides passwords in standard postgresql URLs', () => {
    const raw = 'postgresql://admin:superSecretPassword123@db.example.com:5432/campus_db?schema=public';
    const sanitized = sanitizeDatabaseUrl(raw);
    assert.ok(!sanitized.includes('superSecretPassword123'), 'Sanitized URL must not contain the raw password');
    assert.ok(sanitized.includes('*****'), 'Sanitized URL should contain masked password asterisks');
    assert.ok(sanitized.includes('db.example.com'), 'Sanitized URL preserves hostname');
    assert.ok(sanitized.includes('campus_db'), 'Sanitized URL preserves database name');
  });

  await t.test('sanitizeDatabaseUrl handles undefined and non-standard inputs safely', () => {
    assert.equal(sanitizeDatabaseUrl(undefined), '[undefined]');
    assert.equal(sanitizeDatabaseUrl(''), '[undefined]');
    const custom = 'postgres://user:secret@127.0.0.1:5432/dev';
    const sanitized = sanitizeDatabaseUrl(custom);
    assert.ok(!sanitized.includes('secret'));
  });

  await t.test('getPrismaClient returns a singleton instance without re-instantiating', () => {
    resetPrismaClientInstanceForTesting();
    const client1 = getPrismaClient({ databaseUrl: 'postgresql://mock:pass@localhost:5432/db' });
    const client2 = getPrismaClient();
    assert.equal(client1, client2, 'Subsequent getPrismaClient calls must return the same singleton instance');
  });

  await t.test('disconnectPrismaClient safely resets client instance', async () => {
    await disconnectPrismaClient();
    resetPrismaClientInstanceForTesting();
  });
});

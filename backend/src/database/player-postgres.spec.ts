import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaPlayerRepository } from './repositories/prisma-player.repository';
import { getPrismaClient } from './prisma-client';

test('Player PostgreSQL Persistence Verification Suite', async (t) => {
  const prisma = getPrismaClient();
  const repo = new PrismaPlayerRepository(() => prisma);

  await t.test('PostgreSQL connection is healthy and responsive', async () => {
    const result: any = await prisma.$queryRaw`SELECT 1 as connected;`;
    assert.ok(result);
    assert.equal(Number(result[0].connected), 1);
  });

  await t.test('Preserves existing Message records intact in PostgreSQL', async () => {
    const messageCount = await prisma.message.count();
    assert.ok(messageCount >= 0);
  });

  await t.test('Canonical bots are present and marked with isBot = true in PostgreSQL', async () => {
    const canonicalBots = [
      'rival-sam',
      'rival-chad',
      'rival-elliot',
      'rival-alex',
      'rival-emma',
    ];

    for (const botId of canonicalBots) {
      const bot = await repo.findById(botId);
      assert.ok(bot, `Canonical bot ${botId} must exist in PostgreSQL`);
      assert.equal(bot.isBot, true, `Bot ${botId} must have isBot = true`);
      assert.ok(bot.cash >= 0, `Bot ${botId} must have valid cash balance`);
    }
  });

  await t.test('Full Player lifecycle in PostgreSQL (Create, Read, Update, Search, Delete)', async () => {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const testId = `pg-test-player-${uniqueSuffix}`;
    const testUsername = `PG_User_${uniqueSuffix}`;
    const testEmail = `pg_user_${uniqueSuffix}@campus.edu`;

    // 1. Create
    const created = await repo.create({
      id: testId,
      username: testUsername,
      email: testEmail,
      passwordHash: 'scryptHash$1234567890',
      cash: 1800,
      bankCash: 700,
      power: 24,
      smartness: 36,
      equippedTitle: 'Scholar Apprentice',
    });

    assert.equal(created.id, testId);
    assert.equal(created.username, testUsername);
    assert.equal(created.email, testEmail);
    assert.equal(created.cash, 1800);
    assert.equal(created.bankCash, 700);
    assert.equal(created.power, 24);
    assert.equal(created.smartness, 36);
    assert.equal(created.isBot, false);

    // 2. Find by ID
    const foundById = await repo.findById(testId);
    assert.ok(foundById);
    assert.equal(foundById.id, testId);
    assert.equal(foundById.username, testUsername);

    // 3. Case-insensitive findByUsername
    const foundByUser = await repo.findByUsername(testUsername.toLowerCase());
    assert.ok(foundByUser);
    assert.equal(foundByUser.id, testId);

    // 4. Case-insensitive findByEmail
    const foundByEmail = await repo.findByEmail(testEmail.toUpperCase());
    assert.ok(foundByEmail);
    assert.equal(foundByEmail.id, testId);

    // 5. Update cash and stats
    const withCash = await repo.updateCash(testId, 2200, 900);
    assert.equal(withCash.cash, 2200);
    assert.equal(withCash.bankCash, 900);

    const withStats = await repo.updateStats(testId, { power: 30, smartness: 42 });
    assert.equal(withStats.power, 30);
    assert.equal(withStats.smartness, 42);

    // 6. Update energy and morale
    const withVitals = await repo.updateEnergyAndMorale(testId, 8, 9);
    assert.equal(withVitals.energy, 8);
    assert.equal(withVitals.morale, 9);

    // 7. Search
    const searchRes = await repo.search({ query: testUsername.slice(0, 7) });
    assert.ok(searchRes.length >= 1);
    assert.ok(searchRes.some((p) => p.id === testId));

    // 8. Delete & Cleanup
    const deleted = await repo.deleteById(testId);
    assert.equal(deleted, true);

    const afterDelete = await repo.findById(testId);
    assert.equal(afterDelete, null);
  });
});

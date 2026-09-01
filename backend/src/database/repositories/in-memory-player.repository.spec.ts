import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryPlayerRepository } from './in-memory-player.repository';

test('InMemoryPlayerRepository Unit Test Suite', async (t) => {
  const repo = new InMemoryPlayerRepository();

  t.beforeEach(() => {
    repo.clear();
  });

  await t.test('create initializes default player fields and persists', async () => {
    const created = await repo.create({
      id: 'player-alpha-1',
      username: 'AdaLovelace',
      email: 'ada@campus.edu',
      passwordHash: 'hashedSecret123',
      cash: 1500,
      power: 20,
      smartness: 35,
    });

    assert.equal(created.id, 'player-alpha-1');
    assert.equal(created.username, 'AdaLovelace');
    assert.equal(created.email, 'ada@campus.edu');
    assert.equal(created.cash, 1500);
    assert.equal(created.power, 20);
    assert.equal(created.smartness, 35);
    assert.equal(created.energy, 10);
    assert.equal(created.morale, 10);
    assert.equal(created.equippedTitle, 'Freshman Novice');
    assert.ok(Array.isArray(created.ownedCosmetics));
    assert.ok(created.ownedCosmetics.includes('avatar-coder'));
  });

  await t.test('enforces unique username and email constraints on create', async () => {
    await repo.create({
      username: 'Turing',
      email: 'turing@campus.edu',
      passwordHash: 'pass1',
    });

    await assert.rejects(
      async () => {
        await repo.create({
          username: 'turing', // Case-insensitive collision
          email: 'different@campus.edu',
          passwordHash: 'pass2',
        });
      },
      /Username "turing" is already taken/i
    );

    await assert.rejects(
      async () => {
        await repo.create({
          username: 'Alan',
          email: 'TURING@campus.edu', // Case-insensitive email collision
          passwordHash: 'pass3',
        });
      },
      /Email "turing@campus.edu" is already registered/i
    );
  });

  await t.test('lookup methods findById, findByUsername, findByEmail, findByUsernameOrEmail', async () => {
    const created = await repo.create({
      id: 'p-lookup-1',
      username: 'GraceHopper',
      email: 'grace@navy.mil',
      passwordHash: 'compiler123',
    });

    const byId = await repo.findById('p-lookup-1');
    assert.equal(byId?.username, 'GraceHopper');

    const byUser = await repo.findByUsername('gracehopper');
    assert.equal(byUser?.id, 'p-lookup-1');

    const byEmail = await repo.findByEmail('GRACE@navy.mil');
    assert.equal(byEmail?.id, 'p-lookup-1');

    const byLoginUser = await repo.findByUsernameOrEmail('GraceHopper');
    assert.equal(byLoginUser?.id, 'p-lookup-1');

    const byLoginEmail = await repo.findByUsernameOrEmail('grace@navy.mil');
    assert.equal(byLoginEmail?.id, 'p-lookup-1');

    const missing = await repo.findById('non-existent');
    assert.equal(missing, null);
  });

  await t.test('update modifies player fields and validates non-colliding uniqueness', async () => {
    const created = await repo.create({
      id: 'p-update-1',
      username: 'Babbage',
      email: 'charles@engine.ac.uk',
      passwordHash: 'gear123',
    });

    const updated = await repo.update('p-update-1', {
      customBio: 'Building the analytical engine.',
      equippedTitle: 'Dean of Algorithms',
    });

    assert.equal(updated.customBio, 'Building the analytical engine.');
    assert.equal(updated.equippedTitle, 'Dean of Algorithms');
    assert.equal(updated.username, 'Babbage');
  });

  await t.test('updateCash, updateStats, and updateEnergyAndMorale mutate state accurately', async () => {
    const created = await repo.create({
      id: 'p-math-1',
      username: 'Shannon',
      email: 'shannon@bell.labs',
      passwordHash: 'entropy',
      cash: 1000,
      bankCash: 500,
      energy: 10,
      morale: 10,
    });

    const withCash = await repo.updateCash(created.id, 850, 650);
    assert.equal(withCash.cash, 850);
    assert.equal(withCash.bankCash, 650);

    const withStats = await repo.updateStats(created.id, { power: 15, smartness: 45 });
    assert.equal(withStats.power, 15);
    assert.equal(withStats.smartness, 45);

    const withVitals = await repo.updateEnergyAndMorale(created.id, 7, 9);
    assert.equal(withVitals.energy, 7);
    assert.equal(withVitals.morale, 9);
  });

  await t.test('search filters players by query and excludes current player ID', async () => {
    await repo.create({ id: 'p1', username: 'AlexHacker', email: 'a1@test.com', passwordHash: 'p' });
    await repo.create({ id: 'p2', username: 'AlexJock', email: 'a2@test.com', passwordHash: 'p' });
    await repo.create({ id: 'p3', username: 'BobScholar', email: 'a3@test.com', passwordHash: 'p' });

    const results = await repo.search({ query: 'alex', excludePlayerId: 'p1' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'p2');
  });

  await t.test('listLeaderboard sorts descending by requested attribute', async () => {
    await repo.create({ id: 'p1', username: 'LowPower', email: 'e1@t.co', passwordHash: 'p', power: 10 });
    await repo.create({ id: 'p2', username: 'HighPower', email: 'e2@t.co', passwordHash: 'p', power: 90 });
    await repo.create({ id: 'p3', username: 'MidPower', email: 'e3@t.co', passwordHash: 'p', power: 50 });

    const topPower = await repo.listLeaderboard({ sortBy: 'power', limit: 2 });
    assert.equal(topPower.length, 2);
    assert.equal(topPower[0].username, 'HighPower');
    assert.equal(topPower[1].username, 'MidPower');
  });

  await t.test('count and deleteById operate cleanly', async () => {
    const p1 = await repo.create({ username: 'DelUser', email: 'del@test.com', passwordHash: 'p' });
    assert.equal(await repo.count(), 1);

    const deleted = await repo.deleteById(p1.id);
    assert.equal(deleted, true);
    assert.equal(await repo.count(), 0);

    const deleteMissing = await repo.deleteById('non-existent-id');
    assert.equal(deleteMissing, false);
  });
});

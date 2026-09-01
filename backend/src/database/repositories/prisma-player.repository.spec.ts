import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaPlayerRepository } from './prisma-player.repository';

test('PrismaPlayerRepository Unit Test Suite', async (t) => {
  const mockStore = new Map<string, any>();

  const mockPrisma = {
    player: {
      create: async ({ data }: any) => {
        const id = data.id || `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const row = {
          id,
          username: data.username,
          email: data.email,
          passwordHash: data.passwordHash,
          cash: data.cash ?? 1000,
          bankCash: data.bankCash ?? 0,
          energy: data.energy ?? 10,
          morale: data.morale ?? 10,
          power: data.power ?? 0,
          smartness: data.smartness ?? 0,
          winStreak: data.winStreak ?? 0,
          highestStreak: data.highestStreak ?? 0,
          totalPvPWins: data.totalPvPWins ?? 0,
          totalPvPLosses: data.totalPvPLosses ?? 0,
          totalPlundered: data.totalPlundered ?? 0,
          equippedTitle: data.equippedTitle || 'Freshman Novice',
          avatarId: data.avatarId || 'avatar-coder',
          avatarAura: data.avatarAura || 'aura-none',
          avatarFrame: data.avatarFrame || 'frame-neon',
          avatarOutfit: data.avatarOutfit || 'outfit-hoodie',
          avatarHeadwear: data.avatarHeadwear || 'headwear-none',
          avatarAccessory: data.avatarAccessory || 'acc-laptop',
          ownedCosmetics: data.ownedCosmetics || ['avatar-coder', 'avatar-varsity', 'avatar-scholar', 'avatar-freshman', 'aura-none', 'outfit-hoodie', 'headwear-none', 'acc-laptop', 'frame-neon'],
          customBio: data.customBio || 'Ready to conquer the campus empire! 💻💸',
          claimedMilestones: data.claimedMilestones || [],
          totalJobsCompleted: data.totalJobsCompleted ?? 0,
          totalBankDeposited: data.totalBankDeposited ?? 0,
          dailyStreak: data.dailyStreak ?? 1,
          dailyQuestsDate: data.dailyQuestsDate ?? null,
          dailyQuestsState: data.dailyQuestsState ?? null,
          pinnedUntil: data.pinnedUntil ?? null,
          isBot: data.isBot ?? false,
          lastEnergyUpdate: new Date(),
          lastMoraleUpdate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockStore.set(id, row);
        return row;
      },
      findUnique: async ({ where }: any) => {
        if (where.id) return mockStore.get(where.id) || null;
        if (where.username) {
          for (const row of mockStore.values()) {
            if (row.username === where.username) return row;
          }
        }
        if (where.email) {
          for (const row of mockStore.values()) {
            if (row.email === where.email) return row;
          }
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const row of mockStore.values()) {
          if (where.username) {
            const matchVal = typeof where.username === 'object' && where.username.equals ? where.username.equals : where.username;
            if (row.username.toLowerCase() === matchVal.toLowerCase()) return row;
          }
          if (where.email) {
            const matchVal = typeof where.email === 'object' && where.email.equals ? where.email.equals : where.email;
            if (row.email.toLowerCase() === matchVal.toLowerCase()) return row;
          }
          if (where.OR) {
            for (const cond of where.OR) {
              if (cond.username) {
                const matchVal = typeof cond.username === 'object' && cond.username.equals ? cond.username.equals : cond.username;
                if (row.username.toLowerCase() === matchVal.toLowerCase()) return row;
              }
              if (cond.email) {
                const matchVal = typeof cond.email === 'object' && cond.email.equals ? cond.email.equals : cond.email;
                if (row.email.toLowerCase() === matchVal.toLowerCase()) return row;
              }
            }
          }
        }
        return null;
      },
      findMany: async ({ where, orderBy, take }: any) => {
        let list = Array.from(mockStore.values());
        if (where?.id?.not) {
          list = list.filter((r) => r.id !== where.id.not);
        }
        if (where?.username?.contains) {
          const q = where.username.contains.toLowerCase();
          list = list.filter((r) => r.username.toLowerCase().includes(q));
        }
        if (orderBy) {
          const field = Object.keys(orderBy)[0];
          const dir = orderBy[field];
          list.sort((a, b) => {
            if (dir === 'desc') return b[field] - a[field];
            return a[field] - b[field];
          });
        }
        if (take) {
          list = list.slice(0, take);
        }
        return list;
      },
      update: async ({ where, data }: any) => {
        const row = mockStore.get(where.id);
        if (!row) throw new Error('Not found');
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      count: async () => {
        return mockStore.size;
      },
      delete: async ({ where }: any) => {
        if (!mockStore.has(where.id)) throw new Error('Not found');
        const row = mockStore.get(where.id);
        mockStore.delete(where.id);
        return row;
      },
    },
  };

  const repo = new PrismaPlayerRepository(() => mockPrisma as any);

  t.beforeEach(() => {
    mockStore.clear();
  });

  await t.test('create initializes default player fields and persists in Prisma', async () => {
    const created = await repo.create({
      id: 'player-prisma-1',
      username: 'Euler',
      email: 'euler@academy.org',
      passwordHash: 'eTotheiPi',
      cash: 2000,
      power: 40,
      smartness: 99,
    });

    assert.equal(created.id, 'player-prisma-1');
    assert.equal(created.username, 'Euler');
    assert.equal(created.email, 'euler@academy.org');
    assert.equal(created.cash, 2000);
    assert.equal(created.power, 40);
    assert.equal(created.smartness, 99);
    assert.equal(created.energy, 10);
    assert.equal(created.morale, 10);
    assert.equal(created.equippedTitle, 'Freshman Novice');
    assert.ok(Array.isArray(created.ownedCosmetics));
  });

  await t.test('lookup methods findById, findByUsername, findByEmail, findByUsernameOrEmail', async () => {
    await repo.create({
      id: 'p-lookup-2',
      username: 'Gauss',
      email: 'gauss@gottingen.de',
      passwordHash: 'normalDist',
    });

    const byId = await repo.findById('p-lookup-2');
    assert.equal(byId?.username, 'Gauss');

    const byUser = await repo.findByUsername('gauss');
    assert.equal(byUser?.id, 'p-lookup-2');

    const byEmail = await repo.findByEmail('GAUSS@gottingen.de');
    assert.equal(byEmail?.id, 'p-lookup-2');

    const byLoginUser = await repo.findByUsernameOrEmail('gauss');
    assert.equal(byLoginUser?.id, 'p-lookup-2');

    const byLoginEmail = await repo.findByUsernameOrEmail('gauss@gottingen.de');
    assert.equal(byLoginEmail?.id, 'p-lookup-2');

    const missing = await repo.findById('non-existent');
    assert.equal(missing, null);
  });

  await t.test('update modifies player fields correctly', async () => {
    await repo.create({
      id: 'p-update-2',
      username: 'Riemann',
      email: 'riemann@gottingen.de',
      passwordHash: 'zeta',
    });

    const updated = await repo.update('p-update-2', {
      customBio: 'Mapping the zeta zeros.',
      equippedTitle: 'Hypothesis Master',
    });

    assert.equal(updated.customBio, 'Mapping the zeta zeros.');
    assert.equal(updated.equippedTitle, 'Hypothesis Master');
    assert.equal(updated.username, 'Riemann');
  });

  await t.test('updateCash, updateStats, and updateEnergyAndMorale mutate state accurately', async () => {
    const created = await repo.create({
      id: 'p-math-2',
      username: 'Fourier',
      email: 'fourier@paris.fr',
      passwordHash: 'series',
      cash: 1000,
      bankCash: 500,
      energy: 10,
      morale: 10,
    });

    const withCash = await repo.updateCash(created.id, 900, 700);
    assert.equal(withCash.cash, 900);
    assert.equal(withCash.bankCash, 700);

    const withStats = await repo.updateStats(created.id, { power: 30, smartness: 75 });
    assert.equal(withStats.power, 30);
    assert.equal(withStats.smartness, 75);

    const withVitals = await repo.updateEnergyAndMorale(created.id, 6, 8);
    assert.equal(withVitals.energy, 6);
    assert.equal(withVitals.morale, 8);
  });

  await t.test('search filters players by query and excludes current player ID', async () => {
    await repo.create({ id: 'p1', username: 'NewtonCalc', email: 'n1@cam.ac.uk', passwordHash: 'p' });
    await repo.create({ id: 'p2', username: 'NewtonOptics', email: 'n2@cam.ac.uk', passwordHash: 'p' });
    await repo.create({ id: 'p3', username: 'Leibniz', email: 'l@leipzig.de', passwordHash: 'p' });

    const results = await repo.search({ query: 'newton', excludePlayerId: 'p1' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'p2');
  });

  await t.test('listLeaderboard sorts descending by requested attribute', async () => {
    await repo.create({ id: 'p1', username: 'LowSmart', email: 'e1@t.co', passwordHash: 'p', smartness: 10 });
    await repo.create({ id: 'p2', username: 'HighSmart', email: 'e2@t.co', passwordHash: 'p', smartness: 90 });
    await repo.create({ id: 'p3', username: 'MidSmart', email: 'e3@t.co', passwordHash: 'p', smartness: 50 });

    const topSmart = await repo.listLeaderboard({ sortBy: 'smartness', limit: 2 });
    assert.equal(topSmart.length, 2);
    assert.equal(topSmart[0].username, 'HighSmart');
    assert.equal(topSmart[1].username, 'MidSmart');
  });

  await t.test('count and deleteById operate cleanly', async () => {
    const p1 = await repo.create({ username: 'Noether', email: 'emmy@math.org', passwordHash: 'p' });
    assert.equal(await repo.count(), 1);

    const deleted = await repo.deleteById(p1.id);
    assert.equal(deleted, true);
    assert.equal(await repo.count(), 0);

    const deleteMissing = await repo.deleteById('non-existent-id');
    assert.equal(deleteMissing, false);
  });
});

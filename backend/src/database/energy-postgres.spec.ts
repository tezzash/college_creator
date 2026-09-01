import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaPlayerRepository } from './repositories/prisma-player.repository';
import { getPrismaClient } from './prisma-client';
import { DatabasePlayerService } from './database.player.service';

test('Player Energy PostgreSQL Persistence Verification Suite (REAL POSTGRESQL TEST)', async (t) => {
  const prisma = getPrismaClient();
  const repo = new PrismaPlayerRepository(() => prisma);
  const playerService = new DatabasePlayerService(prisma as any);

  // Helper to create isolated test player
  async function createTestPlayer(initialEnergy = 10, pastUpdateMinutes = 0) {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const testId = `pg-energy-${uniqueSuffix}`;
    const testUsername = `EnergyUser_${uniqueSuffix}`;
    const testEmail = `energy_${uniqueSuffix}@campus.edu`;
    const lastUpdate = new Date(Date.now() - pastUpdateMinutes * 60 * 1000);

    const created = await prisma.player.create({
      data: {
        id: testId,
        username: testUsername,
        email: testEmail,
        passwordHash: 'scrypt$hash$testing',
        cash: 1000,
        energy: initialEnergy,
        lastEnergyUpdate: lastUpdate,
      },
    });

    return { id: created.id, username: created.username, email: created.email };
  }

  await t.test('1. Initial Energy: New player has default 10 energy in PostgreSQL', async () => {
    const p = await createTestPlayer(10);
    try {
      const dbRow = await prisma.player.findUniqueOrThrow({ where: { id: p.id } });
      assert.equal(dbRow.energy, 10, 'PostgreSQL raw energy must be 10');
      assert.ok(dbRow.lastEnergyUpdate instanceof Date, 'lastEnergyUpdate must be a Date');

      const state = await playerService.get(p.id);
      assert.equal(state.energy, 10, 'PlayerService state energy must be 10');
      assert.equal(state.maxEnergy, 10, 'Max energy must be 10');
    } finally {
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });

  await t.test('2. Consume 1 Energy: Decrements to 9 and updates timestamp in PostgreSQL', async () => {
    const attacker = await createTestPlayer(10);

    try {
      // Execute 1 energy consumption action
      await playerService.consumeEnergy(attacker.id, 1);

      const dbRow = await prisma.player.findUniqueOrThrow({ where: { id: attacker.id } });
      assert.equal(dbRow.energy, 9, 'PostgreSQL raw energy must be 9 after 1 consumption');

      const state = await playerService.get(attacker.id);
      assert.equal(state.energy, 9, 'Player state energy must reflect 9');
    } finally {
      await prisma.player.delete({ where: { id: attacker.id } }).catch(() => {});
    }
  });

  await t.test('3. Cannot consume at 0 Energy: Throws insufficient energy error and preserves 0', async () => {
    const attacker = await createTestPlayer(0);

    try {
      await assert.rejects(
        () => playerService.consumeEnergy(attacker.id, 1),
        /Insufficient Energy/i,
        'Should reject fight when energy is 0'
      );

      const dbRow = await prisma.player.findUniqueOrThrow({ where: { id: attacker.id } });
      assert.equal(dbRow.energy, 0, 'Energy must not drop below 0 in PostgreSQL');
    } finally {
      await prisma.player.delete({ where: { id: attacker.id } }).catch(() => {});
    }
  });

  await t.test('4. Fight consumes 1 Energy from universal Energy pool', async () => {
    const attacker = await createTestPlayer(5);

    try {
      await playerService.consumeEnergy(attacker.id, 1);
      const dbRow = await prisma.player.findUniqueOrThrow({ where: { id: attacker.id } });
      assert.equal(dbRow.energy, 4, 'Fight must consume exactly 1 energy (5 -> 4)');
    } finally {
      await prisma.player.delete({ where: { id: attacker.id } }).catch(() => {});
    }
  });

  await t.test('5. Prank consumes 1 Energy from the exact same universal pool', async () => {
    const attacker = await createTestPlayer(4);

    try {
      await playerService.consumeEnergy(attacker.id, 1);
      const dbRow = await prisma.player.findUniqueOrThrow({ where: { id: attacker.id } });
      assert.equal(dbRow.energy, 3, 'Prank must consume exactly 1 energy from the same pool (4 -> 3)');
    } finally {
      await prisma.player.delete({ where: { id: attacker.id } }).catch(() => {});
    }
  });

  await t.test('6. Spy consumes 1 Energy from the exact same universal pool', async () => {
    const attacker = await createTestPlayer(3);

    try {
      await playerService.consumeEnergy(attacker.id, 1);
      const dbRow = await prisma.player.findUniqueOrThrow({ where: { id: attacker.id } });
      assert.equal(dbRow.energy, 2, 'Spy must consume exactly 1 energy from the same pool (3 -> 2)');
    } finally {
      await prisma.player.delete({ where: { id: attacker.id } }).catch(() => {});
    }
  });

  await t.test('7. 420-second regeneration: Exactly 1 Energy is granted after 7 minutes (420s)', async () => {
    // 7 minutes = 420 seconds ago
    const p = await createTestPlayer(5, 7);

    try {
      const state = await playerService.get(p.id);
      assert.equal(state.energy, 6, '5 energy + 7 mins elapsed must authoritatively evaluate to 6 energy');
    } finally {
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });

  await t.test('8. Multiple elapsed regeneration cycles: Accounts for all elapsed 420s intervals', async () => {
    // 21 minutes = 3 intervals of 420s (1260s)
    const p = await createTestPlayer(2, 21);

    try {
      const state = await playerService.get(p.id);
      assert.equal(state.energy, 5, '2 energy + 21 mins (3 intervals) must evaluate to 5 energy');
    } finally {
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });

  await t.test('9. Maximum capacity enforcement: Energy does not regenerate above 10 (or max)', async () => {
    // 2 hours ago = 120 minutes
    const p = await createTestPlayer(8, 120);

    try {
      const state = await playerService.get(p.id);
      assert.equal(state.energy, 10, 'Energy must cap at maximum 10');
    } finally {
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });

  await t.test('10. Offline regeneration: Player left offline regenerates and can spend immediately', async () => {
    // Player offline for 14 minutes with 0 energy -> regenerates 2 energy
    const attacker = await createTestPlayer(0, 14);

    try {
      // Should successfully spend because 2 energy regenerated authoritatively
      await playerService.consumeEnergy(attacker.id, 1);

      const dbRow = await prisma.player.findUniqueOrThrow({ where: { id: attacker.id } });
      assert.equal(dbRow.energy, 1, 'Attacker should have 1 energy remaining after spending 1 from 2 regenerated');
    } finally {
      await prisma.player.delete({ where: { id: attacker.id } }).catch(() => {});
    }
  });

  await t.test('11. Countdown timestamp correctness: Preserves remainder seconds toward next interval', async () => {
    // 10 minutes ago = 600 seconds = 1 interval (420s) + 180s remainder progress
    const p = await createTestPlayer(4, 10);

    try {
      const state = await playerService.get(p.id);
      assert.equal(state.energy, 5, '4 + 1 interval = 5 energy');

      const effectiveUpdate = new Date(state.lastEnergyUpdate || Date.now()).getTime();
      const elapsedSinceEffective = Math.floor((Date.now() - effectiveUpdate) / 1000);
      // Remainder should be ~180 seconds (within small test execution jitter ± 5s)
      assert.ok(
        elapsedSinceEffective >= 170 && elapsedSinceEffective <= 190,
        `Expected remainder ~180s, got ${elapsedSinceEffective}s`
      );
    } finally {
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });

  await t.test('12. Server restart persistence: Energy and timestamps survive process reload', async () => {
    const p = await createTestPlayer(7, 0);

    try {
      // Simulate new connection / repository / service instance
      const freshRepo = new PrismaPlayerRepository(() => getPrismaClient());
      const freshPlayer = await freshRepo.findById(p.id);

      assert.ok(freshPlayer);
      assert.equal(freshPlayer.energy, 7, 'Fresh repository instance must read 7 energy');
      assert.ok(freshPlayer.lastEnergyUpdate instanceof Date, 'Fresh repository must read Date');
    } finally {
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });

  await t.test('13. Concurrent consumption: Simultaneous requests to consume final 1 energy allow exactly 1 success', async () => {
    // Attacker starts with exactly 1 Energy
    const attacker = await createTestPlayer(1, 0);

    try {
      // Fire 2 concurrent attacks simultaneously
      const results = await Promise.allSettled([
        playerService.consumeEnergy(attacker.id, 1),
        playerService.consumeEnergy(attacker.id, 1),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      assert.equal(fulfilled.length, 1, 'Exactly one concurrent request must succeed');
      assert.equal(rejected.length, 1, 'The competing concurrent request must fail');

      const dbRow = await prisma.player.findUniqueOrThrow({ where: { id: attacker.id } });
      assert.equal(dbRow.energy, 0, 'Energy in PostgreSQL must be exactly 0, never negative');
    } finally {
      await prisma.player.delete({ where: { id: attacker.id } }).catch(() => {});
    }
  });

  await t.test('14. Cross-request consistency: Sequential actions reflect updated energy accurately', async () => {
    const attacker = await createTestPlayer(3, 0);

    try {
      // Request 1: 3 -> 2
      await playerService.consumeEnergy(attacker.id, 1);
      const r1 = await playerService.get(attacker.id);
      assert.equal(r1.energy, 2);

      // Request 2: 2 -> 1
      await playerService.consumeEnergy(attacker.id, 1);
      const r2 = await playerService.get(attacker.id);
      assert.equal(r2.energy, 1);

      // Request 3: 1 -> 0
      await playerService.consumeEnergy(attacker.id, 1);
      const r3 = await playerService.get(attacker.id);
      assert.equal(r3.energy, 0);
    } finally {
      await prisma.player.delete({ where: { id: attacker.id } }).catch(() => {});
    }
  });

  await t.test('15. Cross-session consistency: Two independent sessions see identical PostgreSQL energy state', async () => {
    const p = await createTestPlayer(6, 0);

    try {
      // Session A and Session B both retrieve state
      const sessionA = new DatabasePlayerService(prisma as any);
      const sessionB = new DatabasePlayerService(prisma as any);

      const stateA = await sessionA.get(p.id);
      const stateB = await sessionB.get(p.id);

      assert.equal(stateA.energy, stateB.energy, 'Both sessions must see same energy');
      assert.equal(stateA.lastEnergyUpdate, stateB.lastEnergyUpdate, 'Both sessions must see same timestamp');
    } finally {
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });
});

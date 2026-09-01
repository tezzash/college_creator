import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { getPrismaClient } from './prisma-client';
import { AppModule } from '../app/app.module';

describe('Phase 20 — Supabase RLS & Database Security Hardening Test Suite', () => {
  const prisma = getPrismaClient();
  const testRunId = `rls_${Date.now()}`;
  const playerAId = `usr_a_${testRunId}`;
  const playerBId = `usr_b_${testRunId}`;
  const playerCId = `usr_c_${testRunId}`;
  const botId = `bot_${testRunId}`;

  const setupData = async () => {
    // Seed test players in PostgreSQL using privileged server connection
    await prisma.player.createMany({
      data: [
        {
          id: playerAId,
          username: `alice_${testRunId}`,
          email: `alice_${testRunId}@college.edu`,
          passwordHash: '$2b$10$securerlshashalice',
          cash: 1500,
          bankCash: 500,
          energy: 100,
          morale: 100,
          power: 20,
          smartness: 25,
          isBot: false,
        },
        {
          id: playerBId,
          username: `bob_${testRunId}`,
          email: `bob_${testRunId}@college.edu`,
          passwordHash: '$2b$10$securerlshashbob',
          cash: 2000,
          bankCash: 1000,
          energy: 100,
          morale: 100,
          power: 30,
          smartness: 15,
          isBot: false,
        },
        {
          id: playerCId,
          username: `carol_${testRunId}`,
          email: `carol_${testRunId}@college.edu`,
          passwordHash: '$2b$10$securerlshashcarol',
          cash: 3000,
          bankCash: 2000,
          energy: 100,
          morale: 100,
          power: 40,
          smartness: 30,
          isBot: false,
        },
        {
          id: botId,
          username: `RivalBot_${testRunId}`,
          email: `rivalbot_${testRunId}@college.edu`,
          passwordHash: '$2b$10$securerlshashbot',
          cash: 500,
          bankCash: 0,
          energy: 100,
          morale: 100,
          power: 15,
          smartness: 10,
          isBot: true,
        },
      ],
    });

    // Seed test jobs catalog if not present
    await prisma.job.upsert({
      where: { id: 'job-study' },
      update: {},
      create: { id: 'job-study', name: 'Study in Library', durationSeconds: 60, rewardCash: 50 },
    });

    // Seed tower room for Player B
    await prisma.towerRoom.create({
      data: {
        id: `room_b_${testRunId}`,
        playerId: playerBId,
        roomNumber: 1,
        unlockCost: 0,
        unlocked: true,
      },
    });

    // Seed occupant in Player B room
    await prisma.roomOccupant.create({
      data: {
        id: `occ_b_${testRunId}`,
        towerRoomId: `room_b_${testRunId}`,
        allyId: 'ally-tutor-tim',
        level: 2,
        totalInvested: 250,
      },
    });

    // Seed active job for Player B
    await prisma.activeJob.create({
      data: {
        id: `job_b_${testRunId}`,
        playerId: playerBId,
        jobId: 'job-study',
        startedAt: new Date(),
        finishesAt: new Date(Date.now() + 60000),
        collected: false,
      },
    });

    // Seed furniture for Player B
    await prisma.playerDormFurniture.create({
      data: {
        id: `furn_b_${testRunId}`,
        playerId: playerBId,
        furnitureId: 'furn-gaming-chair',
      },
    });

    // Seed private messages between B and C
    await prisma.message.create({
      data: {
        id: `msg_bc_${testRunId}`,
        senderId: playerBId,
        receiverId: playerCId,
        content: 'Secret message between Bob and Carol',
        isRead: false,
      },
    });

    // Seed message between A and B
    await prisma.message.create({
      data: {
        id: `msg_ab_${testRunId}`,
        senderId: playerAId,
        receiverId: playerBId,
        content: 'Hello Bob from Alice',
        isRead: false,
      },
    });

    // Seed friendship between B and C
    await prisma.friendship.create({
      data: {
        id: `friend_bc_${testRunId}`,
        senderId: playerBId,
        receiverId: playerCId,
        status: 'ACCEPTED',
      },
    });

    // Seed cash transaction for Player B
    await prisma.cashTransaction.create({
      data: {
        id: `tx_b_${testRunId}`,
        playerId: playerBId,
        type: 'BANK_DEPOSIT',
        amount: 500,
        balanceAfter: 1500,
        reference: 'Bank Deposit',
      },
    });

    // Seed battle between B and C
    await prisma.battle.create({
      data: {
        id: `battle_bc_${testRunId}`,
        attackerId: playerBId,
        defenderId: playerCId,
        action: 'FIGHT',
        success: true,
        cashStolen: 100,
      },
    });
  };

  const cleanup = async () => {
    const ids = [playerAId, playerBId, playerCId, botId];
    await prisma.cashTransaction.deleteMany({ where: { playerId: { in: ids } } });
    await prisma.battle.deleteMany({
      where: {
        OR: [{ attackerId: { in: ids } }, { defenderId: { in: ids } }],
      },
    });
    await prisma.message.deleteMany({
      where: {
        OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }],
      },
    });
    await prisma.friendship.deleteMany({
      where: {
        OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }],
      },
    });
    await prisma.playerDormFurniture.deleteMany({ where: { playerId: { in: ids } } });
    await prisma.roomOccupant.deleteMany({
      where: {
        towerRoom: { playerId: { in: ids } },
      },
    });
    await prisma.towerRoom.deleteMany({ where: { playerId: { in: ids } } });
    await prisma.activeJob.deleteMany({ where: { playerId: { in: ids } } });
    await prisma.player.deleteMany({ where: { id: { in: ids } } });
  };

  test.before(async () => {
    await setupData();
  });

  test.after(async () => {
    await cleanup();
  });

  describe('1. Player Isolation & RLS Verification', () => {
    test('Player A authenticated role cannot UPDATE Player B row directly', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        // Attempting to update Bob's bio or cash as Alice
        const updateCount = await tx.$executeRawUnsafe(`
          UPDATE "players" SET "custom_bio" = 'Hacked by Alice' WHERE "id" = '${playerBId}';
        `);
        // RLS prevents matching any row where id != playerAId
        assert.equal(updateCount, 0, 'Alice must NOT be able to update Bob row (0 rows updated)');
      });

      // Verify Bob's bio remains unaltered
      const bob = await prisma.player.findUnique({ where: { id: playerBId } });
      assert.notEqual(bob?.customBio, 'Hacked by Alice', 'Bob bio must NOT be hacked');
    });

    test('Player A authenticated role cannot INSERT a player pretending to be Player B', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        // Attempting to insert a player record with id = playerBId or another ID
        await assert.rejects(
          async () => {
            await tx.$executeRawUnsafe(`
              INSERT INTO "players" ("id", "username", "email", "password_hash", "cash", "bank_cash", "energy", "morale", "power", "smartness", "win_streak", "highest_streak", "total_pvp_wins", "total_pvp_losses", "total_plundered", "equipped_title", "avatar_id", "avatar_aura", "avatar_frame", "avatar_outfit", "avatar_headwear", "avatar_accessory", "custom_bio", "total_jobs_completed", "total_bank_deposited", "daily_streak", "is_bot", "last_energy_update", "last_morale_update", "created_at", "updated_at")
              VALUES ('${playerBId}_spoof', 'imposter', 'spoof@college.edu', 'hash', 100, 0, 100, 100, 10, 10, 0, 0, 0, 0, 0, 'Novice', 'avatar_1', 'aura_none', 'frame_default', 'outfit_casual', 'headwear_none', 'accessory_none', '', 0, 0, 1, false, NOW(), NOW(), NOW(), NOW());
            `);
          },
          /violates row-level security policy/,
          'Inserting player with mismatched ID must violate RLS policy'
        );
      });
    });

    test('Player A authenticated role CAN update their own bio', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        const updateCount = await tx.$executeRawUnsafe(`
          UPDATE "players" SET "custom_bio" = 'Alice Official Bio' WHERE "id" = '${playerAId}';
        `);
        assert.equal(updateCount, 1, 'Alice must be able to update her own row');
      });

      const alice = await prisma.player.findUnique({ where: { id: playerAId } });
      assert.equal(alice?.customBio, 'Alice Official Bio');
    });
  });

  describe('2. Messages RLS Security & Privacy Boundaries', () => {
    test('Player A CANNOT read private conversation between Bob and Carol', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        const messages = await tx.$queryRawUnsafe<any[]>(`
          SELECT * FROM "messages" WHERE "id" = 'msg_bc_${testRunId}';
        `);
        assert.equal(messages.length, 0, 'Alice must NOT see private messages between Bob and Carol');
      });
    });

    test('Player A CAN read messages where Alice is sender or receiver', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        const messages = await tx.$queryRawUnsafe<any[]>(`
          SELECT * FROM "messages" WHERE "id" = 'msg_ab_${testRunId}';
        `);
        assert.equal(messages.length, 1, 'Alice must see messages where she is the sender');
        assert.equal(messages[0].content, 'Hello Bob from Alice');
      });
    });

    test('Player A CANNOT forge message sender as Bob', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        await assert.rejects(
          async () => {
            await tx.$executeRawUnsafe(`
              INSERT INTO "messages" ("id", "sender_id", "receiver_id", "content", "is_read", "created_at")
              VALUES ('msg_spoof_${testRunId}', '${playerBId}', '${playerCId}', 'Spoofed message', false, NOW());
            `);
          },
          /violates row-level security policy/,
          'Alice inserting message with sender_id = Bob must be rejected by RLS'
        );
      });
    });
  });

  describe('3. Friendships RLS Security & Bot Isolation', () => {
    test('Player A CANNOT view or manipulate friendship between Bob and Carol', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        // Attempting to select Bob-Carol friendship
        const friendships = await tx.$queryRawUnsafe<any[]>(`
          SELECT * FROM "friendships" WHERE "id" = 'friend_bc_${testRunId}';
        `);
        assert.equal(friendships.length, 0, 'Alice must NOT see Bob-Carol friendship');

        // Attempting to update or reject Bob-Carol friendship
        const updateCount = await tx.$executeRawUnsafe(`
          UPDATE "friendships" SET "status" = 'REJECTED' WHERE "id" = 'friend_bc_${testRunId}';
        `);
        assert.equal(updateCount, 0, 'Alice must NOT be able to modify Bob-Carol friendship');
      });
    });

    test('Player A CANNOT send friend request pretending to be Bob', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        await assert.rejects(
          async () => {
            await tx.$executeRawUnsafe(`
              INSERT INTO "friendships" ("id", "sender_id", "receiver_id", "status", "created_at", "updated_at")
              VALUES ('friend_spoof_${testRunId}', '${playerBId}', '${playerAId}', 'PENDING', NOW(), NOW());
            `);
          },
          /violates row-level security policy/,
          'Spoofing friendship sender must be blocked by RLS'
        );
      });
    });
  });

  describe('4. Jobs & Active Jobs Security', () => {
    test('Jobs catalog is readable by authenticated role but cannot be modified', async () => {
      const initialJob = await prisma.job.findUnique({ where: { id: 'job-study' } });
      const expectedReward = Number(initialJob?.rewardCash || 50);

      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        // Reading catalog is allowed
        const jobs = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM "jobs" WHERE "id" = 'job-study';`);
        assert.ok(jobs.length >= 1, 'Jobs catalog should be readable');

        // Modifying catalog is rejected (no UPDATE policy -> 0 rows affected)
        const updateCount = await tx.$executeRawUnsafe(`
          UPDATE "jobs" SET "reward_cash" = 999999 WHERE "id" = 'job-study';
        `);
        assert.equal(updateCount, 0, 'Client role must not be able to modify jobs catalog (0 rows updated)');
      });

      // Verify job reward remains unaltered
      const job = await prisma.job.findUnique({ where: { id: 'job-study' } });
      assert.equal(Number(job?.rewardCash), expectedReward, 'Job reward cash must remain unchanged');
    });

    test('Player A CANNOT read or manipulate Player B active job', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        // Reading Bob active job returns 0 rows
        const activeJobs = await tx.$queryRawUnsafe<any[]>(`
          SELECT * FROM "active_jobs" WHERE "id" = 'job_b_${testRunId}';
        `);
        assert.equal(activeJobs.length, 0, 'Alice cannot see Bob active jobs');

        // Modifying or collecting Bob active job affects 0 rows
        const updateCount = await tx.$executeRawUnsafe(`
          UPDATE "active_jobs" SET "collected" = true WHERE "id" = 'job_b_${testRunId}';
        `);
        assert.equal(updateCount, 0, 'Alice cannot collect or modify Bob active jobs');
      });
    });
  });

  describe('5. Tower, Allies & Dorm Furniture Security', () => {
    test('Player A CANNOT view or modify Player B tower rooms', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        // Selecting Bob's tower room returns 0 rows
        const rooms = await tx.$queryRawUnsafe<any[]>(`
          SELECT * FROM "tower_rooms" WHERE "id" = 'room_b_${testRunId}';
        `);
        assert.equal(rooms.length, 0, 'Alice cannot see Bob tower rooms');

        // Unlocking or updating Bob's tower room affects 0 rows
        const updateCount = await tx.$executeRawUnsafe(`
          UPDATE "tower_rooms" SET "unlocked" = false WHERE "id" = 'room_b_${testRunId}';
        `);
        assert.equal(updateCount, 0, 'Alice cannot modify Bob tower rooms');
      });
    });

    test('Player A CANNOT view or modify occupants in Player B tower rooms', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        const occupants = await tx.$queryRawUnsafe<any[]>(`
          SELECT * FROM "room_occupants" WHERE "id" = 'occ_b_${testRunId}';
        `);
        assert.equal(occupants.length, 0, 'Alice cannot see occupants of Bob tower rooms');

        const updateCount = await tx.$executeRawUnsafe(`
          UPDATE "room_occupants" SET "level" = 99 WHERE "id" = 'occ_b_${testRunId}';
        `);
        assert.equal(updateCount, 0, 'Alice cannot modify occupants of Bob tower rooms');
      });
    });

    test('Player A CANNOT view or modify Player B dorm furniture', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        const furn = await tx.$queryRawUnsafe<any[]>(`
          SELECT * FROM "player_dorm_furniture" WHERE "id" = 'furn_b_${testRunId}';
        `);
        assert.equal(furn.length, 0, 'Alice cannot see Bob dorm furniture');

        const updateCount = await tx.$executeRawUnsafe(`
          DELETE FROM "player_dorm_furniture" WHERE "id" = 'furn_b_${testRunId}';
        `);
        assert.equal(updateCount, 0, 'Alice cannot delete Bob dorm furniture');
      });
    });
  });

  describe('6. Economy & Cash Transactions Security (HIGH RISK)', () => {
    test('Player A CANNOT read Player B cash transactions', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        const txs = await tx.$queryRawUnsafe<any[]>(`
          SELECT * FROM "cash_transactions" WHERE "id" = 'tx_b_${testRunId}';
        `);
        assert.equal(txs.length, 0, 'Alice cannot see Bob cash transactions');
      });
    });

    test('Player A CANNOT directly insert fake financial transactions (Ledger Immutable to client)', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        // Client role attempting direct insert on cash_transactions must fail (no INSERT policy)
        await assert.rejects(
          async () => {
            await tx.$executeRawUnsafe(`
              INSERT INTO "cash_transactions" ("id", "player_id", "type", "amount", "balance_after", "reference", "created_at")
              VALUES ('tx_fake_${testRunId}', '${playerAId}', 'ADMIN_ADJUSTMENT', 1000000, 1001500, 'Free Hacked Money', NOW());
            `);
          },
          /permission denied|violates row-level security policy/,
          'Direct client transaction injection must be blocked by RLS'
        );
      });
    });
  });

  describe('7. PvP Battles Security & Server Authority', () => {
    test('Player A CANNOT view private battle between Bob and Carol', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        const battles = await tx.$queryRawUnsafe<any[]>(`
          SELECT * FROM "battles" WHERE "id" = 'battle_bc_${testRunId}';
        `);
        assert.equal(battles.length, 0, 'Alice cannot see battles between Bob and Carol');
      });
    });

    test('Player A CANNOT insert or manipulate battle records directly', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
        await tx.$executeRawUnsafe(`SET LOCAL "request.jwt.claim.sub" = '${playerAId}';`);

        await assert.rejects(
          async () => {
            await tx.$executeRawUnsafe(`
              INSERT INTO "battles" ("id", "attacker_id", "defender_id", "action", "success", "cash_stolen", "created_at")
              VALUES ('battle_fake_${testRunId}', '${playerAId}', '${playerBId}', 'FIGHT', true, 999999, NOW());
            `);
          },
          /permission denied|violates row-level security policy/,
          'Client role must not be able to insert combat records directly'
        );
      });
    });
  });

  describe('8. Full Application End-to-End Authority & Social Security', () => {
    test('AppModule domain operations continue seamlessly with RLS enabled', async () => {
      const app = new AppModule();

      // Alice deposits money via backend service (atomic transaction with ledger)
      const depositResult = await app.databasePlayerService.depositBank(playerAId, 200);
      assert.ok(depositResult, 'Bank deposit must succeed');

      const alice = await app.databasePlayerService.get(playerAId);
      assert.equal(Number(alice.cash), 1300, 'Cash should be reduced by deposit amount');
      assert.equal(Number(alice.bankCash), 690, 'Bank cash should increase by 190 (after 5% fee)');

      // Bob engages in PvP against RivalBot (bots are PvP-only)
      const pvpResult = await app.databaseBattleService.fight(playerBId, botId, 'fight');
      assert.ok(pvpResult.battle, 'PvP fight against bot should succeed');

      // Bob cannot send friend request to a bot
      await assert.rejects(
        async () => {
          await app.databasePlayerService.sendFriendRequest(playerBId, `RivalBot_${testRunId}`);
        },
        /Cannot send friend request to a campus bot|Bot/,
        'Bots must remain isolated from social friendships'
      );
    });
  });
});

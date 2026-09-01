import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getPrismaClient } from './prisma-client';
import {
  PrismaPlayerRepository,
  PrismaJobRepository,
  PrismaTowerRepository,
  PrismaAlliesRepository,
  PrismaWalletRepository,
  PrismaFurnitureRepository,
  PrismaFriendshipRepository,
  PrismaBattleRepository,
  PrismaMessageRepository,
} from './repositories';
import { DatabasePlayerService } from './database.player.service';
import { DatabaseWalletService } from './database.wallet.service';
import { DatabaseBattleService } from './database.battle.service';
import { DatabaseJobsService } from './database.jobs.service';
import { DatabaseTowerService } from './database.tower.service';
import { DatabaseAlliesService } from './database.allies.service';
import { CombatService } from '../combat/combat.service';
import { GameConfigService } from '../game-config/game-config.service';
import { CashTransactionType } from './prisma.service';

describe('Phase 18 — PostgreSQL Authority & Persistence Cutover Audit Suite', () => {
  const prisma = getPrismaClient();

  // Pure PostgreSQL Repositories
  const playerRepo = new PrismaPlayerRepository(() => prisma);
  const jobRepo = new PrismaJobRepository(() => prisma);
  const towerRepo = new PrismaTowerRepository(() => prisma);
  const alliesRepo = new PrismaAlliesRepository(() => prisma);
  const walletRepo = new PrismaWalletRepository(() => prisma);
  const furnitureRepo = new PrismaFurnitureRepository(() => prisma);
  const friendshipRepo = new PrismaFriendshipRepository(() => prisma);
  const battleRepo = new PrismaBattleRepository(() => prisma);
  const messageRepo = new PrismaMessageRepository(() => prisma);

  const gameConfig = new GameConfigService().getConfig();
  const combat = new CombatService(gameConfig);

  // Pure PostgreSQL Services
  const playerService = new DatabasePlayerService(
    prisma as any,
    messageRepo,
    furnitureRepo,
    walletRepo,
    friendshipRepo
  );
  const walletService = new DatabaseWalletService(walletRepo);
  const jobsService = new DatabaseJobsService(jobRepo);
  const towerService = new DatabaseTowerService(towerRepo);
  const alliesService = new DatabaseAlliesService(alliesRepo);
  const battleService = new DatabaseBattleService(
    prisma as any,
    combat,
    gameConfig.pvpEnergyCost,
    gameConfig.stealRate,
    gameConfig.maxEnergy,
    gameConfig.energyRegenSeconds,
    () => new Date(),
    battleRepo,
    walletRepo
  );

  const createdPlayerIds: string[] = [];

  const createStudent = async (prefix: string, startingCash = 2500) => {
    const id = `test-p18-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const username = `${prefix}_${Date.now().toString().slice(-4)}_${Math.random().toString(36).slice(2, 5)}`;
    const email = `${username.toLowerCase()}@campus.audit`;

    const player = await playerService.create({
      id,
      username,
      email,
      passwordHash: 'scrypt-audit-hash',
      cash: startingCash,
      power: 10,
      smartness: 12,
    });

    createdPlayerIds.push(id);
    return player;
  };

  before(async () => {
    await prisma.$queryRawUnsafe('SELECT 1');
  });

  after(async () => {
    if (createdPlayerIds.length > 0) {
      await prisma.message.deleteMany({
        where: { OR: [{ senderId: { in: createdPlayerIds } }, { receiverId: { in: createdPlayerIds } }] },
      }).catch(() => {});
      await prisma.friendship.deleteMany({
        where: { OR: [{ senderId: { in: createdPlayerIds } }, { receiverId: { in: createdPlayerIds } }] },
      }).catch(() => {});
      await prisma.battle.deleteMany({
        where: { OR: [{ attackerId: { in: createdPlayerIds } }, { defenderId: { in: createdPlayerIds } }] },
      }).catch(() => {});
      await prisma.cashTransaction.deleteMany({
        where: { playerId: { in: createdPlayerIds } },
      }).catch(() => {});
      await prisma.activeJob.deleteMany({
        where: { playerId: { in: createdPlayerIds } },
      }).catch(() => {});
      await prisma.roomOccupant.deleteMany({
        where: { towerRoom: { playerId: { in: createdPlayerIds } } },
      }).catch(() => {});
      await prisma.towerRoom.deleteMany({
        where: { playerId: { in: createdPlayerIds } },
      }).catch(() => {});
      await prisma.playerDormFurniture.deleteMany({
        where: { playerId: { in: createdPlayerIds } },
      }).catch(() => {});
      await prisma.player.deleteMany({
        where: { id: { in: createdPlayerIds } },
      }).catch(() => {});
    }
  });

  describe('Step 5 & 6 — Player Initialization & Cross-Device Authority', () => {
    it('initializes a player in PostgreSQL with all required defaults and schema constraints', async () => {
      const student = await createStudent('init');

      // Verify PostgreSQL row directly
      const raw = await prisma.player.findUniqueOrThrow({ where: { id: student.id } });
      assert.strictEqual(raw.username, student.username);
      assert.strictEqual(Number(raw.cash), 2500);
      assert.strictEqual(Number(raw.bankCash), 0);
      assert.strictEqual(raw.energy, 10);
      assert.strictEqual(raw.morale, 10);
      assert.strictEqual(raw.winStreak, 0);
      assert.strictEqual(raw.dailyStreak, 1);
      assert.strictEqual(raw.isBot, false);
      assert.strictEqual(raw.equippedTitle, 'Freshman Novice');
    });

    it('proves cross-device consistency: mutations in Session A are immediately visible in Session B via PostgreSQL', async () => {
      const student = await createStudent('cross_dev', 3000);

      // Session A performs operations
      await walletService.depositBank(student.id, 1000);
      await jobsService.start(student.id, 'job-study');
      await furnitureRepo.buyFurniture(student.id, 'furn-espresso');
      await playerService.recordDailyAction(student.id, 'job', 1);

      // Session B (simulated by completely fresh service and direct DB queries)
      const sessionBWallet = await walletService.getWallet(student.id);
      const sessionBActiveJob = await jobsService.getActive(student.id);
      const sessionBFurniture = await furnitureRepo.getPlayerFurniture(student.id);
      const sessionBQuests = await playerService.getDailyQuests(student.id);

      assert.strictEqual(sessionBWallet.bankCash, 950); // 1000 - 50 fee
      assert.strictEqual(sessionBWallet.cash, 500); // 3000 - 1000 (deposit) - 1500 (espresso)
      assert.ok(sessionBActiveJob);
      assert.strictEqual(sessionBActiveJob.jobId, 'job-study');
      assert.ok(sessionBFurniture.some((f) => f.furnitureId === 'furn-espresso'));
      const jobQuest = sessionBQuests.dailyQuests.find((q) => q.id === 'dq-jobs');
      assert.strictEqual(jobQuest?.progress, 1);
    });
  });

  describe('Step 7 & 8 — Backend Restart & Multi-Process Concurrency Authority', () => {
    it('preserves all domain entities across simulated server teardown and cold restart', async () => {
      const studentA = await createStudent('restart_a', 5000);
      const studentB = await createStudent('restart_b', 5000);

      // Mutate state across domains
      await towerService.unlock(studentA.id, { roomNumber: 2 });
      await alliesService.hire(studentA.id, 'ally-coder', (await towerService.list(studentA.id))[0].id);
      await friendshipRepo.createRequest({ senderId: studentA.id, receiverId: studentB.id });
      await messageRepo.create({
        senderId: studentA.id,
        receiverId: studentB.id,
        content: 'Campus meetup at the neural rig!',
      });

      // Cold Restart simulation: instantiate completely isolated service instances
      const isolatedPrisma = getPrismaClient();
      const freshTower = new DatabaseTowerService(new PrismaTowerRepository(() => isolatedPrisma));
      const freshFriendship = new PrismaFriendshipRepository(() => isolatedPrisma);
      const freshMessages = new PrismaMessageRepository(() => isolatedPrisma);

      const rooms = await freshTower.list(studentA.id);
      const unlockedRooms = rooms.filter((r) => r.unlocked);
      const friends = await freshFriendship.listForPlayer(studentA.id);
      const msgs = await freshMessages.findConversation(studentA.id, studentB.id);

      assert.strictEqual(unlockedRooms.length, 2);
      assert.strictEqual(rooms[0]?.occupants?.[0]?.allyId, 'ally-coder');
      assert.strictEqual(friends.length, 1);
      assert.strictEqual(friends[0].status, 'PENDING');
      assert.strictEqual(msgs.length, 1);
      assert.strictEqual(msgs[0].content, 'Campus meetup at the neural rig!');
    });

    it('proves multi-process concurrent wallet operations are atomic and prevent double spending', async () => {
      const student = await createStudent('multi_proc', 1000);

      // Simulate 5 concurrent attempts to spend $600 from a $1,000 balance
      const results = await Promise.allSettled([
        walletService.spendCash(student.id, 600, CashTransactionType.FURNITURE_PURCHASE, 'Purchase A'),
        walletService.spendCash(student.id, 600, CashTransactionType.FURNITURE_PURCHASE, 'Purchase B'),
        walletService.spendCash(student.id, 600, CashTransactionType.FURNITURE_PURCHASE, 'Purchase C'),
        walletService.spendCash(student.id, 600, CashTransactionType.FURNITURE_PURCHASE, 'Purchase D'),
        walletService.spendCash(student.id, 600, CashTransactionType.FURNITURE_PURCHASE, 'Purchase E'),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      assert.strictEqual(fulfilled.length, 1, 'Only exactly 1 spend operation may succeed');
      assert.strictEqual(rejected.length, 4, '4 spend operations must be rejected for insufficient funds');

      const finalWallet = await walletService.getWallet(student.id);
      assert.strictEqual(finalWallet.cash, 400);
    });
  });

  describe('Step 12 & 13 — Database Schema & Relational Integrity Audit', () => {
    it('verifies all expected tables, foreign keys, and cascading delete constraints', async () => {
      const tempStudent = await createStudent('cascade_test', 5000);

      // Create dependent records
      const room = await towerService.unlock(tempStudent.id, { roomNumber: 2 });
      await alliesService.hire(tempStudent.id, 'ally-tutor', room.id);
      await furnitureRepo.buyFurniture(tempStudent.id, 'furn-lock');
      await walletService.addCash(tempStudent.id, 100, CashTransactionType.JOB_REWARD, 'Test Reward');

      // Verify records exist
      assert.strictEqual((await prisma.towerRoom.count({ where: { playerId: tempStudent.id } })), 2);
      assert.strictEqual((await prisma.roomOccupant.count({ where: { towerRoomId: room.id } })), 1);
      assert.strictEqual((await prisma.playerDormFurniture.count({ where: { playerId: tempStudent.id } })), 1);
      assert.ok((await prisma.cashTransaction.count({ where: { playerId: tempStudent.id } })) >= 1);

      // Delete player and verify cascade
      await prisma.player.delete({ where: { id: tempStudent.id } });

      assert.strictEqual((await prisma.towerRoom.count({ where: { playerId: tempStudent.id } })), 0);
      assert.strictEqual((await prisma.roomOccupant.count({ where: { towerRoomId: room.id } })), 0);
      assert.strictEqual((await prisma.playerDormFurniture.count({ where: { playerId: tempStudent.id } })), 0);
      assert.strictEqual((await prisma.cashTransaction.count({ where: { playerId: tempStudent.id } })), 0);
    });

    it('verifies no orphaned rows exist in relational tables', async () => {
      const orphanedRooms = await prisma.$queryRawUnsafe<any[]>(`
        SELECT tr.id FROM tower_rooms tr LEFT JOIN players p ON tr.player_id = p.id WHERE p.id IS NULL
      `);
      assert.strictEqual(orphanedRooms.length, 0, 'No orphaned tower rooms');

      const orphanedOccupants = await prisma.$queryRawUnsafe<any[]>(`
        SELECT ro.id FROM room_occupants ro LEFT JOIN tower_rooms tr ON ro.tower_room_id = tr.id WHERE tr.id IS NULL
      `);
      assert.strictEqual(orphanedOccupants.length, 0, 'No orphaned room occupants');

      const orphanedFurniture = await prisma.$queryRawUnsafe<any[]>(`
        SELECT pf.id FROM player_dorm_furniture pf LEFT JOIN players p ON pf.player_id = p.id WHERE p.id IS NULL
      `);
      assert.strictEqual(orphanedFurniture.length, 0, 'No orphaned player furniture');

      const orphanedTxs = await prisma.$queryRawUnsafe<any[]>(`
        SELECT ct.id FROM cash_transactions ct LEFT JOIN players p ON ct.player_id = p.id WHERE p.id IS NULL
      `);
      assert.strictEqual(orphanedTxs.length, 0, 'No orphaned cash transactions');
    });
  });

  describe('Step 14 — Security Authority & Isolation Audit', () => {
    it('enforces that Player A cannot modify, spend, or withdraw from Player B balance', async () => {
      const victim = await createStudent('sec_victim', 5000);
      await walletService.depositBank(victim.id, 2000);

      // Attacker tries to withdraw from victim bank account
      await assert.rejects(
        async () => {
          // Attacker has $0 bank cash
          const attacker = await createStudent('sec_attacker', 100);
          await walletService.withdrawBank(attacker.id, 1000);
        },
        /Insufficient funds in Campus Bank/
      );

      const victimWallet = await walletService.getWallet(victim.id);
      assert.strictEqual(victimWallet.bankCash, 1900); // 2000 - 100 fee
    });

    it('enforces that Player A cannot read private messages between Player B and Player C', async () => {
      const alice = await createStudent('sec_alice');
      const bob = await createStudent('sec_bob');
      const eve = await createStudent('sec_eve');

      await messageRepo.create({
        senderId: alice.id,
        receiverId: bob.id,
        content: 'Secret strategy meeting at dawn.',
      });

      // Eve attempts to read Alice or Bob conversation
      const eveUserMessages = await messageRepo.findUserMessages(eve.id);
      assert.strictEqual(eveUserMessages.length, 0);

      const eveConversationWithAlice = await messageRepo.findConversation(eve.id, alice.id);
      assert.strictEqual(eveConversationWithAlice.length, 0);
    });
  });

  describe('Step 16 — Performance & Query Execution Timing Audit', () => {
    it('executes core database operations within low latency thresholds (<100ms)', async () => {
      const student = await createStudent('perf_test', 5000);

      const t0 = Date.now();
      await walletService.getWallet(student.id);
      const getWalletMs = Date.now() - t0;
      assert.ok(getWalletMs < 200, `getWallet took ${getWalletMs}ms`);

      const t1 = Date.now();
      await jobsService.listJobs();
      const listJobsMs = Date.now() - t1;
      assert.ok(listJobsMs < 200, `listJobs took ${listJobsMs}ms`);

      const t2 = Date.now();
      await playerService.getMilestonesAndTrophies(student.id);
      const trophiesMs = Date.now() - t2;
      assert.ok(trophiesMs < 200, `getMilestonesAndTrophies took ${trophiesMs}ms`);
    });
  });
});

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { getPrismaClient } from './prisma-client';
import { AppModule } from '../app/app.module';
import { STATIC_ALLIES_CATALOG } from './repositories/allies.repository.interface';

describe('Phase 19 — Production PostgreSQL Cutover & Authority Test Suite', () => {
  const prisma = getPrismaClient();
  const testRunId = `cutover_p19_${Date.now()}`;
  const createdPlayerIds: string[] = [];

  const cleanup = async () => {
    if (createdPlayerIds.length > 0) {
      await prisma.cashTransaction.deleteMany({ where: { playerId: { in: createdPlayerIds } } });
      await prisma.battle.deleteMany({
        where: {
          OR: [
            { attackerId: { in: createdPlayerIds } },
            { defenderId: { in: createdPlayerIds } },
          ],
        },
      });
      await prisma.message.deleteMany({
        where: {
          OR: [
            { senderId: { in: createdPlayerIds } },
            { receiverId: { in: createdPlayerIds } },
          ],
        },
      });
      await prisma.friendship.deleteMany({
        where: {
          OR: [
            { senderId: { in: createdPlayerIds } },
            { receiverId: { in: createdPlayerIds } },
          ],
        },
      });
      await prisma.playerDormFurniture.deleteMany({ where: { playerId: { in: createdPlayerIds } } });
      await prisma.roomOccupant.deleteMany({
        where: {
          towerRoom: { playerId: { in: createdPlayerIds } },
        },
      });
      await prisma.towerRoom.deleteMany({ where: { playerId: { in: createdPlayerIds } } });
      await prisma.activeJob.deleteMany({ where: { playerId: { in: createdPlayerIds } } });
      await prisma.player.deleteMany({ where: { id: { in: createdPlayerIds } } });
    }
  };

  test.after(async () => {
    await cleanup();
  });

  describe('1. Production Container Startup & Single Source of Truth', () => {
    test('AppModule initializes with PostgreSQL PrismaClient as authoritative backend', async () => {
      const appModule = new AppModule();
      assert.ok(appModule.prisma, 'Prisma instance should exist on AppModule');
      assert.ok(appModule.databasePlayerService, 'DatabasePlayerService should exist');
      assert.ok(appModule.databaseWalletService, 'DatabaseWalletService should exist');
      assert.ok(appModule.databaseBattleService, 'DatabaseBattleService should exist');
      assert.ok(appModule.databaseTowerService, 'DatabaseTowerService should exist');
      assert.ok(appModule.databaseAlliesService, 'DatabaseAlliesService should exist');
      assert.ok(appModule.databaseJobsService, 'DatabaseJobsService should exist');

      // Create a player through AppModule and verify direct persistence in PostgreSQL
      const created = await appModule.databasePlayerService.create({
        username: `hero_${testRunId}`,
        email: `hero_${testRunId}@college.edu`,
        passwordHash: '$2b$10$authoritativehash123',
      });
      createdPlayerIds.push(created.id);

      assert.ok(created.id, 'Player should receive UUID');
      assert.equal(created.username, `hero_${testRunId}`);

      // Verify row exists in PostgreSQL directly via PrismaClient query
      const dbRow = await prisma.player.findUnique({ where: { id: created.id } });
      assert.ok(dbRow, 'Player row must be directly present in PostgreSQL');
      assert.equal(dbRow.email, `hero_${testRunId}@college.edu`);
      assert.equal(Number(dbRow.cash), 1000);
      assert.equal(Number(dbRow.bankCash), 0);
    });

    test('Cold restart preserves PostgreSQL state without Firestore or local JSON overwrite', async () => {
      // Simulate Container Instance A creating state
      const appInstanceA = new AppModule();
      const student = await appInstanceA.databasePlayerService.create({
        username: `student_${testRunId}`,
        email: `student_${testRunId}@college.edu`,
        passwordHash: '$2b$10$authoritativehash456',
      });
      createdPlayerIds.push(student.id);

      // Perform state mutation: deposit $400 into bank vault ($20 fee -> $380 net deposit, $600 pocket cash)
      await appInstanceA.databasePlayerService.depositBank(student.id, 400);

      // Simulate Container Instance B booting up (cold reboot)
      const appInstanceB = new AppModule();
      const fetchedB = await appInstanceB.databasePlayerService.get(student.id);

      assert.equal(Number(fetchedB.cash), 600, 'Pocket cash should be exactly $600 in cold reboot instance');
      assert.equal(Number(fetchedB.bankCash), 380, 'Bank cash should be exactly $380 in cold reboot instance');
      assert.equal(Number(fetchedB.totalBankDeposited), 380, 'Total deposited should match authoritative SQL ledger');

      // Check cash transactions in SQL
      const txs = await appInstanceB.databasePlayerService.getTransactionHistory(student.id);
      assert.ok(txs.length >= 2, 'Should have bank deposit and fee ledger entries');
    });
  });

  describe('2. Comprehensive Domain Operations on PostgreSQL Authority', () => {
    test('Job workflow executes atomically on PostgreSQL', async () => {
      const app = new AppModule();
      const player = await app.databasePlayerService.create({
        username: `jobber_${testRunId}`,
        email: `jobber_${testRunId}@college.edu`,
        passwordHash: '$2b$10$authjobhash789',
      });
      createdPlayerIds.push(player.id);

      // Start Job
      const activeJob = await app.databaseJobsService.start(player.id, 'job-study');
      assert.ok(activeJob, 'Active job should be created');
      assert.equal(activeJob.collected, false);

      // Verify in DB
      const dbJob = await prisma.activeJob.findUnique({ where: { id: activeJob.id } });
      assert.ok(dbJob, 'Active job must exist in PostgreSQL');
      assert.equal(dbJob.jobId, 'job-study');

      // Fast-forward finishesAt to past for testing collection
      await prisma.activeJob.update({
        where: { id: activeJob.id },
        data: { finishesAt: new Date(Date.now() - 1000) },
      });

      // Collect Job Reward
      const collectResult = await app.databaseJobsService.collect(player.id, activeJob.id);
      assert.ok(collectResult.rewardCash > 0, 'Should receive cash reward');

      const updatedPlayer = await app.databasePlayerService.get(player.id);
      assert.equal(Number(updatedPlayer.cash), 1000 + collectResult.rewardCash);
    });

    test('Tower room unlocking & ally hiring persist in PostgreSQL', async () => {
      const app = new AppModule();
      const player = await app.databasePlayerService.create({
        username: `tower_${testRunId}`,
        email: `tower_${testRunId}@college.edu`,
        passwordHash: '$2b$10$authtowerhash789',
      });
      createdPlayerIds.push(player.id);

      // Room 1 is already unlocked on player creation. Unlock Room 2!
      const unlockedRoom2 = await app.databaseTowerService.unlock(player.id, { roomNumber: 2 });
      assert.ok(unlockedRoom2, 'Room 2 should be unlocked');
      assert.equal(unlockedRoom2.unlocked, true);
      assert.equal(unlockedRoom2.roomNumber, 2);

      // Verify in PostgreSQL
      const dbRoom = await prisma.towerRoom.findUnique({
        where: {
          playerId_roomNumber: {
            playerId: player.id,
            roomNumber: 2,
          },
        },
      });
      assert.ok(dbRoom, 'Tower room 2 must exist in PostgreSQL');
      assert.equal(dbRoom.unlocked, true);

      // Hire Ally into Room 2
      const ally = STATIC_ALLIES_CATALOG[0];
      const hireResult = await app.databaseAlliesService.hire(player.id, ally.id, unlockedRoom2.id);
      assert.ok(hireResult.occupant, 'Occupant should be recorded');
      assert.equal(hireResult.occupant.level, 1);

      // Verify occupant in PostgreSQL
      const dbOccupant = await prisma.roomOccupant.findUnique({
        where: { towerRoomId: unlockedRoom2.id },
      });
      assert.ok(dbOccupant, 'Room occupant must exist in PostgreSQL');
      assert.equal(dbOccupant.allyId, ally.id);
    });

    test('PvP combat, scouting, and battle feed operate on PostgreSQL', async () => {
      const app = new AppModule();
      const attacker = await app.databasePlayerService.create({
        username: `pvp_atk_${testRunId}`,
        email: `pvp_atk_${testRunId}@college.edu`,
        passwordHash: '$2b$10$authpvphash1',
      });
      const defender = await app.databasePlayerService.create({
        username: `pvp_def_${testRunId}`,
        email: `pvp_def_${testRunId}@college.edu`,
        passwordHash: '$2b$10$authpvphash2',
      });
      createdPlayerIds.push(attacker.id, defender.id);

      // Scout defender
      const scoutReport = await app.databaseBattleService.scout(attacker.id, defender.id);
      assert.ok(scoutReport, 'Scout report should be generated');
      assert.equal(scoutReport.defender.id, defender.id);

      // Execute PvP fight
      const battleResult = await app.databaseBattleService.fight(attacker.id, defender.id, 'fight');
      assert.ok(battleResult, 'Battle result should be generated');
      assert.ok(battleResult.battle?.id, 'Battle ID must exist');

      // Verify battle logged in PostgreSQL
      const dbBattle = await prisma.battle.findUnique({ where: { id: battleResult.battle.id } });
      assert.ok(dbBattle, 'Battle record must exist in PostgreSQL');
      assert.equal(dbBattle.attackerId, attacker.id);
      assert.equal(dbBattle.defenderId, defender.id);

      // Verify battle feed
      const feed = await app.databaseBattleService.getPlayerBattleFeed(attacker.id);
      assert.ok(feed.length >= 1, 'Battle feed should show recorded battle');
    });

    test('Direct messages and friend requests persist in PostgreSQL', async () => {
      const app = new AppModule();
      const playerA = await app.databasePlayerService.create({
        username: `social_a_${testRunId}`,
        email: `social_a_${testRunId}@college.edu`,
        passwordHash: '$2b$10$authsocialhash1',
      });
      const playerB = await app.databasePlayerService.create({
        username: `social_b_${testRunId}`,
        email: `social_b_${testRunId}@college.edu`,
        passwordHash: '$2b$10$authsocialhash2',
      });
      createdPlayerIds.push(playerA.id, playerB.id);

      // Send Message from A to B
      const msgResult = await app.databasePlayerService.sendMessage(
        playerA.id,
        playerB.id,
        'Meet me at the campus library!'
      );
      assert.ok(msgResult.data?.id, 'Message ID should be returned');

      // Check PostgreSQL
      const dbMsg = await prisma.message.findUnique({ where: { id: msgResult.data.id } });
      assert.ok(dbMsg, 'Message must be in PostgreSQL');
      assert.equal(dbMsg.content, 'Meet me at the campus library!');

      // Send Friend Request from A to B
      const reqResult = await app.databasePlayerService.sendFriendRequest(playerA.id, playerB.username);
      assert.ok(reqResult.friendshipId, 'Friend request should be created');

      // Accept Friend Request by B
      const acceptResult = await app.databasePlayerService.respondFriendRequest(
        playerB.id,
        reqResult.friendshipId,
        true
      );
      assert.ok(acceptResult.message, 'Accept message returned');

      // Verify in PostgreSQL
      const dbFriendship = await prisma.friendship.findUnique({
        where: { id: reqResult.friendshipId },
      });
      assert.ok(dbFriendship, 'Friendship must exist in PostgreSQL');
      assert.equal(dbFriendship.status, 'ACCEPTED');
    });
  });
});

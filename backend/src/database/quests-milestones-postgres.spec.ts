import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getPrismaClient } from './prisma-client';
import {
  PrismaPlayerRepository,
  InMemoryPlayerRepository,
  PrismaWalletRepository,
  PrismaFurnitureRepository,
  PrismaFriendshipRepository,
} from './repositories';
import { DatabasePlayerService } from './database.player.service';

describe('Phase 17 — Quests, Milestones & Remaining Player State PostgreSQL Persistence Suite', () => {
  const prisma = getPrismaClient();
  const walletRepo = new PrismaWalletRepository(() => prisma);
  const furnitureRepo = new PrismaFurnitureRepository(() => prisma);
  const friendshipRepo = new PrismaFriendshipRepository(() => prisma);

  const playerService = new DatabasePlayerService(
    prisma as any,
    undefined,
    furnitureRepo,
    walletRepo,
    friendshipRepo
  );

  const createdPlayerIds: string[] = [];

  const createTestStudent = async (prefix: string, startingCash = 2000) => {
    const id = `test-p17-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const username = `${prefix}_${Date.now().toString().slice(-4)}_${Math.random().toString(36).slice(2, 5)}`;
    const email = `${username.toLowerCase()}@campus.test`;

    const player = await playerService.create({
      id,
      username,
      email,
      passwordHash: 'scrypt-test-hash',
      cash: startingCash,
      power: 10,
      smartness: 15,
    });

    createdPlayerIds.push(id);
    return player;
  };

  before(async () => {
    await prisma.$queryRawUnsafe('SELECT 1');
  });

  after(async () => {
    if (createdPlayerIds.length > 0) {
      await walletRepo.deleteTestRecords(createdPlayerIds).catch(() => {});
      await prisma.cashTransaction.deleteMany({
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

  describe('1. Daily Quests Persistence & Progression', () => {
    it('initializes clean daily quests for today with zero progress', async () => {
      const student = await createTestStudent('quest_init');
      const questsData = await playerService.getDailyQuests(student.id);

      assert.strictEqual(questsData.dailyQuests.length, 3);
      assert.strictEqual(questsData.allDailyCompleted, false);
      assert.strictEqual(questsData.dailyBonusClaimed, false);
      assert.strictEqual(questsData.dailyStreak, 1);

      const jobQuest = questsData.dailyQuests.find((q) => q.id === 'dq-jobs');
      assert.ok(jobQuest);
      assert.strictEqual(jobQuest.progress, 0);
      assert.strictEqual(jobQuest.completed, false);
      assert.strictEqual(jobQuest.claimed, false);
    });

    it('records daily actions and accurately updates quest progression', async () => {
      const student = await createTestStudent('quest_prog');

      // Record job progression
      await playerService.recordDailyAction(student.id, 'job', 1);
      let data = await playerService.getDailyQuests(student.id);
      let jobQuest = data.dailyQuests.find((q) => q.id === 'dq-jobs')!;
      assert.strictEqual(jobQuest.progress, 1);
      assert.strictEqual(jobQuest.completed, false);

      await playerService.recordDailyAction(student.id, 'job', 1);
      data = await playerService.getDailyQuests(student.id);
      jobQuest = data.dailyQuests.find((q) => q.id === 'dq-jobs')!;
      assert.strictEqual(jobQuest.progress, 2);
      assert.strictEqual(jobQuest.completed, true);
    });

    it('claims daily quest reward, credits wallet, and records cash transaction', async () => {
      const student = await createTestStudent('quest_claim', 1000);
      await playerService.recordDailyAction(student.id, 'job', 2);

      const initialCash = (await playerService.get(student.id)).cash;
      const initialEnergy = (await playerService.get(student.id)).energy;

      const claimResult = await playerService.claimDailyQuest(student.id, 'dq-jobs');
      assert.strictEqual(claimResult.quest.claimed, true);
      assert.strictEqual(claimResult.player.cash, initialCash + 500);

      // Verify PostgreSQL cash transaction entry
      const txs = await playerService.getTransactionHistory(student.id, { limit: 10 });
      const questTx = txs.find((t: any) => t.reference?.includes('Daily Quest Reward: Campus Hustle'));
      assert.ok(questTx, 'CashTransaction for quest reward must exist');
      assert.strictEqual(questTx.amount, 500);
    });

    it('strictly prevents duplicate daily quest claims (idempotency/concurrency)', async () => {
      const student = await createTestStudent('quest_dup');
      await playerService.recordDailyAction(student.id, 'pvp', 2);

      // First claim succeeds
      const first = await playerService.claimDailyQuest(student.id, 'dq-pvp');
      assert.strictEqual(first.quest.claimed, true);

      // Second sequential claim must fail
      await assert.rejects(
        async () => {
          await playerService.claimDailyQuest(student.id, 'dq-pvp');
        },
        /Quest reward already claimed/
      );

      // Concurrent claims must only grant once
      const results = await Promise.allSettled([
        playerService.claimDailyQuest(student.id, 'dq-pvp'),
        playerService.claimDailyQuest(student.id, 'dq-pvp'),
      ]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      assert.strictEqual(fulfilled.length, 0, 'No duplicate concurrent claim allowed');
    });
  });

  describe('2. Grand Daily Bonus & Streak Persistence', () => {
    it('unlocks Grand Daily Bonus only after all 3 daily quests are completed', async () => {
      const student = await createTestStudent('bonus_unlock', 500);

      // Try before completing quests
      await assert.rejects(
        async () => {
          await playerService.claimDailyBonus(student.id);
        },
        /Complete all 3 daily quests/
      );

      // Complete all 3 quests
      await playerService.recordDailyAction(student.id, 'job', 2);
      await playerService.recordDailyAction(student.id, 'pvp', 2);
      await playerService.recordDailyAction(student.id, 'bank', 500);

      const beforeBonus = await playerService.get(student.id);
      const bonusRes = await playerService.claimDailyBonus(student.id);

      assert.strictEqual(bonusRes.dailyData.dailyBonusClaimed, true);
      assert.strictEqual(bonusRes.player.dailyStreak, 2);
      assert.strictEqual(bonusRes.player.cash, beforeBonus.cash + 1500);
      assert.strictEqual(bonusRes.player.energy, 10); // Full refill

      // Verify transaction ledger
      const txs = await playerService.getTransactionHistory(student.id, { limit: 10 });
      const bonusTx = txs.find((t: any) => t.reference?.includes('Grand Daily Vault Bonus'));
      assert.ok(bonusTx);
      assert.strictEqual(bonusTx.amount, 1500);
    });

    it('strictly prevents duplicate claims of the Grand Daily Bonus', async () => {
      const student = await createTestStudent('bonus_dup', 500);
      await playerService.recordDailyAction(student.id, 'job', 2);
      await playerService.recordDailyAction(student.id, 'pvp', 2);
      await playerService.recordDailyAction(student.id, 'bank', 500);

      await playerService.claimDailyBonus(student.id);

      await assert.rejects(
        async () => {
          await playerService.claimDailyBonus(student.id);
        },
        /Grand Daily Bonus already claimed for today/
      );
    });
  });

  describe('3. Milestones & Achievements Persistence', () => {
    it('computes milestone progression dynamically and unlocks titles', async () => {
      const student = await createTestStudent('ms_eval', 1500);
      const trophies = await playerService.getMilestonesAndTrophies(student.id);

      assert.ok(trophies.milestones.length >= 19);
      assert.ok(trophies.unlockedTitles.includes('Freshman Novice'));

      // ms-wealth-1 requires $1,000 pocket cash (student has $1,500)
      const msWealth1 = trophies.milestones.find((m) => m.id === 'ms-wealth-1');
      assert.ok(msWealth1);
      assert.strictEqual(msWealth1.completed, true);
      assert.strictEqual(msWealth1.claimed, false);
      assert.strictEqual(msWealth1.rewardTitle, 'Freshman Earner');
    });

    it('claims milestone reward, updates player state, and unlocks title permanently in PostgreSQL', async () => {
      const student = await createTestStudent('ms_claim', 1200);
      const beforeClaim = await playerService.get(student.id);

      const result = await playerService.claimMilestone(student.id, 'ms-wealth-1');
      assert.strictEqual(result.milestone.claimed, true);
      assert.strictEqual(result.player.cash, beforeClaim.cash + 500);
      assert.ok(result.player.claimedMilestones?.includes('ms-wealth-1'));

      // Verify PostgreSQL persistence by re-reading directly
      const reloaded = await playerService.get(student.id);
      assert.ok(reloaded.claimedMilestones?.includes('ms-wealth-1'));

      // Verify title is unlocked in profile
      const profile = await playerService.getMilestonesAndTrophies(student.id);
      assert.ok(profile.unlockedTitles.includes('Freshman Earner'));

      // Verify transaction ledger
      const txs = await playerService.getTransactionHistory(student.id, { limit: 10 });
      const msTx = txs.find((t: any) => t.reference?.includes('Trophy Milestone Reward: First Paycheck'));
      assert.ok(msTx);
      assert.strictEqual(msTx.amount, 500);
    });

    it('strictly prevents duplicate milestone claims', async () => {
      const student = await createTestStudent('ms_dup', 1500);

      // First claim succeeds
      await playerService.claimMilestone(student.id, 'ms-wealth-1');

      // Second claim must fail
      await assert.rejects(
        async () => {
          await playerService.claimMilestone(student.id, 'ms-wealth-1');
        },
        /Milestone reward already claimed/
      );

      // Concurrent claims must not grant duplicate rewards
      const results = await Promise.allSettled([
        playerService.claimMilestone(student.id, 'ms-wealth-1'),
        playerService.claimMilestone(student.id, 'ms-wealth-1'),
      ]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      assert.strictEqual(fulfilled.length, 0);
    });

    it('rejects milestone claim if requirement is not met', async () => {
      const student = await createTestStudent('ms_unmet', 100);
      // ms-wealth-3 requires $50,000 net worth
      await assert.rejects(
        async () => {
          await playerService.claimMilestone(student.id, 'ms-wealth-3');
        },
        /Milestone requirement has not been met/
      );
    });
  });

  describe('4. Complete Player Persistence & Parity Contract', () => {
    it('preserves all player progression attributes in PostgreSQL across updates', async () => {
      const student = await createTestStudent('player_parity', 5000);

      const updated = await playerService.updateProfile(student.id, {
        equippedTitle: 'Freshman Novice',
        avatarId: 'avatar-scholar',
        avatarAura: 'aura-none',
        avatarFrame: 'frame-neon',
        avatarOutfit: 'outfit-hoodie',
        avatarHeadwear: 'headwear-none',
        avatarAccessory: 'acc-laptop',
        customBio: 'Conquering the campus empire step by step!',
      });

      assert.strictEqual(updated.equippedTitle, 'Freshman Novice');
      assert.strictEqual(updated.avatarId, 'avatar-scholar');
      assert.strictEqual(updated.avatarAura, 'aura-none');
      assert.strictEqual(updated.avatarFrame, 'frame-neon');
      assert.strictEqual(updated.avatarOutfit, 'outfit-hoodie');
      assert.strictEqual(updated.avatarHeadwear, 'headwear-none');
      assert.strictEqual(updated.avatarAccessory, 'acc-laptop');
      assert.strictEqual(updated.customBio, 'Conquering the campus empire step by step!');

      // Read fresh from database
      const fresh = await playerService.get(student.id);
      assert.strictEqual(fresh.equippedTitle, 'Freshman Novice');
      assert.strictEqual(fresh.avatarId, 'avatar-scholar');
      assert.strictEqual(fresh.customBio, 'Conquering the campus empire step by step!');
    });
  });
});

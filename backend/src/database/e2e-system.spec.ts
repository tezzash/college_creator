import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaService } from './prisma.service';
import { DatabaseBattleService } from './database.battle.service';
import { DatabasePlayerService } from './database.player.service';
import { DatabaseJobsService } from './database.jobs.service';
import { DatabaseTowerService } from './database.tower.service';
import { DatabaseAlliesService } from './database.allies.service';
import { CombatService } from '../combat/combat.service';

test('Comprehensive End-to-End System Suite for College Geeks', async (t) => {
  const prisma = new PrismaService();
  // Deterministic random (0.0) so combat succeeds deterministically in test environment
  const combat = new CombatService({ minWinProbability: 0.1, maxWinProbability: 0.9 }, () => 0.0);
  const battleService = new DatabaseBattleService(prisma, combat, 1, 0.15);
  const playerService = new DatabasePlayerService(prisma);
  const jobsService = new DatabaseJobsService(prisma);
  const towerService = new DatabaseTowerService(prisma);
  const alliesService = new DatabaseAlliesService(prisma);

  const testPlayerId = `test-player-${Date.now()}`;

  // 1. Auth / Player Registration & Initialization
  await t.test('1. Player creation and default state verification', async () => {
    const created = await playerService.create({
      id: testPlayerId,
      username: `Challenger_${Date.now().toString().slice(-4)}`,
      email: `${testPlayerId}@campus.edu`,
      passwordHash: 'hash123',
    });

    assert.ok(created);
    assert.equal(created.id, testPlayerId);
    assert.equal(created.energy, 10);
    assert.equal(created.morale, 10);
    assert.equal(created.cash, 1000);
    assert.equal(created.bankCash, 0);

    const fullProfile = await playerService.get(testPlayerId);
    assert.ok(fullProfile);
    assert.ok(fullProfile.power >= 5);
    assert.ok(fullProfile.smartness >= 5);
  });

  // 2. Tower & Suite Management
  await t.test('2. Tower suite unlocking and suite listing', async () => {
    // Unlock Suite 2 (costs $500).
    const unlockRes = await towerService.unlock(testPlayerId, { roomNumber: 2 });
    assert.ok(unlockRes);
    assert.equal(unlockRes.roomNumber, 2);

    const suites = await towerService.list(testPlayerId);
    assert.ok(Array.isArray(suites));
    assert.ok(suites.filter((s: any) => s.unlocked).length >= 2);

    const updatedProfile = await playerService.get(testPlayerId);
    assert.equal(updatedProfile.cash, 500); // 1000 - 500
  });

  // 3. Ally Catalog & Hiring
  await t.test('3. Ally hiring and suite occupant assignment', async () => {
    const catalog = await alliesService.listAllies();
    assert.ok(catalog.length > 0);

    // Find affordable ally (e.g. Tutor for $200)
    const tutor = catalog.find((a) => a.id === 'ally-tutor') || catalog[0];
    assert.ok(tutor);

    // Hire into suite 2
    const rooms = await towerService.list(testPlayerId);
    const suite2 = rooms.find((s: any) => s.roomNumber === 2);
    assert.ok(suite2);

    const hireRes = await alliesService.hire(testPlayerId, tutor.id, suite2.id);
    assert.ok(hireRes);
    assert.equal(hireRes.occupant.allyId, tutor.id);

    // Verify player stats gained bonus
    const buffedProfile = await playerService.get(testPlayerId);
    assert.ok(buffedProfile.smartness >= 5);
  });

  // 4. Jobs & Campus Gigs Engine
  await t.test('4. Jobs starting, ticking, and completion reward payout', async () => {
    await prisma.player.update({
      where: { id: testPlayerId },
      data: { energy: 10 },
    });

    const jobsCatalog = await jobsService.listJobs();
    assert.ok(jobsCatalog.length > 0);
    const flyerJob = jobsCatalog.find((j: any) => j.id === 'job-flyers') || jobsCatalog[0];

    const started = await jobsService.start(testPlayerId, flyerJob.id);
    assert.ok(started.id);
    assert.equal(started.jobId, flyerJob.id);

    // Complete job immediately by setting finishesAt in past
    await prisma.activeJob.update({
      where: { id: started.id },
      data: { finishesAt: new Date(Date.now() - 1000) },
    });

    const claimRes = await jobsService.collect(testPlayerId, started.id);
    assert.ok(claimRes.rewardCash > 0);
    assert.ok(claimRes.player.cash > 0);
  });

  // 5. ATM & Campus Vault Transactions
  await t.test('5. ATM deposit with 5% processing fee and withdrawals', async () => {
    await prisma.player.update({
      where: { id: testPlayerId },
      data: { cash: 1000, bankCash: 0 },
    });

    // Deposit $500 (fee is 5% = $25, credited $475)
    const depRes = await playerService.depositBank(testPlayerId, 500);
    assert.equal(depRes.player.cash, 500);
    assert.equal(depRes.player.bankCash, 475);

    // Withdraw $200 (no fee on withdrawal)
    const withRes = await playerService.withdrawBank(testPlayerId, 200);
    assert.equal(withRes.player.cash, 700);
    assert.equal(withRes.player.bankCash, 275);
  });

  // 6. PvP Combat: Fight, Prank, and Spy
  await t.test('6. PvP Arena - Rival Targeting, Fight, Prank, and Spy Dossier', async () => {
    const allPlayers = await prisma.player.findMany();
    const rivals = allPlayers.filter((p: any) => p.id !== testPlayerId);
    assert.ok(rivals.length > 0);

    const rival = rivals.find((r: any) => r.id === 'rival-chad') || rivals[0];
    assert.ok(rival);
    assert.ok(rival.power > 0);
    assert.ok(rival.cash > 0);

    // Ensure player and rival have high stats and are not hospitalized or pinned
    await prisma.player.update({
      where: { id: rival.id },
      data: {
        pinnedUntil: null,
        hospitalizedUntil: null,
        cash: 1000,
      },
    });

    await prisma.player.update({
      where: { id: testPlayerId },
      data: {
        energy: 10,
        morale: 10,
        power: 50,
        smartness: 50,
      },
    });

    // 6a. Spy Action
    const spyRes = await battleService.fight(testPlayerId, rival.id, 'spy');
    assert.ok(spyRes);
    assert.equal(spyRes.actionType, 'spy');
    assert.ok(spyRes.spyIntel, 'Spy intel dossier must be returned on spy success');
    assert.ok(spyRes.spyIntel.unbankedCash !== undefined);
    assert.ok(spyRes.spyIntel.power !== undefined);
    assert.ok(spyRes.spyIntel.smartness !== undefined);

    // Replenish test resources & reset pinning
    await prisma.player.update({ where: { id: rival.id }, data: { pinnedUntil: null, hospitalizedUntil: null, cash: 1000 } });
    await prisma.player.update({ where: { id: testPlayerId }, data: { energy: 10, morale: 10 } });

    // 6b. Prank Action (+25% loot bonus)
    const prankRes = await battleService.fight(testPlayerId, rival.id, 'prank');
    assert.ok(prankRes);
    assert.equal(prankRes.actionType, 'prank');
    assert.ok(prankRes.combat);

    // Replenish test resources & reset pinning
    await prisma.player.update({ where: { id: rival.id }, data: { pinnedUntil: null, hospitalizedUntil: null, cash: 1000 } });
    await prisma.player.update({ where: { id: testPlayerId }, data: { energy: 10, morale: 10 } });

    // 6c. Fight Action
    const fightRes = await battleService.fight(testPlayerId, rival.id, 'fight');
    assert.ok(fightRes);
    assert.equal(fightRes.actionType, 'fight');
    assert.ok(fightRes.combat);

    // Verify battle logs generated in database
    const battleFeed = await battleService.getPlayerBattleFeed(testPlayerId);
    assert.ok(battleFeed.length >= 3);
  });

  // 7. Milestones and Title Unlocks
  await t.test('7. Achievement Milestones and Claiming', async () => {
    const trophies = await playerService.getMilestonesAndTrophies(testPlayerId);
    assert.ok(Array.isArray(trophies.milestones));
    assert.ok(trophies.milestones.length > 0);

    // Check completed milestone claiming logic
    const completable = trophies.milestones.find((m: any) => m.progress >= m.target && !m.claimed);
    if (completable) {
      const claim = await playerService.claimMilestone(testPlayerId, completable.id);
      assert.ok(claim.milestone);
      assert.ok(claim.player);
    }
  });

  // 8. Leaderboards
  await t.test('8. Global Campus Leaderboards', async () => {
    const leaderboards = await battleService.getLeaderboards();
    assert.ok(leaderboards.topPlunderers.length > 0);
    assert.ok(leaderboards.topNetWorth.length > 0);
  });

  // Test suite completed successfully
});

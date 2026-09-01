import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaService } from './prisma.service';
import { DatabaseBattleService, getStreakMultiplier } from './database.battle.service';
import { DatabasePlayerService } from './database.player.service';
import { DatabaseWalletService } from './database.wallet.service';
import { PrismaFurnitureRepository } from './repositories/prisma-furniture.repository';
import { CombatService } from '../combat/combat.service';
import { PrismaBattleRepository } from './repositories/prisma-battle.repository';
import { InMemoryBattleRepository } from './repositories/in-memory-battle.repository';

test('Phase 15: PvP PostgreSQL Persistence & Combat Engine Test Suite', async (t) => {
  const prisma = new PrismaService();
  // Deterministic combat: 0.0 means attacker always succeeds
  const combatWin = new CombatService({ minWinProbability: 0.1, maxWinProbability: 0.9 }, () => 0.0);
  // Deterministic combat: 1.0 means attacker always fails
  const combatLoss = new CombatService({ minWinProbability: 0.1, maxWinProbability: 0.9 }, () => 1.0);

  const battleServiceWin = new DatabaseBattleService(prisma, combatWin, 1, 0.15, 10, 420);
  const battleServiceLoss = new DatabaseBattleService(prisma, combatLoss, 1, 0.15, 10, 420);
  const playerService = new DatabasePlayerService(prisma);
  const walletService = new DatabaseWalletService(prisma);
  const furnitureRepo = new PrismaFurnitureRepository(() => prisma);

  const p1Id = `pvp-p1-${Date.now()}`;
  const p2Id = `pvp-p2-${Date.now()}`;
  const p3Id = `pvp-p3-${Date.now()}`;
  const testPlayerIds = [p1Id, p2Id, p3Id];

  // Setup test players
  await playerService.create({
    id: p1Id,
    username: `Attacker_${Date.now().toString().slice(-4)}`,
    email: `${p1Id}@campus.edu`,
    passwordHash: 'hash123',
  });

  await playerService.create({
    id: p2Id,
    username: `Defender_${Date.now().toString().slice(-4)}`,
    email: `${p2Id}@campus.edu`,
    passwordHash: 'hash123',
  });

  await playerService.create({
    id: p3Id,
    username: `Neutral_${Date.now().toString().slice(-4)}`,
    email: `${p3Id}@campus.edu`,
    passwordHash: 'hash123',
  });

  // Cleanup helper after test
  t.after(async () => {
    await battleServiceWin.deleteTestRecords(testPlayerIds);
    await prisma.cashTransaction.deleteMany({
      where: { playerId: { in: testPlayerIds } },
    });
    await prisma.playerDormFurniture.deleteMany({
      where: { playerId: { in: testPlayerIds } },
    });
    await prisma.player.deleteMany({
      where: { id: { in: testPlayerIds } },
    });
  });

  // 1. Fight Mechanics & Plunder
  await t.test('1. Fight consumes 1 Energy, transfers 15% plunder, updates streak and records transactions', async () => {
    await prisma.player.update({
      where: { id: p1Id },
      data: { energy: 10, cash: 1000, winStreak: 0, highestStreak: 0, totalPvPWins: 0 },
    });
    await prisma.player.update({
      where: { id: p2Id },
      data: { energy: 10, cash: 1000, pinnedUntil: null, totalPvPLosses: 0 },
    });

    const res = await battleServiceWin.fight(p1Id, p2Id, 'fight');

    assert.equal(res.action, 'fight');
    assert.equal(res.combat.success, true);
    assert.equal(res.energySpent, 1);
    assert.equal(res.attackerEnergy, 9);
    // Base plunder 15% of 1000 = 150
    assert.equal(res.cashTransferred, 150);
    assert.equal(res.winStreak, 1);
    assert.equal(res.highestStreak, 1);

    // Verify DB states
    const attacker = await playerService.get(p1Id);
    const defender = await playerService.get(p2Id);

    // If knockout occurred (e.g. decisive win), attacker gets 150 + 100 knockout bonus
    const expectedAttackerCash = 1000 + res.cashTransferred + (res.knockoutBonus || 0);
    assert.equal(attacker.cash, expectedAttackerCash);
    assert.equal(defender.cash, 1000 - res.cashTransferred);
    assert.equal(attacker.totalPvPWins, 1);
    assert.equal(defender.totalPvPLosses, 1);

    // Verify Cash Transaction records
    const attackerTxs = await walletService.listTransactions(p1Id);
    const defenderTxs = await walletService.listTransactions(p2Id);

    const attackerCredit = attackerTxs.find((tx: any) => tx.type === 'PVP_STEAL_CREDIT');
    const defenderDebit = defenderTxs.find((tx: any) => tx.type === 'PVP_STEAL_DEBIT');

    assert.ok(attackerCredit, 'Attacker must have PVP_STEAL_CREDIT ledger entry');
    assert.ok(defenderDebit, 'Defender must have PVP_STEAL_DEBIT ledger entry');
    assert.equal(defenderDebit.amount, -res.cashTransferred);
  });

  // 2. Prank Mechanics (+25% plunder bonus)
  await t.test('2. Prank consumes 1 Energy, applies +25% plunder bonus (18.75% base rate)', async () => {
    await prisma.player.update({
      where: { id: p1Id },
      data: { energy: 10, cash: 1000, winStreak: 0 },
    });
    await prisma.player.update({
      where: { id: p2Id },
      data: { energy: 10, cash: 1000, pinnedUntil: null },
    });

    const res = await battleServiceWin.fight(p1Id, p2Id, 'prank');

    assert.equal(res.action, 'prank');
    assert.equal(res.combat.success, true);
    assert.equal(res.energySpent, 1);
    assert.equal(res.attackerEnergy, 9);
    // Prank plunder: 1000 * (0.15 * 1.25) = 187.5 => 187.5
    assert.equal(res.cashTransferred, 187.5);
  });

  // 3. Spy Mechanics (Stealth Infiltration Bounty + Intel Dossier)
  await t.test('3. Spy consumes 1 Energy, awards stealth bounty and returns full spy intel dossier', async () => {
    await prisma.player.update({
      where: { id: p1Id },
      data: { energy: 10, cash: 1000, winStreak: 2 },
    });
    await prisma.player.update({
      where: { id: p2Id },
      data: { energy: 10, cash: 1000, pinnedUntil: null },
    });

    const res = await battleServiceWin.fight(p1Id, p2Id, 'spy');

    assert.equal(res.action, 'spy');
    assert.equal(res.combat.success, true);
    assert.equal(res.energySpent, 1);
    assert.ok(res.spyCashBounty >= 50 && res.spyCashBounty <= 100);
    assert.equal(res.winStreak, 2, 'Spy should not modify win streak');

    // Verify spy intel dossier
    assert.ok(res.spyIntel);
    assert.equal(res.spyIntel.targetCash, 1000);
    assert.ok(res.spyIntel.power !== undefined);
    assert.ok(res.spyIntel.smartness !== undefined);
    assert.ok(res.spyIntel.fightWinProbability !== undefined);
    assert.ok(res.spyIntel.prankWinProbability !== undefined);
  });

  // 4. Insufficient Energy Rejection
  await t.test('4. Rejects battle actions when Energy < 1', async () => {
    await prisma.player.update({
      where: { id: p1Id },
      data: { energy: 0, lastEnergyUpdate: new Date() },
    });

    await assert.rejects(
      async () => {
        await battleServiceWin.fight(p1Id, p2Id, 'fight');
      },
      /Insufficient Energy/i
    );

    await assert.rejects(
      async () => {
        await battleServiceWin.fight(p1Id, p2Id, 'prank');
      },
      /Insufficient Energy/i
    );

    await assert.rejects(
      async () => {
        await battleServiceWin.fight(p1Id, p2Id, 'spy');
      },
      /Insufficient Energy/i
    );
  });

  // 5. Smart Lock Furniture Defense Mitigation
  await t.test('5. Smart Lock furniture on defender reduces plunder rate by 35%', async () => {
    // Equip Smart Lock on defender (p2)
    await prisma.player.update({
      where: { id: p2Id },
      data: { cash: 5000 },
    });
    await furnitureRepo.buyFurniture(p2Id, 'furn-lock');

    await prisma.player.update({
      where: { id: p1Id },
      data: { energy: 10, cash: 1000, winStreak: 0 },
    });
    await prisma.player.update({
      where: { id: p2Id },
      data: { energy: 10, cash: 1000, pinnedUntil: null },
    });

    const res = await battleServiceWin.fight(p1Id, p2Id, 'fight');

    // Base steal 15% * (1 - 0.35) = 9.75% of 1000 = 97.5
    assert.equal(res.hasSmartLockDefended, true);
    assert.equal(res.cashTransferred, 97.5);
  });

  // 6. Loss Mechanics & Streak Reset
  await t.test('6. Combat loss resets win streak, increments losses, and transfers $0 plunder', async () => {
    await prisma.player.update({
      where: { id: p1Id },
      data: { energy: 10, cash: 1000, winStreak: 5, totalPvPLosses: 0 },
    });
    await prisma.player.update({
      where: { id: p2Id },
      data: { energy: 10, cash: 1000, pinnedUntil: null, totalPvPWins: 0 },
    });

    const res = await battleServiceLoss.fight(p1Id, p2Id, 'fight');

    assert.equal(res.combat.success, false);
    assert.equal(res.cashTransferred, 0);
    assert.equal(res.winStreak, 0, 'Win streak must reset to 0 on defeat');

    const attacker = await playerService.get(p1Id);
    const defender = await playerService.get(p2Id);

    assert.equal(attacker.winStreak, 0);
    assert.equal(attacker.totalPvPLosses, 1);
    assert.equal(defender.totalPvPWins, 1);
  });

  // 7. Knockout & Infirmary Pinning (180s)
  await t.test('7. Decisive knockout pins defender in infirmary for 180s and blocks further attacks', async () => {
    await prisma.player.update({
      where: { id: p1Id },
      data: { energy: 10, cash: 1000, winStreak: 3 },
    });
    await prisma.player.update({
      where: { id: p2Id },
      data: { energy: 1, morale: 1, cash: 1000, pinnedUntil: null },
    });

    const res = await battleServiceWin.fight(p1Id, p2Id, 'fight');

    assert.equal(res.isKnockout, true);
    assert.equal(res.isDefenderPinned, true);
    assert.equal(res.knockoutBonus, 100);

    // Defender should now be pinned in DB
    const defender = await playerService.get(p2Id);
    assert.ok(defender.pinnedUntil);
    const pinnedTime = new Date(defender.pinnedUntil).getTime();
    assert.ok(pinnedTime > Date.now() + 100 * 1000);

    // Subsequent Fight or Prank against pinned defender must be rejected
    await assert.rejects(
      async () => {
        await battleServiceWin.fight(p1Id, p2Id, 'fight');
      },
      /recuperating in the campus infirmary/i
    );

    await assert.rejects(
      async () => {
        await battleServiceWin.fight(p1Id, p2Id, 'prank');
      },
      /recuperating in the campus infirmary/i
    );

    // Spy should STILL be allowed against pinned targets
    await prisma.player.update({ where: { id: p1Id }, data: { energy: 10 } });
    const spyRes = await battleServiceWin.fight(p1Id, p2Id, 'spy');
    assert.ok(spyRes.spyIntel);
  });

  // 8. Scouting Report
  await t.test('8. Scout endpoint calculates accurate combat odds, threat rating, and estimated plunder', async () => {
    const scout = await battleServiceWin.scout(p1Id, p2Id);

    assert.ok(scout.defender);
    assert.equal(scout.defender.id, p2Id);
    assert.ok(scout.combatAssessment);
    assert.ok(scout.combatAssessment.punchWinChance >= 0 && scout.combatAssessment.punchWinChance <= 100);
    assert.ok(scout.combatAssessment.faceOffWinChance >= 0 && scout.combatAssessment.faceOffWinChance <= 100);
    assert.ok(['EASY PREY', 'EVEN MATCH', 'HIGH RISK', 'APEX BOSS'].includes(scout.combatAssessment.threatRating));
  });

  // 9. Battle History Feed
  await t.test('9. Battle feed retrieves logged battles with attacker and defender opponent info', async () => {
    const feed = await battleServiceWin.getPlayerBattleFeed(p1Id);
    assert.ok(Array.isArray(feed));
    assert.ok(feed.length >= 1);

    const firstItem = feed[0];
    assert.ok(firstItem.id);
    assert.ok(firstItem.opponent);
    assert.ok(firstItem.opponent.username);
  });

  // 10. Bot PvP Support and Social Isolation
  await t.test('10. Canonical PvP bots are targetable in arena and excluded from social channels', async () => {
    const botId = 'rival-sam';
    await prisma.player.update({
      where: { id: botId },
      data: { pinnedUntil: null, cash: 1000 },
    });
    await prisma.player.update({
      where: { id: p1Id },
      data: { energy: 10 },
    });

    // 10a. Can fight bot
    const botFight = await battleServiceWin.fight(p1Id, botId, 'fight');
    assert.ok(botFight);
    assert.equal(botFight.defenderId, botId);

    // 10b. Can scout bot
    const botScout = await battleServiceWin.scout(p1Id, botId);
    assert.equal(botScout.defender.id, botId);

    // 10c. Bots excluded from social search
    const searchResults = await playerService.search('Freshman_Sam', p1Id);
    assert.equal(searchResults.length, 0);

    // 10d. Bot friend request rejected
    await assert.rejects(
      async () => {
        await playerService.sendFriendRequest(p1Id, 'Freshman_Sam');
      },
      /sparring bot/i
    );
  });

  // 11. Campus Leaderboards
  await t.test('11. Campus leaderboards return top plunderers, net worth, win streaks, and titans', async () => {
    const leaderboards = await battleServiceWin.getLeaderboards();
    assert.ok(Array.isArray(leaderboards.topPlunderers));
    assert.ok(Array.isArray(leaderboards.topNetWorth));
    assert.ok(Array.isArray(leaderboards.topStreaks));
    assert.ok(Array.isArray(leaderboards.topTitans));

    assert.ok(leaderboards.topPlunderers.length > 0);
    assert.ok(leaderboards.topNetWorth.length > 0);
  });

  // 12. PostgreSQL Persistence across service re-instantiation
  await t.test('12. Persistent PvP stats and battle history survive service re-instantiation', async () => {
    // Instantiate fresh service instance
    const freshBattleService = new DatabaseBattleService(
      prisma,
      combatWin,
      1,
      0.15
    );

    const freshFeed = await freshBattleService.getPlayerBattleFeed(p1Id);
    assert.ok(freshFeed.length >= 1);

    const p1 = await playerService.get(p1Id);
    assert.ok(p1.totalPvPWins >= 1);
    assert.ok(p1.totalPlundered > 0);
  });

  // 13. In-Memory Battle Repository Test
  await t.test('13. InMemoryBattleRepository provides isolated contract parity for unit testing', async () => {
    const memRepo = new InMemoryBattleRepository();
    memRepo.setOpponentInfo({ id: 'mem-1', username: 'MemAttacker' });
    memRepo.setOpponentInfo({ id: 'mem-2', username: 'MemDefender' });

    const battle = await memRepo.createBattle({
      attackerId: 'mem-1',
      defenderId: 'mem-2',
      action: 'FIGHT',
      success: true,
      cashStolen: 200,
    });

    assert.ok(battle.id);
    assert.equal(battle.cashStolen, 200);

    const feed = await memRepo.getBattleFeed('mem-1');
    assert.equal(feed.length, 1);
    assert.equal(feed[0].isAttacker, true);
    assert.equal(feed[0].won, true);
    assert.equal(feed[0].opponent?.username, 'MemDefender');

    const deleted = await memRepo.deleteTestRecords(['mem-1']);
    assert.equal(deleted, 1);
    const emptyFeed = await memRepo.getBattleFeed('mem-1');
    assert.equal(emptyFeed.length, 0);
  });
});

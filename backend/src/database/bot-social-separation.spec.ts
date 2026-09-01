import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaService } from './prisma.service';
import { DatabaseBattleService } from './database.battle.service';
import { DatabasePlayerService } from './database.player.service';
import { CombatService } from '../combat/combat.service';

test('Phase 7C: Bot / Social Separation Regression Suite', async (t) => {
  const prisma = new PrismaService();
  const combat = new CombatService({ minWinProbability: 0.1, maxWinProbability: 0.9 }, () => 0.0);
  const battleService = new DatabaseBattleService(prisma, combat, 1, 0.15);
  const playerService = new DatabasePlayerService(prisma);

  const realPlayerId1 = `real-alice-${Date.now()}`;
  const realPlayerId2 = `real-bob-${Date.now()}`;

  // Seed two real players
  await playerService.create({
    id: realPlayerId1,
    username: `Alice_${Date.now().toString().slice(-4)}`,
    email: `${realPlayerId1}@campus.edu`,
    passwordHash: 'hash123',
  });

  await playerService.create({
    id: realPlayerId2,
    username: `Bob_${Date.now().toString().slice(-4)}`,
    email: `${realPlayerId2}@campus.edu`,
    passwordHash: 'hash123',
  });

  // 1. Canonical Bot Count & Identities
  await t.test('1. Authoritative canonical bot count is exactly 5 and each has isBot: true', async () => {
    const allPlayers = await prisma.player.findMany();
    const bots = allPlayers.filter((p) => p.isBot === true);

    assert.equal(bots.length, 5, 'Must have exactly 5 canonical PvP bots');
    
    const botIds = bots.map((b) => b.id).sort();
    assert.deepEqual(botIds, [
      'rival-alex',
      'rival-chad',
      'rival-elliot',
      'rival-emma',
      'rival-sam',
    ]);

    for (const bot of bots) {
      assert.equal(bot.isBot, true, `Bot ${bot.id} must have isBot === true`);
    }

    // Verify retired bots do not exist
    const retiredChloe = allPlayers.find((p) => p.id === 'rival-chloe');
    const retiredTyler = allPlayers.find((p) => p.id === 'rival-tyler');
    assert.equal(retiredChloe, undefined, 'rival-chloe must be retired');
    assert.equal(retiredTyler, undefined, 'rival-tyler must be retired');
  });

  // 2. Real Player Flags
  await t.test('2. Real players are created with isBot: false', async () => {
    const alice = await playerService.get(realPlayerId1);
    const bob = await playerService.get(realPlayerId2);

    assert.equal(alice.isBot, false);
    assert.equal(bob.isBot, false);
  });

  // 3. Real Player List Exclusion
  await t.test('3. getRealPlayers() returns ONLY real players and never returns bots', async () => {
    const realPlayers = await playerService.getRealPlayers(realPlayerId1);
    
    assert.ok(realPlayers.length >= 1);
    for (const p of realPlayers) {
      assert.equal(p.isBot, false, `Player ${p.username} (${p.id}) in real player list must not be a bot`);
      assert.notEqual(p.id, realPlayerId1, 'Calling player should be excluded');
    }

    const hasAnyBot = realPlayers.some((p) => p.isBot || p.id.startsWith('rival-'));
    assert.equal(hasAnyBot, false, 'No bot may ever appear in real players list');
  });

  // 4. Social Search Exclusion
  await t.test('4. Social search excludes bots completely', async () => {
    // Search with empty query
    const resultsAll = await playerService.search('', realPlayerId1);
    for (const r of resultsAll) {
      assert.equal(r.isBot, false, `Search result ${r.username} must not be a bot`);
    }

    // Search explicitly for a bot's name
    const resultsBotSearch = await playerService.search('Chad_Varsity', realPlayerId1);
    assert.equal(resultsBotSearch.length, 0, 'Social search for bot username must return empty array');

    const resultsSamSearch = await playerService.search('Freshman_Sam', realPlayerId1);
    assert.equal(resultsSamSearch.length, 0, 'Social search for bot username must return empty array');
  });

  // 5. Backend Rejection: Friend Requests to Bots
  await t.test('5. Backend rejects friend requests targeted at bots', async () => {
    await assert.rejects(
      async () => {
        await playerService.sendFriendRequest(realPlayerId1, 'Chad_Varsity');
      },
      /sparring bot|real students/i,
      'Sending friend request to bot username must throw error'
    );
  });

  // 6. Backend Rejection: Direct Messages to Bots
  await t.test('6. Backend rejects direct messages targeted at bots', async () => {
    await assert.rejects(
      async () => {
        await playerService.sendMessage(realPlayerId1, 'rival-chad', 'Hey Chad, want to study?');
      },
      /Bots cannot receive private chat messages/i,
      'Sending message to bot ID must throw error'
    );
  });

  // 7. PvP Arena: Bots remain fully targetable for combat, pranks, and scouting
  await t.test('7. PvP Arena allows targeting bots for fight, prank, and scout', async () => {
    // Ensure test bots are not in infirmary from prior test runs
    await prisma.player.updateMany({
      where: { id: { in: ['rival-sam', 'rival-chad', 'rival-elliot'] } },
      data: { hospitalUntil: null, pinnedUntil: null },
    });

    // 7.1 Fight
    const fightRes = await battleService.fight(realPlayerId1, 'rival-sam', 'fight');
    assert.ok(fightRes);
    assert.equal(fightRes.action, 'fight');
    assert.equal(fightRes.defenderId, 'rival-sam');

    // 7.2 Prank
    const prankRes = await battleService.fight(realPlayerId1, 'rival-chad', 'prank');
    assert.ok(prankRes);
    assert.equal(prankRes.action, 'prank');
    assert.equal(prankRes.defenderId, 'rival-chad');

    // 7.3 Scout
    const scoutRes = await battleService.scout(realPlayerId1, 'rival-elliot');
    assert.ok(scoutRes);
    assert.equal(scoutRes.defender.id, 'rival-elliot');
    assert.ok(scoutRes.combatAssessment);
  });

  // 8. PvP Opponents Search includes both bots and players
  await t.test('8. searchPvPOpponents returns bots and players for battle arena', async () => {
    const pvpOpponents = await playerService.searchPvPOpponents('', realPlayerId1);
    const hasBots = pvpOpponents.some((p) => p.isBot === true);
    const hasPlayers = pvpOpponents.some((p) => p.isBot === false);

    assert.equal(hasBots, true, 'PvP opponents must include bots');
    assert.equal(hasPlayers, true, 'PvP opponents must include real players');
  });
});

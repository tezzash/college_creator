import test from 'node:test';
import assert from 'node:assert/strict';
import { getPrismaClient } from './prisma-client';
import { PrismaTowerRepository } from './repositories/prisma-tower.repository';
import { PrismaAlliesRepository } from './repositories/prisma-allies.repository';
import { PrismaFurnitureRepository } from './repositories/prisma-furniture.repository';
import { DatabaseTowerService } from './database.tower.service';
import { DatabaseAlliesService } from './database.allies.service';
import { DatabasePlayerService } from './database.player.service';
import { PrismaService } from './prisma.service';

test('Progression (Tower + Allies + Dorm Furniture) PostgreSQL Persistence Suite', async (t) => {
  const prisma = getPrismaClient();
  const towerRepo = new PrismaTowerRepository(() => prisma);
  const alliesRepo = new PrismaAlliesRepository(() => prisma);
  const furnitureRepo = new PrismaFurnitureRepository(() => prisma);

  const towerService = new DatabaseTowerService(towerRepo);
  const alliesService = new DatabaseAlliesService(alliesRepo);
  const playerService = new DatabasePlayerService(prisma as any, undefined, furnitureRepo);

  const createdPlayerIds: string[] = [];

  // Helper to create an isolated test player in PostgreSQL
  async function createTestPlayer(initialCash = 50000) {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const testId = `pg-prog-${uniqueSuffix}`;
    const testUsername = `ProgUser_${uniqueSuffix}`;
    const testEmail = `prog_${uniqueSuffix}@campus.edu`;

    const created = await prisma.player.create({
      data: {
        id: testId,
        username: testUsername,
        email: testEmail,
        passwordHash: 'scrypt$test$hash',
        cash: initialCash,
        bankCash: 0,
        energy: 10,
        power: 10,
        smartness: 10,
      },
    });

    createdPlayerIds.push(created.id);
    return {
      id: created.id,
      username: created.username,
      email: created.email,
      cash: Number(created.cash),
    };
  }

  // Teardown hook
  t.after(async () => {
    if (createdPlayerIds.length > 0) {
      await furnitureRepo.deleteTestRecords(createdPlayerIds).catch(() => {});
      await alliesRepo.deleteTestRecords(createdPlayerIds).catch(() => {});
      await towerRepo.deleteTestRecords(createdPlayerIds).catch(() => {});
      await prisma.player.deleteMany({
        where: { id: { in: createdPlayerIds } },
      }).catch(() => {});
    }
  });

  // ==========================================
  // SECTION 1: TOWER PERSISTENCE
  // ==========================================
  await t.test('1. Tower: Lists 8 suites and reflects initial locked state', async () => {
    const p = await createTestPlayer();
    const suites = await towerService.list(p.id);

    assert.equal(suites.length, 8, 'Tower must always present 8 suites');
    assert.equal(suites[0].roomNumber, 1);
    assert.equal(suites[0].unlockCost, 250);
    assert.equal(suites[0].unlocked, false);
    assert.equal(suites[7].roomNumber, 8);
    assert.equal(suites[7].unlockCost, 12000);
    assert.equal(suites[7].unlocked, false);
  });

  await t.test('2. Tower: Unlocks Suite 1 atomically and persists to PostgreSQL', async () => {
    const p = await createTestPlayer(1000);
    const unlockedRoom = await towerService.unlock(p.id, { roomNumber: 1 });

    assert.equal(unlockedRoom.roomNumber, 1);
    assert.equal(unlockedRoom.unlocked, true);
    assert.equal(unlockedRoom.unlockCost, 250);

    // Verify in database directly
    const dbRoom = await prisma.towerRoom.findUnique({
      where: { playerId_roomNumber: { playerId: p.id, roomNumber: 1 } },
    });
    assert.ok(dbRoom, 'Tower room row must exist in PostgreSQL');
    assert.equal(dbRoom?.unlocked, true);

    // Verify player cash deduction
    const updatedPlayer = await prisma.player.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(Number(updatedPlayer.cash), 750, 'Player cash should be reduced by $250');
  });

  await t.test('3. Tower: Prevents duplicate unlock and enforces cash check', async () => {
    const p = await createTestPlayer(300);
    await towerService.unlock(p.id, { roomNumber: 1 }); // costs 250, leaves 50

    // Duplicate unlock attempt
    await assert.rejects(
      async () => {
        await towerService.unlock(p.id, { roomNumber: 1 });
      },
      /already unlocked/i,
      'Must reject unlocking an already unlocked room'
    );

    // Insufficient cash attempt for Room 2 (costs 500, player has 50)
    await assert.rejects(
      async () => {
        await towerService.unlock(p.id, { roomNumber: 2 });
      },
      /insufficient cash/i,
      'Must reject unlock when player lacks funds'
    );
  });

  // ==========================================
  // SECTION 2: ALLIES PERSISTENCE
  // ==========================================
  await t.test('4. Allies: Lists static catalog from PostgreSQL service', async () => {
    const allies = await alliesService.listAllies();
    assert.ok(allies.length >= 9, 'Should have all 9 static catalog allies');

    const tutor = allies.find((a) => a.id === 'ally-tutor');
    assert.ok(tutor, 'Campus Tutor must exist');
    assert.equal(tutor?.hireCost, 250);
    assert.equal(tutor?.smartness, 4);

    const legend = allies.find((a) => a.id === 'ally-legend');
    assert.ok(legend, 'Campus Legend must exist');
    assert.equal(legend?.hireCost, 1800);
  });

  await t.test('5. Allies: Hires an ally into an unlocked suite with PostgreSQL persistence', async () => {
    const p = await createTestPlayer(5000);
    const room1 = await towerService.unlock(p.id, { roomNumber: 1 }); // cost 250

    const hireResult = await alliesService.hire(p.id, 'ally-tutor', room1.id);
    assert.equal(hireResult.occupant.allyId, 'ally-tutor');
    assert.equal(hireResult.occupant.level, 1);
    assert.equal(hireResult.occupant.totalInvested, 250);
    assert.equal(hireResult.ally.name, 'Campus Tutor');

    // Verify row in PostgreSQL
    const dbOccupant = await prisma.roomOccupant.findUnique({
      where: { towerRoomId: room1.id },
    });
    assert.ok(dbOccupant, 'RoomOccupant row must exist in PostgreSQL');
    assert.equal(dbOccupant?.allyId, 'ally-tutor');
    assert.equal(dbOccupant?.level, 1);
    assert.equal(Number(dbOccupant?.totalInvested), 250);

    // Verify player cash balance (5000 - 250 unlock - 250 hire = 4500)
    const updatedPlayer = await prisma.player.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(Number(updatedPlayer.cash), 4500);
  });

  await t.test('6. Allies: Prevents hiring duplicate ally or into locked/occupied rooms', async () => {
    const p = await createTestPlayer(10000);
    const room1 = await towerService.unlock(p.id, { roomNumber: 1 });
    const room2 = await towerService.unlock(p.id, { roomNumber: 2 });

    await alliesService.hire(p.id, 'ally-athlete', room1.id);

    // Cannot hire into already occupied room
    await assert.rejects(
      async () => {
        await alliesService.hire(p.id, 'ally-coder', room1.id);
      },
      /already occupied/i,
      'Must reject hiring into an occupied room'
    );

    // Cannot hire same ally twice across rooms
    await assert.rejects(
      async () => {
        await alliesService.hire(p.id, 'ally-athlete', room2.id);
      },
      /already hired/i,
      'Must reject hiring the same ally in multiple rooms'
    );
  });

  await t.test('7. Allies: Upgrades ally and updates level/invested amount in PostgreSQL', async () => {
    const p = await createTestPlayer(10000);
    const room1 = await towerService.unlock(p.id, { roomNumber: 1 });
    await alliesService.hire(p.id, 'ally-tutor', room1.id); // hireCost: 250

    // Upgrade to level 2 (ratio 1.5 -> cost Math.round(250 * 1.5) = 375)
    const upgradeRes = await alliesService.upgrade(p.id, room1.id);
    assert.equal(upgradeRes.previousLevel, 1);
    assert.equal(upgradeRes.newLevel, 2);
    assert.equal(upgradeRes.costPaid, 375);
    assert.equal(upgradeRes.occupant.totalInvested, 250 + 375);

    // Verify row in PostgreSQL
    const dbOccupant = await prisma.roomOccupant.findUniqueOrThrow({
      where: { towerRoomId: room1.id },
    });
    assert.equal(dbOccupant.level, 2);
    assert.equal(Number(dbOccupant.totalInvested), 625);
  });

  await t.test('8. Allies: Evicts ally with 50% refund and cleans up occupant record in PostgreSQL', async () => {
    const p = await createTestPlayer(10000);
    const room1 = await towerService.unlock(p.id, { roomNumber: 1 });
    await alliesService.hire(p.id, 'ally-tutor', room1.id); // cost 250
    await alliesService.upgrade(p.id, room1.id); // cost 375, total invested = 625

    const playerBeforeEvict = await prisma.player.findUniqueOrThrow({ where: { id: p.id } });
    const cashBefore = Number(playerBeforeEvict.cash);

    const evictRes = await alliesService.evict(p.id, room1.id);
    const expectedRefund = Math.floor(625 * 0.5); // 312
    assert.equal(evictRes.refundAmount, expectedRefund);

    // Verify occupant is deleted from PostgreSQL
    const dbOccupant = await prisma.roomOccupant.findUnique({
      where: { towerRoomId: room1.id },
    });
    assert.equal(dbOccupant, null, 'Occupant record must be deleted upon eviction');

    // Verify player received refund in PostgreSQL
    const playerAfterEvict = await prisma.player.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(Number(playerAfterEvict.cash), cashBefore + expectedRefund);

    // Room is now empty and can be re-hired
    const rehire = await alliesService.hire(p.id, 'ally-ra', room1.id);
    assert.equal(rehire.occupant.allyId, 'ally-ra');
  });

  // ==========================================
  // SECTION 3: DORM FURNITURE PERSISTENCE
  // ==========================================
  await t.test('9. Dorm Furniture: Lists catalog with ownership status from PostgreSQL', async () => {
    const p = await createTestPlayer();
    const furnitureList = await playerService.getDormFurniture(p.id);

    assert.equal(furnitureList.length, 4, 'Catalog must contain 4 dorm furniture upgrades');
    for (const item of furnitureList) {
      assert.equal(item.isOwned, false, 'Should not own any furniture initially');
      assert.equal(item.equippedAt, null);
    }
  });

  await t.test('10. Dorm Furniture: Purchases upgrade and stores in player_dorm_furniture table', async () => {
    const p = await createTestPlayer(10000);
    const buyResult = await playerService.buyDormFurniture(p.id, 'furn-espresso'); // cost 1500

    assert.equal(buyResult.furniture.id, 'furn-espresso');
    assert.equal(buyResult.furniture.isOwned, true);
    assert.ok(buyResult.furniture.equippedAt);

    // Check database directly
    const dbFurn = await prisma.playerDormFurniture.findUnique({
      where: { playerId_furnitureId: { playerId: p.id, furnitureId: 'furn-espresso' } },
    });
    assert.ok(dbFurn, 'player_dorm_furniture row must exist in PostgreSQL');
    assert.equal(dbFurn?.furnitureId, 'furn-espresso');

    // Cash check (10000 - 1500 = 8500)
    const updatedPlayer = await prisma.player.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(Number(updatedPlayer.cash), 8500);

    // Verify catalog now reports isOwned = true
    const catalog = await playerService.getDormFurniture(p.id);
    const espresso = catalog.find((f) => f.id === 'furn-espresso');
    assert.equal(espresso?.isOwned, true);
    assert.ok(espresso?.equippedAt);
  });

  await t.test('11. Dorm Furniture: Prevents duplicate purchase', async () => {
    const p = await createTestPlayer(10000);
    await playerService.buyDormFurniture(p.id, 'furn-lock');

    await assert.rejects(
      async () => {
        await playerService.buyDormFurniture(p.id, 'furn-lock');
      },
      /already own/i,
      'Must reject duplicate purchase of owned dorm upgrade'
    );
  });
});

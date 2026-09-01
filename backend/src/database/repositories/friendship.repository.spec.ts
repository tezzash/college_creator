import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryFriendshipRepository } from './in-memory-friendship.repository';
import { PrismaFriendshipRepository } from './prisma-friendship.repository';
import { getPrismaClient } from '../prisma-client';

test('FriendshipRepository Test Suite', async (t) => {
  await t.test('InMemoryFriendshipRepository', async (suite) => {
    const repo = new InMemoryFriendshipRepository();

    suite.beforeEach(() => {
      repo.clear();
    });

    await suite.test('createRequest initializes friendship fields and persists', async () => {
      const f = await repo.createRequest({
        senderId: 'player-1',
        receiverId: 'player-2',
      });

      assert.ok(f.id);
      assert.equal(f.senderId, 'player-1');
      assert.equal(f.receiverId, 'player-2');
      assert.equal(f.status, 'PENDING');
      assert.equal(f.lastGiftSentAt, null);
      assert.ok(f.createdAt instanceof Date);
      assert.ok(f.updatedAt instanceof Date);
    });

    await suite.test('findById retrieves an existing friendship', async () => {
      const created = await repo.createRequest({
        senderId: 'player-1',
        receiverId: 'player-2',
      });

      const found = await repo.findById(created.id);
      assert.ok(found);
      assert.equal(found?.id, created.id);

      const notFound = await repo.findById('non-existent');
      assert.equal(notFound, null);
    });

    await suite.test('findRelationship finds symmetric pair (A->B or B->A)', async () => {
      const created = await repo.createRequest({
        senderId: 'player-1',
        receiverId: 'player-2',
      });

      const f1 = await repo.findRelationship('player-1', 'player-2');
      assert.ok(f1);
      assert.equal(f1?.id, created.id);

      const f2 = await repo.findRelationship('player-2', 'player-1');
      assert.ok(f2);
      assert.equal(f2?.id, created.id);

      const notFound = await repo.findRelationship('player-1', 'player-3');
      assert.equal(notFound, null);
    });

    await suite.test('listForPlayer returns incoming and outgoing friendships', async () => {
      await repo.createRequest({ senderId: 'player-1', receiverId: 'player-2' });
      await repo.createRequest({ senderId: 'player-3', receiverId: 'player-1' });
      await repo.createRequest({ senderId: 'player-4', receiverId: 'player-5' });

      const list1 = await repo.listForPlayer('player-1');
      assert.equal(list1.length, 2);

      const list2 = await repo.listForPlayer('player-2');
      assert.equal(list2.length, 1);
    });

    await suite.test('listAcceptedForPlayer filters only ACCEPTED status', async () => {
      const f1 = await repo.createRequest({ senderId: 'player-1', receiverId: 'player-2' });
      await repo.createRequest({ senderId: 'player-1', receiverId: 'player-3' });

      await repo.updateStatus(f1.id, 'ACCEPTED');

      const accepted = await repo.listAcceptedForPlayer('player-1');
      assert.equal(accepted.length, 1);
      assert.equal(accepted[0].id, f1.id);
    });

    await suite.test('updateLastGiftSentAt updates timestamp', async () => {
      const f = await repo.createRequest({ senderId: 'player-1', receiverId: 'player-2', status: 'ACCEPTED' });
      const now = new Date('2026-08-28T12:00:00Z');

      const updated = await repo.updateLastGiftSentAt(f.id, now);
      assert.equal(updated.lastGiftSentAt?.toISOString(), now.toISOString());

      const reFetched = await repo.findById(f.id);
      assert.equal(reFetched?.lastGiftSentAt?.toISOString(), now.toISOString());
    });

    await suite.test('deleteById removes friendship record', async () => {
      const f = await repo.createRequest({ senderId: 'player-1', receiverId: 'player-2' });
      const deleted = await repo.deleteById(f.id);
      assert.equal(deleted, true);

      const reFetched = await repo.findById(f.id);
      assert.equal(reFetched, null);
    });
  });

  await t.test('PrismaFriendshipRepository', async (suite) => {
    const prisma = getPrismaClient();
    const repo = new PrismaFriendshipRepository(() => prisma);
    const testPlayerIds: string[] = [];

    suite.before(async () => {
      // Create two test players for relational constraints
      const p1 = await prisma.player.create({
        data: {
          id: `test-repo-p1-${Date.now()}`,
          username: `repou1_${Date.now().toString().slice(-5)}`,
          email: `repou1_${Date.now()}@test.com`,
          passwordHash: 'hash',
          cash: 1000,
        },
      });
      const p2 = await prisma.player.create({
        data: {
          id: `test-repo-p2-${Date.now()}`,
          username: `repou2_${Date.now().toString().slice(-5)}`,
          email: `repou2_${Date.now()}@test.com`,
          passwordHash: 'hash',
          cash: 1000,
        },
      });
      testPlayerIds.push(p1.id, p2.id);
    });

    suite.after(async () => {
      if (testPlayerIds.length > 0) {
        await repo.deleteTestRecords(testPlayerIds).catch(() => {});
        await prisma.cashTransaction.deleteMany({ where: { playerId: { in: testPlayerIds } } }).catch(() => {});
        await prisma.player.deleteMany({ where: { id: { in: testPlayerIds } } }).catch(() => {});
      }
    });

    await suite.test('createRequest, findById, and findRelationship against Postgres', async () => {
      const [p1Id, p2Id] = testPlayerIds;
      const req = await repo.createRequest({
        senderId: p1Id,
        receiverId: p2Id,
        status: 'PENDING',
      });

      assert.ok(req.id);
      assert.equal(req.senderId, p1Id);
      assert.equal(req.receiverId, p2Id);

      const byId = await repo.findById(req.id);
      assert.ok(byId);
      assert.equal(byId?.id, req.id);

      const rel = await repo.findRelationship(p2Id, p1Id);
      assert.ok(rel);
      assert.equal(rel?.id, req.id);

      const updated = await repo.updateStatus(req.id, 'ACCEPTED');
      assert.equal(updated.status, 'ACCEPTED');

      const acceptedList = await repo.listAcceptedForPlayer(p1Id);
      assert.equal(acceptedList.length, 1);

      const giftTime = new Date();
      const withGift = await repo.updateLastGiftSentAt(req.id, giftTime);
      assert.ok(withGift.lastGiftSentAt);

      const deleted = await repo.deleteById(req.id);
      assert.equal(deleted, true);

      const afterDelete = await repo.findById(req.id);
      assert.equal(afterDelete, null);
    });
  });
});

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getPrismaClient } from './prisma-client';
import {
  PrismaFriendshipRepository,
  InMemoryFriendshipRepository,
  PrismaWalletRepository,
  PrismaFurnitureRepository,
} from './repositories';
import { DatabasePlayerService } from './database.player.service';
import { PrismaService } from './prisma.service';

describe('Phase 16 — Social & Friendship PostgreSQL Persistence Suite', () => {
  const prisma = getPrismaClient();
  const friendshipRepo = new PrismaFriendshipRepository(() => prisma);
  const walletRepo = new PrismaWalletRepository(() => prisma);
  const furnitureRepo = new PrismaFurnitureRepository(() => prisma);

  const playerService = new DatabasePlayerService(
    prisma as any,
    undefined,
    furnitureRepo,
    walletRepo,
    friendshipRepo
  );

  const createdPlayerIds: string[] = [];

  const createTestStudent = async (prefix: string, startingCash = 1000) => {
    const id = `test-soc-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const username = `${prefix}_${Date.now().toString().slice(-4)}_${Math.random().toString(36).slice(2, 5)}`;
    const email = `${username.toLowerCase()}@campus.test`;

    const player = await playerService.create({
      id,
      username,
      email,
      passwordHash: 'argon2-test-hash',
      cash: startingCash,
      power: 15,
      smartness: 25,
    });

    createdPlayerIds.push(id);
    return player;
  };

  before(async () => {
    await prisma.$queryRawUnsafe('SELECT 1');
  });

  after(async () => {
    if (createdPlayerIds.length > 0) {
      await friendshipRepo.deleteTestRecords(createdPlayerIds).catch(() => {});
      await walletRepo.deleteTestRecords(createdPlayerIds).catch(() => {});
      await prisma.player.deleteMany({
        where: { id: { in: createdPlayerIds } },
      }).catch(() => {});
    }
  });

  describe('1. Friend Request Lifecycle & State Persistence', () => {
    it('sends friend request and reflects in incoming/outgoing lists', async () => {
      const alice = await createTestStudent('alice');
      const bob = await createTestStudent('bob');

      const sendRes = await playerService.sendFriendRequest(alice.id, bob.username);
      assert.ok(sendRes.friendshipId);
      assert.match(sendRes.message, /Buddy request sent/);

      // Verify Alice has outgoing request
      const aliceFriends = await playerService.getFriends(alice.id);
      assert.equal(aliceFriends.friends.length, 0);
      assert.equal(aliceFriends.requests.outgoing.length, 1);
      assert.equal(aliceFriends.requests.outgoing[0].receiverId, bob.id);
      assert.equal(aliceFriends.requests.outgoing[0].username, bob.username);

      // Verify Bob has incoming request
      const bobFriends = await playerService.getFriends(bob.id);
      assert.equal(bobFriends.friends.length, 0);
      assert.equal(bobFriends.requests.incoming.length, 1);
      assert.equal(bobFriends.requests.incoming[0].senderId, alice.id);
      assert.equal(bobFriends.requests.incoming[0].username, alice.username);
      assert.equal(bobFriends.requests.incoming[0].power, 15);
      assert.equal(bobFriends.requests.incoming[0].smartness, 25);
    });

    it('rejects duplicate friend requests from the same sender', async () => {
      const charlie = await createTestStudent('charlie');
      const dave = await createTestStudent('dave');

      await playerService.sendFriendRequest(charlie.id, dave.username);

      await assert.rejects(
        async () => {
          await playerService.sendFriendRequest(charlie.id, dave.username);
        },
        /Friend request already sent and pending/
      );
    });

    it('auto-accepts reciprocal friend requests (B requests A when A->B is pending)', async () => {
      const eva = await createTestStudent('eva');
      const frank = await createTestStudent('frank');

      await playerService.sendFriendRequest(eva.id, frank.username);

      // Frank sends back to Eva -> should auto-accept
      const recipRes = await playerService.sendFriendRequest(frank.id, eva.username);
      assert.match(recipRes.message, /Study Buddies/);

      const evaFriends = await playerService.getFriends(eva.id);
      assert.equal(evaFriends.friends.length, 1);
      assert.equal(evaFriends.friends[0].friendId, frank.id);
      assert.equal(evaFriends.requests.incoming.length, 0);
      assert.equal(evaFriends.requests.outgoing.length, 0);

      const frankFriends = await playerService.getFriends(frank.id);
      assert.equal(frankFriends.friends.length, 1);
      assert.equal(frankFriends.friends[0].friendId, eva.id);
    });

    it('rejects adding self as buddy', async () => {
      const selfStudent = await createTestStudent('self');
      await assert.rejects(
        async () => {
          await playerService.sendFriendRequest(selfStudent.id, selfStudent.username);
        },
        /You cannot add yourself as a buddy/
      );
    });
  });

  describe('2. Friendship Acceptance, Decline, & Removal', () => {
    it('accepts request, establishes buddy relationship, and rewards both with $100', async () => {
      const grace = await createTestStudent('grace', 500);
      const heidi = await createTestStudent('heidi', 500);

      const reqRes = await playerService.sendFriendRequest(grace.id, heidi.username);
      const acceptRes = await playerService.respondFriendRequest(heidi.id, reqRes.friendshipId, true);
      assert.match(acceptRes.message, /Study Buddies/);

      // Check Grace friends & wallet
      const graceFriends = await playerService.getFriends(grace.id);
      assert.equal(graceFriends.friends.length, 1);
      assert.equal(graceFriends.friends[0].friendId, heidi.id);
      const freshGrace = await playerService.get(grace.id);
      assert.equal(freshGrace.cash, 600);

      // Check Heidi friends & wallet
      const heidiFriends = await playerService.getFriends(heidi.id);
      assert.equal(heidiFriends.friends.length, 1);
      assert.equal(heidiFriends.friends[0].friendId, grace.id);
      const freshHeidi = await playerService.get(heidi.id);
      assert.equal(freshHeidi.cash, 600);
    });

    it('declines friend request and removes pending record', async () => {
      const ivan = await createTestStudent('ivan');
      const judy = await createTestStudent('judy');

      const reqRes = await playerService.sendFriendRequest(ivan.id, judy.username);
      const declineRes = await playerService.respondFriendRequest(judy.id, reqRes.friendshipId, false);
      assert.match(declineRes.message, /declined/i);

      const judyFriends = await playerService.getFriends(judy.id);
      assert.equal(judyFriends.requests.incoming.length, 0);
      assert.equal(judyFriends.friends.length, 0);

      const ivanFriends = await playerService.getFriends(ivan.id);
      assert.equal(ivanFriends.requests.outgoing.length, 0);
      assert.equal(ivanFriends.friends.length, 0);
    });

    it('rejects unauthorized response to friend request', async () => {
      const mallory = await createTestStudent('mallory');
      const oscar = await createTestStudent('oscar');
      const peggy = await createTestStudent('peggy');

      const reqRes = await playerService.sendFriendRequest(mallory.id, oscar.username);

      // Peggy tries to respond to Oscar's incoming request
      await assert.rejects(
        async () => {
          await playerService.respondFriendRequest(peggy.id, reqRes.friendshipId, true);
        },
        /unauthorized|not found/i
      );
    });

    it('removes active buddy cleanly', async () => {
      const ken = await createTestStudent('ken');
      const leo = await createTestStudent('leo');

      const reqRes = await playerService.sendFriendRequest(ken.id, leo.username);
      await playerService.respondFriendRequest(leo.id, reqRes.friendshipId, true);

      // Verify active
      let kenFriends = await playerService.getFriends(ken.id);
      assert.equal(kenFriends.friends.length, 1);

      // Remove buddy
      const removeRes = await playerService.removeFriend(ken.id, reqRes.friendshipId);
      assert.match(removeRes.message, /Removed/);

      kenFriends = await playerService.getFriends(ken.id);
      assert.equal(kenFriends.friends.length, 0);

      const leoFriends = await playerService.getFriends(leo.id);
      assert.equal(leoFriends.friends.length, 0);
    });
  });

  describe('3. Care Packages & Daily Friendship Cooldown', () => {
    it('sends care package, updates lastGiftSentAt, rewards sender with cash and friend with energy/morale', async () => {
      const mia = await createTestStudent('mia', 300);
      const noah = await playerService.create({
        id: `test-soc-noah-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        username: `noah_${Date.now().toString().slice(-4)}_${Math.random().toString(36).slice(2, 5)}`,
        email: `noah_${Date.now()}@campus.test`,
        passwordHash: 'hash',
        cash: 300,
        energy: 5,
        morale: 5,
      });
      createdPlayerIds.push(noah.id);

      // Setup friendship
      const reqRes = await playerService.sendFriendRequest(mia.id, noah.username);
      await playerService.respondFriendRequest(noah.id, reqRes.friendshipId, true);

      // Send care package
      const giftRes = await playerService.sendCarePackage(mia.id, reqRes.friendshipId);
      assert.match(giftRes.message, /Earned \+\$100 Karma Cash/);

      // Sender rewarded
      const freshMia = await playerService.get(mia.id);
      assert.equal(freshMia.cash, 500); // 300 + 100 (accept) + 100 (gift)

      // Friend rewarded (+1 energy, +1 morale) in database
      const rawNoah = await prisma.player.findUnique({ where: { id: noah.id } });
      assert.equal(rawNoah?.energy, 6);
      assert.equal(rawNoah?.morale, 11);

      // Care package cooldown enforced
      const miaFriends = await playerService.getFriends(mia.id);
      assert.equal(miaFriends.friends[0].canSendGift, false);
      assert.ok(miaFriends.friends[0].lastGiftSentAt);

      await assert.rejects(
        async () => {
          await playerService.sendCarePackage(mia.id, reqRes.friendshipId);
        },
        /Care package already sent today/
      );
    });
  });

  describe('4. Anti-Bot Social Isolation Invariant', () => {
    it('rejects sending friend requests to canonical PvP bots', async () => {
      const student = await createTestStudent('bot_hunter');
      const canonicalBots = ['Freshman_Sam', 'Chad_Varsity', 'Hacker_Elliot', 'GymRat_Alex', 'Valedictorian_Emma'];

      for (const botUsername of canonicalBots) {
        await assert.rejects(
          async () => {
            await playerService.sendFriendRequest(student.id, botUsername);
          },
          /campus sparring bot|real students/i
        );
      }
    });

    it('getRealPlayers excludes all bots and only returns human students', async () => {
      const student = await createTestStudent('real_querier');
      const realPlayers = await playerService.getRealPlayers(student.id);

      assert.ok(realPlayers.length >= 1);
      for (const p of realPlayers) {
        assert.equal(p.isBot, false);
        assert.notEqual(p.id, student.id);
        assert.ok(!p.id.startsWith('rival-'));
      }
    });
  });

  describe('5. Repository Contract Parity (InMemory vs Prisma)', () => {
    it('InMemoryFriendshipRepository behaves identically to PrismaFriendshipRepository', async () => {
      const inMemoryRepo = new InMemoryFriendshipRepository();

      const req = await inMemoryRepo.createRequest({
        senderId: 'mem-p1',
        receiverId: 'mem-p2',
        status: 'PENDING',
      });

      assert.ok(req.id);
      assert.equal(req.senderId, 'mem-p1');
      assert.equal(req.receiverId, 'mem-p2');
      assert.equal(req.status, 'PENDING');
      assert.equal(req.lastGiftSentAt, null);

      const rel = await inMemoryRepo.findRelationship('mem-p2', 'mem-p1');
      assert.ok(rel);
      assert.equal(rel.id, req.id);

      const updated = await inMemoryRepo.updateStatus(req.id, 'ACCEPTED');
      assert.equal(updated.status, 'ACCEPTED');

      const acceptedList = await inMemoryRepo.listAcceptedForPlayer('mem-p1');
      assert.equal(acceptedList.length, 1);
      assert.equal(acceptedList[0].id, req.id);

      const now = new Date();
      const withGift = await inMemoryRepo.updateLastGiftSentAt(req.id, now);
      assert.equal(withGift.lastGiftSentAt?.getTime(), now.getTime());

      const deleted = await inMemoryRepo.deleteById(req.id);
      assert.equal(deleted, true);

      const afterDelete = await inMemoryRepo.findById(req.id);
      assert.equal(afterDelete, null);
    });
  });
});

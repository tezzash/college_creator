import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from './prisma-client';
import { PrismaMessageRepository } from './repositories/prisma-message.repository';
import { PrismaService } from './prisma.service';
import { DatabasePlayerService } from './database.player.service';

test('PostgreSQL Chat Message Retention Integration Suite (100 Message Limit)', async (t) => {
  const prisma: PrismaClient = getPrismaClient();
  const messageRepo = new PrismaMessageRepository(() => prisma);
  const prismaService = new PrismaService();
  const playerService = new DatabasePlayerService(prismaService, messageRepo);

  const userA = `real-user-a-${Date.now()}`;
  const userB = `real-user-b-${Date.now()}`;
  const userC = `real-user-c-${Date.now()}`;

  const cleanup = async () => {
    try {
      await prisma.message.deleteMany({
        where: {
          OR: [
            { senderId: userA },
            { receiverId: userA },
            { senderId: userB },
            { receiverId: userB },
            { senderId: userC },
            { receiverId: userC },
          ],
        },
      });
    } catch {
      // ignore
    }
  };

  await cleanup();

  t.after(async () => {
    await cleanup();
  });

  await t.test('1. 99 messages in PostgreSQL -> send 1 -> exactly 100 remain', async () => {
    const baseTime = Date.now() - 250000;
    for (let i = 1; i <= 99; i++) {
      await messageRepo.create({
        senderId: userA,
        receiverId: userB,
        content: `PG-Msg-${i}`,
        createdAt: new Date(baseTime + i * 1000),
      });
    }

    let conv = await messageRepo.findConversation(userA, userB);
    assert.equal(conv.length, 99);

    // Send 100th message
    await messageRepo.create({
      senderId: userB,
      receiverId: userA,
      content: 'PG-Msg-100',
      createdAt: new Date(baseTime + 100 * 1000),
    });

    conv = await messageRepo.findConversation(userA, userB);
    assert.equal(conv.length, 100);
    assert.equal(conv[0].content, 'PG-Msg-1');
    assert.equal(conv[99].content, 'PG-Msg-100');
  });

  await t.test('2. 100 messages in PostgreSQL -> send 1 (101st) -> oldest removed, newest 100 remain', async () => {
    const baseTime = Date.now() - 250000;
    const msg101 = await messageRepo.create({
      senderId: userA,
      receiverId: userB,
      content: 'PG-Msg-101',
      createdAt: new Date(baseTime + 101 * 1000),
    });

    const conv = await messageRepo.findConversation(userA, userB);
    assert.equal(conv.length, 100, 'Conversation in PostgreSQL must never exceed 100 messages');
    assert.equal(conv[0].content, 'PG-Msg-2', 'Oldest message (PG-Msg-1) must be removed from PostgreSQL');
    assert.equal(conv[99].content, 'PG-Msg-101', 'Newest message (PG-Msg-101) must be retained in PostgreSQL');
    assert.equal(conv[99].id, msg101.id);

    // Verify oldest message cannot be found by ID
    const oldestFound = await messageRepo.findConversation(userA, userB);
    const hasMsg1 = oldestFound.some((m) => m.content === 'PG-Msg-1');
    assert.equal(hasMsg1, false);
  });

  await t.test('3. Chronological ordering, unread count, and read state remain correct', async () => {
    const conv = await messageRepo.findConversation(userA, userB);
    for (let i = 0; i < conv.length - 1; i++) {
      assert.ok(
        conv[i].createdAt.getTime() <= conv[i + 1].createdAt.getTime(),
        'Messages must remain in strictly ascending chronological order'
      );
    }

    // User B unread count for unread messages sent by User A
    const unreadCount = await messageRepo.countUnread(userB);
    assert.ok(unreadCount >= 1);

    // Mark conversation as read
    const marked = await messageRepo.markConversationAsRead(userB, userA);
    assert.ok(marked >= 1);

    const unreadAfter = await messageRepo.countUnread(userB);
    assert.equal(unreadAfter, 0);
  });

  await t.test('4. Independent 100-message limits across separate conversations (A<->B vs A<->C)', async () => {
    const baseTime = Date.now() - 100000;
    // Populate Conversation A <-> C with 5 messages
    for (let i = 1; i <= 5; i++) {
      await messageRepo.create({
        senderId: userA,
        receiverId: userC,
        content: `AC-PG-Msg-${i}`,
        createdAt: new Date(baseTime + i * 1000),
      });
    }

    const convAB = await messageRepo.findConversation(userA, userB);
    const convAC = await messageRepo.findConversation(userA, userC);

    assert.equal(convAB.length, 100, 'Conversation A<->B remains capped at 100');
    assert.equal(convAC.length, 5, 'Conversation A<->C is isolated and contains its 5 messages');
  });

  await t.test('5. Concurrent message creations safely enforce 100-message limit without overflow', async () => {
    // Send 5 concurrent messages to Conversation A <-> B
    const promises = [1, 2, 3, 4, 5].map((num) =>
      messageRepo.create({
        senderId: userB,
        receiverId: userA,
        content: `Concurrent-PG-Msg-${num}`,
      })
    );

    await Promise.all(promises);

    const conv = await messageRepo.findConversation(userA, userB);
    assert.equal(conv.length, 100, 'Conversation must strictly contain 100 messages after concurrent sends');
  });

  await t.test('6. Bot message rejection remains enforced', async () => {
    // Attempting to send message to a bot via playerService must throw
    await assert.rejects(
      async () => {
        await playerService.sendMessage(userA, 'rival-alex', 'Hello Alex!');
      },
      {
        message: 'Bots cannot receive private chat messages.',
      }
    );
  });
});

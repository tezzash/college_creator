import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryMessageRepository } from './in-memory-message.repository';
import { PrismaMessageRepository } from './prisma-message.repository';
import { MAX_CONVERSATION_MESSAGES } from './message.repository.interface';

test('MessageRepository Test Suite', async (t) => {
  await t.test('InMemoryMessageRepository', async (suite) => {
    const repo = new InMemoryMessageRepository();

    suite.beforeEach(() => {
      repo.clear();
    });

    await suite.test('create initializes default message fields and persists', async () => {
      const msg = await repo.create({
        senderId: 'player-1',
        receiverId: 'player-2',
        content: 'Hey buddy, ready for the exam?',
      });

      assert.ok(msg.id);
      assert.equal(msg.senderId, 'player-1');
      assert.equal(msg.receiverId, 'player-2');
      assert.equal(msg.content, 'Hey buddy, ready for the exam?');
      assert.equal(msg.isRead, false);
      assert.equal(msg.readAt, null);
      assert.ok(msg.createdAt instanceof Date);
    });

    await suite.test('findConversation retrieves messages in chronological order', async () => {
      const t1 = new Date('2026-08-26T10:00:00Z');
      const t2 = new Date('2026-08-26T10:05:00Z');
      const t3 = new Date('2026-08-26T10:10:00Z');

      await repo.create({
        senderId: 'player-1',
        receiverId: 'player-2',
        content: 'Msg 1',
        createdAt: t1,
      });

      await repo.create({
        senderId: 'player-2',
        receiverId: 'player-1',
        content: 'Msg 2',
        createdAt: t2,
      });

      await repo.create({
        senderId: 'player-1',
        receiverId: 'player-3', // Different conversation
        content: 'Msg 3 to player 3',
        createdAt: t3,
      });

      const conversation = await repo.findConversation('player-1', 'player-2');
      assert.equal(conversation.length, 2);
      assert.equal(conversation[0].content, 'Msg 1');
      assert.equal(conversation[1].content, 'Msg 2');
    });

    await suite.test('markConversationAsRead and countUnread', async () => {
      await repo.create({
        senderId: 'partner-1',
        receiverId: 'me-1',
        content: 'Unread 1',
      });

      await repo.create({
        senderId: 'partner-1',
        receiverId: 'me-1',
        content: 'Unread 2',
      });

      await repo.create({
        senderId: 'me-1',
        receiverId: 'partner-1',
        content: 'My own msg',
      });

      assert.equal(await repo.countUnread('me-1'), 2);

      const marked = await repo.markConversationAsRead('me-1', 'partner-1');
      assert.equal(marked, 2);
      assert.equal(await repo.countUnread('me-1'), 0);

      const conv = await repo.findConversation('me-1', 'partner-1');
      assert.equal(conv.filter((m) => m.senderId === 'partner-1' && m.isRead).length, 2);
    });

    await suite.test('findUserMessages retrieves all conversations for player', async () => {
      await repo.create({ senderId: 'p1', receiverId: 'p2', content: 'hello' });
      await repo.create({ senderId: 'p3', receiverId: 'p1', content: 'world' });
      await repo.create({ senderId: 'p4', receiverId: 'p5', content: 'unrelated' });

      const userMessages = await repo.findUserMessages('p1');
      assert.equal(userMessages.length, 2);
    });

    await suite.test('deleteById removes individual message', async () => {
      const msg = await repo.create({ senderId: 'p1', receiverId: 'p2', content: 'temp' });
      assert.ok(await repo.findById(msg.id));

      const deleted = await repo.deleteById(msg.id);
      assert.equal(deleted, true);
      assert.equal(await repo.findById(msg.id), null);
    });

    await suite.test('Phase 9C: 99 messages -> send 1 -> 100 remain', async () => {
      const baseTime = Date.now() - 200000;
      for (let i = 1; i <= 99; i++) {
        await repo.create({
          senderId: 'user-a',
          receiverId: 'user-b',
          content: `Message ${i}`,
          createdAt: new Date(baseTime + i * 1000),
        });
      }

      let conv = await repo.findConversation('user-a', 'user-b');
      assert.equal(conv.length, 99);

      // Send 100th message
      await repo.create({
        senderId: 'user-b',
        receiverId: 'user-a',
        content: 'Message 100',
        createdAt: new Date(baseTime + 100 * 1000),
      });

      conv = await repo.findConversation('user-a', 'user-b');
      assert.equal(conv.length, 100);
      assert.equal(conv[0].content, 'Message 1');
      assert.equal(conv[99].content, 'Message 100');
    });

    await suite.test('Phase 9C: 100 messages -> send 1 (101st) -> oldest removed, newest 100 remain', async () => {
      const baseTime = Date.now() - 300000;
      for (let i = 1; i <= 100; i++) {
        await repo.create({
          senderId: 'user-a',
          receiverId: 'user-b',
          content: `Message ${i}`,
          createdAt: new Date(baseTime + i * 1000),
        });
      }

      let conv = await repo.findConversation('user-a', 'user-b');
      assert.equal(conv.length, 100);
      assert.equal(conv[0].content, 'Message 1');
      assert.equal(conv[99].content, 'Message 100');

      // Send 101st message
      const msg101 = await repo.create({
        senderId: 'user-a',
        receiverId: 'user-b',
        content: 'Message 101',
        createdAt: new Date(baseTime + 101 * 1000),
      });

      conv = await repo.findConversation('user-a', 'user-b');
      assert.equal(conv.length, 100, 'Conversation must strictly contain 100 messages');
      assert.equal(conv[0].content, 'Message 2', 'Oldest message (Message 1) must be removed');
      assert.equal(conv[99].content, 'Message 101', 'Newest message (Message 101) must be preserved');
      assert.equal(conv[99].id, msg101.id);

      // Verify chronological ordering
      for (let i = 0; i < conv.length - 1; i++) {
        assert.ok(conv[i].createdAt.getTime() <= conv[i + 1].createdAt.getTime());
      }
    });

    await suite.test('Phase 9C: Independent 100-message limits across multiple conversations', async () => {
      const baseTime = Date.now() - 500000;
      // Populate Conversation A <-> B with 100 messages
      for (let i = 1; i <= 100; i++) {
        await repo.create({
          senderId: 'user-a',
          receiverId: 'user-b',
          content: `AB-${i}`,
          createdAt: new Date(baseTime + i * 1000),
        });
      }

      // Populate Conversation A <-> C with 50 messages
      for (let i = 1; i <= 50; i++) {
        await repo.create({
          senderId: 'user-a',
          receiverId: 'user-c',
          content: `AC-${i}`,
          createdAt: new Date(baseTime + i * 1000),
        });
      }

      // Add 101st message to A <-> B
      await repo.create({
        senderId: 'user-b',
        receiverId: 'user-a',
        content: 'AB-101',
        createdAt: new Date(baseTime + 101 * 1000),
      });

      const convAB = await repo.findConversation('user-a', 'user-b');
      const convAC = await repo.findConversation('user-a', 'user-c');

      assert.equal(convAB.length, 100);
      assert.equal(convAB[0].content, 'AB-2');
      assert.equal(convAB[99].content, 'AB-101');

      assert.equal(convAC.length, 50);
      assert.equal(convAC[0].content, 'AC-1');
      assert.equal(convAC[49].content, 'AC-50');
    });
  });

  await t.test('PrismaMessageRepository with mock PrismaClient delegate', async () => {
    const mockStore = new Map<string, any>();
    const mockPrisma = {
      $transaction: async (fn: any) => fn(mockPrisma),
      message: {
        create: async ({ data }: any) => {
          const id = data.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const row = {
            id,
            senderId: data.senderId,
            receiverId: data.receiverId,
            content: data.content,
            isRead: data.isRead ?? false,
            readAt: data.readAt || null,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          };
          mockStore.set(id, row);
          return row;
        },
        findUnique: async ({ where }: any) => {
          return mockStore.get(where.id) || null;
        },
        findMany: async ({ where, orderBy, skip, select }: any) => {
          let list = Array.from(mockStore.values());
          if (where?.OR) {
            list = list.filter((m) =>
              where.OR.some((cond: any) => {
                if (cond.senderId && m.senderId !== cond.senderId) return false;
                if (cond.receiverId && m.receiverId !== cond.receiverId) return false;
                return true;
              })
            );
          }
          if (orderBy) {
            list.sort((a, b) => {
              for (const sortItem of Array.isArray(orderBy) ? orderBy : [orderBy]) {
                const field = Object.keys(sortItem)[0];
                const dir = sortItem[field];
                const valA = a[field] instanceof Date ? a[field].getTime() : a[field];
                const valB = b[field] instanceof Date ? b[field].getTime() : b[field];
                if (valA !== valB) {
                  return dir === 'desc' ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
                }
              }
              return 0;
            });
          }
          if (skip && skip > 0) {
            list = list.slice(skip);
          }
          if (select) {
            return list.map((item) => {
              const res: any = {};
              for (const k of Object.keys(select)) {
                res[k] = item[k];
              }
              return res;
            });
          }
          return list;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const m of mockStore.values()) {
            if (where.senderId && m.senderId !== where.senderId) continue;
            if (where.receiverId && m.receiverId !== where.receiverId) continue;
            if (where.isRead !== undefined && m.isRead !== where.isRead) continue;
            Object.assign(m, data);
            count++;
          }
          return { count };
        },
        count: async ({ where }: any) => {
          let count = 0;
          for (const m of mockStore.values()) {
            if (where?.OR) {
              const matched = where.OR.some((cond: any) => {
                if (cond.senderId && m.senderId !== cond.senderId) return false;
                if (cond.receiverId && m.receiverId !== cond.receiverId) return false;
                return true;
              });
              if (!matched) continue;
            }
            if (where.receiverId && m.receiverId !== where.receiverId) continue;
            if (where.isRead !== undefined && m.isRead !== where.isRead) continue;
            count++;
          }
          return count;
        },
        delete: async ({ where }: any) => {
          if (!mockStore.has(where.id)) throw new Error('Not found');
          mockStore.delete(where.id);
          return { id: where.id };
        },
        deleteMany: async ({ where }: any) => {
          let count = 0;
          if (where?.id?.in) {
            for (const id of where.id.in) {
              if (mockStore.delete(id)) count++;
            }
          }
          return { count };
        },
      },
    };

    const prismaRepo = new PrismaMessageRepository(() => mockPrisma as any);

    const created = await prismaRepo.create({
      senderId: 'userA',
      receiverId: 'userB',
      content: 'Testing Prisma repo abstraction',
    });

    assert.equal(created.senderId, 'userA');
    assert.equal(created.receiverId, 'userB');
    assert.equal(created.content, 'Testing Prisma repo abstraction');

    const found = await prismaRepo.findById(created.id);
    assert.ok(found);
    assert.equal(found.id, created.id);

    const conv = await prismaRepo.findConversation('userA', 'userB');
    assert.equal(conv.length, 1);

    const unread = await prismaRepo.countUnread('userB');
    assert.equal(unread, 1);

    const updatedCount = await prismaRepo.markConversationAsRead('userB', 'userA');
    assert.equal(updatedCount, 1);

    const unreadAfter = await prismaRepo.countUnread('userB');
    assert.equal(unreadAfter, 0);

    const deleted = await prismaRepo.deleteById(created.id);
    assert.equal(deleted, true);

    // Test 100-message limit with Prisma mock
    mockStore.clear();
    const baseTime = Date.now() - 300000;
    for (let i = 1; i <= 100; i++) {
      await prismaRepo.create({
        senderId: 'userX',
        receiverId: 'userY',
        content: `Msg ${i}`,
        createdAt: new Date(baseTime + i * 1000),
      });
    }

    const conv100 = await prismaRepo.findConversation('userX', 'userY');
    assert.equal(conv100.length, 100);
    assert.equal(conv100[0].content, 'Msg 1');
    assert.equal(conv100[99].content, 'Msg 100');

    // 101st message
    await prismaRepo.create({
      senderId: 'userY',
      receiverId: 'userX',
      content: 'Msg 101',
      createdAt: new Date(baseTime + 101 * 1000),
    });

    const convAfter101 = await prismaRepo.findConversation('userX', 'userY');
    assert.equal(convAfter101.length, 100);
    assert.equal(convAfter101[0].content, 'Msg 2', 'Oldest message removed in Prisma repository');
    assert.equal(convAfter101[99].content, 'Msg 101', 'Newest message retained in Prisma repository');
  });
});


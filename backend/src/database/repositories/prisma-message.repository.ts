import { PrismaClient, Message as PrismaMessageModel } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import {
  CreateMessageInput,
  MAX_CONVERSATION_MESSAGES,
  MessageEntity,
  MessageRepository,
} from './message.repository.interface';

export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly prismaProvider: () => PrismaClient | any = () => getPrismaClient()) {}

  private get prisma(): PrismaClient | any {
    return this.prismaProvider();
  }

  private mapPrismaToEntity(row: PrismaMessageModel | any): MessageEntity {
    return {
      id: row.id,
      senderId: row.senderId,
      receiverId: row.receiverId,
      content: row.content,
      isRead: Boolean(row.isRead),
      readAt: row.readAt ? new Date(row.readAt) : null,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
    };
  }

  async create(input: CreateMessageInput): Promise<MessageEntity> {
    const executeInTx = async (tx: any) => {
      // 0. Serialize concurrent operations for this specific 1-to-1 conversation
      const conversationKey = [input.senderId, input.receiverId].sort().join(':');
      if (typeof tx.$executeRaw === 'function') {
        try {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${conversationKey}))`;
        } catch {
          // If unsupported (e.g. SQLite/mock), continue gracefully
        }
      }

      // 1. Create the new message
      const created = await tx.message.create({
        data: {
          ...(input.id ? { id: input.id } : {}),
          senderId: input.senderId,
          receiverId: input.receiverId,
          content: input.content.trim(),
          isRead: Boolean(input.isRead ?? false),
          readAt: input.readAt ? new Date(input.readAt) : null,
          ...(input.createdAt ? { createdAt: new Date(input.createdAt) } : {}),
        },
      });

      // 2. Enforce 100-message conversation limit
      const conversationWhere = {
        OR: [
          { senderId: input.senderId, receiverId: input.receiverId },
          { senderId: input.receiverId, receiverId: input.senderId },
        ],
      };

      const totalCount = await tx.message.count({
        where: conversationWhere,
      });

      if (totalCount > MAX_CONVERSATION_MESSAGES) {
        // Skip newest 100 messages and select older excess message IDs
        const excessMessages = await tx.message.findMany({
          where: conversationWhere,
          orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
          skip: MAX_CONVERSATION_MESSAGES,
          select: { id: true },
        });

        if (excessMessages && excessMessages.length > 0) {
          const idsToDelete = excessMessages.map((m: any) => m.id);
          await tx.message.deleteMany({
            where: {
              id: { in: idsToDelete },
            },
          });
        }
      }

      return created;
    };

    let result;
    if (typeof this.prisma.$transaction === 'function') {
      result = await this.prisma.$transaction(executeInTx);
    } else {
      result = await executeInTx(this.prisma);
    }

    return this.mapPrismaToEntity(result);
  }

  async findById(id: string): Promise<MessageEntity | null> {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });
    return message ? this.mapPrismaToEntity(message) : null;
  }

  async findConversation(playerId: string, partnerId: string): Promise<MessageEntity[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: playerId, receiverId: partnerId },
          { senderId: partnerId, receiverId: playerId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((m: any) => this.mapPrismaToEntity(m));
  }

  async findUserMessages(playerId: string): Promise<MessageEntity[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: playerId },
          { receiverId: playerId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((m: any) => this.mapPrismaToEntity(m));
  }

  async markConversationAsRead(receiverId: string, senderId: string): Promise<number> {
    const res = await this.prisma.message.updateMany({
      where: {
        senderId,
        receiverId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return res.count ?? 0;
  }

  async countUnread(receiverId: string): Promise<number> {
    const count = await this.prisma.message.count({
      where: {
        receiverId,
        isRead: false,
      },
    });
    return count;
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      await this.prisma.message.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}

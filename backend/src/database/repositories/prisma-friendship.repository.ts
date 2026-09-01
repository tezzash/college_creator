import { getPrismaClient } from '../prisma-client';
import {
  CreateFriendshipInput,
  FriendshipEntity,
  FriendshipRepository,
  FriendshipStatus,
  PendingRequestsResult,
} from './friendship.repository.interface';

const PLAYER_PROFILE_SELECT = {
  id: true,
  username: true,
  power: true,
  smartness: true,
  equippedTitle: true,
  avatarId: true,
  avatarAura: true,
  avatarFrame: true,
  avatarOutfit: true,
  avatarAccessory: true,
  isBot: true,
};

export class PrismaFriendshipRepository implements FriendshipRepository {
  private readonly getPrisma: () => any;

  constructor(prismaProvider?: () => any) {
    this.getPrisma = prismaProvider || (() => getPrismaClient());
  }

  private get prisma() {
    return this.getPrisma();
  }

  private toEntity(row: any): FriendshipEntity {
    return {
      id: row.id,
      senderId: row.senderId,
      receiverId: row.receiverId,
      status: row.status as FriendshipStatus,
      lastGiftSentAt: row.lastGiftSentAt ? (row.lastGiftSentAt instanceof Date ? row.lastGiftSentAt : new Date(row.lastGiftSentAt)) : null,
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
      sender: row.sender
        ? {
            id: row.sender.id,
            username: row.sender.username,
            power: row.sender.power ?? 0,
            smartness: row.sender.smartness ?? 0,
            equippedTitle: row.sender.equippedTitle,
            avatarId: row.sender.avatarId,
            avatarAura: row.sender.avatarAura,
            avatarFrame: row.sender.avatarFrame,
            avatarOutfit: row.sender.avatarOutfit,
            avatarAccessory: row.sender.avatarAccessory,
            isBot: row.sender.isBot ?? false,
          }
        : undefined,
      receiver: row.receiver
        ? {
            id: row.receiver.id,
            username: row.receiver.username,
            power: row.receiver.power ?? 0,
            smartness: row.receiver.smartness ?? 0,
            equippedTitle: row.receiver.equippedTitle,
            avatarId: row.receiver.avatarId,
            avatarAura: row.receiver.avatarAura,
            avatarFrame: row.receiver.avatarFrame,
            avatarOutfit: row.receiver.avatarOutfit,
            avatarAccessory: row.receiver.avatarAccessory,
            isBot: row.receiver.isBot ?? false,
          }
        : undefined,
    };
  }

  async createRequest(input: CreateFriendshipInput): Promise<FriendshipEntity> {
    const row = await this.prisma.friendship.create({
      data: {
        senderId: input.senderId,
        receiverId: input.receiverId,
        status: input.status || 'PENDING',
      },
      include: {
        sender: { select: PLAYER_PROFILE_SELECT },
        receiver: { select: PLAYER_PROFILE_SELECT },
      },
    });
    return this.toEntity(row);
  }

  async findRelationship(playerAId: string, playerBId: string): Promise<FriendshipEntity | null> {
    const row = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: playerAId, receiverId: playerBId },
          { senderId: playerBId, receiverId: playerAId },
        ],
      },
      include: {
        sender: { select: PLAYER_PROFILE_SELECT },
        receiver: { select: PLAYER_PROFILE_SELECT },
      },
    });
    return row ? this.toEntity(row) : null;
  }

  async findById(id: string): Promise<FriendshipEntity | null> {
    const row = await this.prisma.friendship.findUnique({
      where: { id },
      include: {
        sender: { select: PLAYER_PROFILE_SELECT },
        receiver: { select: PLAYER_PROFILE_SELECT },
      },
    });
    return row ? this.toEntity(row) : null;
  }

  async listForPlayer(playerId: string): Promise<FriendshipEntity[]> {
    const rows = await this.prisma.friendship.findMany({
      where: {
        OR: [{ senderId: playerId }, { receiverId: playerId }],
      },
      include: {
        sender: { select: PLAYER_PROFILE_SELECT },
        receiver: { select: PLAYER_PROFILE_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => this.toEntity(r));
  }

  async listAcceptedForPlayer(playerId: string): Promise<FriendshipEntity[]> {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: playerId }, { receiverId: playerId }],
      },
      include: {
        sender: { select: PLAYER_PROFILE_SELECT },
        receiver: { select: PLAYER_PROFILE_SELECT },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r: any) => this.toEntity(r));
  }

  async listPendingForPlayer(playerId: string): Promise<PendingRequestsResult> {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: 'PENDING',
        OR: [{ senderId: playerId }, { receiverId: playerId }],
      },
      include: {
        sender: { select: PLAYER_PROFILE_SELECT },
        receiver: { select: PLAYER_PROFILE_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });

    const incoming: FriendshipEntity[] = [];
    const outgoing: FriendshipEntity[] = [];

    for (const r of rows) {
      const entity = this.toEntity(r);
      if (entity.receiverId === playerId) {
        incoming.push(entity);
      } else if (entity.senderId === playerId) {
        outgoing.push(entity);
      }
    }

    return { incoming, outgoing };
  }

  async updateStatus(id: string, status: FriendshipStatus): Promise<FriendshipEntity> {
    const row = await this.prisma.friendship.update({
      where: { id },
      data: { status },
      include: {
        sender: { select: PLAYER_PROFILE_SELECT },
        receiver: { select: PLAYER_PROFILE_SELECT },
      },
    });
    return this.toEntity(row);
  }

  async updateLastGiftSentAt(id: string, timestamp: Date = new Date()): Promise<FriendshipEntity> {
    const row = await this.prisma.friendship.update({
      where: { id },
      data: { lastGiftSentAt: timestamp },
      include: {
        sender: { select: PLAYER_PROFILE_SELECT },
        receiver: { select: PLAYER_PROFILE_SELECT },
      },
    });
    return this.toEntity(row);
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      await this.prisma.friendship.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    if (!playerIds.length) return 0;
    try {
      const res = await this.prisma.friendship.deleteMany({
        where: {
          OR: [{ senderId: { in: playerIds } }, { receiverId: { in: playerIds } }],
        },
      });
      return res?.count ?? 0;
    } catch {
      return 0;
    }
  }
}

import { randomUUID } from 'crypto';
import {
  CreateFriendshipInput,
  FriendshipEntity,
  FriendshipRepository,
  FriendshipStatus,
  PendingRequestsResult,
} from './friendship.repository.interface';

export class InMemoryFriendshipRepository implements FriendshipRepository {
  private readonly items = new Map<string, FriendshipEntity>();
  private readonly getPlayerProfile?: (id: string) => any;

  constructor(playerProfileProvider?: (id: string) => any) {
    this.getPlayerProfile = playerProfileProvider;
  }

  private enrich(entity: FriendshipEntity): FriendshipEntity {
    const copy = { ...entity };
    if (this.getPlayerProfile) {
      if (!copy.sender) {
        const p = this.getPlayerProfile(copy.senderId);
        if (p) {
          copy.sender = {
            id: p.id,
            username: p.username,
            power: p.power ?? 0,
            smartness: p.smartness ?? 0,
            equippedTitle: p.equippedTitle,
            avatarId: p.avatarId,
            avatarAura: p.avatarAura,
            avatarFrame: p.avatarFrame,
            avatarOutfit: p.avatarOutfit,
            avatarAccessory: p.avatarAccessory,
            isBot: p.isBot ?? false,
          };
        }
      }
      if (!copy.receiver) {
        const p = this.getPlayerProfile(copy.receiverId);
        if (p) {
          copy.receiver = {
            id: p.id,
            username: p.username,
            power: p.power ?? 0,
            smartness: p.smartness ?? 0,
            equippedTitle: p.equippedTitle,
            avatarId: p.avatarId,
            avatarAura: p.avatarAura,
            avatarFrame: p.avatarFrame,
            avatarOutfit: p.avatarOutfit,
            avatarAccessory: p.avatarAccessory,
            isBot: p.isBot ?? false,
          };
        }
      }
    }
    return copy;
  }

  async createRequest(input: CreateFriendshipInput): Promise<FriendshipEntity> {
    const id = randomUUID();
    const now = new Date();
    const entity: FriendshipEntity = {
      id,
      senderId: input.senderId,
      receiverId: input.receiverId,
      status: input.status || 'PENDING',
      lastGiftSentAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(id, entity);
    return this.enrich(entity);
  }

  async findRelationship(playerAId: string, playerBId: string): Promise<FriendshipEntity | null> {
    for (const f of this.items.values()) {
      if (
        (f.senderId === playerAId && f.receiverId === playerBId) ||
        (f.senderId === playerBId && f.receiverId === playerAId)
      ) {
        return this.enrich(f);
      }
    }
    return null;
  }

  async findById(id: string): Promise<FriendshipEntity | null> {
    const f = this.items.get(id);
    return f ? this.enrich(f) : null;
  }

  async listForPlayer(playerId: string): Promise<FriendshipEntity[]> {
    const list: FriendshipEntity[] = [];
    for (const f of this.items.values()) {
      if (f.senderId === playerId || f.receiverId === playerId) {
        list.push(this.enrich(f));
      }
    }
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list;
  }

  async listAcceptedForPlayer(playerId: string): Promise<FriendshipEntity[]> {
    const list: FriendshipEntity[] = [];
    for (const f of this.items.values()) {
      if (f.status === 'ACCEPTED' && (f.senderId === playerId || f.receiverId === playerId)) {
        list.push(this.enrich(f));
      }
    }
    list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return list;
  }

  async listPendingForPlayer(playerId: string): Promise<PendingRequestsResult> {
    const incoming: FriendshipEntity[] = [];
    const outgoing: FriendshipEntity[] = [];
    for (const f of this.items.values()) {
      if (f.status === 'PENDING') {
        if (f.receiverId === playerId) {
          incoming.push(this.enrich(f));
        } else if (f.senderId === playerId) {
          outgoing.push(this.enrich(f));
        }
      }
    }
    incoming.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    outgoing.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { incoming, outgoing };
  }

  async updateStatus(id: string, status: FriendshipStatus): Promise<FriendshipEntity> {
    const f = this.items.get(id);
    if (!f) throw new Error('Friendship not found.');
    const updated: FriendshipEntity = {
      ...f,
      status,
      updatedAt: new Date(),
    };
    this.items.set(id, updated);
    return this.enrich(updated);
  }

  async updateLastGiftSentAt(id: string, timestamp: Date = new Date()): Promise<FriendshipEntity> {
    const f = this.items.get(id);
    if (!f) throw new Error('Friendship not found.');
    const updated: FriendshipEntity = {
      ...f,
      lastGiftSentAt: timestamp,
      updatedAt: new Date(),
    };
    this.items.set(id, updated);
    return this.enrich(updated);
  }

  async deleteById(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    let count = 0;
    const idSet = new Set(playerIds);
    for (const [id, f] of this.items.entries()) {
      if (idSet.has(f.senderId) || idSet.has(f.receiverId)) {
        this.items.delete(id);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.items.clear();
  }
}

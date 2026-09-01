export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface FriendshipEntity {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendshipStatus;
  lastGiftSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    username: string;
    power: number;
    smartness: number;
    equippedTitle?: string;
    avatarId?: string;
    avatarAura?: string;
    avatarFrame?: string;
    avatarOutfit?: string;
    avatarAccessory?: string;
    isBot?: boolean;
  };
  receiver?: {
    id: string;
    username: string;
    power: number;
    smartness: number;
    equippedTitle?: string;
    avatarId?: string;
    avatarAura?: string;
    avatarFrame?: string;
    avatarOutfit?: string;
    avatarAccessory?: string;
    isBot?: boolean;
  };
}

export interface CreateFriendshipInput {
  senderId: string;
  receiverId: string;
  status?: FriendshipStatus;
}

export interface PendingRequestsResult {
  incoming: FriendshipEntity[];
  outgoing: FriendshipEntity[];
}

export interface FriendshipRepository {
  createRequest(input: CreateFriendshipInput): Promise<FriendshipEntity>;
  findRelationship(playerAId: string, playerBId: string): Promise<FriendshipEntity | null>;
  findById(id: string): Promise<FriendshipEntity | null>;
  listForPlayer(playerId: string): Promise<FriendshipEntity[]>;
  listAcceptedForPlayer(playerId: string): Promise<FriendshipEntity[]>;
  listPendingForPlayer(playerId: string): Promise<PendingRequestsResult>;
  updateStatus(id: string, status: FriendshipStatus): Promise<FriendshipEntity>;
  updateLastGiftSentAt(id: string, timestamp?: Date): Promise<FriendshipEntity>;
  deleteById(id: string): Promise<boolean>;
  deleteTestRecords(playerIds: string[]): Promise<number>;
  clear?(): void;
}

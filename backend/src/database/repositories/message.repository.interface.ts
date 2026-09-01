export const MAX_CONVERSATION_MESSAGES = 100;

export interface MessageEntity {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateMessageInput {
  id?: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead?: boolean;
  readAt?: Date | null;
  createdAt?: Date;
}

export interface ConversationParticipant {
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
}

export interface ConversationSummaryEntity {
  partner: ConversationParticipant;
  lastMessage: {
    id: string;
    content: string;
    isMe: boolean;
    isRead: boolean;
    createdAt: string;
  };
  unreadCount: number;
}

export interface InboxSummaryResult {
  conversations: ConversationSummaryEntity[];
  totalUnread: number;
}

/**
 * MessageRepository encapsulates persistence for campus direct chat messages.
 */
export interface MessageRepository {
  create(input: CreateMessageInput): Promise<MessageEntity>;
  findById(id: string): Promise<MessageEntity | null>;
  findConversation(playerId: string, partnerId: string): Promise<MessageEntity[]>;
  findUserMessages(playerId: string): Promise<MessageEntity[]>;
  markConversationAsRead(receiverId: string, senderId: string): Promise<number>;
  countUnread(receiverId: string): Promise<number>;
  deleteById(id: string): Promise<boolean>;
  clear?(): void;
}

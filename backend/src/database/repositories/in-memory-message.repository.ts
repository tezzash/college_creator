import { randomUUID } from 'node:crypto';
import {
  CreateMessageInput,
  MAX_CONVERSATION_MESSAGES,
  MessageEntity,
  MessageRepository,
} from './message.repository.interface';

export class InMemoryMessageRepository implements MessageRepository {
  private readonly messages = new Map<string, MessageEntity>();

  private clone(msg: MessageEntity): MessageEntity {
    return {
      ...msg,
      readAt: msg.readAt ? new Date(msg.readAt.getTime()) : null,
      createdAt: new Date(msg.createdAt.getTime()),
    };
  }

  async create(input: CreateMessageInput): Promise<MessageEntity> {
    const id = input.id || randomUUID();
    const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
    const entity: MessageEntity = {
      id,
      senderId: input.senderId,
      receiverId: input.receiverId,
      content: input.content.trim(),
      isRead: Boolean(input.isRead ?? false),
      readAt: input.readAt ? new Date(input.readAt) : null,
      createdAt,
    };
    this.messages.set(id, entity);

    // Enforce maximum 100 messages per conversation retention limit
    const conversationMessages: MessageEntity[] = [];
    for (const msg of this.messages.values()) {
      const isMatch =
        (msg.senderId === input.senderId && msg.receiverId === input.receiverId) ||
        (msg.senderId === input.receiverId && msg.receiverId === input.senderId);
      if (isMatch) {
        conversationMessages.push(msg);
      }
    }

    if (conversationMessages.length > MAX_CONVERSATION_MESSAGES) {
      // Sort descending (newest first)
      conversationMessages.sort((a, b) => {
        const diff = b.createdAt.getTime() - a.createdAt.getTime();
        if (diff !== 0) return diff;
        return b.id.localeCompare(a.id);
      });

      // Remove excess oldest messages beyond MAX_CONVERSATION_MESSAGES
      const excess = conversationMessages.slice(MAX_CONVERSATION_MESSAGES);
      for (const oldMsg of excess) {
        this.messages.delete(oldMsg.id);
      }
    }

    return this.clone(entity);
  }

  async findById(id: string): Promise<MessageEntity | null> {
    const msg = this.messages.get(id);
    return msg ? this.clone(msg) : null;
  }

  async findConversation(playerId: string, partnerId: string): Promise<MessageEntity[]> {
    const results: MessageEntity[] = [];
    for (const msg of this.messages.values()) {
      const isMatch =
        (msg.senderId === playerId && msg.receiverId === partnerId) ||
        (msg.senderId === partnerId && msg.receiverId === playerId);
      if (isMatch) {
        results.push(this.clone(msg));
      }
    }
    results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return results;
  }

  async findUserMessages(playerId: string): Promise<MessageEntity[]> {
    const results: MessageEntity[] = [];
    for (const msg of this.messages.values()) {
      if (msg.senderId === playerId || msg.receiverId === playerId) {
        results.push(this.clone(msg));
      }
    }
    results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return results;
  }

  async markConversationAsRead(receiverId: string, senderId: string): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const msg of this.messages.values()) {
      if (msg.receiverId === receiverId && msg.senderId === senderId && !msg.isRead) {
        msg.isRead = true;
        msg.readAt = now;
        count++;
      }
    }
    return count;
  }

  async countUnread(receiverId: string): Promise<number> {
    let count = 0;
    for (const msg of this.messages.values()) {
      if (msg.receiverId === receiverId && !msg.isRead) {
        count++;
      }
    }
    return count;
  }

  async deleteById(id: string): Promise<boolean> {
    return this.messages.delete(id);
  }

  clear(): void {
    this.messages.clear();
  }
}

import { randomUUID } from 'node:crypto';
import {
  CreatePlayerRecordInput,
  PlayerEntity,
  PlayerLeaderboardOptions,
  PlayerRepository,
  PlayerSearchFilters,
  UpdatePlayerRecordInput,
} from './player.repository.interface';

export class InMemoryPlayerRepository implements PlayerRepository {
  private readonly players = new Map<string, PlayerEntity>();

  private clone(player: PlayerEntity): PlayerEntity {
    return {
      ...player,
      ownedCosmetics: [...player.ownedCosmetics],
      claimedMilestones: [...player.claimedMilestones],
      dailyQuestsState: player.dailyQuestsState ? JSON.parse(JSON.stringify(player.dailyQuestsState)) : null,
      pinnedUntil: player.pinnedUntil ? new Date(player.pinnedUntil.getTime()) : null,
      lastEnergyUpdate: new Date(player.lastEnergyUpdate.getTime()),
      lastMoraleUpdate: new Date(player.lastMoraleUpdate.getTime()),
      createdAt: new Date(player.createdAt.getTime()),
      updatedAt: new Date(player.updatedAt.getTime()),
    };
  }

  async findById(id: string): Promise<PlayerEntity | null> {
    const player = this.players.get(id);
    return player ? this.clone(player) : null;
  }

  async findByUsername(username: string): Promise<PlayerEntity | null> {
    const target = username.trim().toLowerCase();
    for (const player of this.players.values()) {
      if (player.username.toLowerCase() === target) {
        return this.clone(player);
      }
    }
    return null;
  }

  async findByEmail(email: string): Promise<PlayerEntity | null> {
    const target = email.trim().toLowerCase();
    for (const player of this.players.values()) {
      if (player.email.toLowerCase() === target) {
        return this.clone(player);
      }
    }
    return null;
  }

  async findByUsernameOrEmail(identifier: string): Promise<PlayerEntity | null> {
    const target = identifier.trim().toLowerCase();
    for (const player of this.players.values()) {
      if (player.username.toLowerCase() === target || player.email.toLowerCase() === target) {
        return this.clone(player);
      }
    }
    return null;
  }

  async create(input: CreatePlayerRecordInput): Promise<PlayerEntity> {
    const trimmedUsername = input.username.trim();
    const normalizedEmail = input.email.trim().toLowerCase();

    // Check unique constraints
    for (const existing of this.players.values()) {
      if (existing.username.toLowerCase() === trimmedUsername.toLowerCase()) {
        throw new Error(`Username "${trimmedUsername}" is already taken.`);
      }
      if (existing.email.toLowerCase() === normalizedEmail) {
        throw new Error(`Email "${normalizedEmail}" is already registered.`);
      }
    }

    const now = new Date();
    const id = input.id || randomUUID();
    const defaultCosmetics = [
      'avatar-coder',
      'avatar-varsity',
      'avatar-scholar',
      'avatar-freshman',
      'aura-none',
      'outfit-hoodie',
      'headwear-none',
      'acc-laptop',
      'frame-neon',
    ];

    const entity: PlayerEntity = {
      id,
      username: trimmedUsername,
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      cash: input.cash ?? 1000,
      bankCash: input.bankCash ?? 0,
      energy: input.energy ?? 10,
      morale: input.morale ?? 10,
      power: input.power ?? 0,
      smartness: input.smartness ?? 0,
      winStreak: input.winStreak ?? 0,
      highestStreak: input.highestStreak ?? 0,
      totalPvPWins: input.totalPvPWins ?? 0,
      totalPvPLosses: input.totalPvPLosses ?? 0,
      totalPlundered: input.totalPlundered ?? 0,
      equippedTitle: input.equippedTitle || 'Freshman Novice',
      avatarId: input.avatarId || 'avatar-coder',
      avatarAura: input.avatarAura || 'aura-none',
      avatarFrame: input.avatarFrame || 'frame-neon',
      avatarOutfit: input.avatarOutfit || 'outfit-hoodie',
      avatarHeadwear: input.avatarHeadwear || 'headwear-none',
      avatarAccessory: input.avatarAccessory || 'acc-laptop',
      ownedCosmetics: input.ownedCosmetics ? [...input.ownedCosmetics] : defaultCosmetics,
      customBio: input.customBio || 'Ready to conquer the campus empire! 💻💸',
      claimedMilestones: input.claimedMilestones ? [...input.claimedMilestones] : [],
      totalJobsCompleted: input.totalJobsCompleted ?? 0,
      totalBankDeposited: input.totalBankDeposited ?? 0,
      dailyStreak: input.dailyStreak ?? 1,
      dailyQuestsDate: input.dailyQuestsDate ?? null,
      dailyQuestsState: input.dailyQuestsState ?? null,
      pinnedUntil: input.pinnedUntil ?? null,
      isBot: input.isBot ?? false,
      lastEnergyUpdate: now,
      lastMoraleUpdate: now,
      createdAt: now,
      updatedAt: now,
    };

    this.players.set(id, entity);
    return this.clone(entity);
  }

  async update(id: string, updates: UpdatePlayerRecordInput): Promise<PlayerEntity> {
    const existing = this.players.get(id);
    if (!existing) {
      throw new Error(`Player with ID "${id}" not found.`);
    }

    if (updates.username && updates.username.toLowerCase() !== existing.username.toLowerCase()) {
      const match = await this.findByUsername(updates.username);
      if (match && match.id !== id) {
        throw new Error(`Username "${updates.username}" is already taken.`);
      }
    }

    if (updates.email && updates.email.toLowerCase() !== existing.email.toLowerCase()) {
      const match = await this.findByEmail(updates.email);
      if (match && match.id !== id) {
        throw new Error(`Email "${updates.email}" is already registered.`);
      }
    }

    const now = new Date();
    const updated: PlayerEntity = {
      ...existing,
      ...updates,
      username: updates.username !== undefined ? updates.username.trim() : existing.username,
      email: updates.email !== undefined ? updates.email.trim().toLowerCase() : existing.email,
      ownedCosmetics: updates.ownedCosmetics ? [...updates.ownedCosmetics] : existing.ownedCosmetics,
      claimedMilestones: updates.claimedMilestones ? [...updates.claimedMilestones] : existing.claimedMilestones,
      updatedAt: now,
    };

    this.players.set(id, updated);
    return this.clone(updated);
  }

  async updateCash(id: string, newCash: number, newBankCash?: number): Promise<PlayerEntity> {
    const existing = this.players.get(id);
    if (!existing) throw new Error(`Player with ID "${id}" not found.`);

    const now = new Date();
    existing.cash = newCash;
    if (newBankCash !== undefined) {
      existing.bankCash = newBankCash;
    }
    existing.updatedAt = now;
    return this.clone(existing);
  }

  async updateStats(id: string, stats: { power?: number; smartness?: number }): Promise<PlayerEntity> {
    const existing = this.players.get(id);
    if (!existing) throw new Error(`Player with ID "${id}" not found.`);

    if (stats.power !== undefined) existing.power = stats.power;
    if (stats.smartness !== undefined) existing.smartness = stats.smartness;
    existing.updatedAt = new Date();
    return this.clone(existing);
  }

  async updateEnergyAndMorale(
    id: string,
    energy: number,
    morale: number,
    lastEnergyUpdate?: Date,
    lastMoraleUpdate?: Date
  ): Promise<PlayerEntity> {
    const existing = this.players.get(id);
    if (!existing) throw new Error(`Player with ID "${id}" not found.`);

    existing.energy = energy;
    existing.morale = morale;
    if (lastEnergyUpdate) existing.lastEnergyUpdate = lastEnergyUpdate;
    if (lastMoraleUpdate) existing.lastMoraleUpdate = lastMoraleUpdate;
    existing.updatedAt = new Date();
    return this.clone(existing);
  }

  async consumeEnergy(
    id: string,
    amount: number = 1,
    options?: { maxEnergy?: number; energyRegenSeconds?: number; now?: Date }
  ): Promise<PlayerEntity> {
    if (amount <= 0 || !Number.isSafeInteger(amount)) {
      throw new Error('Energy amount must be a positive integer.');
    }
    const existing = this.players.get(id);
    if (!existing) throw new Error(`Player with ID "${id}" not found.`);

    const maxEnergy = options?.maxEnergy ?? 10;
    const regenSeconds = options?.energyRegenSeconds ?? 420;
    const now = options?.now ?? new Date();

    const lastUpdate = existing.lastEnergyUpdate ? new Date(existing.lastEnergyUpdate) : now;
    const elapsedSec = Math.max(0, Math.floor((now.getTime() - lastUpdate.getTime()) / 1000));
    const regenCount = regenSeconds > 0 ? Math.floor(elapsedSec / regenSeconds) : 0;
    const effectiveEnergy = Math.min(maxEnergy, (existing.energy ?? 0) + regenCount);

    if (effectiveEnergy < amount) {
      throw new Error(`Insufficient Energy (${effectiveEnergy}/${maxEnergy}). Need ${amount} Energy.`);
    }

    const newEnergy = effectiveEnergy - amount;
    const wasMax = effectiveEnergy >= maxEnergy;
    const newLastEnergyUpdate = wasMax
      ? now
      : new Date(lastUpdate.getTime() + regenCount * regenSeconds * 1000);

    existing.energy = newEnergy;
    existing.lastEnergyUpdate = newLastEnergyUpdate;
    existing.updatedAt = now;
    return this.clone(existing);
  }

  async search(filters: PlayerSearchFilters): Promise<PlayerEntity[]> {
    const limit = filters.limit ?? 20;
    const query = filters.query?.trim().toLowerCase() ?? '';
    const excludeId = filters.excludePlayerId;

    const matched: PlayerEntity[] = [];
    for (const player of this.players.values()) {
      if (excludeId && player.id === excludeId) continue;
      if (query && !player.username.toLowerCase().includes(query)) continue;
      matched.push(this.clone(player));
    }

    matched.sort((a, b) => a.username.localeCompare(b.username));
    return matched.slice(0, limit);
  }

  async listLeaderboard(options: PlayerLeaderboardOptions): Promise<PlayerEntity[]> {
    const limit = options.limit ?? 20;
    const sortBy = options.sortBy;

    const list = Array.from(this.players.values()).map((p) => this.clone(p));
    list.sort((a, b) => {
      const valA = (a[sortBy] as number) ?? 0;
      const valB = (b[sortBy] as number) ?? 0;
      return valB - valA;
    });

    return list.slice(0, limit);
  }

  async count(): Promise<number> {
    return this.players.size;
  }

  async deleteById(id: string): Promise<boolean> {
    return this.players.delete(id);
  }

  /**
   * Helper to clear all state in testing environments.
   */
  clear(): void {
    this.players.clear();
  }
}

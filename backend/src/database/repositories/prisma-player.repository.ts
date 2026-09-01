import { PrismaClient, Player as PrismaPlayerModel } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import {
  CreatePlayerRecordInput,
  PlayerEntity,
  PlayerLeaderboardOptions,
  PlayerRepository,
  PlayerSearchFilters,
  UpdatePlayerRecordInput,
} from './player.repository.interface';

export class PrismaPlayerRepository implements PlayerRepository {
  constructor(private readonly prismaProvider: () => PrismaClient = () => getPrismaClient()) {}

  private get prisma(): PrismaClient {
    return this.prismaProvider();
  }

  private mapPrismaToEntity(row: PrismaPlayerModel): PlayerEntity {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.passwordHash,
      cash: typeof row.cash === 'number' ? row.cash : Number(row.cash),
      bankCash: typeof row.bankCash === 'number' ? row.bankCash : Number(row.bankCash),
      energy: row.energy,
      morale: row.morale,
      power: row.power,
      smartness: row.smartness,
      winStreak: row.winStreak,
      highestStreak: row.highestStreak,
      totalPvPWins: row.totalPvPWins,
      totalPvPLosses: row.totalPvPLosses,
      totalPlundered: typeof row.totalPlundered === 'number' ? row.totalPlundered : Number(row.totalPlundered),
      equippedTitle: row.equippedTitle,
      avatarId: row.avatarId,
      avatarAura: row.avatarAura,
      avatarFrame: row.avatarFrame,
      avatarOutfit: row.avatarOutfit,
      avatarHeadwear: row.avatarHeadwear,
      avatarAccessory: row.avatarAccessory,
      ownedCosmetics: Array.isArray(row.ownedCosmetics) ? row.ownedCosmetics : [],
      customBio: row.customBio,
      claimedMilestones: Array.isArray(row.claimedMilestones) ? row.claimedMilestones : [],
      totalJobsCompleted: row.totalJobsCompleted,
      totalBankDeposited: typeof row.totalBankDeposited === 'number' ? row.totalBankDeposited : Number(row.totalBankDeposited),
      dailyStreak: row.dailyStreak,
      dailyQuestsDate: row.dailyQuestsDate,
      dailyQuestsState: row.dailyQuestsState,
      pinnedUntil: row.pinnedUntil,
      isBot: row.isBot,
      lastEnergyUpdate: row.lastEnergyUpdate,
      lastMoraleUpdate: row.lastMoraleUpdate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findById(id: string): Promise<PlayerEntity | null> {
    const player = await this.prisma.player.findUnique({
      where: { id },
    });
    return player ? this.mapPrismaToEntity(player) : null;
  }

  async findByUsername(username: string): Promise<PlayerEntity | null> {
    const player = await this.prisma.player.findFirst({
      where: {
        username: { equals: username.trim(), mode: 'insensitive' },
      },
    });
    return player ? this.mapPrismaToEntity(player) : null;
  }

  async findByEmail(email: string): Promise<PlayerEntity | null> {
    const player = await this.prisma.player.findFirst({
      where: {
        email: { equals: email.trim().toLowerCase(), mode: 'insensitive' },
      },
    });
    return player ? this.mapPrismaToEntity(player) : null;
  }

  async findByUsernameOrEmail(identifier: string): Promise<PlayerEntity | null> {
    const trimmed = identifier.trim();
    const normalized = trimmed.toLowerCase();
    const player = await this.prisma.player.findFirst({
      where: {
        OR: [
          { username: { equals: trimmed, mode: 'insensitive' } },
          { email: { equals: normalized, mode: 'insensitive' } },
        ],
      },
    });
    return player ? this.mapPrismaToEntity(player) : null;
  }

  async create(input: CreatePlayerRecordInput): Promise<PlayerEntity> {
    const created = await this.prisma.player.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        username: input.username.trim(),
        email: input.email.trim().toLowerCase(),
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
        ownedCosmetics: input.ownedCosmetics || [
          'avatar-coder',
          'avatar-varsity',
          'avatar-scholar',
          'avatar-freshman',
          'aura-none',
          'outfit-hoodie',
          'headwear-none',
          'acc-laptop',
          'frame-neon',
        ],
        customBio: input.customBio || 'Ready to conquer the campus empire! 💻💸',
        claimedMilestones: input.claimedMilestones || [],
        totalJobsCompleted: input.totalJobsCompleted ?? 0,
        totalBankDeposited: input.totalBankDeposited ?? 0,
        dailyStreak: input.dailyStreak ?? 1,
        dailyQuestsDate: input.dailyQuestsDate ?? null,
        dailyQuestsState: input.dailyQuestsState ?? undefined,
        pinnedUntil: input.pinnedUntil ?? null,
        isBot: input.isBot ?? false,
      },
    });

    return this.mapPrismaToEntity(created);
  }

  async update(id: string, updates: UpdatePlayerRecordInput): Promise<PlayerEntity> {
    const data: any = {};

    if (updates.username !== undefined) data.username = updates.username.trim();
    if (updates.email !== undefined) data.email = updates.email.trim().toLowerCase();
    if (updates.passwordHash !== undefined) data.passwordHash = updates.passwordHash;
    if (updates.cash !== undefined) data.cash = updates.cash;
    if (updates.bankCash !== undefined) data.bankCash = updates.bankCash;
    if (updates.energy !== undefined) data.energy = updates.energy;
    if (updates.morale !== undefined) data.morale = updates.morale;
    if (updates.power !== undefined) data.power = updates.power;
    if (updates.smartness !== undefined) data.smartness = updates.smartness;
    if (updates.winStreak !== undefined) data.winStreak = updates.winStreak;
    if (updates.highestStreak !== undefined) data.highestStreak = updates.highestStreak;
    if (updates.totalPvPWins !== undefined) data.totalPvPWins = updates.totalPvPWins;
    if (updates.totalPvPLosses !== undefined) data.totalPvPLosses = updates.totalPvPLosses;
    if (updates.totalPlundered !== undefined) data.totalPlundered = updates.totalPlundered;
    if (updates.equippedTitle !== undefined) data.equippedTitle = updates.equippedTitle;
    if (updates.avatarId !== undefined) data.avatarId = updates.avatarId;
    if (updates.avatarAura !== undefined) data.avatarAura = updates.avatarAura;
    if (updates.avatarFrame !== undefined) data.avatarFrame = updates.avatarFrame;
    if (updates.avatarOutfit !== undefined) data.avatarOutfit = updates.avatarOutfit;
    if (updates.avatarHeadwear !== undefined) data.avatarHeadwear = updates.avatarHeadwear;
    if (updates.avatarAccessory !== undefined) data.avatarAccessory = updates.avatarAccessory;
    if (updates.ownedCosmetics !== undefined) data.ownedCosmetics = updates.ownedCosmetics;
    if (updates.customBio !== undefined) data.customBio = updates.customBio;
    if (updates.claimedMilestones !== undefined) data.claimedMilestones = updates.claimedMilestones;
    if (updates.totalJobsCompleted !== undefined) data.totalJobsCompleted = updates.totalJobsCompleted;
    if (updates.totalBankDeposited !== undefined) data.totalBankDeposited = updates.totalBankDeposited;
    if (updates.dailyStreak !== undefined) data.dailyStreak = updates.dailyStreak;
    if (updates.dailyQuestsDate !== undefined) data.dailyQuestsDate = updates.dailyQuestsDate;
    if (updates.dailyQuestsState !== undefined) data.dailyQuestsState = updates.dailyQuestsState;
    if (updates.pinnedUntil !== undefined) data.pinnedUntil = updates.pinnedUntil;
    if (updates.isBot !== undefined) data.isBot = updates.isBot;
    if (updates.lastEnergyUpdate !== undefined) data.lastEnergyUpdate = updates.lastEnergyUpdate;
    if (updates.lastMoraleUpdate !== undefined) data.lastMoraleUpdate = updates.lastMoraleUpdate;

    const updated = await this.prisma.player.update({
      where: { id },
      data,
    });

    return this.mapPrismaToEntity(updated);
  }

  async updateCash(id: string, newCash: number, newBankCash?: number): Promise<PlayerEntity> {
    const updated = await this.prisma.player.update({
      where: { id },
      data: {
        cash: newCash,
        ...(newBankCash !== undefined ? { bankCash: newBankCash } : {}),
      },
    });
    return this.mapPrismaToEntity(updated);
  }

  async updateStats(id: string, stats: { power?: number; smartness?: number }): Promise<PlayerEntity> {
    const data: any = {};
    if (stats.power !== undefined) data.power = stats.power;
    if (stats.smartness !== undefined) data.smartness = stats.smartness;

    const updated = await this.prisma.player.update({
      where: { id },
      data,
    });
    return this.mapPrismaToEntity(updated);
  }

  async updateEnergyAndMorale(
    id: string,
    energy: number,
    morale: number,
    lastEnergyUpdate?: Date,
    lastMoraleUpdate?: Date
  ): Promise<PlayerEntity> {
    const data: any = { energy, morale };
    if (lastEnergyUpdate) data.lastEnergyUpdate = lastEnergyUpdate;
    if (lastMoraleUpdate) data.lastMoraleUpdate = lastMoraleUpdate;

    const updated = await this.prisma.player.update({
      where: { id },
      data,
    });
    return this.mapPrismaToEntity(updated);
  }

  async consumeEnergy(
    id: string,
    amount: number = 1,
    options?: { maxEnergy?: number; energyRegenSeconds?: number; now?: Date }
  ): Promise<PlayerEntity> {
    if (amount <= 0 || !Number.isSafeInteger(amount)) {
      throw new Error('Energy amount must be a positive integer.');
    }
    const maxEnergy = options?.maxEnergy ?? 10;
    const regenSeconds = options?.energyRegenSeconds ?? 420;
    const now = options?.now ?? new Date();

    return this.prisma.$transaction(async (tx: any) => {
      const player = await tx.player.findUnique({ where: { id } });
      if (!player) throw new Error('Player not found.');

      const lastUpdate = player.lastEnergyUpdate ? new Date(player.lastEnergyUpdate) : now;
      const elapsedSec = Math.max(0, Math.floor((now.getTime() - lastUpdate.getTime()) / 1000));
      const regenCount = regenSeconds > 0 ? Math.floor(elapsedSec / regenSeconds) : 0;
      const effectiveEnergy = Math.min(maxEnergy, (player.energy ?? 0) + regenCount);

      if (effectiveEnergy < amount) {
        throw new Error(`Insufficient Energy (${effectiveEnergy}/${maxEnergy}). Need ${amount} Energy.`);
      }

      const newEnergy = effectiveEnergy - amount;
      const wasMax = effectiveEnergy >= maxEnergy;
      const newLastEnergyUpdate = wasMax
        ? now
        : new Date(lastUpdate.getTime() + regenCount * regenSeconds * 1000);

      const updateRes = await tx.player.updateMany({
        where: {
          id,
          energy: player.energy,
        },
        data: {
          energy: newEnergy,
          lastEnergyUpdate: newLastEnergyUpdate,
        },
      });

      if (updateRes.count !== 1) {
        throw new Error('Energy state changed concurrently. Please retry.');
      }

      const updated = await tx.player.findUniqueOrThrow({ where: { id } });
      return this.mapPrismaToEntity(updated);
    });
  }

  async search(filters: PlayerSearchFilters): Promise<PlayerEntity[]> {
    const limit = filters.limit ?? 20;
    const query = filters.query?.trim();
    const excludeId = filters.excludePlayerId;

    const where: any = {};
    if (excludeId) {
      where.id = { not: excludeId };
    }
    if (query) {
      where.username = { contains: query, mode: 'insensitive' };
    }

    const rows = await this.prisma.player.findMany({
      where,
      orderBy: { username: 'asc' },
      take: limit,
    });

    return rows.map((r: any) => this.mapPrismaToEntity(r));
  }

  async listLeaderboard(options: PlayerLeaderboardOptions): Promise<PlayerEntity[]> {
    const limit = options.limit ?? 20;
    const sortBy = options.sortBy;

    const rows = await this.prisma.player.findMany({
      orderBy: { [sortBy]: 'desc' },
      take: limit,
    });

    return rows.map((r: any) => this.mapPrismaToEntity(r));
  }

  async count(): Promise<number> {
    return this.prisma.player.count();
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      await this.prisma.player.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}

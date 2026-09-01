import { CashTransactionType, PrismaService } from './prisma.service';
import { getCosmeticItem } from '../../../src/data/cosmeticsCatalog';
import {
  MessageRepository,
  PrismaMessageRepository,
  FurnitureRepository,
  PrismaFurnitureRepository,
  WalletRepository,
  PrismaWalletRepository,
  FriendshipRepository,
  PrismaFriendshipRepository,
} from './repositories';
import { getPrismaClient } from './prisma-client';

export interface PersistentPlayerInput {
  id?: string;
  isBot?: boolean;
  username: string;
  email: string;
  passwordHash: string;
  cash?: number;
  energy?: number;
  morale?: number;
  power?: number;
  smartness?: number;
}

export interface PersistentPlayerState {
  id: string;
  isBot?: boolean;
  username: string;
  email: string;
  cash: number;
  bankCash: number;
  energy: number;
  maxEnergy: number;
  morale: number;
  maxMorale: number;
  power: number;
  smartness: number;
  winStreak: number;
  highestStreak: number;
  totalPvPWins: number;
  totalPvPLosses: number;
  totalPlundered: number;
  equippedTitle?: string;
  avatarId?: string;
  avatarAura?: string;
  avatarFrame?: string;
  avatarOutfit?: string;
  avatarHeadwear?: string;
  avatarAccessory?: string;
  ownedCosmetics?: string[];
  customBio?: string;
  claimedMilestones?: string[];
  totalJobsCompleted?: number;
  totalBankDeposited?: number;
  dailyStreak?: number;
  lastEnergyUpdate?: string;
  pinnedUntil?: string | null;
  isPinned?: boolean;
  pinnedSecondsRemaining?: number;
}

export interface PlayerCredentials {
  player: PersistentPlayerState;
  passwordHash: string;
}

export class DatabasePlayerService {
  private readonly messageRepository: MessageRepository;
  private readonly furnitureRepository: FurnitureRepository;
  private readonly walletRepository: WalletRepository;
  private readonly friendshipRepository: FriendshipRepository;

  constructor(
    private readonly prisma: PrismaService,
    messageRepository?: MessageRepository,
    furnitureRepository?: FurnitureRepository,
    walletRepository?: WalletRepository,
    friendshipRepository?: FriendshipRepository,
  ) {
    if (messageRepository) {
      this.messageRepository = messageRepository;
    } else if (
      process.env.DATABASE_URL &&
      (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) &&
      !process.env.DATABASE_URL.includes('campus-memory')
    ) {
      this.messageRepository = new PrismaMessageRepository(() => getPrismaClient());
    } else {
      this.messageRepository = new PrismaMessageRepository(() => this.prisma as any);
    }

    if (furnitureRepository) {
      this.furnitureRepository = furnitureRepository;
    } else if (
      process.env.DATABASE_URL &&
      (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) &&
      !process.env.DATABASE_URL.includes('campus-memory')
    ) {
      this.furnitureRepository = new PrismaFurnitureRepository(() => getPrismaClient());
    } else {
      this.furnitureRepository = new PrismaFurnitureRepository(() => this.prisma as any);
    }

    if (walletRepository) {
      this.walletRepository = walletRepository;
    } else if (
      process.env.DATABASE_URL &&
      (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) &&
      !process.env.DATABASE_URL.includes('campus-memory')
    ) {
      this.walletRepository = new PrismaWalletRepository(() => getPrismaClient());
    } else {
      this.walletRepository = new PrismaWalletRepository(() => this.prisma as any);
    }

    if (friendshipRepository) {
      this.friendshipRepository = friendshipRepository;
    } else if (
      process.env.DATABASE_URL &&
      (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) &&
      !process.env.DATABASE_URL.includes('campus-memory')
    ) {
      this.friendshipRepository = new PrismaFriendshipRepository(() => getPrismaClient());
    } else {
      this.friendshipRepository = new PrismaFriendshipRepository(() => this.prisma as any);
    }
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  async create(input: PersistentPlayerInput): Promise<PersistentPlayerState> {
    const cash = input.cash ?? 1000;
    const player = await this.prisma.$transaction(async (tx) => {
      const created = await tx.player.create({
        data: {
          ...(input.id ? { id: input.id } : {}),
          isBot: Boolean(input.isBot ?? false),
          username: input.username.trim(),
          email: input.email.trim().toLowerCase(),
          passwordHash: input.passwordHash,
          cash,
          bankCash: 0,
          energy: input.energy ?? 10,
          power: input.power ?? 0,
          smartness: input.smartness ?? 0,
          winStreak: 0,
          highestStreak: 0,
          totalPvPWins: 0,
          totalPvPLosses: 0,
          totalPlundered: 0,
          equippedTitle: 'Freshman Novice',
          avatarId: 'avatar-coder',
          avatarAura: 'aura-none',
          avatarFrame: 'frame-neon',
          avatarOutfit: 'outfit-hoodie',
          avatarHeadwear: 'headwear-none',
          avatarAccessory: 'acc-laptop',
          ownedCosmetics: ['avatar-coder', 'avatar-varsity', 'avatar-scholar', 'avatar-freshman', 'aura-none', 'outfit-hoodie', 'headwear-none', 'acc-laptop', 'frame-neon'],
          customBio: 'Ready to conquer the campus empire! 💻💸',
          claimedMilestones: [],
          totalJobsCompleted: 0,
          totalBankDeposited: 0,
          dailyStreak: 1,
        },
      });
      await tx.cashTransaction.create({ data: { playerId: created.id, type: CashTransactionType.STARTING_CASH, amount: cash, balanceAfter: cash, reference: 'player-create' } });
      await tx.towerRoom.create({ data: { playerId: created.id, roomNumber: 1, unlockCost: 0, unlocked: true } });
      return created;
    });
    return this.toState(player);
  }

  async findCredentials(login: string): Promise<PlayerCredentials | null> {
    const normalized = login.trim().toLowerCase();
    const player = await this.prisma.player.findFirst({ where: { OR: [{ username: login.trim() }, { email: normalized }] } });
    if (!player) return null;
    return { player: this.toState(player), passwordHash: player.passwordHash };
  }

  async search(query: string, excludeId: string): Promise<Array<Pick<PersistentPlayerState, 'id' | 'username' | 'power' | 'smartness' | 'winStreak' | 'cash' | 'equippedTitle' | 'avatarId' | 'avatarAura' | 'avatarFrame' | 'avatarOutfit' | 'avatarHeadwear' | 'avatarAccessory' | 'isBot'>>> {
    const normalized = query.trim();
    const players = await this.prisma.player.findMany({
      where: {
        id: { not: excludeId },
        isBot: false,
        ...(normalized ? { username: { contains: normalized, mode: 'insensitive' } } : {}),
      },
      orderBy: { username: 'asc' },
      take: 20,
    });
    return players
      .filter((p) => !p.isBot)
      .map((p) => ({
        id: p.id,
        isBot: false,
        username: p.username,
        power: p.power,
        smartness: p.smartness,
        winStreak: p.winStreak,
        cash: p.cash,
        equippedTitle: p.equippedTitle || 'Freshman Novice',
        avatarId: p.avatarId || 'avatar-coder',
        avatarAura: p.avatarAura || 'aura-none',
        avatarFrame: p.avatarFrame || 'frame-neon',
        avatarOutfit: p.avatarOutfit || 'outfit-hoodie',
        avatarHeadwear: p.avatarHeadwear || 'headwear-none',
        avatarAccessory: p.avatarAccessory || 'acc-laptop',
      }));
  }

  async searchPvPOpponents(query: string, excludeId: string): Promise<Array<Pick<PersistentPlayerState, 'id' | 'username' | 'power' | 'smartness' | 'winStreak' | 'cash' | 'equippedTitle' | 'avatarId' | 'avatarAura' | 'avatarFrame' | 'avatarOutfit' | 'avatarHeadwear' | 'avatarAccessory' | 'isBot'>>> {
    const normalized = query.trim();
    const players = await this.prisma.player.findMany({
      where: {
        id: { not: excludeId },
        ...(normalized ? { username: { contains: normalized, mode: 'insensitive' } } : {}),
      },
      orderBy: { username: 'asc' },
      take: 100,
    });
    return players.map((p) => ({
      id: p.id,
      isBot: Boolean(p.isBot),
      username: p.username,
      power: p.power,
      smartness: p.smartness,
      winStreak: p.winStreak,
      cash: p.cash,
      equippedTitle: p.equippedTitle || 'Freshman Novice',
      avatarId: p.avatarId || 'avatar-coder',
      avatarAura: p.avatarAura || 'aura-none',
      avatarFrame: p.avatarFrame || 'frame-neon',
      avatarOutfit: p.avatarOutfit || 'outfit-hoodie',
      avatarHeadwear: p.avatarHeadwear || 'headwear-none',
      avatarAccessory: p.avatarAccessory || 'acc-laptop',
    }));
  }

  async get(id: string): Promise<PersistentPlayerState> {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new Error('Player not found.');
    return this.toState(player);
  }

  async updateProfile(id: string, updates: {
    equippedTitle?: string;
    avatarId?: string;
    avatarAura?: string;
    avatarFrame?: string;
    avatarOutfit?: string;
    avatarHeadwear?: string;
    avatarAccessory?: string;
    customBio?: string;
  }): Promise<PersistentPlayerState> {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new Error('Player not found.');

    const defaultCosmetics = ['avatar-coder', 'avatar-varsity', 'avatar-scholar', 'avatar-freshman', 'aura-none', 'outfit-hoodie', 'headwear-none', 'acc-laptop', 'frame-neon'];
    const owned = new Set(Array.isArray(player.ownedCosmetics) ? player.ownedCosmetics : defaultCosmetics);
    for (const d of defaultCosmetics) owned.add(d);

    const data: any = {};

    if (updates.equippedTitle !== undefined) {
      const trimmedTitle = updates.equippedTitle.trim().slice(0, 32);
      if (trimmedTitle && trimmedTitle !== 'Freshman Novice') {
        const milestonesData = await this.getMilestonesAndTrophies(id);
        const unlockedTitles = new Set(milestonesData.unlockedTitles);
        if (!unlockedTitles.has(trimmedTitle)) {
          throw new Error('Title is not unlocked yet.');
        }
      }
      data.equippedTitle = trimmedTitle || 'Freshman Novice';
    }

    if (updates.avatarId !== undefined) {
      if (!owned.has(updates.avatarId)) throw new Error('You do not own this avatar persona.');
      data.avatarId = updates.avatarId;
    }
    if (updates.avatarAura !== undefined) {
      if (!owned.has(updates.avatarAura)) throw new Error('You do not own this aura.');
      data.avatarAura = updates.avatarAura;
    }
    if (updates.avatarFrame !== undefined) {
      if (!owned.has(updates.avatarFrame)) throw new Error('You do not own this frame.');
      data.avatarFrame = updates.avatarFrame;
    }
    if (updates.avatarOutfit !== undefined) {
      if (!owned.has(updates.avatarOutfit)) throw new Error('You do not own this outfit.');
      data.avatarOutfit = updates.avatarOutfit;
    }
    if (updates.avatarHeadwear !== undefined) {
      if (!owned.has(updates.avatarHeadwear)) throw new Error('You do not own this headwear.');
      data.avatarHeadwear = updates.avatarHeadwear;
    }
    if (updates.avatarAccessory !== undefined) {
      if (!owned.has(updates.avatarAccessory)) throw new Error('You do not own this accessory.');
      data.avatarAccessory = updates.avatarAccessory;
    }
    if (updates.customBio !== undefined) {
      // Sanitize bio: remove newlines/control characters and clamp length
      data.customBio = updates.customBio.replace(/[\r\n\t\x00-\x1F]/g, ' ').trim().slice(0, 100);
    }

    const updated = await this.prisma.player.update({ where: { id }, data });
    return this.toState(updated);
  }

  async buyCosmetic(id: string, cosmeticId: string, _clientCost?: number): Promise<{ player: PersistentPlayerState; cosmeticId: string }> {
    const item = getCosmeticItem(cosmeticId);
    if (!item) {
      throw new Error('Invalid cosmetic item.');
    }

    if (item.cost <= 0 || (item.unlockCondition && item.unlockCondition.type !== 'CASH' && item.unlockCondition.type !== 'DEFAULT')) {
      throw new Error('This cosmetic cannot be purchased with cash. It must be unlocked via campus feats.');
    }

    const cost = item.cost;

    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new Error('Player not found.');

    const defaultCosmetics = ['avatar-coder', 'avatar-varsity', 'avatar-scholar', 'avatar-freshman', 'aura-none', 'outfit-hoodie', 'headwear-none', 'acc-laptop', 'frame-neon'];
    const owned = Array.isArray(player.ownedCosmetics) ? player.ownedCosmetics : defaultCosmetics;
    if (owned.includes(cosmeticId)) {
      throw new Error('You already own this cosmetic item in your Wardrobe Closet.');
    }

    if (player.cash < cost) {
      throw new Error(`Insufficient cash. Required: $${cost.toLocaleString()}, Current: $${player.cash.toLocaleString()}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const charged = await tx.player.updateMany({
        where: { id, cash: { gte: cost } },
        data: {
          cash: { decrement: cost },
          ownedCosmetics: [...owned, cosmeticId],
        },
      });

      if (charged.count !== 1) {
        throw new Error('Insufficient cash to complete transaction.');
      }

      const p = await tx.player.findUniqueOrThrow({ where: { id } });

      await tx.cashTransaction.create({
        data: {
          playerId: id,
          type: CashTransactionType.COSMETIC_PURCHASE,
          amount: -cost,
          balanceAfter: p.cash,
          reference: `buy-cosmetic:${cosmeticId}`,
        },
      });

      return p;
    }, { isolationLevel: 'Serializable' });

    return {
      player: this.toState(updated),
      cosmeticId,
    };
  }

  async claimCosmeticFeat(id: string, cosmeticId: string): Promise<{ player: PersistentPlayerState; cosmeticId: string }> {
    const item = getCosmeticItem(cosmeticId);
    if (!item) {
      throw new Error('Invalid cosmetic item.');
    }

    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new Error('Player not found.');

    const defaultCosmetics = ['avatar-coder', 'avatar-varsity', 'avatar-scholar', 'avatar-freshman', 'aura-none', 'outfit-hoodie', 'headwear-none', 'acc-laptop', 'frame-neon'];
    const owned = Array.isArray(player.ownedCosmetics) ? player.ownedCosmetics : defaultCosmetics;
    if (owned.includes(cosmeticId)) {
      throw new Error('You already have this feat cosmetic unlocked!');
    }

    // Verify unlocking condition
    if (item.unlockCondition) {
      const cond = item.unlockCondition;
      const threshold = cond.threshold || 0;
      let satisfied = false;

      switch (cond.type) {
        case 'WIN_STREAK':
          satisfied = Math.max(Number(player.highestStreak || 0), Number(player.winStreak || 0)) >= threshold;
          break;
        case 'NET_WORTH':
          satisfied = (Number(player.cash || 0) + Number(player.bankCash || 0)) >= threshold;
          break;
        case 'PVP_WINS':
          satisfied = Number(player.totalPvPWins || 0) >= threshold;
          break;
        case 'JOBS_COUNT':
          satisfied = Number(player.totalJobsCompleted || 0) >= threshold;
          break;
        case 'DEFAULT':
          satisfied = true;
          break;
        default:
          satisfied = false;
      }

      if (!satisfied) {
        throw new Error(`Campus feat not yet completed: ${cond.requirementText}`);
      }
    }

    const updated = await this.prisma.player.update({
      where: { id },
      data: {
        ownedCosmetics: [...owned, cosmeticId],
      },
    });

    return {
      player: this.toState(updated),
      cosmeticId,
    };
  }

  async getDailyQuests(id: string) {
    const player = await this.prisma.player.findUniqueOrThrow({ where: { id } });
    const today = this.getTodayString();

    let state = (player as any).dailyQuestsState;
    if ((player as any).dailyQuestsDate !== today || !state) {
      state = {
        'dq-jobs': { progress: 0, claimed: false },
        'dq-pvp': { progress: 0, claimed: false },
        'dq-bank': { progress: 0, claimed: false },
        bonusClaimed: false,
      };
      await this.prisma.player.update({
        where: { id },
        data: {
          dailyQuestsDate: today,
          dailyQuestsState: state,
        },
      });
    }

    const jobProg = Math.min(2, state['dq-jobs']?.progress || 0);
    const pvpProg = Math.min(2, state['dq-pvp']?.progress || 0);
    const bankProg = Math.min(500, state['dq-bank']?.progress || 0);

    const dailyQuests = [
      {
        id: 'dq-jobs',
        name: 'Campus Hustle',
        description: 'Complete 2 campus hackathons or side gigs today.',
        category: 'JOBS' as const,
        progress: jobProg,
        target: 2,
        rewardCash: 500,
        rewardEnergy: 2,
        completed: jobProg >= 2,
        claimed: Boolean(state['dq-jobs']?.claimed),
        iconName: 'Briefcase',
      },
      {
        id: 'dq-pvp',
        name: 'Arena Dominator',
        description: 'Win 2 PvP Arena battles against rival students.',
        category: 'PVP' as const,
        progress: pvpProg,
        target: 2,
        rewardCash: 1000,
        rewardEnergy: 3,
        completed: pvpProg >= 2,
        claimed: Boolean(state['dq-pvp']?.claimed),
        iconName: 'Swords',
      },
      {
        id: 'dq-bank',
        name: 'Safe Saver',
        description: 'Deposit at least $500 into your Campus Bank Vault today.',
        category: 'BANK' as const,
        progress: bankProg,
        target: 500,
        rewardCash: 400,
        rewardEnergy: 2,
        completed: bankProg >= 500,
        claimed: Boolean(state['dq-bank']?.claimed),
        iconName: 'Landmark',
      },
    ];

    const allDailyCompleted = dailyQuests.every((q) => q.completed);
    const dailyBonusClaimed = Boolean(state.bonusClaimed);

    return {
      dailyQuests,
      allDailyCompleted,
      dailyBonusClaimed,
      dailyBonusReward: { cash: 1500, energy: 10 },
      dailyStreak: player.dailyStreak || 1,
    };
  }

  async claimDailyQuest(id: string, questId: string) {
    return await this.prisma.$transaction(
      async (tx: any) => {
        const player = await tx.player.findUniqueOrThrow({ where: { id } });
        const today = this.getTodayString();

        let state = (player as any).dailyQuestsState;
        if ((player as any).dailyQuestsDate !== today || !state) {
          state = {
            'dq-jobs': { progress: 0, claimed: false },
            'dq-pvp': { progress: 0, claimed: false },
            'dq-bank': { progress: 0, claimed: false },
            bonusClaimed: false,
          };
        }

        const jobProg = Math.min(2, state['dq-jobs']?.progress || 0);
        const pvpProg = Math.min(2, state['dq-pvp']?.progress || 0);
        const bankProg = Math.min(500, state['dq-bank']?.progress || 0);

        const dailyQuests = [
          {
            id: 'dq-jobs',
            name: 'Campus Hustle',
            description: 'Complete 2 campus hackathons or side gigs today.',
            category: 'JOBS' as const,
            progress: jobProg,
            target: 2,
            rewardCash: 500,
            rewardEnergy: 2,
            completed: jobProg >= 2,
            claimed: Boolean(state['dq-jobs']?.claimed),
            iconName: 'Briefcase',
          },
          {
            id: 'dq-pvp',
            name: 'Arena Dominator',
            description: 'Win 2 PvP Arena battles against rival students.',
            category: 'PVP' as const,
            progress: pvpProg,
            target: 2,
            rewardCash: 1000,
            rewardEnergy: 3,
            completed: pvpProg >= 2,
            claimed: Boolean(state['dq-pvp']?.claimed),
            iconName: 'Swords',
          },
          {
            id: 'dq-bank',
            name: 'Safe Saver',
            description: 'Deposit at least $500 into your Campus Bank Vault today.',
            category: 'BANK' as const,
            progress: bankProg,
            target: 500,
            rewardCash: 400,
            rewardEnergy: 2,
            completed: bankProg >= 500,
            claimed: Boolean(state['dq-bank']?.claimed),
            iconName: 'Landmark',
          },
        ];

        const quest = dailyQuests.find((q) => q.id === questId);
        if (!quest) throw new Error('Daily quest not found.');
        if (!quest.completed) throw new Error('Quest is not completed yet.');
        if (quest.claimed) throw new Error('Quest reward already claimed.');

        if (!state[questId]) state[questId] = { progress: quest.target, claimed: false };
        state[questId].claimed = true;

        const newCash = Number(player.cash) + quest.rewardCash;
        const furn = await tx.playerDormFurniture.findMany({ where: { playerId: id } });
        const maxEnergy = 10 + (furn.some((f: any) => f.furnitureId === 'furn-coffee') ? 2 : 0);
        const newEnergy = Math.min(maxEnergy, (player.energy || 0) + quest.rewardEnergy);

        const updated = await tx.player.update({
          where: { id },
          data: {
            cash: newCash,
            energy: newEnergy,
            dailyQuestsDate: today,
            dailyQuestsState: state,
          },
        });

        await tx.cashTransaction.create({
          data: {
            playerId: id,
            type: CashTransactionType.JOB_REWARD,
            amount: quest.rewardCash,
            balanceAfter: newCash,
            reference: `Daily Quest Reward: ${quest.name}`,
          },
        });

        const updatedQuests = dailyQuests.map((q) =>
          q.id === questId ? { ...q, claimed: true } : q
        );
        const allDailyCompleted = updatedQuests.every((q) => q.completed);

        return {
          quest: { ...quest, claimed: true },
          player: this.toState(updated),
          dailyData: {
            dailyQuests: updatedQuests,
            allDailyCompleted,
            dailyBonusClaimed: Boolean(state.bonusClaimed),
            dailyBonusReward: { cash: 1500, energy: 10 },
            dailyStreak: updated.dailyStreak || 1,
          },
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async claimDailyBonus(id: string) {
    return await this.prisma.$transaction(
      async (tx: any) => {
        const player = await tx.player.findUniqueOrThrow({ where: { id } });
        const today = this.getTodayString();

        let state = (player as any).dailyQuestsState;
        if ((player as any).dailyQuestsDate !== today || !state) {
          throw new Error('Complete all 3 daily quests to unlock the Grand Daily Bonus.');
        }

        const jobProg = Math.min(2, state['dq-jobs']?.progress || 0);
        const pvpProg = Math.min(2, state['dq-pvp']?.progress || 0);
        const bankProg = Math.min(500, state['dq-bank']?.progress || 0);

        if (jobProg < 2 || pvpProg < 2 || bankProg < 500) {
          throw new Error('Complete all 3 daily quests to unlock the Grand Daily Bonus.');
        }

        if (Boolean(state.bonusClaimed)) {
          throw new Error('Grand Daily Bonus already claimed for today.');
        }

        state.bonusClaimed = true;

        const bonusCash = 1500;
        const furn = await tx.playerDormFurniture.findMany({ where: { playerId: id } });
        const maxEnergy = 10 + (furn.some((f: any) => f.furnitureId === 'furn-coffee') ? 2 : 0);
        const newCash = Number(player.cash) + bonusCash;
        const newStreak = (player.dailyStreak || 1) + 1;

        const updated = await tx.player.update({
          where: { id },
          data: {
            cash: newCash,
            energy: maxEnergy, // full energy refill
            dailyStreak: newStreak,
            dailyQuestsDate: today,
            dailyQuestsState: state,
          },
        });

        await tx.cashTransaction.create({
          data: {
            playerId: id,
            type: CashTransactionType.JOB_REWARD,
            amount: bonusCash,
            balanceAfter: newCash,
            reference: `Grand Daily Vault Bonus (Streak: ${newStreak} days)`,
          },
        });

        const dailyQuests = [
          {
            id: 'dq-jobs',
            name: 'Campus Hustle',
            description: 'Complete 2 campus hackathons or side gigs today.',
            category: 'JOBS' as const,
            progress: jobProg,
            target: 2,
            rewardCash: 500,
            rewardEnergy: 2,
            completed: true,
            claimed: Boolean(state['dq-jobs']?.claimed),
            iconName: 'Briefcase',
          },
          {
            id: 'dq-pvp',
            name: 'Arena Dominator',
            description: 'Win 2 PvP Arena battles against rival students.',
            category: 'PVP' as const,
            progress: pvpProg,
            target: 2,
            rewardCash: 1000,
            rewardEnergy: 3,
            completed: true,
            claimed: Boolean(state['dq-pvp']?.claimed),
            iconName: 'Swords',
          },
          {
            id: 'dq-bank',
            name: 'Safe Saver',
            description: 'Deposit at least $500 into your Campus Bank Vault today.',
            category: 'BANK' as const,
            progress: bankProg,
            target: 500,
            rewardCash: 400,
            rewardEnergy: 2,
            completed: true,
            claimed: Boolean(state['dq-bank']?.claimed),
            iconName: 'Landmark',
          },
        ];

        return {
          player: this.toState(updated),
          dailyData: {
            dailyQuests,
            allDailyCompleted: true,
            dailyBonusClaimed: true,
            dailyBonusReward: { cash: 1500, energy: 10 },
            dailyStreak: newStreak,
          },
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async recordDailyAction(id: string, actionType: 'job' | 'pvp' | 'bank', amount = 1) {
    try {
      await this.prisma.$transaction(
        async (tx: any) => {
          const player = await tx.player.findUnique({ where: { id } });
          if (!player) return;
          const today = this.getTodayString();

          let state = (player as any).dailyQuestsState;
          if ((player as any).dailyQuestsDate !== today || !state) {
            state = {
              'dq-jobs': { progress: 0, claimed: false },
              'dq-pvp': { progress: 0, claimed: false },
              'dq-bank': { progress: 0, claimed: false },
              bonusClaimed: false,
            };
          }

          if (actionType === 'job') {
            state['dq-jobs'] = state['dq-jobs'] || { progress: 0, claimed: false };
            state['dq-jobs'].progress = (state['dq-jobs'].progress || 0) + amount;
          } else if (actionType === 'pvp') {
            state['dq-pvp'] = state['dq-pvp'] || { progress: 0, claimed: false };
            state['dq-pvp'].progress = (state['dq-pvp'].progress || 0) + amount;
          } else if (actionType === 'bank') {
            state['dq-bank'] = state['dq-bank'] || { progress: 0, claimed: false };
            state['dq-bank'].progress = (state['dq-bank'].progress || 0) + amount;
          }

          await tx.player.update({
            where: { id },
            data: {
              dailyQuestsDate: today,
              dailyQuestsState: state,
            },
          });
        },
        { isolationLevel: 'Serializable' }
      );
    } catch {
      // Best-effort daily action recording
    }
  }

  getMilestoneDefinitions(
    player: any,
    netWorth: number,
    totalStats: number,
    unlockedRoomsCount: number,
    playerOccupantsCount: number,
    maxAllyLevel: number,
    furnitureCount: number
  ) {
    return [
      // Wealth & Empire
      {
        id: 'ms-wealth-1',
        title: 'First Paycheck',
        category: 'WEALTH' as const,
        description: 'Earn and accumulate at least $1,000 pocket cash.',
        rewardCash: 500,
        rewardEnergy: 2,
        rewardTitle: 'Freshman Earner',
        iconName: 'Coins',
        progress: Math.min(1000, Number(player.cash)),
        target: 1000,
      },
      {
        id: 'ms-wealth-2',
        title: 'Campus Capitalist',
        category: 'WEALTH' as const,
        description: 'Reach a total net worth of $10,000 across pocket and vault.',
        rewardCash: 1500,
        rewardEnergy: 3,
        rewardTitle: 'Campus Capitalist',
        iconName: 'Briefcase',
        progress: Math.min(10000, netWorth),
        target: 10000,
      },
      {
        id: 'ms-wealth-3',
        title: 'Silicon Tycoon',
        category: 'WEALTH' as const,
        description: 'Amass an empire of $50,000 Net Worth on campus.',
        rewardCash: 5000,
        rewardEnergy: 5,
        rewardTitle: 'Silicon Tycoon',
        iconName: 'Crown',
        progress: Math.min(50000, netWorth),
        target: 50000,
      },
      {
        id: 'ms-bank-1',
        title: 'Safe Investor',
        category: 'WEALTH' as const,
        description: 'Store at least $1,000 in your Campus Bank Vault.',
        rewardCash: 500,
        rewardEnergy: 2,
        rewardTitle: 'Vault Rookie',
        iconName: 'Shield',
        progress: Math.min(1000, Number(player.bankCash || 0)),
        target: 1000,
      },
      {
        id: 'ms-bank-2',
        title: 'Fort Knox',
        category: 'WEALTH' as const,
        description: 'Secure $10,000 or more in the Campus Bank Vault.',
        rewardCash: 2500,
        rewardEnergy: 4,
        rewardTitle: 'Master Banker',
        iconName: 'Landmark',
        progress: Math.min(10000, Number(player.bankCash || 0)),
        target: 10000,
      },

      // PvP & Combat
      {
        id: 'ms-combat-1',
        title: 'First Blood',
        category: 'COMBAT' as const,
        description: 'Win your first PvP Arena battle against a rival student.',
        rewardCash: 500,
        rewardEnergy: 2,
        rewardTitle: 'Quad Contender',
        iconName: 'Swords',
        progress: Math.min(1, Number(player.totalPvPWins || 0)),
        target: 1,
      },
      {
        id: 'ms-combat-2',
        title: 'Quad Menace',
        category: 'COMBAT' as const,
        description: 'Win 10 PvP battles in the campus arena.',
        rewardCash: 2000,
        rewardEnergy: 4,
        rewardTitle: 'Quad Menace',
        iconName: 'Flame',
        progress: Math.min(10, Number(player.totalPvPWins || 0)),
        target: 10,
      },
      {
        id: 'ms-combat-3',
        title: 'Arena Predator',
        category: 'COMBAT' as const,
        description: 'Dominate rivals with 25 total PvP Arena victories.',
        rewardCash: 5000,
        rewardEnergy: 5,
        rewardTitle: 'Arena Predator',
        iconName: 'Skull',
        progress: Math.min(25, Number(player.totalPvPWins || 0)),
        target: 25,
      },
      {
        id: 'ms-streak-1',
        title: 'Hot Streak',
        category: 'COMBAT' as const,
        description: 'Achieve a 3x consecutive PvP win streak.',
        rewardCash: 1000,
        rewardEnergy: 2,
        rewardTitle: 'Streak Demon',
        iconName: 'Zap',
        progress: Math.min(3, Number(player.highestStreak || player.winStreak || 0)),
        target: 3,
      },
      {
        id: 'ms-streak-2',
        title: 'Unstoppable Force',
        category: 'COMBAT' as const,
        description: 'Achieve an elite 6x consecutive PvP win streak.',
        rewardCash: 3500,
        rewardEnergy: 5,
        rewardTitle: 'Unstoppable Force',
        iconName: 'Trophy',
        progress: Math.min(6, Number(player.highestStreak || player.winStreak || 0)),
        target: 6,
      },
      {
        id: 'ms-plunder-1',
        title: 'Campus Raider',
        category: 'COMBAT' as const,
        description: 'Plunder a cumulative total of $5,000 from rival students.',
        rewardCash: 2500,
        rewardEnergy: 3,
        rewardTitle: 'Campus Raider',
        iconName: 'DollarSign',
        progress: Math.min(5000, Number(player.totalPlundered || 0)),
        target: 5000,
      },

      // Tower & Allies
      {
        id: 'ms-tower-1',
        title: 'Suite Starter',
        category: 'TOWER' as const,
        description: 'Unlock 3 tower dorm suites for your team.',
        rewardCash: 1000,
        rewardEnergy: 2,
        rewardTitle: 'Dorm Resident',
        iconName: 'Building',
        progress: Math.min(3, unlockedRoomsCount),
        target: 3,
      },
      {
        id: 'ms-tower-2',
        title: 'Tower Landlord',
        category: 'TOWER' as const,
        description: 'Unlock all 8 dormitory suites across the campus tower.',
        rewardCash: 6000,
        rewardEnergy: 6,
        rewardTitle: 'Tower Landlord',
        iconName: 'Key',
        progress: Math.min(8, unlockedRoomsCount),
        target: 8,
      },
      {
        id: 'ms-ally-1',
        title: 'Frat Recruiter',
        category: 'TOWER' as const,
        description: 'Recruit at least 4 dormmates into your tower suites.',
        rewardCash: 1200,
        rewardEnergy: 2,
        rewardTitle: 'Frat Recruiter',
        iconName: 'Users',
        progress: Math.min(4, playerOccupantsCount),
        target: 4,
      },
      {
        id: 'ms-ally-2',
        title: "Dean's Syndicate",
        category: 'TOWER' as const,
        description: 'Promote any dormmate to Level 5 mastery.',
        rewardCash: 3000,
        rewardEnergy: 4,
        rewardTitle: 'Frat President',
        iconName: 'Star',
        progress: Math.min(5, maxAllyLevel),
        target: 5,
      },
      {
        id: 'ms-furn-1',
        title: 'Tech Fortress',
        category: 'TOWER' as const,
        description: 'Equip at least 3 dorm room perks & furniture items.',
        rewardCash: 2500,
        rewardEnergy: 3,
        rewardTitle: 'Silicon Prodigy',
        iconName: 'Cpu',
        progress: Math.min(3, furnitureCount),
        target: 3,
      },

      // Academics & Stats
      {
        id: 'ms-power-1',
        title: 'Iron Geek',
        category: 'ACADEMIC' as const,
        description: 'Build your campus tower team Power to 25+.',
        rewardCash: 1500,
        rewardEnergy: 2,
        rewardTitle: 'Varsity Captain',
        iconName: 'Dumbbell',
        progress: Math.min(25, Number(player.power)),
        target: 25,
      },
      {
        id: 'ms-smart-1',
        title: 'Valedictorian',
        category: 'ACADEMIC' as const,
        description: 'Boost your campus tower team Smartness to 25+.',
        rewardCash: 1500,
        rewardEnergy: 2,
        rewardTitle: 'Valedictorian',
        iconName: 'GraduationCap',
        progress: Math.min(25, Number(player.smartness)),
        target: 25,
      },
      {
        id: 'ms-legend-1',
        title: 'Campus Legend',
        category: 'ACADEMIC' as const,
        description: 'Achieve 50+ Total Combined Stats (Power + Smartness).',
        rewardCash: 4000,
        rewardEnergy: 5,
        rewardTitle: 'Campus Legend',
        iconName: 'Award',
        progress: Math.min(50, totalStats),
        target: 50,
      },
    ];
  }

  async getMilestonesAndTrophies(id: string) {
    const player = await this.prisma.player.findUniqueOrThrow({ where: { id } });
    const claimedSet = new Set((player.claimedMilestones as string[]) || []);

    const rooms = await this.prisma.towerRoom.findMany({ where: { playerId: id } });
    const unlockedRoomsCount = rooms.filter((r: any) => r.unlocked !== false).length;
    const roomIds = new Set(rooms.map((r) => r.id));
    const occupants = await this.prisma.roomOccupant.findMany();
    const playerOccupants = occupants.filter((o) => roomIds.has(o.towerRoomId));
    const maxAllyLevel = playerOccupants.reduce((max, o) => Math.max(max, o.level || 1), 0);
    const furniture = await this.prisma.playerDormFurniture.findMany({ where: { playerId: id } });
    const netWorth = Number(player.cash) + Number(player.bankCash || 0);
    const totalStats = Number(player.power) + Number(player.smartness);

    const definitions = this.getMilestoneDefinitions(
      player,
      netWorth,
      totalStats,
      unlockedRoomsCount,
      playerOccupants.length,
      maxAllyLevel,
      furniture.length
    );

    const milestones = definitions.map((m) => ({
      ...m,
      completed: m.progress >= m.target,
      claimed: claimedSet.has(m.id),
    }));

    const defaultTitles = ['Freshman Novice', 'Campus Geek', 'Code Monkey', 'Gym Enthusiast'];
    const unlockedTitles = [
      ...defaultTitles,
      ...milestones.filter((m) => m.completed).map((m) => m.rewardTitle),
    ];
    const uniqueUnlockedTitles = Array.from(new Set(unlockedTitles));

    const availableTitles = [
      { id: 't-novice', title: 'Freshman Novice', unlocked: true, requirement: 'Default Starter Title' },
      { id: 't-geek', title: 'Campus Geek', unlocked: true, requirement: 'Default Starter Title' },
      { id: 't-code', title: 'Code Monkey', unlocked: true, requirement: 'Default Starter Title' },
      { id: 't-gym', title: 'Gym Enthusiast', unlocked: true, requirement: 'Default Starter Title' },
      ...milestones.map((m) => ({
        id: `t-${m.id}`,
        title: m.rewardTitle,
        unlocked: m.completed,
        requirement: `${m.title}: ${m.description}`,
      })),
    ];

    return {
      milestones,
      unlockedTitles: uniqueUnlockedTitles,
      availableTitles,
      claimedCount: milestones.filter((m) => m.claimed).length,
      totalCount: milestones.length,
    };
  }

  async claimMilestone(id: string, milestoneId: string) {
    return await this.prisma.$transaction(
      async (tx: any) => {
        const player = await tx.player.findUniqueOrThrow({ where: { id } });
        const claimedSet = new Set((player.claimedMilestones as string[]) || []);

        const rooms = await tx.towerRoom.findMany({ where: { playerId: id } });
        const unlockedRoomsCount = rooms.filter((r: any) => r.unlocked !== false).length;
        const roomIds = new Set(rooms.map((r: any) => r.id));
        const occupants = await tx.roomOccupant.findMany();
        const playerOccupants = occupants.filter((o: any) => roomIds.has(o.towerRoomId));
        const maxAllyLevel = playerOccupants.reduce((max: number, o: any) => Math.max(max, o.level || 1), 0);
        const furniture = await tx.playerDormFurniture.findMany({ where: { playerId: id } });
        const netWorth = Number(player.cash) + Number(player.bankCash || 0);
        const totalStats = Number(player.power) + Number(player.smartness);

        const definitions = this.getMilestoneDefinitions(
          player,
          netWorth,
          totalStats,
          unlockedRoomsCount,
          playerOccupants.length,
          maxAllyLevel,
          furniture.length
        );

        const ms = definitions.find((m) => m.id === milestoneId);
        if (!ms) throw new Error('Milestone not found.');
        if (ms.progress < ms.target) throw new Error('Milestone requirement has not been met.');
        if (claimedSet.has(milestoneId)) throw new Error('Milestone reward already claimed.');

        const currentClaimed = Array.isArray(player.claimedMilestones) ? [...player.claimedMilestones] : [];
        currentClaimed.push(milestoneId);

        const newCash = Number(player.cash) + ms.rewardCash;
        const maxEnergy = 10 + (furniture.some((f: any) => f.furnitureId === 'furn-coffee') ? 2 : 0);
        const newEnergy = Math.min(maxEnergy, (player.energy || 0) + ms.rewardEnergy);

        const updated = await tx.player.update({
          where: { id },
          data: {
            cash: newCash,
            energy: newEnergy,
            claimedMilestones: currentClaimed,
          },
        });

        await tx.cashTransaction.create({
          data: {
            playerId: id,
            type: CashTransactionType.JOB_REWARD,
            amount: ms.rewardCash,
            balanceAfter: newCash,
            reference: `Trophy Milestone Reward: ${ms.title} (Title: ${ms.rewardTitle})`,
          },
        });

        const updatedClaimedSet = new Set(currentClaimed);
        const updatedMilestones = definitions.map((m) => ({
          ...m,
          completed: m.progress >= m.target,
          claimed: updatedClaimedSet.has(m.id),
        }));

        const defaultTitles = ['Freshman Novice', 'Campus Geek', 'Code Monkey', 'Gym Enthusiast'];
        const unlockedTitles = Array.from(
          new Set([
            ...defaultTitles,
            ...updatedMilestones.filter((m) => m.completed).map((m) => m.rewardTitle),
          ])
        );

        const availableTitles = [
          { id: 't-novice', title: 'Freshman Novice', unlocked: true, requirement: 'Default Starter Title' },
          { id: 't-geek', title: 'Campus Geek', unlocked: true, requirement: 'Default Starter Title' },
          { id: 't-code', title: 'Code Monkey', unlocked: true, requirement: 'Default Starter Title' },
          { id: 't-gym', title: 'Gym Enthusiast', unlocked: true, requirement: 'Default Starter Title' },
          ...updatedMilestones.map((m) => ({
            id: `t-${m.id}`,
            title: m.rewardTitle,
            unlocked: m.completed,
            requirement: `${m.title}: ${m.description}`,
          })),
        ];

        return {
          milestone: {
            ...ms,
            completed: true,
            claimed: true,
          },
          player: this.toState(updated),
          trophiesData: {
            milestones: updatedMilestones,
            unlockedTitles,
            availableTitles,
            claimedCount: updatedMilestones.filter((m) => m.claimed).length,
            totalCount: updatedMilestones.length,
          },
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  private async getMaxEnergyBonus(playerId: string): Promise<number> {
    const furn = await this.prisma.playerDormFurniture.findMany({ where: { playerId } });
    return furn.some((f) => f.furnitureId === 'furn-coffee') ? 2 : 0;
  }

  async addCash(id: string, amount: number, type: CashTransactionType, reference?: string): Promise<PersistentPlayerState> {
    this.validateAmount(amount);
    const player = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.player.update({ where: { id }, data: { cash: { increment: amount } } });
      await tx.cashTransaction.create({ data: { playerId: id, type, amount, balanceAfter: updated.cash, reference } });
      return updated;
    }, { isolationLevel: 'Serializable' });
    return this.toState(player);
  }

  async spendCash(id: string, amount: number, type: CashTransactionType, reference?: string): Promise<PersistentPlayerState> {
    this.validateAmount(amount);
    const player = await this.prisma.$transaction(async (tx) => {
      const charged = await tx.player.updateMany({ where: { id, cash: { gte: amount } }, data: { cash: { decrement: amount } } });
      if (charged.count !== 1) {
        const exists = await tx.player.findUnique({ where: { id }, select: { id: true } });
        if (!exists) throw new Error('Player not found.');
        throw new Error('Insufficient cash.');
      }
      const updated = await tx.player.findUniqueOrThrow({ where: { id } });
      await tx.cashTransaction.create({ data: { playerId: id, type, amount: -amount, balanceAfter: updated.cash, reference } });
      return updated;
    }, { isolationLevel: 'Serializable' });
    return this.toState(player);
  }

  async depositBank(id: string, amount: number): Promise<{ player: PersistentPlayerState; depositedNet: number; fee: number }> {
    this.validateAmount(amount);
    const intAmount = Math.floor(amount);
    if (intAmount < 10) throw new Error('Minimum deposit amount is $10.');

    const fee = Math.floor(intAmount * 0.05); // 5% banking security fee
    const netDeposit = intAmount - fee;

    const player = await this.prisma.$transaction(async (tx) => {
      const charged = await tx.player.updateMany({
        where: { id, cash: { gte: intAmount } },
        data: {
          cash: { decrement: intAmount },
          bankCash: { increment: netDeposit },
          totalBankDeposited: { increment: netDeposit },
        },
      });
      if (charged.count !== 1) {
        const exists = await tx.player.findUnique({ where: { id }, select: { id: true } });
        if (!exists) throw new Error('Player not found.');
        throw new Error('Insufficient pocket cash to deposit.');
      }
      const updated = await tx.player.findUniqueOrThrow({ where: { id } });
      await tx.cashTransaction.createMany({
        data: [
          { playerId: id, type: CashTransactionType.BANK_DEPOSIT, amount: netDeposit, balanceAfter: updated.cash, reference: `Net Bank Deposit (Gross: $${intAmount})` },
          { playerId: id, type: CashTransactionType.BANK_DEPOSIT_FEE, amount: -fee, balanceAfter: updated.cash, reference: `5% Bank Processing Fee` },
        ],
      });
      return updated;
    }, { isolationLevel: 'Serializable' });

    await this.recordDailyAction(id, 'bank', netDeposit);

    return { player: this.toState(player), depositedNet: netDeposit, fee };
  }

  async withdrawBank(id: string, amount: number): Promise<{ player: PersistentPlayerState; withdrawn: number }> {
    this.validateAmount(amount);
    const intAmount = Math.floor(amount);
    if (intAmount < 1) throw new Error('Minimum withdrawal amount is $1.');

    const player = await this.prisma.$transaction(async (tx) => {
      const withdrawn = await tx.player.updateMany({
        where: { id, bankCash: { gte: intAmount } },
        data: { bankCash: { decrement: intAmount }, cash: { increment: intAmount } },
      });
      if (withdrawn.count !== 1) {
        const exists = await tx.player.findUnique({ where: { id }, select: { id: true } });
        if (!exists) throw new Error('Player not found.');
        throw new Error('Insufficient funds in Campus Bank vault.');
      }
      const updated = await tx.player.findUniqueOrThrow({ where: { id } });
      await tx.cashTransaction.create({
        data: { playerId: id, type: CashTransactionType.BANK_WITHDRAW, amount: intAmount, balanceAfter: updated.cash, reference: `ATM Vault Withdrawal` },
      });
      return updated;
    }, { isolationLevel: 'Serializable' });

    return { player: this.toState(player), withdrawn: intAmount };
  }

  async getTransactionHistory(
    playerId: string,
    options?: { limit?: number; offset?: number; type?: string }
  ) {
    return this.walletRepository.listTransactions(playerId, options);
  }

  async getDormFurniture(playerId: string) {
    return this.furnitureRepository.getDormFurnitureWithOwnership(playerId);
  }

  async buyDormFurniture(playerId: string, furnitureId: string) {
    const result = await this.furnitureRepository.buyFurniture(playerId, furnitureId);
    return {
      furniture: result.furniture,
      player: this.toState(result.player),
    };
  }

  async updateStats(id: string, powerDelta: number, smartnessDelta: number): Promise<PersistentPlayerState> {
    if (!Number.isInteger(powerDelta) || powerDelta < 0) throw new Error('powerDelta must be a non-negative integer.');
    if (!Number.isInteger(smartnessDelta) || smartnessDelta < 0) throw new Error('smartnessDelta must be a non-negative integer.');
    const player = await this.prisma.player.update({ where: { id }, data: { power: { increment: powerDelta }, smartness: { increment: smartnessDelta } } });
    return this.toState(player);
  }

  async setEnergy(id: string, energy: number): Promise<PersistentPlayerState> {
    if (!Number.isInteger(energy) || energy < 0) throw new Error('energy must be a non-negative integer.');
    const player = await this.prisma.player.update({ where: { id }, data: { energy } });
    return this.toState(player);
  }

  async consumeEnergy(id: string, amount: number = 1): Promise<PersistentPlayerState> {
    if (amount <= 0 || !Number.isSafeInteger(amount)) {
      throw new Error('Energy amount must be a positive integer.');
    }
    const maxEnergy = 10;
    const regenSeconds = 420;
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
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

      return tx.player.findUniqueOrThrow({ where: { id } });
    });

    return this.toState(updated);
  }

  private validateAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.floor(amount))) {
      throw new Error('amount must be a positive integer.');
    }
  }
  private toState(player: any): PersistentPlayerState {
    const now = new Date();
    const lastEnergyUpdate = player.lastEnergyUpdate ? new Date(player.lastEnergyUpdate) : now;
    const lastMoraleUpdate = player.lastMoraleUpdate ? new Date(player.lastMoraleUpdate) : now;
    
    // Default capacity limits
    const maxEnergy = 10;
    const maxMorale = 10;
    
    // Regen rate: 1 unit per 420 seconds (7 minutes)
    const energyElapsed = Math.max(0, Math.floor((now.getTime() - lastEnergyUpdate.getTime()) / 1000));
    const energyRegen = Math.floor(energyElapsed / 420);
    const liveEnergy = Math.min(maxEnergy, Number(player.energy ?? 0) + energyRegen);

    const moraleElapsed = Math.max(0, Math.floor((now.getTime() - lastMoraleUpdate.getTime()) / 1000));
    const moraleRegen = Math.floor(moraleElapsed / 420);
    const liveMorale = Math.min(maxMorale, Number(player.morale ?? 10) + moraleRegen);

    const pinnedDate = player.pinnedUntil ? new Date(player.pinnedUntil) : null;
    const isPinned = Boolean(pinnedDate && pinnedDate.getTime() > now.getTime());
    const pinnedSecondsRemaining = isPinned ? Math.max(0, Math.ceil((pinnedDate!.getTime() - now.getTime()) / 1000)) : 0;

    const effectiveLastEnergy = (liveEnergy >= maxEnergy
      ? now
      : new Date(lastEnergyUpdate.getTime() + energyRegen * 420 * 1000)
    ).toISOString();

    return {
      id: player.id,
      isBot: Boolean(player.isBot === true),
      username: player.username,
      email: player.email,
      cash: Number(player.cash ?? 0),
      bankCash: Number(player.bankCash ?? 0),
      energy: liveEnergy,
      maxEnergy,
      morale: liveMorale,
      maxMorale,
      power: Number(player.power ?? 0),
      smartness: Number(player.smartness ?? 0),
      winStreak: Number(player.winStreak ?? 0),
      highestStreak: Number(player.highestStreak ?? 0),
      totalPvPWins: Number(player.totalPvPWins ?? 0),
      totalPvPLosses: Number(player.totalPvPLosses ?? 0),
      totalPlundered: Number(player.totalPlundered ?? 0),
      equippedTitle: player.equippedTitle || 'Freshman Novice',
      avatarId: player.avatarId || 'avatar-coder',
      avatarAura: player.avatarAura || 'aura-none',
      avatarFrame: player.avatarFrame || 'frame-neon',
      avatarOutfit: player.avatarOutfit || 'outfit-hoodie',
      avatarHeadwear: player.avatarHeadwear || 'headwear-none',
      avatarAccessory: player.avatarAccessory || 'acc-laptop',
      ownedCosmetics: Array.isArray(player.ownedCosmetics) ? player.ownedCosmetics : ['avatar-coder', 'avatar-varsity', 'avatar-scholar', 'avatar-freshman', 'aura-none', 'outfit-hoodie', 'headwear-none', 'acc-laptop', 'frame-neon'],
      customBio: player.customBio ?? 'Ready to conquer the campus empire! 💻💸',
      claimedMilestones: Array.isArray(player.claimedMilestones) ? player.claimedMilestones : [],
      totalJobsCompleted: Number(player.totalJobsCompleted ?? 0),
      totalBankDeposited: Number(player.totalBankDeposited ?? 0),
      dailyStreak: Number(player.dailyStreak ?? 1),
      lastEnergyUpdate: effectiveLastEnergy,
      pinnedUntil: pinnedDate ? pinnedDate.toISOString() : null,
      isPinned,
      pinnedSecondsRemaining,
    };
  }

  // --- Campus Buddies & Friends System ---
  async getFriends(playerId: string) {
    const allFriendships = await this.friendshipRepository.listForPlayer(playerId);

    const now = Date.now();
    const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;

    const friendsList: any[] = [];
    const incomingRequests: any[] = [];
    const outgoingRequests: any[] = [];

    for (const f of allFriendships) {
      if (f.status === 'ACCEPTED') {
        const isSender = f.senderId === playerId;
        const friendId = isSender ? f.receiverId : f.senderId;
        let friendProfile = isSender ? f.receiver : f.sender;

        if (!friendProfile || friendProfile.power === undefined) {
          const rawFriend = await this.prisma.player.findUnique({ where: { id: friendId } });
          if (rawFriend) {
            const friendState = this.toState(rawFriend);
            friendProfile = {
              id: friendState.id,
              username: friendState.username,
              power: friendState.power,
              smartness: friendState.smartness,
              equippedTitle: friendState.equippedTitle,
              avatarId: friendState.avatarId,
              avatarAura: friendState.avatarAura,
              avatarFrame: friendState.avatarFrame,
              avatarOutfit: friendState.avatarOutfit,
              avatarAccessory: friendState.avatarAccessory,
            };
          }
        }

        if (friendProfile) {
          const lastSentTime = f.lastGiftSentAt ? new Date(f.lastGiftSentAt).getTime() : 0;
          const canSendGift = !f.lastGiftSentAt || (now - lastSentTime > TWENTY_HOURS_MS);

          friendsList.push({
            friendshipId: f.id,
            friendId: friendProfile.id,
            username: friendProfile.username,
            power: friendProfile.power ?? 0,
            smartness: friendProfile.smartness ?? 0,
            equippedTitle: friendProfile.equippedTitle,
            avatarId: friendProfile.avatarId,
            avatarAura: friendProfile.avatarAura,
            avatarFrame: friendProfile.avatarFrame,
            avatarOutfit: friendProfile.avatarOutfit,
            avatarAccessory: friendProfile.avatarAccessory,
            canSendGift,
            lastGiftSentAt: f.lastGiftSentAt ? new Date(f.lastGiftSentAt).toISOString() : null,
          });
        }
      } else if (f.status === 'PENDING') {
        if (f.receiverId === playerId) {
          let senderProfile = f.sender;
          if (!senderProfile || senderProfile.power === undefined) {
            const rawSender = await this.prisma.player.findUnique({ where: { id: f.senderId } });
            if (rawSender) {
              const senderState = this.toState(rawSender);
              senderProfile = {
                id: senderState.id,
                username: senderState.username,
                power: senderState.power,
                smartness: senderState.smartness,
                equippedTitle: senderState.equippedTitle,
                avatarId: senderState.avatarId,
                avatarFrame: senderState.avatarFrame,
              };
            }
          }
          if (senderProfile) {
            incomingRequests.push({
              friendshipId: f.id,
              senderId: senderProfile.id,
              username: senderProfile.username,
              power: senderProfile.power ?? 0,
              smartness: senderProfile.smartness ?? 0,
              equippedTitle: senderProfile.equippedTitle,
              avatarId: senderProfile.avatarId,
              avatarFrame: senderProfile.avatarFrame,
              createdAt: new Date(f.createdAt).toISOString(),
            });
          }
        } else if (f.senderId === playerId) {
          let receiverProfile = f.receiver;
          if (!receiverProfile || !receiverProfile.username) {
            const rawReceiver = await this.prisma.player.findUnique({ where: { id: f.receiverId } });
            if (rawReceiver) {
              receiverProfile = {
                id: rawReceiver.id,
                username: rawReceiver.username,
                power: rawReceiver.power ?? 0,
                smartness: rawReceiver.smartness ?? 0,
                equippedTitle: rawReceiver.equippedTitle,
                avatarId: rawReceiver.avatarId,
                avatarFrame: rawReceiver.avatarFrame,
              };
            }
          }
          if (receiverProfile) {
            outgoingRequests.push({
              friendshipId: f.id,
              receiverId: receiverProfile.id,
              username: receiverProfile.username,
              createdAt: new Date(f.createdAt).toISOString(),
            });
          }
        }
      }
    }

    return {
      friends: friendsList,
      requests: {
        incoming: incomingRequests,
        outgoing: outgoingRequests,
      },
    };
  }

  async sendFriendRequest(senderId: string, targetUsername: string) {
    const cleanTarget = targetUsername.trim().toLowerCase();
    const allPlayers = await this.prisma.player.findMany({});
    const targetPlayer = allPlayers.find((p) => p.username.toLowerCase() === cleanTarget);

    if (!targetPlayer) {
      throw new Error(`Student "${targetUsername}" not found on campus.`);
    }

    if (targetPlayer.isBot) {
      throw new Error(`"${targetPlayer.username}" is a campus sparring bot. You can only send friend requests to real students.`);
    }

    if (targetPlayer.id === senderId) {
      throw new Error('You cannot add yourself as a buddy!');
    }

    // Check if friendship already exists
    const existing = await this.friendshipRepository.findRelationship(senderId, targetPlayer.id);

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new Error(`You are already buddies with ${targetPlayer.username}!`);
      }
      if (existing.status === 'PENDING') {
        if (existing.senderId === senderId) {
          throw new Error('Friend request already sent and pending.');
        } else {
          // Auto accept since both wanted it!
          await this.friendshipRepository.updateStatus(existing.id, 'ACCEPTED');
          return { message: `You and ${targetPlayer.username} are now Study Buddies!`, friendshipId: existing.id };
        }
      }
    }

    const created = await this.friendshipRepository.createRequest({
      senderId,
      receiverId: targetPlayer.id,
      status: 'PENDING',
    });

    return { message: `Buddy request sent to ${targetPlayer.username}!`, friendshipId: created.id };
  }

  async respondFriendRequest(playerId: string, friendshipId: string, accept: boolean) {
    const f = await this.friendshipRepository.findById(friendshipId);
    if (!f || f.receiverId !== playerId) {
      throw new Error('Friendship request not found or unauthorized.');
    }

    if (f.status !== 'PENDING') {
      throw new Error('This request has already been resolved.');
    }

    if (!accept) {
      await this.friendshipRepository.deleteById(friendshipId);
      return { message: 'Friend request declined.' };
    }

    // Accept request
    await this.friendshipRepository.updateStatus(friendshipId, 'ACCEPTED');

    // Reward both players with $100 Karma Cash bonus
    const sender = await this.prisma.player.findUnique({ where: { id: f.senderId } });
    const receiver = await this.prisma.player.findUnique({ where: { id: f.receiverId } });

    if (sender) {
      await this.walletRepository.addCash(sender.id, 100, CashTransactionType.ADMIN_ADJUSTMENT, 'Study Buddies acceptance bonus').catch(async () => {
        await this.prisma.player.update({ where: { id: sender.id }, data: { cash: { increment: 100 } } });
      });
    }
    if (receiver) {
      await this.walletRepository.addCash(receiver.id, 100, CashTransactionType.ADMIN_ADJUSTMENT, 'Study Buddies acceptance bonus').catch(async () => {
        await this.prisma.player.update({ where: { id: receiver.id }, data: { cash: { increment: 100 } } });
      });
    }

    return { message: `Accepted! You and ${sender?.username || 'your classmate'} are now Study Buddies! +$100 Karma Cash awarded!` };
  }

  async sendCarePackage(senderId: string, friendshipId: string) {
    const f = await this.friendshipRepository.findById(friendshipId);
    if (!f || (f.senderId !== senderId && f.receiverId !== senderId) || f.status !== 'ACCEPTED') {
      throw new Error('Active friendship not found.');
    }

    const friendId = f.senderId === senderId ? f.receiverId : f.senderId;
    const now = Date.now();
    const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;

    if (f.lastGiftSentAt) {
      const diff = now - new Date(f.lastGiftSentAt).getTime();
      if (diff < TWENTY_HOURS_MS) {
        const remainingMinutes = Math.ceil((TWENTY_HOURS_MS - diff) / 60000);
        throw new Error(`Care package already sent today. Next care package ready in ${remainingMinutes}m.`);
      }
    }

    // Update friendship
    await this.friendshipRepository.updateLastGiftSentAt(friendshipId, new Date());

    // Reward sender with $100 Karma Cash
    let updatedSenderState: PersistentPlayerState;
    try {
      const walletRes = await this.walletRepository.addCash(senderId, 100, CashTransactionType.ADMIN_ADJUSTMENT, 'Care package reward');
      const freshSender = await this.prisma.player.findUnique({ where: { id: senderId } });
      updatedSenderState = freshSender ? this.toState(freshSender) : this.toState(walletRes.player);
    } catch {
      const updatedSender = await this.prisma.player.update({
        where: { id: senderId },
        data: { cash: { increment: 100 } },
      });
      updatedSenderState = this.toState(updatedSender);
    }

    // Reward friend with +1 Energy or +1 Morale
    const friend = await this.prisma.player.findUnique({ where: { id: friendId } });
    if (friend) {
      await this.prisma.player.update({
        where: { id: friendId },
        data: {
          energy: { increment: 1 },
          morale: { increment: 1 },
        },
      });
    }

    return {
      message: `Sent campus coffee & study notes to ${friend?.username || 'buddy'}! Earned +$100 Karma Cash!`,
      player: updatedSenderState,
    };
  }

  async removeFriend(playerId: string, friendshipId: string) {
    const f = await this.friendshipRepository.findById(friendshipId);
    if (!f || (f.senderId !== playerId && f.receiverId !== playerId)) {
      throw new Error('Friendship not found.');
    }

    await this.friendshipRepository.deleteById(friendshipId);
    return { message: 'Removed from your campus study buddies.' };
  }

  async getRealPlayers(playerId?: string): Promise<PersistentPlayerState[]> {
    const all = await this.prisma.player.findMany({});
    return all
      .filter((p) => !p.isBot && (!playerId || p.id !== playerId))
      .map((p) => this.toState(p));
  }

  // --- Private Direct Messages & Inbox ---
  async getInbox(playerId: string) {
    const allMessages = await this.messageRepository.findUserMessages(playerId);

    const conversationsMap = new Map<string, any>();

    for (const msg of allMessages) {
      const isMeSender = msg.senderId === playerId;
      const partnerId = isMeSender ? msg.receiverId : msg.senderId;

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          partnerId,
          lastMessage: msg,
          unreadCount: 0,
          messages: [],
        });
      }

      const conv = conversationsMap.get(partnerId);
      conv.messages.push(msg);

      if (!isMeSender && !msg.isRead) {
        conv.unreadCount += 1;
      }

      if (new Date(msg.createdAt).getTime() > new Date(conv.lastMessage.createdAt).getTime()) {
        conv.lastMessage = msg;
      }
    }

    const conversations: any[] = [];
    let totalUnread = 0;

    for (const [partnerId, conv] of conversationsMap.entries()) {
      const partnerRaw = await this.prisma.player.findUnique({ where: { id: partnerId } });
      if (partnerRaw) {
        const partnerState = this.toState(partnerRaw);
        totalUnread += conv.unreadCount;
        conversations.push({
          partner: {
            id: partnerState.id,
            username: partnerState.username,
            power: partnerState.power,
            smartness: partnerState.smartness,
            equippedTitle: partnerState.equippedTitle,
            avatarId: partnerState.avatarId,
            avatarFrame: partnerState.avatarFrame,
            avatarAura: partnerState.avatarAura,
            avatarOutfit: partnerState.avatarOutfit,
            avatarAccessory: partnerState.avatarAccessory,
          },
          lastMessage: {
            id: conv.lastMessage.id,
            content: conv.lastMessage.content,
            isMe: conv.lastMessage.senderId === playerId,
            isRead: conv.lastMessage.isRead,
            createdAt: new Date(conv.lastMessage.createdAt).toISOString(),
          },
          unreadCount: conv.unreadCount,
        });
      }
    }

    conversations.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

    return {
      conversations,
      totalUnread,
      unreadTotal: totalUnread,
    };
  }

  async getConversation(playerId: string, partnerId: string) {
    const partnerRaw = await this.prisma.player.findUnique({ where: { id: partnerId } });
    if (!partnerRaw) {
      throw new Error('Student not found.');
    }

    // Mark incoming messages as read via MessageRepository
    await this.messageRepository.markConversationAsRead(playerId, partnerId);

    const messages = await this.messageRepository.findConversation(playerId, partnerId);

    return {
      partner: this.toState(partnerRaw),
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        content: m.content,
        isMe: m.senderId === playerId,
        isRead: m.isRead,
        createdAt: new Date(m.createdAt).toISOString(),
      })),
    };
  }

  async sendMessage(senderId: string, receiverId: string, content: string) {
    const cleanContent = content.trim();
    if (!cleanContent) {
      throw new Error('Message cannot be empty.');
    }
    if (cleanContent.length > 500) {
      throw new Error('Message length cannot exceed 500 characters.');
    }

    const receiver = await this.prisma.player.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      throw new Error('Recipient student not found.');
    }

    if (receiver.isBot) {
      throw new Error('Bots cannot receive private chat messages.');
    }

    const msg = await this.messageRepository.create({
      senderId,
      receiverId,
      content: cleanContent,
    });

    return {
      message: 'Message sent.',
      data: {
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        isMe: true,
        isRead: false,
        createdAt: new Date(msg.createdAt).toISOString(),
      },
    };
  }
}


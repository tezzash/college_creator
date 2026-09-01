export interface PlayerEntity {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  cash: number;
  bankCash: number;
  energy: number;
  morale: number;
  power: number;
  smartness: number;
  winStreak: number;
  highestStreak: number;
  totalPvPWins: number;
  totalPvPLosses: number;
  totalPlundered: number;
  equippedTitle: string;
  avatarId: string;
  avatarAura: string;
  avatarFrame: string;
  avatarOutfit: string;
  avatarHeadwear: string;
  avatarAccessory: string;
  ownedCosmetics: string[];
  customBio: string;
  claimedMilestones: string[];
  totalJobsCompleted: number;
  totalBankDeposited: number;
  dailyStreak: number;
  dailyQuestsDate: string | null;
  dailyQuestsState: any | null;
  pinnedUntil: Date | null;
  isBot: boolean;
  lastEnergyUpdate: Date;
  lastMoraleUpdate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlayerRecordInput {
  id?: string;
  username: string;
  email: string;
  passwordHash: string;
  cash?: number;
  bankCash?: number;
  energy?: number;
  morale?: number;
  power?: number;
  smartness?: number;
  winStreak?: number;
  highestStreak?: number;
  totalPvPWins?: number;
  totalPvPLosses?: number;
  totalPlundered?: number;
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
  dailyQuestsDate?: string | null;
  dailyQuestsState?: any | null;
  pinnedUntil?: Date | null;
  isBot?: boolean;
}

export interface UpdatePlayerRecordInput {
  username?: string;
  email?: string;
  passwordHash?: string;
  cash?: number;
  bankCash?: number;
  energy?: number;
  morale?: number;
  power?: number;
  smartness?: number;
  winStreak?: number;
  highestStreak?: number;
  totalPvPWins?: number;
  totalPvPLosses?: number;
  totalPlundered?: number;
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
  dailyQuestsDate?: string | null;
  dailyQuestsState?: any | null;
  pinnedUntil?: Date | null;
  isBot?: boolean;
  lastEnergyUpdate?: Date;
  lastMoraleUpdate?: Date;
}

export interface PlayerSearchFilters {
  query?: string;
  excludePlayerId?: string;
  limit?: number;
}

export interface PlayerLeaderboardOptions {
  sortBy: 'power' | 'smartness' | 'cash' | 'winStreak' | 'highestStreak' | 'totalPvPWins';
  limit?: number;
}

/**
 * High-value repository boundary for the Player aggregate.
 */
export interface PlayerRepository {
  findById(id: string): Promise<PlayerEntity | null>;
  findByUsername(username: string): Promise<PlayerEntity | null>;
  findByEmail(email: string): Promise<PlayerEntity | null>;
  findByUsernameOrEmail(identifier: string): Promise<PlayerEntity | null>;
  create(input: CreatePlayerRecordInput): Promise<PlayerEntity>;
  update(id: string, updates: UpdatePlayerRecordInput): Promise<PlayerEntity>;
  updateCash(id: string, newCash: number, newBankCash?: number): Promise<PlayerEntity>;
  updateStats(id: string, stats: { power?: number; smartness?: number }): Promise<PlayerEntity>;
  updateEnergyAndMorale(
    id: string,
    energy: number,
    morale: number,
    lastEnergyUpdate?: Date,
    lastMoraleUpdate?: Date
  ): Promise<PlayerEntity>;
  consumeEnergy(
    id: string,
    amount?: number,
    options?: { maxEnergy?: number; energyRegenSeconds?: number; now?: Date }
  ): Promise<PlayerEntity>;
  search(filters: PlayerSearchFilters): Promise<PlayerEntity[]>;
  listLeaderboard(options: PlayerLeaderboardOptions): Promise<PlayerEntity[]>;
  count(): Promise<number>;
  deleteById(id: string): Promise<boolean>;
}

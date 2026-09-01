export interface Player {
  id: string;
  isBot?: boolean;
  username: string;
  email: string;
  cash: number;
  bankCash: number;
  energy: number;
  maxEnergy?: number;
  morale?: number;
  maxMorale?: number;
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
  avatarPose?: string;
  ownedCosmetics?: string[];
  customBio?: string;
  claimedMilestones?: string[];
  totalJobsCompleted?: number;
  totalBankDeposited?: number;
  lastEnergyUpdate?: string;
  lastMoraleUpdate?: string;
  isPinned?: boolean;
  pinnedUntil?: string | null;
  pinnedSecondsRemaining?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type AvatarViewMode = 'headshot' | 'portrait' | 'card' | 'fullbody';
export type AvatarPoseStyle = 'athletic' | 'chic' | 'prodigy' | 'rebel' | 'royalty' | 'relaxed';

export interface Job {
  id: string;
  name: string;
  durationSeconds: number;
  rewardCash: number;
}

export interface ActiveJob {
  id: string;
  playerId: string;
  jobId: string;
  startedAt: string;
  finishesAt: string;
  collected: boolean;
  job?: Job;
}

export interface Ally {
  id: string;
  name: string;
  tier: string;
  power: number;
  smartness: number;
  hireCost: number;
}

export interface RoomOccupant {
  id: string;
  towerRoomId: string;
  allyId: string;
  level?: number;
  totalInvested?: number;
  hiredAt: string;
  ally?: Ally;
}

export interface TowerRoom {
  id: string;
  playerId: string;
  roomNumber: number;
  unlockCost: number;
  unlocked: boolean;
  occupants?: RoomOccupant[];
}

export interface DormFurnitureItem {
  id: string;
  name: string;
  category: 'TECH' | 'GYM' | 'SECURITY' | 'VIBE' | string;
  cost: number;
  description: string;
  bonusSummary: string;
  iconName: string;
  isOwned?: boolean;
  equippedAt?: string | null;
}

export interface RivalPlayer {
  id: string;
  isBot?: boolean;
  username: string;
  power: number;
  smartness: number;
  winStreak?: number;
  cash?: number;
  equippedTitle?: string;
  avatarId?: string;
  avatarAura?: string;
  avatarFrame?: string;
  avatarOutfit?: string;
  avatarHeadwear?: string;
  avatarAccessory?: string;
  avatarPose?: string;
  customBio?: string;
  isPinned?: boolean;
  pinnedUntil?: string | null;
  pinnedSecondsRemaining?: number;
}

export interface SpyIntel {
  unbankedCash: number;
  bankVaultCash: number;
  power: number;
  smartness: number;
  hasSmartLock: boolean;
  isPinned: boolean;
  dormmates: Array<{
    name: string;
    tier: string;
    level: number;
    powerBonus: number;
    smartnessBonus: number;
  }>;
  fightWinProbability: number;
  prankWinProbability: number;
}

export interface ScoutReport {
  defender: {
    id: string;
    username: string;
    power: number;
    smartness: number;
    pocketCash: number;
    bankProtectedCash: number;
    winStreak: number;
    totalPvPWins: number;
    unlockedSuites: number;
    equippedTitle?: string;
    avatarId?: string;
    avatarAura?: string;
    avatarFrame?: string;
    avatarOutfit?: string;
    avatarHeadwear?: string;
    avatarAccessory?: string;
    avatarPose?: string;
    customBio?: string;
    dormmates: Array<{
      name: string;
      tier: string;
      level: number;
      powerBonus: number;
      smartnessBonus: number;
    }>;
    hasSmartLock: boolean;
    isPinned?: boolean;
    pinnedUntil?: string | null;
    pinnedSecondsRemaining?: number;
  };
  combatAssessment: {
    punchWinChance: number;
    faceOffWinChance: number;
    threatRating: 'EASY PREY' | 'EVEN MATCH' | 'HIGH RISK' | 'APEX BOSS';
    estimatedPlunder: number;
  };
}

export interface LeaderboardsData {
  topPlunderers: Array<{
    rank: number;
    id: string;
    username: string;
    totalPlundered: number;
    wins: number;
    avatarId?: string;
    avatarFrame?: string;
    avatarAura?: string;
    avatarOutfit?: string;
    avatarHeadwear?: string;
    avatarAccessory?: string;
    equippedTitle?: string;
  }>;
  topNetWorth: Array<{
    rank: number;
    id: string;
    username: string;
    cash: number;
    bankCash: number;
    netWorth: number;
    avatarId?: string;
    avatarFrame?: string;
    avatarAura?: string;
    avatarOutfit?: string;
    avatarHeadwear?: string;
    avatarAccessory?: string;
    equippedTitle?: string;
  }>;
  topStreaks: Array<{
    rank: number;
    id: string;
    username: string;
    currentStreak: number;
    highestStreak: number;
    avatarId?: string;
    avatarFrame?: string;
    avatarAura?: string;
    avatarOutfit?: string;
    avatarHeadwear?: string;
    avatarAccessory?: string;
    equippedTitle?: string;
  }>;
  topTitans: Array<{
    rank: number;
    id: string;
    username: string;
    power: number;
    smartness: number;
    totalStats: number;
    avatarId?: string;
    avatarFrame?: string;
    avatarAura?: string;
    avatarOutfit?: string;
    avatarHeadwear?: string;
    avatarAccessory?: string;
    equippedTitle?: string;
  }>;
}

export interface BattleLogItem {
  id: string;
  isAttacker: boolean;
  isDefense: boolean;
  action: 'FIGHT' | 'PRANK' | 'SPY' | 'PUNCH' | 'FACE_OFF' | string;
  success: boolean;
  won: boolean;
  cashStolen: number;
  createdAt: string;
  opponent: {
    id: string;
    username: string;
    power: number;
    smartness: number;
  } | null;
}

export interface BattleResult {
  battle: {
    id: string;
    attackerId: string;
    defenderId: string;
    action: string;
    success: boolean;
    cashStolen: number;
    createdAt: string;
  };
  combat: {
    action: string;
    success: boolean;
    winProbability: number;
  };
  attackerId: string;
  defenderId: string;
  action?: 'fight' | 'prank' | 'spy' | 'punch' | 'face-off';
  actionType?: 'fight' | 'prank' | 'spy';
  energySpent?: number;
  moraleSpent?: number;
  cashTransferred: number;
  spyCashBounty?: number;
  knockoutBonus?: number;
  isKnockout?: boolean;
  isDefenderPinned?: boolean;
  attackerCash: number;
  defenderCash: number;
  attackerEnergy?: number;
  attackerMorale?: number;
  winStreak?: number;
  highestStreak?: number;
  streakBonusMultiplier?: number;
  hasSmartLockDefended?: boolean;
  spyIntel?: SpyIntel | null;
}

export interface DailyQuest {
  id: string;
  name: string;
  description: string;
  category: 'JOBS' | 'PVP' | 'BANK';
  progress: number;
  target: number;
  rewardCash: number;
  rewardEnergy: number;
  completed: boolean;
  claimed: boolean;
  iconName: string;
}

export interface DailyPlannerData {
  dailyQuests: DailyQuest[];
  allDailyCompleted: boolean;
  dailyBonusClaimed: boolean;
  dailyBonusReward: { cash: number; energy: number };
  dailyStreak: number;
}

export interface AchievementMilestone {
  id: string;
  title: string;
  category: 'WEALTH' | 'COMBAT' | 'TOWER' | 'ACADEMIC';
  description: string;
  rewardCash: number;
  rewardEnergy: number;
  rewardTitle: string;
  iconName: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
}

export interface TrophiesData {
  milestones: AchievementMilestone[];
  unlockedTitles: string[];
  availableTitles: Array<{
    id: string;
    title: string;
    unlocked: boolean;
    requirement: string;
  }>;
  claimedCount: number;
  totalCount: number;
}

export type CosmeticCategory = 'PERSONA' | 'AURA' | 'FRAME' | 'OUTFIT' | 'HEADWEAR' | 'GEAR';
export type CosmeticRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  cost: number;
  description: string;
  perkText?: string;
  tag: string;
  iconName: string;
  setId?: string;
  unlockCondition?: {
    type: 'DEFAULT' | 'CASH' | 'WIN_STREAK' | 'NET_WORTH' | 'JOBS_COUNT' | 'PVP_WINS' | 'HOSPITALIZATIONS';
    threshold?: number;
    requirementText: string;
  };
}

export interface SetSynergy {
  id: string;
  name: string;
  theme: string;
  requiredItemIds: string[];
  bonusText: string;
  statBonus: {
    powerMultiplier?: number;
    smartnessMultiplier?: number;
    plunderMultiplier?: number;
    maxEnergyBonus?: number;
  };
}

export interface ClosetItem {
  id: string;
  name: string;
  category: 'AVATAR' | 'FRAME' | 'OUTFIT' | 'ACCESSORY';
  description?: string;
  icon?: string;
  borderClass?: string;
  auraClass?: string;
  glowColor?: string;
  tag?: string;
}

export interface FriendBuddy {
  friendshipId: string;
  friendId: string;
  username: string;
  power: number;
  smartness: number;
  equippedTitle?: string;
  avatarId?: string;
  avatarAura?: string;
  avatarFrame?: string;
  avatarOutfit?: string;
  avatarAccessory?: string;
  canSendGift: boolean;
  lastGiftSentAt?: string | null;
}

export interface FriendRequestIncoming {
  friendshipId: string;
  senderId: string;
  username: string;
  power: number;
  smartness: number;
  equippedTitle?: string;
  avatarId?: string;
  avatarFrame?: string;
  createdAt: string;
}

export interface FriendsResponse {
  friends: FriendBuddy[];
  requests: {
    incoming: FriendRequestIncoming[];
    outgoing: any[];
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  isMe?: boolean;
}

export interface ConversationSummary {
  partner: {
    id: string;
    username: string;
    power: number;
    smartness: number;
    equippedTitle?: string;
    avatarId?: string;
    avatarFrame?: string;
    avatarAura?: string;
    avatarOutfit?: string;
    avatarAccessory?: string;
  };
  lastMessage: {
    id: string;
    content: string;
    isMe: boolean;
    isRead: boolean;
    createdAt: string;
  };
  unreadCount: number;
}

export interface InboxResponse {
  conversations: ConversationSummary[];
  totalUnread: number;
}

export interface ConversationResponse {
  partner: Player;
  messages: ChatMessage[];
}




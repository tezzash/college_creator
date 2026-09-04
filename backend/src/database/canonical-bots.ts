export interface CanonicalBotRoom {
  roomNumber: number;
  allyId: string;
  level: number;
}

export interface CanonicalBotDefinition {
  id: string;
  isBot: boolean;
  username: string;
  email: string;
  passwordHash: string;
  cash: number;
  bankCash: number;
  energy: number;
  morale: number;
  basePower: number;
  baseSmartness: number;
  power: number;
  smartness: number;
  winStreak: number;
  highestStreak: number;
  totalPvPWins: number;
  totalPvPLosses: number;
  totalPlundered: number;
  equippedTitle: string;
  avatarId: string;
  avatarFrame: string;
  avatarOutfit: string;
  avatarAccessory: string;
  customBio: string;
  claimedMilestones: string[];
  totalJobsCompleted: number;
  totalBankDeposited: number;
  rooms: CanonicalBotRoom[];
  furniture: string[];
}

export const CANONICAL_BOTS: CanonicalBotDefinition[] = [
  {
    id: 'rival-sam',
    isBot: true,
    username: 'Freshman_Sam',
    email: 'sam@campus.edu',
    passwordHash: 'mock',
    cash: 950,
    bankCash: 300,
    energy: 10,
    morale: 10,
    basePower: 6,
    baseSmartness: 6,
    power: 6,
    smartness: 10,
    winStreak: 1,
    highestStreak: 2,
    totalPvPWins: 6,
    totalPvPLosses: 7,
    totalPlundered: 950,
    equippedTitle: 'Freshman Novice',
    avatarId: 'avatar-freshman',
    avatarFrame: 'frame-slate',
    avatarOutfit: 'outfit-hoodie',
    avatarAccessory: 'acc-headphones',
    customBio: 'Just trying to survive midterms and not get raided day one 📚',
    claimedMilestones: [],
    totalJobsCompleted: 5,
    totalBankDeposited: 0,
    rooms: [
      { roomNumber: 1, allyId: 'ally-tutor', level: 1 },
    ],
    furniture: [],
  },
  {
    id: 'rival-chad',
    isBot: true,
    username: 'Chad_Varsity',
    email: 'chad@campus.edu',
    passwordHash: 'mock',
    cash: 1650,
    bankCash: 800,
    energy: 10,
    morale: 10,
    basePower: 16,
    baseSmartness: 5,
    power: 39,
    smartness: 6,
    winStreak: 3,
    highestStreak: 5,
    totalPvPWins: 16,
    totalPvPLosses: 4,
    totalPlundered: 3800,
    equippedTitle: 'Varsity Captain',
    avatarId: 'avatar-varsity',
    avatarFrame: 'frame-crimson',
    avatarOutfit: 'outfit-varsity',
    avatarAccessory: 'acc-dumbbell',
    customBio: 'Weights first, midterms maybe. Gym is my real lecture hall! 💪',
    claimedMilestones: ['ms-combat-1', 'ms-combat-2', 'ms-power-1'],
    totalJobsCompleted: 12,
    totalBankDeposited: 1000,
    rooms: [
      { roomNumber: 1, allyId: 'ally-athlete', level: 2 },
      { roomNumber: 2, allyId: 'ally-bouncer', level: 1 },
    ],
    furniture: ['furn-rack'],
  },
  {
    id: 'rival-elliot',
    isBot: true,
    username: 'Hacker_Elliot',
    email: 'elliot@campus.edu',
    passwordHash: 'mock',
    cash: 1850,
    bankCash: 1800,
    energy: 10,
    morale: 10,
    basePower: 8,
    baseSmartness: 18,
    power: 10,
    smartness: 48,
    winStreak: 2,
    highestStreak: 4,
    totalPvPWins: 13,
    totalPvPLosses: 5,
    totalPlundered: 3100,
    equippedTitle: 'Silicon Prodigy',
    avatarId: 'avatar-coder',
    avatarFrame: 'frame-neon',
    avatarOutfit: 'outfit-hoodie',
    avatarAccessory: 'acc-shades',
    customBio: 'Root access acquired. Your firewall is cute ⚡💻',
    claimedMilestones: ['ms-smart-1', 'ms-tower-1'],
    totalJobsCompleted: 20,
    totalBankDeposited: 3000,
    rooms: [
      { roomNumber: 1, allyId: 'ally-coder', level: 2 },
      { roomNumber: 2, allyId: 'ally-tutor', level: 2 },
    ],
    furniture: ['furn-server'],
  },
  {
    id: 'rival-alex',
    isBot: true,
    username: 'GymRat_Alex',
    email: 'alex@campus.edu',
    passwordHash: 'mock',
    cash: 1350,
    bankCash: 900,
    energy: 10,
    morale: 10,
    basePower: 22,
    baseSmartness: 3,
    power: 50,
    smartness: 5,
    winStreak: 4,
    highestStreak: 6,
    totalPvPWins: 19,
    totalPvPLosses: 6,
    totalPlundered: 4600,
    equippedTitle: 'Quad Menace',
    avatarId: 'avatar-athlete',
    avatarFrame: 'frame-crimson',
    avatarOutfit: 'outfit-street',
    avatarAccessory: 'acc-dumbbell',
    customBio: 'Arena is my playground. Step up or get punched! 🥊🔥',
    claimedMilestones: ['ms-combat-1', 'ms-combat-2', 'ms-combat-3'],
    totalJobsCompleted: 15,
    totalBankDeposited: 1500,
    rooms: [
      { roomNumber: 1, allyId: 'ally-bouncer', level: 2 },
      { roomNumber: 2, allyId: 'ally-athlete', level: 1 },
    ],
    furniture: ['furn-rack'],
  },
  {
    id: 'rival-emma',
    isBot: true,
    username: 'Valedictorian_Emma',
    email: 'emma@campus.edu',
    passwordHash: 'mock',
    cash: 2250,
    bankCash: 5200,
    energy: 10,
    morale: 10,
    basePower: 4,
    baseSmartness: 24,
    power: 6,
    smartness: 53,
    winStreak: 5,
    highestStreak: 8,
    totalPvPWins: 24,
    totalPvPLosses: 2,
    totalPlundered: 7200,
    equippedTitle: 'Valedictorian',
    avatarId: 'avatar-scholar',
    avatarFrame: 'frame-gold',
    avatarOutfit: 'outfit-lab',
    avatarAccessory: 'acc-laptop',
    customBio: '4.0 GPA, perfect algorithms, and all cash locked in the vault 🧠✨',
    claimedMilestones: ['ms-wealth-1', 'ms-wealth-2', 'ms-smart-1', 'ms-combat-1'],
    totalJobsCompleted: 35,
    totalBankDeposited: 8000,
    rooms: [
      { roomNumber: 1, allyId: 'ally-valedictorian', level: 1 },
      { roomNumber: 2, allyId: 'ally-tutor', level: 3 },
    ],
    furniture: ['furn-lock'],
  },
];

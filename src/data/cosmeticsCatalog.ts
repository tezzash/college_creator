export type CosmeticCategory = 'PERSONA' | 'AURA' | 'FRAME' | 'OUTFIT' | 'HEADWEAR' | 'GEAR';
export type CosmeticRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  cost: number; // 0 if default or feat-unlocked
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

/**
 * PIMD-grade Tier Multipliers:
 * Common (Tier 1): +1% Stats
 * Rare (Tier 2): +3% Stats
 * Epic (Tier 3): +6% Stats
 * Legendary (Tier 4): +10% Stats
 * Mythic (Tier 5): +15% Stats
 */
export const TIER_MULTIPLIER_MAP: Record<
  CosmeticRarity,
  { tierNumber: number; multiplier: number; label: string; percentText: string; color: string; badgeClass: string }
> = {
  COMMON: {
    tierNumber: 1,
    multiplier: 0.01,
    label: 'Tier 1 • Common',
    percentText: '+1%',
    color: '#94a3b8',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  RARE: {
    tierNumber: 2,
    multiplier: 0.03,
    label: 'Tier 2 • Rare',
    percentText: '+3%',
    color: '#38bdf8',
    badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-500/40',
  },
  EPIC: {
    tierNumber: 3,
    multiplier: 0.06,
    label: 'Tier 3 • Epic',
    percentText: '+6%',
    color: '#c084fc',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
  },
  LEGENDARY: {
    tierNumber: 4,
    multiplier: 0.10,
    label: 'Tier 4 • Legendary',
    percentText: '+10%',
    color: '#fbbf24',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
  },
  MYTHIC: {
    tierNumber: 5,
    multiplier: 0.15,
    label: 'Tier 5 • Mythic',
    percentText: '+15%',
    color: '#f43f5e',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/50 ring-1 ring-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.4)]',
  },
};

/**
 * Returns the rarity information for any item id in the catalog.
 */
export function getCosmeticItem(id?: string): CosmeticItem | undefined {
  if (!id) return undefined;
  return COSMETICS_MASTER_CATALOG.find((item) => item.id === id);
}

/**
 * Calculate avatar stat multiplier based on equipped persona.
 */
export function getAvatarTierMultiplier(avatarId?: string): number {
  const item = getCosmeticItem(avatarId);
  if (!item) return 0.01; // Default common 1%
  return TIER_MULTIPLIER_MAP[item.rarity]?.multiplier ?? 0.01;
}

/**
 * Calculate total gear drip stat bonus (Avatar Tier multiplier + active Set Synergies).
 */
export function calculateTotalDripBonus(
  avatarId?: string,
  outfitId?: string,
  headwearId?: string,
  accessoryId?: string,
  auraId?: string,
  frameId?: string
): {
  avatarMultiplier: number;
  synergyPowerMultiplier: number;
  synergySmartnessMultiplier: number;
  totalPowerMultiplier: number;
  totalSmartnessMultiplier: number;
  activeSynergies: SetSynergy[];
} {
  const avatarMultiplier = getAvatarTierMultiplier(avatarId);
  const equipped = [avatarId, outfitId, headwearId, accessoryId, auraId, frameId].filter(Boolean) as string[];

  const activeSynergies = SET_SYNERGIES.filter((synergy) =>
    synergy.requiredItemIds.every((reqId) => equipped.includes(reqId))
  );

  const synergyPowerMultiplier = activeSynergies.reduce(
    (acc, s) => acc + (s.statBonus.powerMultiplier || 0),
    0
  );
  const synergySmartnessMultiplier = activeSynergies.reduce(
    (acc, s) => acc + (s.statBonus.smartnessMultiplier || 0),
    0
  );

  return {
    avatarMultiplier,
    synergyPowerMultiplier,
    synergySmartnessMultiplier,
    totalPowerMultiplier: avatarMultiplier + synergyPowerMultiplier,
    totalSmartnessMultiplier: avatarMultiplier + synergySmartnessMultiplier,
    activeSynergies,
  };
}

export const SET_SYNERGIES: SetSynergy[] = [
  {
    id: 'SET_CYBER_OVERCLOCK',
    name: 'Cyberpunk Overclock Set',
    theme: 'High-tech matrix runner style with neon cyan accents',
    requiredItemIds: ['avatar-cyber', 'aura-matrix-glitch', 'outfit-cyber-trench', 'headwear-vr-visor', 'acc-laptop'],
    bonusText: '+15% Smartness on Gigs & +10% Prank Plunder Bonus',
    statBonus: {
      smartnessMultiplier: 0.15,
      plunderMultiplier: 0.10,
    },
  },
  {
    id: 'SET_VARSITY_CHAMP',
    name: 'Varsity All-Star Set',
    theme: 'Gold embroidered collegiate athlete drip',
    requiredItemIds: ['avatar-varsity', 'aura-gold-sparkle', 'outfit-varsity', 'headwear-gold-laurels', 'acc-dumbbell'],
    bonusText: '+15% Power in Arena Duels & +10% Fight Victory Cash',
    statBonus: {
      powerMultiplier: 0.15,
      plunderMultiplier: 0.10,
    },
  },
  {
    id: 'SET_WALLSTREET_LUXE',
    name: 'Campus Plutocrat Set',
    theme: 'Pinstripe luxury blazer & diamond status relics',
    requiredItemIds: ['avatar-wallstreet', 'aura-emerald-cash', 'outfit-suit', 'headwear-aviator-gold', 'acc-briefcase'],
    bonusText: '+10% Plunder Retention on Defense & +5% ATM Safe Vault Yield',
    statBonus: {
      plunderMultiplier: 0.05,
    },
  },
  {
    id: 'SET_ROYAL_MONARCH',
    name: 'Quad Royalty Set',
    theme: 'Imperial violet & diamond crown sovereign elegance',
    requiredItemIds: ['avatar-royal', 'aura-nebula-violet', 'outfit-royal-kimono', 'headwear-diamond-crown', 'acc-trophy-cup'],
    bonusText: '+1 Max Energy Capacity & +10% Total Stat Multiplier',
    statBonus: {
      maxEnergyBonus: 1,
      powerMultiplier: 0.10,
      smartnessMultiplier: 0.10,
    },
  },
];

export const COSMETICS_MASTER_CATALOG: CosmeticItem[] = [
  // ==========================================
  // 1. PERSONAS (Base Archetypes)
  // ==========================================
  {
    id: 'avatar-coder',
    name: 'Hacker Geek',
    category: 'PERSONA',
    rarity: 'COMMON',
    cost: 0,
    description: 'Terminal hacker & midnight algorithm master.',
    perkText: 'Starter Tech Persona',
    tag: 'Starter',
    iconName: 'Code',
    unlockCondition: { type: 'DEFAULT', requirementText: 'Unlocked by default' },
  },
  {
    id: 'avatar-varsity',
    name: 'Varsity Athlete',
    category: 'PERSONA',
    rarity: 'COMMON',
    cost: 0,
    description: 'Campus sports champion with unstoppable momentum.',
    perkText: 'Starter Athletic Persona',
    tag: 'Starter',
    iconName: 'Dumbbell',
    setId: 'SET_VARSITY_CHAMP',
    unlockCondition: { type: 'DEFAULT', requirementText: 'Unlocked by default' },
  },
  {
    id: 'avatar-scholar',
    name: 'Dean’s Scholar',
    category: 'PERSONA',
    rarity: 'COMMON',
    cost: 0,
    description: 'Valedictorian candidate & textbook genius.',
    perkText: 'Starter Academic Persona',
    tag: 'Starter',
    iconName: 'GraduationCap',
    unlockCondition: { type: 'DEFAULT', requirementText: 'Unlocked by default' },
  },
  {
    id: 'avatar-freshman',
    name: 'Eager Rookie',
    category: 'PERSONA',
    rarity: 'COMMON',
    cost: 0,
    description: 'Hungry freshman ready to build a campus empire.',
    perkText: 'Starter Freshman Persona',
    tag: 'Starter',
    iconName: 'BookOpen',
    unlockCondition: { type: 'DEFAULT', requirementText: 'Unlocked by default' },
  },
  {
    id: 'avatar-cyber',
    name: 'Cyberpunk Rebel',
    category: 'PERSONA',
    rarity: 'RARE',
    cost: 2000,
    description: 'Overclocked cyber enthusiast with neon-infused style.',
    perkText: '+2 Base Smartness',
    tag: 'Boutique',
    iconName: 'Zap',
    setId: 'SET_CYBER_OVERCLOCK',
    unlockCondition: { type: 'CASH', threshold: 2000, requirementText: 'Purchase for $2,000 cash' },
  },
  {
    id: 'avatar-dj',
    name: 'Quad Beatmaker DJ',
    category: 'PERSONA',
    rarity: 'RARE',
    cost: 2500,
    description: 'Late-night music producer & campus party mixer.',
    perkText: '+2 Base Morale Boost',
    tag: 'Boutique',
    iconName: 'Music',
    unlockCondition: { type: 'CASH', threshold: 2500, requirementText: 'Purchase for $2,500 cash' },
  },
  {
    id: 'avatar-gamer',
    name: 'Esports Champion',
    category: 'PERSONA',
    rarity: 'RARE',
    cost: 3000,
    description: 'RGB tournament carry with lightning reflexes.',
    perkText: '+2 Base Power',
    tag: 'Boutique',
    iconName: 'Gamepad2',
    unlockCondition: { type: 'CASH', threshold: 3000, requirementText: 'Purchase for $3,000 cash' },
  },
  {
    id: 'avatar-wallstreet',
    name: 'Wall Street Prodigy',
    category: 'PERSONA',
    rarity: 'EPIC',
    cost: 6500,
    description: 'Fintech day-trader & venture capital prodigy.',
    perkText: '+5% Cash Earned from Gigs',
    tag: 'Boutique',
    iconName: 'TrendingUp',
    setId: 'SET_WALLSTREET_LUXE',
    unlockCondition: { type: 'CASH', threshold: 6500, requirementText: 'Purchase for $6,500 cash' },
  },
  {
    id: 'avatar-goth',
    name: 'Goth Alchemist',
    category: 'PERSONA',
    rarity: 'EPIC',
    cost: 7500,
    description: 'Midnight chemistry virtuoso brewing secret quad formulas.',
    perkText: '+3% Prank Success Odds',
    tag: 'Boutique',
    iconName: 'Flame',
    unlockCondition: { type: 'CASH', threshold: 7500, requirementText: 'Purchase for $7,500 cash' },
  },
  {
    id: 'avatar-royal',
    name: 'Quad Sovereign Monarch',
    category: 'PERSONA',
    rarity: 'LEGENDARY',
    cost: 18000,
    description: 'The supreme ruler of campus society & leader of the elite.',
    perkText: '+5 Power & +5 Smartness',
    tag: 'Prestige',
    iconName: 'Crown',
    setId: 'SET_ROYAL_MONARCH',
    unlockCondition: { type: 'CASH', threshold: 18000, requirementText: 'Purchase for $18,000 cash' },
  },
  {
    id: 'avatar-shadow-shinobi',
    name: 'Shadow Infiltrator',
    category: 'PERSONA',
    rarity: 'MYTHIC',
    cost: 0,
    description: 'Ghost operative who strikes rivals undetected from the shadows.',
    perkText: '+15% Spy Infiltration Success Rate',
    tag: 'Feat Unlock',
    iconName: 'Eye',
    unlockCondition: { type: 'HOSPITALIZATIONS', threshold: 3, requirementText: 'Hospitalize/Pin 3 Rivals in the Arena' },
  },
  {
    id: 'avatar-titan-overlord',
    name: 'Campus Titan Overlord',
    category: 'PERSONA',
    rarity: 'MYTHIC',
    cost: 0,
    description: 'Living legend of the campus arena who crushed all contenders.',
    perkText: '+8 Base Power & Legendary Aura',
    tag: 'Feat Unlock',
    iconName: 'Trophy',
    unlockCondition: { type: 'WIN_STREAK', threshold: 7, requirementText: 'Reach a 7x Win Streak in the Arena' },
  },
  {
    id: 'avatar-sorority',
    name: 'Sorority President',
    category: 'PERSONA',
    rarity: 'EPIC',
    cost: 8000,
    description: 'Greek life queenpin commanding premier campus clout and social alliances.',
    perkText: '+4 Base Smartness & High-Clout Aura',
    tag: 'Boutique',
    iconName: 'Crown',
    unlockCondition: { type: 'CASH', threshold: 8000, requirementText: 'Purchase for $8,000 cash' },
  },
  {
    id: 'avatar-streetwear',
    name: 'Street Fashion Icon',
    category: 'PERSONA',
    rarity: 'EPIC',
    cost: 8500,
    description: 'Quad trendsetter wearing rare designer drops and hyper-exclusive drip.',
    perkText: '+4 Base Power & Runway Clout',
    tag: 'Boutique',
    iconName: 'Sparkles',
    unlockCondition: { type: 'CASH', threshold: 8500, requirementText: 'Purchase for $8,500 cash' },
  },
  {
    id: 'avatar-grandmaster',
    name: 'Grandmaster Strategist',
    category: 'PERSONA',
    rarity: 'LEGENDARY',
    cost: 16500,
    description: 'Campus chess and algorithmic mastermind who calculates 20 moves ahead.',
    perkText: '+6 Base Smartness & Strategic Edge',
    tag: 'Prestige',
    iconName: 'Brain',
    unlockCondition: { type: 'CASH', threshold: 16500, requirementText: 'Purchase for $16,500 cash' },
  },

  // ==========================================
  // 2. AURAS & PARTICLE FX
  // ==========================================
  {
    id: 'aura-none',
    name: 'No Aura (Clean)',
    category: 'AURA',
    rarity: 'COMMON',
    cost: 0,
    description: 'Standard natural appearance with no particle effects.',
    tag: 'Default',
    iconName: 'Sun',
    unlockCondition: { type: 'DEFAULT', requirementText: 'Unlocked by default' },
  },
  {
    id: 'aura-neon-pulse',
    name: 'Cyan Neon Pulse',
    category: 'AURA',
    rarity: 'RARE',
    cost: 1500,
    description: 'Subtle electric cyan wave pulsing behind the avatar.',
    perkText: 'Vibrant Neon Glow',
    tag: 'Boutique',
    iconName: 'Zap',
    unlockCondition: { type: 'CASH', threshold: 1500, requirementText: 'Purchase for $1,500 cash' },
  },
  {
    id: 'aura-crimson-flame',
    name: 'Berserker Crimson Flame',
    category: 'AURA',
    rarity: 'EPIC',
    cost: 4500,
    description: 'Fierce arena battle flame burning with competitive fury.',
    perkText: 'Intimidating Flame Particles',
    tag: 'Boutique',
    iconName: 'Flame',
    unlockCondition: { type: 'CASH', threshold: 4500, requirementText: 'Purchase for $4,500 cash' },
  },
  {
    id: 'aura-matrix-glitch',
    name: 'Cyber Glitch Stream',
    category: 'AURA',
    rarity: 'EPIC',
    cost: 5000,
    description: 'Cascading digital matrix glyphs & chromatic aberration.',
    perkText: 'Animated Cyber Overclock',
    tag: 'Boutique',
    iconName: 'Binary',
    setId: 'SET_CYBER_OVERCLOCK',
    unlockCondition: { type: 'CASH', threshold: 5000, requirementText: 'Purchase for $5,000 cash' },
  },
  {
    id: 'aura-gold-sparkle',
    name: 'Golden Champion Halo',
    category: 'AURA',
    rarity: 'EPIC',
    cost: 6000,
    description: 'Radiant golden sparkle rays and championship glints.',
    perkText: 'Championship Prestige Glow',
    tag: 'Boutique',
    iconName: 'Sparkles',
    setId: 'SET_VARSITY_CHAMP',
    unlockCondition: { type: 'CASH', threshold: 6000, requirementText: 'Purchase for $6,000 cash' },
  },
  {
    id: 'aura-emerald-cash',
    name: 'Emerald Wealth Radiance',
    category: 'AURA',
    rarity: 'LEGENDARY',
    cost: 12000,
    description: 'Floating golden coins and shimmering emerald jewel particles.',
    perkText: '+2% Plunder on PvP Victories',
    tag: 'Luxury',
    iconName: 'Coins',
    setId: 'SET_WALLSTREET_LUXE',
    unlockCondition: { type: 'CASH', threshold: 12000, requirementText: 'Purchase for $12,000 cash' },
  },
  {
    id: 'aura-nebula-violet',
    name: 'Quantum Nebula Void',
    category: 'AURA',
    rarity: 'LEGENDARY',
    cost: 15000,
    description: 'Hypnotic swirling galaxy cloud with pulsing cosmic stars.',
    perkText: 'Supreme Cosmic Aura',
    tag: 'Prestige',
    iconName: 'Orbit',
    setId: 'SET_ROYAL_MONARCH',
    unlockCondition: { type: 'CASH', threshold: 15000, requirementText: 'Purchase for $15,000 cash' },
  },
  {
    id: 'aura-prism-overclock',
    name: 'Rainbow Prism Overdrive',
    category: 'AURA',
    rarity: 'MYTHIC',
    cost: 0,
    description: 'Prismatic shifting RGB hyper-glow reserved for campus billionaires.',
    perkText: 'Legendary Status Glow',
    tag: 'Feat Unlock',
    iconName: 'Sparkle',
    unlockCondition: { type: 'NET_WORTH', threshold: 25000, requirementText: 'Accumulate $25,000 Total Net Worth' },
  },

  // ==========================================
  // 3. APPAREL & JACKETS (Outfits)
  // ==========================================
  {
    id: 'outfit-hoodie',
    name: 'Silicon Valley Tech Hoodie',
    category: 'OUTFIT',
    rarity: 'COMMON',
    cost: 0,
    description: 'The unofficial startup uniform: oversized, comfy & dark.',
    perkText: 'Standard Dev Wear',
    tag: 'Starter',
    iconName: 'Shirt',
    unlockCondition: { type: 'DEFAULT', requirementText: 'Unlocked by default' },
  },
  {
    id: 'outfit-varsity',
    name: 'Letterman Varsity Bomber',
    category: 'OUTFIT',
    rarity: 'RARE',
    cost: 1800,
    description: 'Heavy wool and leather varsity jacket with gold championship chenille.',
    perkText: '+2 Arena Power',
    tag: 'Athletic',
    iconName: 'Award',
    setId: 'SET_VARSITY_CHAMP',
    unlockCondition: { type: 'CASH', threshold: 1800, requirementText: 'Purchase for $1,800 cash' },
  },
  {
    id: 'outfit-cyber-trench',
    name: 'Cyberpunk Neon Trenchcoat',
    category: 'OUTFIT',
    rarity: 'EPIC',
    cost: 4800,
    description: 'Weatherproof armored trenchcoat lined with glowing fiber-optic seams.',
    perkText: '+3 Smartness on Tech Gigs',
    tag: 'Cyberstyle',
    iconName: 'Shield',
    setId: 'SET_CYBER_OVERCLOCK',
    unlockCondition: { type: 'CASH', threshold: 4800, requirementText: 'Purchase for $4,800 cash' },
  },
  {
    id: 'outfit-suit',
    name: 'Wall Street Pinstripe Blazer',
    category: 'OUTFIT',
    rarity: 'EPIC',
    cost: 5500,
    description: 'Italian tailored wool blazer with gold monogrammed cufflinks.',
    perkText: '+3% Job Cash Rewards',
    tag: 'Executive',
    iconName: 'Briefcase',
    setId: 'SET_WALLSTREET_LUXE',
    unlockCondition: { type: 'CASH', threshold: 5500, requirementText: 'Purchase for $5,500 cash' },
  },
  {
    id: 'outfit-lab',
    name: 'Quantum Lab Coat & Steth',
    category: 'OUTFIT',
    rarity: 'RARE',
    cost: 2800,
    description: 'Sterile white lab attire equipped with pocket test tubes and pen arrays.',
    perkText: '+2 Smartness',
    tag: 'Academic',
    iconName: 'FlaskConical',
    unlockCondition: { type: 'CASH', threshold: 2800, requirementText: 'Purchase for $2,800 cash' },
  },
  {
    id: 'outfit-leather-moto',
    name: 'Spiked Rebel Moto Jacket',
    category: 'OUTFIT',
    rarity: 'EPIC',
    cost: 4200,
    description: 'Heavy distressed leather studded with chrome hardware and patches.',
    perkText: '+2 Power & Intimidation',
    tag: 'Rebel',
    iconName: 'Flame',
    unlockCondition: { type: 'CASH', threshold: 4200, requirementText: 'Purchase for $4,200 cash' },
  },
  {
    id: 'outfit-royal-kimono',
    name: 'Golden Dragon Silk Kimono',
    category: 'OUTFIT',
    rarity: 'LEGENDARY',
    cost: 16000,
    description: 'Woven imperial silk embroidered with 24k pure gold thread.',
    perkText: '+5 Power & +5 Smartness',
    tag: 'Prestige',
    iconName: 'Crown',
    setId: 'SET_ROYAL_MONARCH',
    unlockCondition: { type: 'CASH', threshold: 16000, requirementText: 'Purchase for $16,000 cash' },
  },
  {
    id: 'outfit-shadow-suit',
    name: 'Kevlar Shinobi Stealth Weave',
    category: 'OUTFIT',
    rarity: 'MYTHIC',
    cost: 0,
    description: 'Radar-absorbing tactical weave worn by undefeated arena legends.',
    perkText: '-20% Plunder Lost on Defeat',
    tag: 'Feat Unlock',
    iconName: 'ShieldAlert',
    unlockCondition: { type: 'PVP_WINS', threshold: 15, requirementText: 'Achieve 15 Total PvP Arena Wins' },
  },

  // ==========================================
  // 4. HEADWEAR & EYEWEAR
  // ==========================================
  {
    id: 'headwear-none',
    name: 'Natural Hair (No Hat)',
    category: 'HEADWEAR',
    rarity: 'COMMON',
    cost: 0,
    description: 'Clean, unobstructed hairstyle without headgear.',
    tag: 'Default',
    iconName: 'User',
    unlockCondition: { type: 'DEFAULT', requirementText: 'Unlocked by default' },
  },
  {
    id: 'headwear-beanie',
    name: 'Midnight Slouch Beanie',
    category: 'HEADWEAR',
    rarity: 'COMMON',
    cost: 600,
    description: 'Cozy knitted black beanie for marathon coding sessions.',
    perkText: 'Classic Indie Dev Style',
    tag: 'Casual',
    iconName: 'Smile',
    unlockCondition: { type: 'CASH', threshold: 600, requirementText: 'Purchase for $600 cash' },
  },
  {
    id: 'headwear-snapback',
    name: 'Streetwear Backward Snapback',
    category: 'HEADWEAR',
    rarity: 'RARE',
    cost: 1200,
    description: 'Embroidered campus athletic cap worn reversed.',
    perkText: '+1 Power',
    tag: 'Athletic',
    iconName: 'Flame',
    unlockCondition: { type: 'CASH', threshold: 1200, requirementText: 'Purchase for $1,200 cash' },
  },
  {
    id: 'headwear-vr-visor',
    name: 'Neural HUD Cyber Visor',
    category: 'HEADWEAR',
    rarity: 'EPIC',
    cost: 4500,
    description: 'Tactical holographic eyepiece displaying real-time rival stats.',
    perkText: '+3 Smartness in Combat',
    tag: 'Cybertech',
    iconName: 'Glasses',
    setId: 'SET_CYBER_OVERCLOCK',
    unlockCondition: { type: 'CASH', threshold: 4500, requirementText: 'Purchase for $4,500 cash' },
  },
  {
    id: 'headwear-aviator-gold',
    name: '24K Gold Mirrored Aviators',
    category: 'HEADWEAR',
    rarity: 'EPIC',
    cost: 3800,
    description: 'High-roller sunglasses that completely obscure your gaze.',
    perkText: '+2% Plunder Bounty',
    tag: 'Luxury',
    iconName: 'Glasses',
    setId: 'SET_WALLSTREET_LUXE',
    unlockCondition: { type: 'CASH', threshold: 3800, requirementText: 'Purchase for $3,800 cash' },
  },
  {
    id: 'headwear-gold-laurels',
    name: 'Imperial Golden Laurels',
    category: 'HEADWEAR',
    rarity: 'EPIC',
    cost: 5200,
    description: 'Ancient collegiate gold wreath awarded to sports champions.',
    perkText: '+3 Arena Power',
    tag: 'Championship',
    iconName: 'Award',
    setId: 'SET_VARSITY_CHAMP',
    unlockCondition: { type: 'CASH', threshold: 5200, requirementText: 'Purchase for $5,200 cash' },
  },
  {
    id: 'headwear-diamond-crown',
    name: 'Diamond Monarch Crown',
    category: 'HEADWEAR',
    rarity: 'LEGENDARY',
    cost: 20000,
    description: 'Solid platinum crown encrusted with flawless quad diamonds.',
    perkText: '+5 Power & +5 Smartness',
    tag: 'Prestige',
    iconName: 'Crown',
    setId: 'SET_ROYAL_MONARCH',
    unlockCondition: { type: 'CASH', threshold: 20000, requirementText: 'Purchase for $20,000 cash' },
  },
  {
    id: 'headwear-hacker-hood',
    name: 'Ghost Protocol Cowl',
    category: 'HEADWEAR',
    rarity: 'MYTHIC',
    cost: 0,
    description: 'Deep shadowy cowl that prevents enemy scouts from identifying you.',
    perkText: '+10% Defense Win Odds',
    tag: 'Feat Unlock',
    iconName: 'Shield',
    unlockCondition: { type: 'JOBS_COUNT', threshold: 20, requirementText: 'Complete 20 Campus Jobs' },
  },

  // ==========================================
  // 5. STATUS GEAR & HANDHELD RELICS
  // ==========================================
  {
    id: 'acc-laptop',
    name: 'Overclocked Dev Laptop',
    category: 'GEAR',
    rarity: 'COMMON',
    cost: 0,
    description: 'Mechanical keyboard rig with neon debug stickers.',
    perkText: 'Standard Dev Tool',
    tag: 'Starter',
    iconName: 'Laptop',
    setId: 'SET_CYBER_OVERCLOCK',
    unlockCondition: { type: 'DEFAULT', requirementText: 'Unlocked by default' },
  },
  {
    id: 'acc-dumbbell',
    name: 'Golden 45lb Barbell',
    category: 'GEAR',
    rarity: 'RARE',
    cost: 2200,
    description: 'Pure 24k polished iron flexed across the campus weight room.',
    perkText: '+2 Power',
    tag: 'Heavy Iron',
    iconName: 'Dumbbell',
    setId: 'SET_VARSITY_CHAMP',
    unlockCondition: { type: 'CASH', threshold: 2200, requirementText: 'Purchase for $2,200 cash' },
  },
  {
    id: 'acc-headphones',
    name: 'Studio Noise-Canceling Cans',
    category: 'GEAR',
    rarity: 'RARE',
    cost: 1600,
    description: 'Deep focus acoustics for intense study & coding sprints.',
    perkText: '+1 Smartness & Morale',
    tag: 'Audio',
    iconName: 'Headphones',
    unlockCondition: { type: 'CASH', threshold: 1600, requirementText: 'Purchase for $1,600 cash' },
  },
  {
    id: 'acc-briefcase',
    name: 'Kevlar Case of $100s',
    category: 'GEAR',
    rarity: 'EPIC',
    cost: 6500,
    description: 'Heavy tactical briefcase bursting with crisp banded cash stacks.',
    perkText: '+5% Safe Vault Capacity',
    tag: 'High Roller',
    iconName: 'Briefcase',
    setId: 'SET_WALLSTREET_LUXE',
    unlockCondition: { type: 'CASH', threshold: 6500, requirementText: 'Purchase for $6,500 cash' },
  },
  {
    id: 'acc-trophy-cup',
    name: 'Grand Championship Trophy',
    category: 'GEAR',
    rarity: 'EPIC',
    cost: 7500,
    description: 'Towering engraved golden cup won in tournament finals.',
    perkText: '+3 Power & +3 Smartness',
    tag: 'Championship',
    iconName: 'Trophy',
    setId: 'SET_ROYAL_MONARCH',
    unlockCondition: { type: 'CASH', threshold: 7500, requirementText: 'Purchase for $7,500 cash' },
  },
  {
    id: 'acc-laser-blade',
    name: 'Holographic Plasma Saber',
    category: 'GEAR',
    rarity: 'LEGENDARY',
    cost: 14000,
    description: 'Humming neon energy blade crafted in the physics engineering lab.',
    perkText: '+6 Arena Power & Knockout Bonus',
    tag: 'Futuristic',
    iconName: 'Zap',
    unlockCondition: { type: 'CASH', threshold: 14000, requirementText: 'Purchase for $14,000 cash' },
  },

  // ==========================================
  // 6. FRAMES & BORDER STYLES
  // ==========================================
  {
    id: 'frame-neon',
    name: 'Cyber Neon Cyan',
    category: 'FRAME',
    rarity: 'COMMON',
    cost: 0,
    description: 'Electric cyan boundary with clean glow.',
    tag: 'Default',
    iconName: 'Shield',
    unlockCondition: { type: 'DEFAULT', requirementText: 'Unlocked by default' },
  },
  {
    id: 'frame-slate',
    name: 'Minimal Titanium Slate',
    category: 'FRAME',
    rarity: 'COMMON',
    cost: 500,
    description: 'Sleek brushed matte titanium finish.',
    tag: 'Minimal',
    iconName: 'Shield',
    unlockCondition: { type: 'CASH', threshold: 500, requirementText: 'Purchase for $500 cash' },
  },
  {
    id: 'frame-gold',
    name: 'Varsity Championship Gold',
    category: 'FRAME',
    rarity: 'RARE',
    cost: 2000,
    description: 'Polished yellow gold border with championship radiance.',
    tag: 'Prestige',
    iconName: 'Award',
    unlockCondition: { type: 'CASH', threshold: 2000, requirementText: 'Purchase for $2,000 cash' },
  },
  {
    id: 'frame-crimson',
    name: 'Crimson Berserker',
    category: 'FRAME',
    rarity: 'RARE',
    cost: 2500,
    description: 'Blood-red battle frame with aggressive corner spikes.',
    tag: 'Arena',
    iconName: 'Flame',
    unlockCondition: { type: 'CASH', threshold: 2500, requirementText: 'Purchase for $2,500 cash' },
  },
  {
    id: 'frame-violet',
    name: 'Royal Syndicate Violet',
    category: 'FRAME',
    rarity: 'EPIC',
    cost: 5000,
    description: 'Deep velvet violet border with neon pulse styling.',
    tag: 'Syndicate',
    iconName: 'Sparkles',
    unlockCondition: { type: 'CASH', threshold: 5000, requirementText: 'Purchase for $5,000 cash' },
  },
  {
    id: 'frame-emerald',
    name: 'Emerald Tycoon Vault',
    category: 'FRAME',
    rarity: 'EPIC',
    cost: 6500,
    description: 'Gleaming emerald facet border representing deep campus wealth.',
    tag: 'Tycoon',
    iconName: 'Landmark',
    unlockCondition: { type: 'CASH', threshold: 6500, requirementText: 'Purchase for $6,500 cash' },
  },
  {
    id: 'frame-holographic',
    name: 'Holographic Rainbow Prism',
    category: 'FRAME',
    rarity: 'LEGENDARY',
    cost: 15000,
    description: 'Shifting iridescent foil border with prismatic holographic sheen.',
    tag: 'Ultra-Luxe',
    iconName: 'Sparkles',
    unlockCondition: { type: 'CASH', threshold: 15000, requirementText: 'Purchase for $15,000 cash' },
  },
];

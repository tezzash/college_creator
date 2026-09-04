import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getCloudDoc, saveCloudDoc } from './firebase.service';
import { CANONICAL_BOTS } from './canonical-bots';

export enum BattleAction {
  PUNCH = 'PUNCH',
  FACE_OFF = 'FACE_OFF',
  FIGHT = 'FIGHT',
  PRANK = 'PRANK',
  SPY = 'SPY',
}

export enum CashTransactionType {
  STARTING_CASH = 'STARTING_CASH',
  JOB_REWARD = 'JOB_REWARD',
  TOWER_ROOM_UNLOCK = 'TOWER_ROOM_UNLOCK',
  ALLY_HIRE = 'ALLY_HIRE',
  ALLY_UPGRADE = 'ALLY_UPGRADE',
  ALLY_EVICT_REFUND = 'ALLY_EVICT_REFUND',
  PVP_STEAL_CREDIT = 'PVP_STEAL_CREDIT',
  PVP_STEAL_DEBIT = 'PVP_STEAL_DEBIT',
  BANK_DEPOSIT = 'BANK_DEPOSIT',
  BANK_DEPOSIT_FEE = 'BANK_DEPOSIT_FEE',
  BANK_WITHDRAW = 'BANK_WITHDRAW',
  FURNITURE_PURCHASE = 'FURNITURE_PURCHASE',
  COSMETIC_PURCHASE = 'COSMETIC_PURCHASE',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
}

export const ALLY_LEVEL_MULTIPLIERS: Readonly<Record<number, number>> = Object.freeze({
  1: 1.0,
  2: 1.8,
  3: 2.8,
  4: 4.2,
  5: 6.0,
});

export const ALLY_UPGRADE_COST_RATIOS: Readonly<Record<number, number>> = Object.freeze({
  2: 1.5,
  3: 2.8,
  4: 4.8,
  5: 8.0,
});

export const DORM_FURNITURE_CATALOG = [
  {
    id: 'furn-espresso',
    name: 'Espresso Overclock Station',
    category: 'energy',
    cost: 1500,
    description: 'Brews ultra-caffeinated roast. Grants +2 Maximum Energy capacity (12 Max Energy).',
    bonusText: '+2 Max Energy Capacity',
    icon: 'Coffee',
  },
  {
    id: 'furn-lock',
    name: 'Biometric Smart Vault Lock',
    category: 'defense',
    cost: 2500,
    description: 'Military-grade biometric door lock. Reduces cash plundered by rivals by 35% on defense.',
    bonusText: '-35% Plunder Loss on Defense',
    icon: 'ShieldCheck',
  },
  {
    id: 'furn-server',
    name: 'Liquid-Cooled Neural Rig',
    category: 'smartness',
    cost: 3500,
    description: 'Multi-GPU computing workstation. Amplifies total Dormmate Smartness output by +20%.',
    bonusText: '+20% Total Smartness Multiplier',
    icon: 'Server',
  },
  {
    id: 'furn-rack',
    name: 'Titan Power Cage & Barbell',
    category: 'power',
    cost: 3500,
    description: 'Heavy duty steel squat rack. Amplifies total Dormmate Power output by +20%.',
    bonusText: '+20% Total Power Multiplier',
    icon: 'Dumbbell',
  },
];

export class PrismaService {
  private players = new Map<string, any>();
  private jobs = new Map<string, any>();
  private activeJobs = new Map<string, any>();
  private towerRooms = new Map<string, any>();
  private allies = new Map<string, any>();
  private roomOccupants = new Map<string, any>();
  private battles = new Map<string, any>();
  private cashTransactions = new Map<string, any>();
  private dormFurniture = new Map<string, any>();
  private playerFurniture = new Map<string, any>();
  private messages = new Map<string, any>();
  private friendships = new Map<string, any>();
  private storageFilePath = path.join(process.cwd(), '.campus_game_store.json');
  private saveTimeout: NodeJS.Timeout | null = null;
  private cloudSaveTimeout: NodeJS.Timeout | null = null;
  private lastCloudSaveTime = 0;
  private isCloudSynced = false;

  constructor() {
    this.seedStaticCatalog();
    const loaded = this.loadFromDisk();
    if (!loaded || this.players.size === 0) {
      this.seedDefaults();
    }
    this.ensureRivalsConfigured();
    this.saveToDisk();
    // Phase 19 Production Cutover: Firestore startup restoration is disabled.
    // PostgreSQL is the single authoritative source of persistent truth.
  }

  private async syncFromCloudFirestore() {
    // Phase 19 Production Cutover: Passive stub - never restore or overwrite authoritative database state
    return;
  }

  private seedStaticCatalog() {
    for (const f of DORM_FURNITURE_CATALOG) {
      this.dormFurniture.set(f.id, { ...f });
    }
    const jobsList = [
      { id: 'job-study', name: 'Study Session', durationSeconds: 30, rewardCash: 100 },
      { id: 'job-freelance', name: 'Freelance Gig', durationSeconds: 90, rewardCash: 300 },
      { id: 'job-night-shift', name: 'Night Shift', durationSeconds: 180, rewardCash: 750 },
    ];
    for (const j of jobsList) {
      this.jobs.set(j.id, { ...j });
    }

    const alliesList = [
      { id: 'ally-tutor', name: 'Campus Tutor', tier: 'common', power: 0, smartness: 4, hireCost: 250 },
      { id: 'ally-athlete', name: 'Varsity Athlete', tier: 'rare', power: 5, smartness: 0, hireCost: 450 },
      { id: 'ally-ra', name: 'Resident Advisor', tier: 'rare', power: 3, smartness: 3, hireCost: 650 },
      { id: 'ally-captain', name: 'Club Captain', tier: 'epic', power: 4, smartness: 6, hireCost: 900 },
      { id: 'ally-coder', name: 'Hacker Prodigy', tier: 'epic', power: 1, smartness: 10, hireCost: 1200 },
      { id: 'ally-bouncer', name: 'Campus Bouncer', tier: 'epic', power: 10, smartness: 1, hireCost: 1200 },
      { id: 'ally-legend', name: 'Campus Legend', tier: 'legendary', power: 10, smartness: 8, hireCost: 1800 },
      { id: 'ally-valedictorian', name: "Dean's Scholar", tier: 'legendary', power: 2, smartness: 18, hireCost: 2500 },
      { id: 'ally-champion', name: 'All-Star Champion', tier: 'legendary', power: 18, smartness: 2, hireCost: 2500 },
    ];
    for (const a of alliesList) {
      this.allies.set(a.id, { ...a });
    }
  }

  public async saveToDisk() {
    try {
      const payload = {
        players: Array.from(this.players.entries()),
        activeJobs: Array.from(this.activeJobs.entries()),
        towerRooms: Array.from(this.towerRooms.entries()),
        roomOccupants: Array.from(this.roomOccupants.entries()),
        battles: Array.from(this.battles.entries()),
        cashTransactions: Array.from(this.cashTransactions.entries()),
        playerFurniture: Array.from(this.playerFurniture.entries()),
        messages: Array.from(this.messages.entries()),
        friendships: Array.from(this.friendships.entries()),
      };
      fs.writeFileSync(this.storageFilePath, JSON.stringify(payload, null, 2), 'utf-8');

      if (process.env.NODE_ENV !== 'test') {
        this.triggerCloudBackup(payload);
      }
    } catch (err) {
      console.warn('[Database Storage] Error saving state:', err);
    }
  }

  private triggerCloudBackup(payload: any) {
    const now = Date.now();
    // Throttle cloud updates to at most once every 30 seconds
    if (now - this.lastCloudSaveTime < 30000) {
      if (!this.cloudSaveTimeout) {
        this.cloudSaveTimeout = setTimeout(() => {
          this.cloudSaveTimeout = null;
          this.triggerCloudBackup(payload);
        }, 30000);
      }
      return;
    }

    this.lastCloudSaveTime = now;
    saveCloudDoc('campus_meta', 'game_state_store', {
      payload: JSON.stringify(payload),
      updatedAt: new Date().toISOString(),
      playerCount: this.players.size,
    }).catch((err) => {
      console.warn('[Firebase Firestore] Background backup write error:', err.message);
    });
  }

  public scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToDisk();
    }, 50);
  }

  public hydrateFromPayload(data: any): boolean {
    try {
      if (!data) return false;
      if (data.players && Array.isArray(data.players)) {
        for (const [id, p] of data.players) {
          p.createdAt = new Date(p.createdAt);
          p.updatedAt = new Date(p.updatedAt);
          if (p.lastEnergyUpdate) p.lastEnergyUpdate = new Date(p.lastEnergyUpdate);
          if (p.lastMoraleUpdate) p.lastMoraleUpdate = new Date(p.lastMoraleUpdate);
          if (p.pinnedUntil) p.pinnedUntil = new Date(p.pinnedUntil);
          if (p.morale === undefined) p.morale = 10;
          if (!p.lastMoraleUpdate) p.lastMoraleUpdate = new Date();
          p.isBot = p.isBot !== undefined ? Boolean(p.isBot) : (String(id).startsWith('rival-') ? true : false);
          this.players.set(id, p);
        }
        // Purge retired rivals if present in loaded payload
        this.players.delete('rival-chloe');
        this.players.delete('rival-tyler');
      }
      if (data.activeJobs && Array.isArray(data.activeJobs)) {
        for (const [id, aj] of data.activeJobs) {
          aj.startedAt = new Date(aj.startedAt);
          aj.finishesAt = new Date(aj.finishesAt || aj.completesAt || Date.now());
          if (aj.completesAt) aj.completesAt = new Date(aj.completesAt);
          this.activeJobs.set(id, aj);
        }
      }
      if (data.towerRooms && Array.isArray(data.towerRooms)) {
        for (const [id, r] of data.towerRooms) {
          this.towerRooms.set(id, r);
        }
      }
      if (data.roomOccupants && Array.isArray(data.roomOccupants)) {
        for (const [id, ro] of data.roomOccupants) {
          ro.hiredAt = new Date(ro.hiredAt);
          this.roomOccupants.set(id, ro);
        }
      }
      if (data.battles && Array.isArray(data.battles)) {
        for (const [id, b] of data.battles) {
          b.createdAt = new Date(b.createdAt);
          this.battles.set(id, b);
        }
      }
      if (data.cashTransactions && Array.isArray(data.cashTransactions)) {
        for (const [id, ct] of data.cashTransactions) {
          ct.createdAt = new Date(ct.createdAt);
          this.cashTransactions.set(id, ct);
        }
      }
      if (data.playerFurniture && Array.isArray(data.playerFurniture)) {
        for (const [id, pf] of data.playerFurniture) {
          pf.equippedAt = new Date(pf.equippedAt);
          this.playerFurniture.set(id, pf);
        }
      }
      if (data.messages && Array.isArray(data.messages)) {
        for (const [id, m] of data.messages) {
          m.createdAt = new Date(m.createdAt);
          if (m.readAt) m.readAt = new Date(m.readAt);
          this.messages.set(id, m);
        }
      }
      if (data.friendships && Array.isArray(data.friendships)) {
        for (const [id, f] of data.friendships) {
          f.createdAt = new Date(f.createdAt);
          if (f.updatedAt) f.updatedAt = new Date(f.updatedAt);
          if (f.lastGiftSentAt) f.lastGiftSentAt = new Date(f.lastGiftSentAt);
          this.friendships.set(id, f);
        }
      }
      return true;
    } catch (err) {
      console.warn('[Database Storage] Error hydrating state:', err);
      return false;
    }
  }

  private loadFromDisk(): boolean {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const data = JSON.parse(raw);
        const success = this.hydrateFromPayload(data);
        if (success) {
          console.log(`[Database Storage] Restored ${this.players.size} players, ${this.towerRooms.size} rooms, ${this.roomOccupants.size} occupants from local disk.`);
          return true;
        }
      }
    } catch (err) {
      console.warn('[Database Storage] Error restoring state from disk:', err);
    }
    return false;
  }

  private seedDefaults() {
    this.seedStaticCatalog();
    this.ensureRivalsConfigured();
  }

  private getRivalDefaultPower(id: string): number {
    switch (id) {
      case 'rival-sam': return 6;
      case 'rival-chad': return 16;
      case 'rival-elliot': return 8;
      case 'rival-alex': return 22;
      case 'rival-emma': return 4;
      default: return 8;
    }
  }

  private getRivalDefaultSmartness(id: string): number {
    switch (id) {
      case 'rival-sam': return 6;
      case 'rival-chad': return 5;
      case 'rival-elliot': return 18;
      case 'rival-alex': return 3;
      case 'rival-emma': return 24;
      default: return 8;
    }
  }

  private getRivalDefaultCash(id: string): number {
    switch (id) {
      case 'rival-sam': return 950;
      case 'rival-chad': return 1650;
      case 'rival-elliot': return 1850;
      case 'rival-alex': return 1350;
      case 'rival-emma': return 2250;
      default: return 1200;
    }
  }

  public ensureRivalsConfigured() {
    // Purge retired bot accounts from in-memory players
    this.players.delete('rival-chloe');
    this.players.delete('rival-tyler');

    const rivals = CANONICAL_BOTS;

    for (const r of rivals) {
      const existing = this.players.get(r.id);
      const isDepletedCash = !existing || Number(existing.cash ?? 0) < 400;
      const currentCash = isDepletedCash ? r.cash : Number(existing.cash);
      
      const record = {
        id: r.id,
        isBot: true,
        username: r.username,
        email: r.email,
        passwordHash: 'mock',
        cash: currentCash,
        bankCash: existing ? Number(existing.bankCash ?? r.bankCash) : r.bankCash,
        energy: existing ? Math.max(existing.energy ?? 10, 10) : 10,
        morale: existing ? Math.max(existing.morale ?? 10, 10) : 10,
        basePower: r.basePower,
        baseSmartness: r.baseSmartness,
        winStreak: existing ? (existing.winStreak ?? r.winStreak) : r.winStreak,
        highestStreak: existing ? (existing.highestStreak ?? r.highestStreak) : r.highestStreak,
        totalPvPWins: existing ? (existing.totalPvPWins ?? r.totalPvPWins) : r.totalPvPWins,
        totalPvPLosses: existing ? (existing.totalPvPLosses ?? r.totalPvPLosses) : r.totalPvPLosses,
        totalPlundered: existing ? (existing.totalPlundered ?? r.totalPlundered) : r.totalPlundered,
        equippedTitle: r.equippedTitle,
        avatarId: r.avatarId,
        avatarFrame: r.avatarFrame,
        avatarOutfit: r.avatarOutfit,
        avatarAccessory: r.avatarAccessory,
        customBio: r.customBio,
        claimedMilestones: r.claimedMilestones,
        totalJobsCompleted: r.totalJobsCompleted,
        totalBankDeposited: r.totalBankDeposited,
        lastEnergyUpdate: new Date(),
        createdAt: existing?.createdAt || new Date(),
        updatedAt: new Date(),
        pinnedUntil: existing?.pinnedUntil ? new Date(existing.pinnedUntil) : null,
      };

      this.players.set(r.id, record);

      // Seed/ensure tower rooms for this rival
      for (const rm of r.rooms) {
        let roomId = `room-${r.id}-${rm.roomNumber}`;
        if (!this.towerRooms.has(roomId)) {
          this.towerRooms.set(roomId, {
            id: roomId,
            playerId: r.id,
            roomNumber: rm.roomNumber,
            unlockedAt: new Date(),
          });
        }

        // Seed room occupant
        let occId = `occ-${r.id}-${rm.roomNumber}`;
        if (!this.roomOccupants.has(occId)) {
          this.roomOccupants.set(occId, {
            id: occId,
            towerRoomId: roomId,
            allyId: rm.allyId,
            level: rm.level,
            assignedAt: new Date(),
          });
        }
      }

      // Seed furniture
      for (const furnId of r.furniture) {
        let pfId = `pf-${r.id}-${furnId}`;
        if (!this.playerFurniture.has(pfId)) {
          this.playerFurniture.set(pfId, {
            id: pfId,
            playerId: r.id,
            furnitureId: furnId,
            acquiredAt: new Date(),
          });
        }
      }

      // Run stat calculation immediately
      this.syncPlayerStatsFromAllies(record);
    }
  }

  private syncPlayerStatsFromAllies(player: any) {
    if (!player) return player;
    const playerRoomIds = new Set(
      Array.from(this.towerRooms.values())
        .filter((r) => r.playerId === player.id)
        .map((r) => r.id)
    );
    let allyBonusPower = 0;
    let allyBonusSmartness = 0;
    for (const occ of this.roomOccupants.values()) {
      if (playerRoomIds.has(occ.towerRoomId)) {
        const ally = this.allies.get(occ.allyId);
        if (ally) {
          const level = occ.level || 1;
          const mult = ALLY_LEVEL_MULTIPLIERS[level] || 1.0;
          allyBonusPower += Math.round(Number(ally.power || 0) * mult);
          allyBonusSmartness += Math.round(Number(ally.smartness || 0) * mult);
        }
      }
    }

    // Check equipped furniture multiplier
    const playerFurnIds = new Set(
      Array.from(this.playerFurniture.values())
        .filter((pf) => pf.playerId === player.id)
        .map((pf) => pf.furnitureId)
    );

    if (playerFurnIds.has('furn-rack')) {
      allyBonusPower = Math.round(allyBonusPower * 1.2);
    }
    if (playerFurnIds.has('furn-server')) {
      allyBonusSmartness = Math.round(allyBonusSmartness * 1.2);
    }

    const isBot = player.isBot !== undefined ? Boolean(player.isBot) : String(player.id).startsWith('rival-');
    player.isBot = isBot;
    const basePower = Number(player.basePower ?? (isBot ? this.getRivalDefaultPower(player.id) : 5));
    const baseSmartness = Number(player.baseSmartness ?? (isBot ? this.getRivalDefaultSmartness(player.id) : 5));

    player.power = Math.max(1, basePower + allyBonusPower);
    player.smartness = Math.max(1, baseSmartness + allyBonusSmartness);

    // Bot cash replenishment: If bot cash is depleted (< $400), auto-replenish to base allowance so players can always loot cash
    if (isBot && Number(player.cash ?? 0) < 400) {
      player.cash = this.getRivalDefaultCash(player.id);
    }

    player.bankCash = Number(player.bankCash ?? (isBot ? 800 : 0));
    player.winStreak = Number(player.winStreak ?? 0);
    player.highestStreak = Number(player.highestStreak ?? 0);
    player.totalPvPWins = Number(player.totalPvPWins ?? 0);
    player.totalPvPLosses = Number(player.totalPvPLosses ?? 0);
    player.totalPlundered = Number(player.totalPlundered ?? 0);
    player.equippedTitle = player.equippedTitle || 'Freshman Novice';
    player.avatarId = player.avatarId || 'avatar-coder';
    player.avatarFrame = player.avatarFrame || 'frame-neon';
    player.avatarOutfit = player.avatarOutfit || 'outfit-hoodie';
    player.avatarAccessory = player.avatarAccessory || 'acc-laptop';
    player.customBio = player.customBio ?? 'Ready to conquer the campus empire! 💻💸';
    player.claimedMilestones = Array.isArray(player.claimedMilestones) ? player.claimedMilestones : [];
    player.totalJobsCompleted = Number(player.totalJobsCompleted ?? 0);
    player.totalBankDeposited = Number(player.totalBankDeposited ?? 0);
    player.dailyStreak = Number(player.dailyStreak ?? 1);
    
    player.morale = Number(player.morale ?? 10);
    player.pinnedUntil = player.pinnedUntil ? new Date(player.pinnedUntil) : null;
    player.isPinned = Boolean(player.pinnedUntil && new Date(player.pinnedUntil).getTime() > Date.now());

    // Also sync the canonical in-memory record
    const canonical = this.players.get(player.id);
    if (canonical) {
      canonical.isBot = isBot;
      canonical.power = player.power;
      canonical.smartness = player.smartness;
      canonical.cash = player.cash;
      canonical.bankCash = player.bankCash;
      canonical.winStreak = player.winStreak;
      canonical.highestStreak = player.highestStreak;
      canonical.totalPvPWins = player.totalPvPWins;
      canonical.totalPvPLosses = player.totalPvPLosses;
      canonical.totalPlundered = player.totalPlundered;
      canonical.equippedTitle = player.equippedTitle;
      canonical.avatarId = player.avatarId;
      canonical.avatarFrame = player.avatarFrame;
      canonical.avatarOutfit = player.avatarOutfit;
      canonical.avatarAccessory = player.avatarAccessory;
      canonical.customBio = player.customBio;
      canonical.claimedMilestones = player.claimedMilestones;
      canonical.totalJobsCompleted = player.totalJobsCompleted;
      canonical.totalBankDeposited = player.totalBankDeposited;
      canonical.dailyStreak = player.dailyStreak;
      canonical.morale = player.morale;
      canonical.pinnedUntil = player.pinnedUntil;
    }
    return player;
  }

  get player() {
    return {
      create: async ({ data }: { data: any }): Promise<any> => {
        const id = data.id || randomUUID();
        const isBot = Boolean(data.isBot ?? false);
        const p = {
          id,
          isBot,
          username: data.username,
          email: data.email,
          passwordHash: data.passwordHash,
          cash: data.cash ?? 1000,
          bankCash: data.bankCash ?? 0,
          energy: data.energy ?? 10,
          morale: data.morale ?? 10,
          power: data.power ?? 0,
          smartness: data.smartness ?? 0,
          winStreak: 0,
          highestStreak: 0,
          totalPvPWins: 0,
          totalPvPLosses: 0,
          totalPlundered: 0,
          equippedTitle: data.equippedTitle || 'Freshman Novice',
          avatarId: data.avatarId || 'avatar-coder',
          avatarFrame: data.avatarFrame || 'frame-neon',
          avatarOutfit: data.avatarOutfit || 'outfit-hoodie',
          avatarAccessory: data.avatarAccessory || 'acc-laptop',
          customBio: data.customBio || 'Ready to conquer the campus empire! 💻💸',
          claimedMilestones: [],
          totalJobsCompleted: 0,
          totalBankDeposited: 0,
          dailyStreak: 1,
          lastEnergyUpdate: new Date(),
          lastMoraleUpdate: new Date(),
          pinnedUntil: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.players.set(id, p);
        this.scheduleSave();
        return { ...p };
      },
      findFirst: async ({ where }: { where: any }): Promise<any> => {
        for (const p of this.players.values()) {
          if (where.isBot !== undefined && Boolean(p.isBot) !== Boolean(where.isBot)) {
            continue;
          }
          if (where.OR) {
            for (const cond of where.OR) {
              if (cond.username && p.username.toLowerCase() === cond.username.toLowerCase()) return this.syncPlayerStatsFromAllies({ ...p });
              if (cond.email && p.email.toLowerCase() === cond.email.toLowerCase()) return this.syncPlayerStatsFromAllies({ ...p });
            }
          }
          if (where.username && p.username.toLowerCase() === where.username.toLowerCase()) return this.syncPlayerStatsFromAllies({ ...p });
          if (where.email && p.email.toLowerCase() === where.email.toLowerCase()) return this.syncPlayerStatsFromAllies({ ...p });
        }
        return null;
      },
      findUnique: async ({ where }: { where: { id?: string; [k: string]: any }; select?: any }): Promise<any> => {
        if (where.id) {
          const p = this.players.get(where.id);
          return p ? this.syncPlayerStatsFromAllies({ ...p }) : null;
        }
        return null;
      },
      findUniqueOrThrow: async ({ where }: { where: { id?: string; [k: string]: any }; select?: any }): Promise<any> => {
        if (where.id) {
          const p = this.players.get(where.id);
          if (!p) throw new Error('Player not found.');
          return this.syncPlayerStatsFromAllies({ ...p });
        }
        throw new Error('Player not found.');
      },
      findMany: async (args: any = {}): Promise<any[]> => {
        let list = Array.from(this.players.values()).map((p) => this.syncPlayerStatsFromAllies({ ...p }));
        if (args?.where?.isBot !== undefined) {
          list = list.filter((p) => Boolean(p.isBot) === Boolean(args.where.isBot));
        }
        if (args?.where?.id?.not) {
          list = list.filter((p) => p.id !== args.where.id.not);
        }
        if (args?.where?.username?.contains) {
          const q = args.where.username.contains.toLowerCase();
          list = list.filter((p) => p.username.toLowerCase().includes(q));
        }
        list.sort((a, b) => a.username.localeCompare(b.username));
        if (args?.take) list = list.slice(0, args.take);
        return list.map((p) => ({ ...p }));
      },
      update: async ({ where, data }: { where: { id: string }; data: any }): Promise<any> => {
        const p = this.players.get(where.id);
        if (!p) throw new Error('Player not found.');
        if (data.cash?.increment !== undefined) p.cash = Number(p.cash) + Number(data.cash.increment);
        if (data.cash?.decrement !== undefined) p.cash = Number(p.cash) - Number(data.cash.decrement);
        if (typeof data.cash === 'number') p.cash = data.cash;
        if (data.bankCash?.increment !== undefined) p.bankCash = Number(p.bankCash ?? 0) + Number(data.bankCash.increment);
        if (data.bankCash?.decrement !== undefined) p.bankCash = Number(p.bankCash ?? 0) - Number(data.bankCash.decrement);
        if (typeof data.bankCash === 'number') p.bankCash = data.bankCash;
        if (data.power?.increment !== undefined) p.power = Number(p.power) + Number(data.power.increment);
        if (data.power?.decrement !== undefined) p.power = Number(p.power) - Number(data.power.decrement);
        if (typeof data.power === 'number') p.power = data.power;
        if (data.smartness?.increment !== undefined) p.smartness = Number(p.smartness) + Number(data.smartness.increment);
        if (data.smartness?.decrement !== undefined) p.smartness = Number(p.smartness) - Number(data.smartness.decrement);
        if (typeof data.smartness === 'number') p.smartness = data.smartness;
        if (data.energy !== undefined) p.energy = data.energy;
        if (data.morale !== undefined) p.morale = data.morale;
        if (data.winStreak !== undefined) p.winStreak = data.winStreak;
        if (data.highestStreak !== undefined) p.highestStreak = data.highestStreak;
        if (data.totalPvPWins?.increment !== undefined) p.totalPvPWins = Number(p.totalPvPWins ?? 0) + Number(data.totalPvPWins.increment);
        if (data.totalPvPLosses?.increment !== undefined) p.totalPvPLosses = Number(p.totalPvPLosses ?? 0) + Number(data.totalPvPLosses.increment);
        if (data.totalPlundered?.increment !== undefined) p.totalPlundered = Number(p.totalPlundered ?? 0) + Number(data.totalPlundered.increment);
        if (data.equippedTitle !== undefined) p.equippedTitle = data.equippedTitle;
        if (data.avatarId !== undefined) p.avatarId = data.avatarId;
        if (data.avatarFrame !== undefined) p.avatarFrame = data.avatarFrame;
        if (data.avatarOutfit !== undefined) p.avatarOutfit = data.avatarOutfit;
        if (data.avatarAccessory !== undefined) p.avatarAccessory = data.avatarAccessory;
        if (data.customBio !== undefined) p.customBio = data.customBio;
        if (data.claimedMilestones !== undefined) p.claimedMilestones = data.claimedMilestones;
        if (data.totalJobsCompleted?.increment !== undefined) p.totalJobsCompleted = Number(p.totalJobsCompleted ?? 0) + Number(data.totalJobsCompleted.increment);
        if (typeof data.totalJobsCompleted === 'number') p.totalJobsCompleted = data.totalJobsCompleted;
        if (data.totalBankDeposited?.increment !== undefined) p.totalBankDeposited = Number(p.totalBankDeposited ?? 0) + Number(data.totalBankDeposited.increment);
        if (typeof data.totalBankDeposited === 'number') p.totalBankDeposited = data.totalBankDeposited;
        if (data.dailyStreak !== undefined) p.dailyStreak = data.dailyStreak;
        if (data.dailyQuestsDate !== undefined) p.dailyQuestsDate = data.dailyQuestsDate;
        if (data.dailyQuestsState !== undefined) p.dailyQuestsState = data.dailyQuestsState;
        if (data.lastDailyClaimedDate !== undefined) p.lastDailyClaimedDate = data.lastDailyClaimedDate;
        if (data.dailyBonusClaimedDate !== undefined) p.dailyBonusClaimedDate = data.dailyBonusClaimedDate;
        if (data.lastEnergyUpdate) p.lastEnergyUpdate = data.lastEnergyUpdate;
        if (data.lastMoraleUpdate) p.lastMoraleUpdate = data.lastMoraleUpdate;
        if (data.pinnedUntil !== undefined) p.pinnedUntil = data.pinnedUntil;
        p.updatedAt = new Date();
        this.players.set(where.id, p);
        this.scheduleSave();
        return this.syncPlayerStatsFromAllies({ ...p });
      },
      updateMany: async ({ where, data }: { where: any; data: any }): Promise<{ count: number }> => {
        let count = 0;
        for (const [id, p] of this.players.entries()) {
          let match = true;
          if (where.id) {
            if (typeof where.id === 'object' && Array.isArray(where.id.in)) {
              if (!where.id.in.includes(p.id)) match = false;
            } else if (p.id !== where.id) {
              match = false;
            }
          }
          if (where.cash?.gte !== undefined && p.cash < where.cash.gte) match = false;
          if (where.bankCash?.gte !== undefined && (p.bankCash ?? 0) < where.bankCash.gte) match = false;
          if (where.energy !== undefined && p.energy !== where.energy) match = false;
          if (where.morale !== undefined && p.morale !== where.morale) match = false;
          if (match) {
            count++;
            if (data.pinnedUntil !== undefined) p.pinnedUntil = data.pinnedUntil;
            if (data.hospitalUntil !== undefined) p.hospitalUntil = data.hospitalUntil;
            if (data.hospitalizedUntil !== undefined) p.hospitalizedUntil = data.hospitalizedUntil;
            if (data.cash?.decrement !== undefined) p.cash = Number(p.cash) - Number(data.cash.decrement);
            if (data.cash?.increment !== undefined) p.cash = Number(p.cash) + Number(data.cash.increment);
            if (typeof data.cash === 'number') p.cash = data.cash;
            if (data.bankCash?.decrement !== undefined) p.bankCash = Number(p.bankCash ?? 0) - Number(data.bankCash.decrement);
            if (data.bankCash?.increment !== undefined) p.bankCash = Number(p.bankCash ?? 0) + Number(data.bankCash.increment);
            if (typeof data.bankCash === 'number') p.bankCash = data.bankCash;
            if (data.power?.increment !== undefined) p.power = Number(p.power) + Number(data.power.increment);
            if (data.power?.decrement !== undefined) p.power = Number(p.power) - Number(data.power.decrement);
            if (typeof data.power === 'number') p.power = data.power;
            if (data.smartness?.increment !== undefined) p.smartness = Number(p.smartness) + Number(data.smartness.increment);
            if (data.smartness?.decrement !== undefined) p.smartness = Number(p.smartness) - Number(data.smartness.decrement);
            if (typeof data.smartness === 'number') p.smartness = data.smartness;
            if (data.energy !== undefined) p.energy = data.energy;
            if (data.morale !== undefined) p.morale = data.morale;
            if (data.winStreak !== undefined) p.winStreak = data.winStreak;
            if (data.highestStreak !== undefined) p.highestStreak = data.highestStreak;
            if (data.totalPvPWins?.increment !== undefined) p.totalPvPWins = Number(p.totalPvPWins ?? 0) + Number(data.totalPvPWins.increment);
            if (data.totalPvPLosses?.increment !== undefined) p.totalPvPLosses = Number(p.totalPvPLosses ?? 0) + Number(data.totalPvPLosses.increment);
            if (data.totalPlundered?.increment !== undefined) p.totalPlundered = Number(p.totalPlundered ?? 0) + Number(data.totalPlundered.increment);
            if (data.equippedTitle !== undefined) p.equippedTitle = data.equippedTitle;
            if (data.avatarId !== undefined) p.avatarId = data.avatarId;
            if (data.avatarFrame !== undefined) p.avatarFrame = data.avatarFrame;
            if (data.avatarOutfit !== undefined) p.avatarOutfit = data.avatarOutfit;
            if (data.avatarAccessory !== undefined) p.avatarAccessory = data.avatarAccessory;
            if (data.customBio !== undefined) p.customBio = data.customBio;
            if (data.claimedMilestones !== undefined) p.claimedMilestones = data.claimedMilestones;
            if (data.totalJobsCompleted?.increment !== undefined) p.totalJobsCompleted = Number(p.totalJobsCompleted ?? 0) + Number(data.totalJobsCompleted.increment);
            if (typeof data.totalJobsCompleted === 'number') p.totalJobsCompleted = data.totalJobsCompleted;
            if (data.totalBankDeposited?.increment !== undefined) p.totalBankDeposited = Number(p.totalBankDeposited ?? 0) + Number(data.totalBankDeposited.increment);
            if (typeof data.totalBankDeposited === 'number') p.totalBankDeposited = data.totalBankDeposited;
            if (data.dailyStreak !== undefined) p.dailyStreak = data.dailyStreak;
            if (data.dailyQuestsDate !== undefined) p.dailyQuestsDate = data.dailyQuestsDate;
            if (data.dailyQuestsState !== undefined) p.dailyQuestsState = data.dailyQuestsState;
            if (data.lastDailyClaimedDate !== undefined) p.lastDailyClaimedDate = data.lastDailyClaimedDate;
            if (data.dailyBonusClaimedDate !== undefined) p.dailyBonusClaimedDate = data.dailyBonusClaimedDate;
            if (data.highestStreak !== undefined) p.highestStreak = data.highestStreak;
            if (data.totalPvPWins?.increment !== undefined) p.totalPvPWins = Number(p.totalPvPWins ?? 0) + Number(data.totalPvPWins.increment);
            if (data.totalPvPLosses?.increment !== undefined) p.totalPvPLosses = Number(p.totalPvPLosses ?? 0) + Number(data.totalPvPLosses.increment);
            if (data.totalPlundered?.increment !== undefined) p.totalPlundered = Number(p.totalPlundered ?? 0) + Number(data.totalPlundered.increment);
            if (data.lastEnergyUpdate) p.lastEnergyUpdate = data.lastEnergyUpdate;
            if (data.lastMoraleUpdate) p.lastMoraleUpdate = data.lastMoraleUpdate;
            if (data.pinnedUntil !== undefined) p.pinnedUntil = data.pinnedUntil;
            p.updatedAt = new Date();
            this.players.set(id, p);
          }
        }
        if (count > 0) this.scheduleSave();
        return { count };
      },
      delete: async ({ where }: { where: { id: string } }): Promise<any> => {
        const p = this.players.get(where.id);
        if (p) {
          this.players.delete(where.id);
          this.scheduleSave();
          return { ...p };
        }
        return null;
      },
      deleteMany: async ({ where }: any = {}): Promise<{ count: number }> => {
        let count = 0;
        const toDelete: string[] = [];
        for (const [id] of this.players.entries()) {
          let match = true;
          if (where?.id) {
            if (typeof where.id === 'object' && where.id?.in) {
              if (!where.id.in.includes(id)) match = false;
            } else if (id !== where.id) {
              match = false;
            }
          }
          if (match) {
            toDelete.push(id);
            count++;
          }
        }
        for (const id of toDelete) {
          this.players.delete(id);
        }
        if (count > 0) this.scheduleSave();
        return { count };
      },
    };
  }

  get job() {
    return {
      create: async ({ data }: { data: any }): Promise<any> => {
        const id = data.id || randomUUID();
        const j = { id, ...data };
        this.jobs.set(id, j);
        return { ...j };
      },
      findUnique: async ({ where }: { where: { id: string }; select?: any }): Promise<any> => {
        const j = this.jobs.get(where.id);
        return j ? { ...j } : null;
      },
      findMany: async (args: any = {}): Promise<any[]> => {
        return Array.from(this.jobs.values()).sort((a, b) => a.name.localeCompare(b.name));
      },
      upsert: async ({ where, update, create }: any): Promise<any> => {
        const existing = this.jobs.get(where.id);
        const item = existing ? { ...existing, ...update } : { id: where.id, ...create };
        this.jobs.set(item.id, item);
        return { ...item };
      },
    };
  }

  get activeJob() {
    return {
      create: async ({ data, include }: any): Promise<any> => {
        const id = randomUUID();
        const aj = { id, ...data, collected: false };
        this.activeJobs.set(id, aj);
        this.scheduleSave();
        if (include?.job) {
          return { ...aj, job: this.jobs.get(aj.jobId) };
        }
        return { ...aj };
      },
      findFirst: async ({ where, include }: any): Promise<any> => {
        for (const aj of this.activeJobs.values()) {
          if (where.playerId && aj.playerId !== where.playerId) continue;
          if (where.collected !== undefined && aj.collected !== where.collected) continue;
          if (where.id && aj.id !== where.id) continue;
          if (include?.job) {
            return { ...aj, job: this.jobs.get(aj.jobId) };
          }
          return { ...aj };
        }
        return null;
      },
      update: async ({ where, data }: any): Promise<any> => {
        const aj = this.activeJobs.get(where.id);
        if (!aj) throw new Error('Active job not found.');
        Object.assign(aj, data);
        this.activeJobs.set(where.id, aj);
        this.scheduleSave();
        return { ...aj };
      },
    };
  }

  get towerRoom() {
    return {
      create: async ({ data }: any): Promise<any> => {
        const id = randomUUID();
        const tr = { id, ...data, occupants: [] };
        this.towerRooms.set(id, tr);
        this.scheduleSave();
        return { ...tr };
      },
      findUnique: async ({ where }: any): Promise<any> => {
        if (where.id) {
          const r = this.towerRooms.get(where.id);
          return r ? { ...r } : null;
        }
        if (where.playerId_roomNumber) {
          for (const r of this.towerRooms.values()) {
            if (r.playerId === where.playerId_roomNumber.playerId && r.roomNumber === where.playerId_roomNumber.roomNumber) {
              return { ...r };
            }
          }
        }
        return null;
      },
      findMany: async ({ where, include }: any = {}): Promise<any[]> => {
        const list = Array.from(this.towerRooms.values())
          .filter((r) => !where?.playerId || r.playerId === where.playerId)
          .sort((a, b) => a.roomNumber - b.roomNumber);

        return list.map((r) => {
          const res = { ...r };
          if (include?.occupants) {
            const occs = Array.from(this.roomOccupants.values()).filter((o) => o.towerRoomId === r.id);
            res.occupants = occs.map((o) => ({
              ...o,
              ally: this.allies.get(o.allyId) || null,
            }));
          }
          return res;
        });
      },
      update: async ({ where, data }: any): Promise<any> => {
        const r = this.towerRooms.get(where.id);
        if (!r) throw new Error('Tower room not found.');
        Object.assign(r, data);
        this.towerRooms.set(where.id, r);
        this.scheduleSave();
        return { ...r };
      },
    };
  }

  get ally() {
    return {
      create: async ({ data }: any): Promise<any> => {
        const id = data.id || randomUUID();
        const a = { id, ...data };
        this.allies.set(id, a);
        return { ...a };
      },
      findUnique: async ({ where }: any): Promise<any> => {
        const a = this.allies.get(where.id);
        return a ? { ...a } : null;
      },
      findMany: async (args: any = {}): Promise<any[]> => {
        return Array.from(this.allies.values()).sort((a, b) => a.name.localeCompare(b.name));
      },
      upsert: async ({ where, update, create }: any): Promise<any> => {
        const existing = this.allies.get(where.id);
        const item = existing ? { ...existing, ...update } : { id: where.id, ...create };
        this.allies.set(item.id, item);
        return { ...item };
      },
    };
  }

  get roomOccupant() {
    return {
      create: async ({ data }: any): Promise<any> => {
        const id = randomUUID();
        const ro = {
          id,
          ...data,
          level: data.level || 1,
          totalInvested: data.totalInvested || 0,
          hiredAt: new Date(),
        };
        this.roomOccupants.set(id, ro);
        this.scheduleSave();
        return { ...ro };
      },
      findUnique: async ({ where }: any): Promise<any> => {
        if (where.id) {
          const ro = this.roomOccupants.get(where.id);
          return ro ? { ...ro } : null;
        }
        for (const ro of this.roomOccupants.values()) {
          if (where.towerRoomId && ro.towerRoomId === where.towerRoomId) return { ...ro };
        }
        return null;
      },
      findFirst: async ({ where }: any): Promise<any> => {
        for (const ro of this.roomOccupants.values()) {
          if (where.allyId && ro.allyId !== where.allyId) continue;
          if (where.towerRoomId && ro.towerRoomId !== where.towerRoomId) continue;
          if (where.towerRoom?.playerId) {
            const tr = this.towerRooms.get(ro.towerRoomId);
            if (tr?.playerId !== where.towerRoom.playerId) continue;
          }
          return { ...ro };
        }
        return null;
      },
      update: async ({ where, data }: any): Promise<any> => {
        let ro = where.id ? this.roomOccupants.get(where.id) : null;
        if (!ro && where.towerRoomId) {
          for (const item of this.roomOccupants.values()) {
            if (item.towerRoomId === where.towerRoomId) {
              ro = item;
              break;
            }
          }
        }
        if (!ro) throw new Error('Room occupant not found.');
        Object.assign(ro, data);
        this.roomOccupants.set(ro.id, ro);
        this.scheduleSave();
        return { ...ro };
      },
      delete: async ({ where }: any): Promise<any> => {
        let targetId = where.id;
        if (!targetId && where.towerRoomId) {
          for (const item of this.roomOccupants.values()) {
            if (item.towerRoomId === where.towerRoomId) {
              targetId = item.id;
              break;
            }
          }
        }
        if (targetId && this.roomOccupants.has(targetId)) {
          const ro = this.roomOccupants.get(targetId);
          this.roomOccupants.delete(targetId);
          this.scheduleSave();
          return { ...ro };
        }
        throw new Error('Room occupant not found to delete.');
      },
      findMany: async ({ where }: any = {}): Promise<any[]> => {
        let list = Array.from(this.roomOccupants.values());
        if (where) {
          if (where.towerRoomId) list = list.filter((r) => r.towerRoomId === where.towerRoomId);
          if (where.allyId) list = list.filter((r) => r.allyId === where.allyId);
        }
        return list.map((r) => ({ ...r }));
      },
    };
  }

  get battle() {
    return {
      create: async ({ data }: any): Promise<any> => {
        const id = randomUUID();
        const b = { id, ...data, createdAt: new Date() };
        this.battles.set(id, b);
        this.scheduleSave();
        return { ...b };
      },
      findMany: async ({ where, orderBy, take }: any = {}): Promise<any[]> => {
        let list = Array.from(this.battles.values());
        if (where) {
          if (where.OR && Array.isArray(where.OR)) {
            list = list.filter((b) =>
              where.OR.some((condition: any) => {
                let match = true;
                if (condition.attackerId !== undefined) {
                  if (typeof condition.attackerId === 'object' && condition.attackerId?.in) {
                    if (!condition.attackerId.in.includes(b.attackerId)) match = false;
                  } else if (b.attackerId !== condition.attackerId) {
                    match = false;
                  }
                }
                if (condition.defenderId !== undefined) {
                  if (typeof condition.defenderId === 'object' && condition.defenderId?.in) {
                    if (!condition.defenderId.in.includes(b.defenderId)) match = false;
                  } else if (b.defenderId !== condition.defenderId) {
                    match = false;
                  }
                }
                return match;
              })
            );
          } else {
            if (where.attackerId) list = list.filter((b) => b.attackerId === where.attackerId);
            if (where.defenderId) list = list.filter((b) => b.defenderId === where.defenderId);
          }
        }
        if (orderBy?.createdAt === 'desc') {
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else if (orderBy?.createdAt === 'asc') {
          list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        if (take && typeof take === 'number') {
          list = list.slice(0, take);
        }
        return list.map((b) => {
          const attacker = this.players.get(b.attackerId);
          const defender = this.players.get(b.defenderId);
          return {
            ...b,
            attacker: attacker ? { id: attacker.id, username: attacker.username, power: attacker.power, smartness: attacker.smartness } : null,
            defender: defender ? { id: defender.id, username: defender.username, power: defender.power, smartness: defender.smartness } : null,
          };
        });
      },
      deleteMany: async ({ where }: any = {}): Promise<{ count: number }> => {
        let count = 0;
        const toDelete: string[] = [];
        for (const b of this.battles.values()) {
          let match = false;
          if (where?.OR && Array.isArray(where.OR)) {
            match = where.OR.some((cond: any) => {
              if (cond.attackerId?.in && cond.attackerId.in.includes(b.attackerId)) return true;
              if (cond.defenderId?.in && cond.defenderId.in.includes(b.defenderId)) return true;
              if (cond.attackerId && cond.attackerId === b.attackerId) return true;
              if (cond.defenderId && cond.defenderId === b.defenderId) return true;
              return false;
            });
          } else if (where?.attackerId && where.attackerId === b.attackerId) {
            match = true;
          } else if (where?.defenderId && where.defenderId === b.defenderId) {
            match = true;
          } else if (!where || Object.keys(where).length === 0) {
            match = true;
          }
          if (match) {
            toDelete.push(b.id);
            count++;
          }
        }
        for (const id of toDelete) {
          this.battles.delete(id);
        }
        if (count > 0) this.scheduleSave();
        return { count };
      },
    };
  }

  get cashTransaction() {
    return {
      create: async ({ data }: any): Promise<any> => {
        const id = randomUUID();
        const ct = { id, ...data, createdAt: new Date() };
        this.cashTransactions.set(id, ct);
        this.scheduleSave();
        return { ...ct };
      },
      createMany: async ({ data }: { data: any[] }): Promise<{ count: number }> => {
        for (const item of data) {
          const id = randomUUID();
          this.cashTransactions.set(id, { id, ...item, createdAt: new Date() });
        }
        this.scheduleSave();
        return { count: data.length };
      },
      findMany: async ({ where, orderBy, take }: any = {}): Promise<any[]> => {
        let list = Array.from(this.cashTransactions.values());
        if (where) {
          if (where.playerId) {
            if (typeof where.playerId === 'object' && where.playerId?.in) {
              list = list.filter((ct) => where.playerId.in.includes(ct.playerId));
            } else {
              list = list.filter((ct) => ct.playerId === where.playerId);
            }
          }
          if (where.type) list = list.filter((ct) => ct.type === where.type);
        }
        if (orderBy?.createdAt === 'desc') {
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else if (orderBy?.createdAt === 'asc') {
          list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        if (take && typeof take === 'number') {
          list = list.slice(0, take);
        }
        return list.map((ct) => ({ ...ct }));
      },
      deleteMany: async ({ where }: any = {}): Promise<{ count: number }> => {
        let count = 0;
        const toDelete: string[] = [];
        for (const ct of this.cashTransactions.values()) {
          let match = true;
          if (where?.playerId) {
            if (typeof where.playerId === 'object' && where.playerId?.in) {
              if (!where.playerId.in.includes(ct.playerId)) match = false;
            } else if (ct.playerId !== where.playerId) {
              match = false;
            }
          }
          if (match) {
            toDelete.push(ct.id);
            count++;
          }
        }
        for (const id of toDelete) {
          this.cashTransactions.delete(id);
        }
        if (count > 0) this.scheduleSave();
        return { count };
      },
    };
  }

  get dormFurnitureCatalog() {
    return {
      findMany: async (): Promise<any[]> => {
        return Array.from(this.dormFurniture.values());
      },
      findUnique: async ({ where }: { where: { id: string } }): Promise<any> => {
        return this.dormFurniture.get(where.id) || null;
      },
    };
  }

  get playerDormFurniture() {
    return {
      create: async ({ data }: { data: any }): Promise<any> => {
        const id = randomUUID();
        const pf = { id, ...data, equippedAt: new Date() };
        this.playerFurniture.set(id, pf);
        this.scheduleSave();
        return { ...pf };
      },
      findMany: async ({ where }: { where: { playerId?: string | any } }): Promise<any[]> => {
        let list = Array.from(this.playerFurniture.values());
        if (where?.playerId) {
          if (typeof where.playerId === 'object' && where.playerId?.in) {
            list = list.filter((pf) => where.playerId.in.includes(pf.playerId));
          } else {
            list = list.filter((pf) => pf.playerId === where.playerId);
          }
        }
        return list.map((pf) => ({
          ...pf,
          furniture: this.dormFurniture.get(pf.furnitureId),
        }));
      },
      findUnique: async ({ where }: any): Promise<any> => {
        if (where?.id) {
          const pf = this.playerFurniture.get(where.id);
          return pf ? { ...pf, furniture: this.dormFurniture.get(pf.furnitureId) } : null;
        }
        if (where?.playerId_furnitureId) {
          const { playerId, furnitureId } = where.playerId_furnitureId;
          for (const pf of this.playerFurniture.values()) {
            if (pf.playerId === playerId && pf.furnitureId === furnitureId) {
              return { ...pf, furniture: this.dormFurniture.get(pf.furnitureId) };
            }
          }
        }
        return null;
      },
      findFirst: async ({ where }: { where: { playerId: string; furnitureId: string } }): Promise<any> => {
        for (const pf of this.playerFurniture.values()) {
          if (pf.playerId === where.playerId && pf.furnitureId === where.furnitureId) {
            return { ...pf, furniture: this.dormFurniture.get(pf.furnitureId) };
          }
        }
        return null;
      },
      deleteMany: async ({ where }: any = {}): Promise<{ count: number }> => {
        let count = 0;
        const toDelete: string[] = [];
        for (const pf of this.playerFurniture.values()) {
          let match = true;
          if (where?.playerId) {
            if (typeof where.playerId === 'object' && where.playerId?.in) {
              if (!where.playerId.in.includes(pf.playerId)) match = false;
            } else if (pf.playerId !== where.playerId) {
              match = false;
            }
          }
          if (match) {
            toDelete.push(pf.id);
            count++;
          }
        }
        for (const id of toDelete) {
          this.playerFurniture.delete(id);
        }
        if (count > 0) this.scheduleSave();
        return { count };
      },
    };
  }

  get friendship() {
    return {
      create: async ({ data }: { data: any }): Promise<any> => {
        const id = randomUUID();
        const f = {
          id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          status: data.status || 'PENDING', // PENDING, ACCEPTED, REJECTED
          lastGiftSentAt: data.lastGiftSentAt || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.friendships.set(id, f);
        this.scheduleSave();
        return { ...f };
      },
      findUnique: async ({ where }: { where: { id: string } }): Promise<any> => {
        return this.friendships.get(where.id) ? { ...this.friendships.get(where.id) } : null;
      },
      findFirst: async ({ where }: { where: any }): Promise<any> => {
        for (const f of this.friendships.values()) {
          if (where.id && f.id !== where.id) continue;
          if (where.status && f.status !== where.status) continue;
          if (where.OR && Array.isArray(where.OR)) {
            const matchesOr = where.OR.some((cond: any) => {
              if (cond.senderId && f.senderId !== cond.senderId) return false;
              if (cond.receiverId && f.receiverId !== cond.receiverId) return false;
              return true;
            });
            if (!matchesOr) continue;
          } else {
            if (where.senderId && f.senderId !== where.senderId) continue;
            if (where.receiverId && f.receiverId !== where.receiverId) continue;
          }
          return { ...f };
        }
        return null;
      },
      findMany: async ({ where }: { where: any } = { where: {} }): Promise<any[]> => {
        let list = Array.from(this.friendships.values());
        if (where) {
          if (where.status) list = list.filter((f) => f.status === where.status);
          if (where.OR && Array.isArray(where.OR)) {
            list = list.filter((f) =>
              where.OR.some((cond: any) => {
                if (cond.senderId && f.senderId === cond.senderId) return true;
                if (cond.receiverId && f.receiverId === cond.receiverId) return true;
                return false;
              })
            );
          } else {
            if (where.senderId) list = list.filter((f) => f.senderId === where.senderId);
            if (where.receiverId) list = list.filter((f) => f.receiverId === where.receiverId);
          }
        }
        return list.map((f) => ({ ...f }));
      },
      update: async ({ where, data }: { where: { id: string }; data: any }): Promise<any> => {
        const f = this.friendships.get(where.id);
        if (!f) throw new Error('Friendship not found.');
        Object.assign(f, data, { updatedAt: new Date() });
        this.friendships.set(f.id, f);
        this.scheduleSave();
        return { ...f };
      },
      delete: async ({ where }: { where: { id: string } }): Promise<any> => {
        const f = this.friendships.get(where.id);
        if (!f) throw new Error('Friendship not found.');
        this.friendships.delete(where.id);
        this.scheduleSave();
        return { ...f };
      },
      deleteMany: async ({ where }: { where?: any } = {}): Promise<{ count: number }> => {
        let count = 0;
        if (where) {
          for (const [id, f] of Array.from(this.friendships.entries())) {
            let match = true;
            if (where.id && f.id !== where.id) match = false;
            if (where.OR && Array.isArray(where.OR)) {
              match = where.OR.some((cond: any) => {
                if (cond.senderId?.in && !cond.senderId.in.includes(f.senderId)) return false;
                if (cond.receiverId?.in && !cond.receiverId.in.includes(f.receiverId)) return false;
                if (cond.senderId && !cond.senderId.in && f.senderId !== cond.senderId) return false;
                if (cond.receiverId && !cond.receiverId.in && f.receiverId !== cond.receiverId) return false;
                return true;
              });
            }
            if (match) {
              this.friendships.delete(id);
              count++;
            }
          }
        } else {
          count = this.friendships.size;
          this.friendships.clear();
        }
        this.scheduleSave();
        return { count };
      },
    };
  }

  get message() {
    return {
      create: async ({ data }: { data: any }): Promise<any> => {
        const id = randomUUID();
        const m = {
          id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content,
          isRead: data.isRead ?? false,
          readAt: data.readAt || null,
          createdAt: new Date(),
        };
        this.messages.set(id, m);
        this.scheduleSave();
        return { ...m };
      },
      findMany: async ({ where }: { where: any } = { where: {} }): Promise<any[]> => {
        let list = Array.from(this.messages.values());
        if (where) {
          if (where.OR && Array.isArray(where.OR)) {
            list = list.filter((m) =>
              where.OR.some((cond: any) => {
                if (cond.senderId && m.senderId !== cond.senderId) return false;
                if (cond.receiverId && m.receiverId !== cond.receiverId) return false;
                return true;
              })
            );
          } else {
            if (where.senderId) list = list.filter((m) => m.senderId === where.senderId);
            if (where.receiverId) list = list.filter((m) => m.receiverId === where.receiverId);
          }
          if (where.isRead !== undefined) {
            list = list.filter((m) => m.isRead === where.isRead);
          }
        }
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return list.map((m) => ({ ...m }));
      },
      updateMany: async ({ where, data }: { where: any; data: any }): Promise<{ count: number }> => {
        let count = 0;
        for (const m of this.messages.values()) {
          if (where.senderId && m.senderId !== where.senderId) continue;
          if (where.receiverId && m.receiverId !== where.receiverId) continue;
          if (where.isRead !== undefined && m.isRead !== where.isRead) continue;
          Object.assign(m, data);
          if (data.isRead && !m.readAt) m.readAt = new Date();
          this.messages.set(m.id, m);
          count++;
        }
        if (count > 0) this.scheduleSave();
        return { count };
      },
      count: async ({ where }: { where: any }): Promise<number> => {
        const list = await this.message.findMany({ where });
        return list.length;
      },
    };
  }

  async $transaction<T>(fn: (tx: PrismaService) => Promise<T>, _options?: any): Promise<T> {
    return fn(this);
  }

  async $disconnect() {
    // No-op for in-memory
  }
}

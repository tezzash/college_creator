import { BattleAction, CashTransactionType, PrismaService } from './prisma.service';
import { CombatAction, CombatService } from '../combat/index';
import { BattleRepository } from './repositories/battle.repository.interface';
import { PrismaBattleRepository } from './repositories/prisma-battle.repository';
import { WalletRepository } from './repositories/wallet.repository.interface';
import { PrismaWalletRepository } from './repositories/prisma-wallet.repository';
import { STATIC_ALLIES_CATALOG } from './repositories/allies.repository.interface';

export function getStreakMultiplier(streak: number): number {
  if (streak <= 1) return 1.0;
  if (streak === 2) return 1.1; // +10%
  if (streak === 3) return 1.2; // +20%
  if (streak === 4) return 1.35; // +35%
  return 1.5; // +50% max bonus
}

/**
 * PIMD Avatar Tier Multiplier values:
 * Common (Tier 1): +1% (0.01)
 * Rare (Tier 2): +3% (0.03)
 * Epic (Tier 3): +6% (0.06)
 * Legendary (Tier 4): +10% (0.10)
 * Mythic (Tier 5): +15% (0.15)
 */
export function getAvatarTierMultiplier(avatarId?: string): number {
  if (!avatarId) return 0.01;
  switch (avatarId) {
    // Mythic: +15%
    case 'avatar-titan-overlord':
    case 'avatar-shadow-shinobi':
      return 0.15;
    // Legendary: +10%
    case 'avatar-royal':
    case 'avatar-grandmaster':
      return 0.10;
    // Epic: +6%
    case 'avatar-wallstreet':
    case 'avatar-goth':
    case 'avatar-sorority':
    case 'avatar-streetwear':
      return 0.06;
    // Rare: +3%
    case 'avatar-cyber':
    case 'avatar-dj':
    case 'avatar-gamer':
      return 0.03;
    // Common: +1%
    case 'avatar-coder':
    case 'avatar-varsity':
    case 'avatar-scholar':
    case 'avatar-freshman':
    default:
      return 0.01;
  }
}

export class DatabaseBattleService {
  private readonly battleRepo: BattleRepository;
  private readonly walletRepo: WalletRepository;

  constructor(
    private readonly prisma: PrismaService,
    private readonly combat: CombatService,
    private readonly pvpEnergyCost: number,
    private readonly stealRate: number,
    private readonly maxEnergy = 10,
    private readonly energyRegenSeconds = 420,
    private readonly now: () => Date = () => new Date(),
    battleRepo?: BattleRepository,
    walletRepo?: WalletRepository,
  ) {
    this.battleRepo = battleRepo || new PrismaBattleRepository(() => this.prisma);
    this.walletRepo = walletRepo || new PrismaWalletRepository(() => this.prisma);
  }

  async fight(attackerId: string, defenderId: string, rawAction: CombatAction) {
    if (attackerId === defenderId) throw new Error('A player cannot fight themselves.');
    if (!Number.isInteger(this.pvpEnergyCost) || this.pvpEnergyCost <= 0) throw new Error('Invalid PvP energy cost.');
    if (!Number.isFinite(this.stealRate) || this.stealRate < 0 || this.stealRate > 1) throw new Error('Invalid steal rate.');

    // Normalize action:
    // 'punch' or 'fight' -> Physical Fight (⚡ Energy, Power)
    // 'face-off' or 'prank' -> Campus Prank (🎭 Morale, Smartness)
    // 'spy' -> Undercover Spy (🎭 Morale, Smartness)
    const isPhysicalFight = rawAction === 'punch' || rawAction === 'fight';
    const isSpy = rawAction === 'spy';
    const isPrank = rawAction === 'face-off' || rawAction === 'prank';
    const actionType = isPhysicalFight ? 'fight' : isSpy ? 'spy' : 'prank';

    return this.prisma.$transaction(async (tx) => {
      const [attackerBefore, defender, attackerFurn, defenderFurn] = await Promise.all([
        tx.player.findUnique({ where: { id: attackerId } }),
        tx.player.findUnique({ where: { id: defenderId } }),
        tx.playerDormFurniture.findMany({ where: { playerId: attackerId } }),
        tx.playerDormFurniture.findMany({ where: { playerId: defenderId } }),
      ]);
      if (!attackerBefore || !defender) throw new Error('Player not found.');

      const now = this.now();

      // Pinning Protection check: Pinned rivals cannot be physically attacked or pranked
      if (!isSpy && defender.pinnedUntil && new Date(defender.pinnedUntil).getTime() > now.getTime()) {
        const remainingSeconds = Math.ceil((new Date(defender.pinnedUntil).getTime() - now.getTime()) / 1000);
        throw new Error(`This rival was knocked out and is recuperating in the campus infirmary (pinned) for another ${remainingSeconds}s.`);
      }

      // Check perks for capacity
      const hasEspresso = attackerFurn.some((f: any) => f.furnitureId === 'furn-espresso');
      const maxEnergyLimit = hasEspresso ? 12 : this.maxEnergy;

      // Calculate Attacker regenerated Energy authoritative from timestamps
      const lastEnergyUpdate = attackerBefore.lastEnergyUpdate ? new Date(attackerBefore.lastEnergyUpdate) : now;
      const elapsedEnergySec = Math.max(0, Math.floor((now.getTime() - lastEnergyUpdate.getTime()) / 1000));
      const regenEnergy = this.energyRegenSeconds > 0 ? Math.floor(elapsedEnergySec / this.energyRegenSeconds) : 0;
      const availableEnergy = Math.min(maxEnergyLimit, (attackerBefore.energy ?? 0) + regenEnergy);

      // Fight, Prank, and Spy all consume 1 Energy from the single universal Energy pool
      const actionEnergyCost = this.pvpEnergyCost; // 1 Energy
      if (availableEnergy < actionEnergyCost) {
        throw new Error('Insufficient Energy (⚡) for this PvP action. Please wait for Energy to regenerate.');
      }

      const newAttackerEnergy = availableEnergy - actionEnergyCost;
      const newLastEnergyUpdate = availableEnergy >= maxEnergyLimit
        ? now
        : new Date(lastEnergyUpdate.getTime() + regenEnergy * this.energyRegenSeconds * 1000);

      const reserved = await tx.player.updateMany({
        where: { id: attackerId, energy: attackerBefore.energy },
        data: {
          energy: newAttackerEnergy,
          lastEnergyUpdate: newLastEnergyUpdate,
        },
      });
      if (reserved.count !== 1) throw new Error('Player state changed during battle. Please retry.');

      // Apply PIMD Avatar Tier Multipliers (+1% to +15%)
      const attackerTierMultiplier = getAvatarTierMultiplier(attackerBefore.avatarId);
      const defenderTierMultiplier = getAvatarTierMultiplier(defender.avatarId);

      const effectiveAttacker = {
        power: Math.max(1, Math.round(attackerBefore.power * (1 + attackerTierMultiplier))),
        smartness: Math.max(1, Math.round(attackerBefore.smartness * (1 + attackerTierMultiplier))),
      };

      const effectiveDefender = {
        power: Math.max(1, Math.round(defender.power * (1 + defenderTierMultiplier))),
        smartness: Math.max(1, Math.round(defender.smartness * (1 + defenderTierMultiplier))),
      };

      // Resolve Combat Outcome with effective avatar stats
      const combat = this.combat.resolve(rawAction, effectiveAttacker, effectiveDefender);

      // Defense furniture mitigation: Smart Lock reduces plunder rate by 35%
      const hasSmartLock = defenderFurn.some((f: any) => f.furnitureId === 'furn-lock');
      const baseSteal = isPrank ? this.stealRate * 1.25 : this.stealRate; // Pranks have 25% higher plunder yield!
      const effectiveStealRate = hasSmartLock ? baseSteal * 0.65 : baseSteal;

      // Streak plunder bonus calculation
      const currentStreak = attackerBefore.winStreak || 0;
      const streakBonusMultiplier = combat.success ? getStreakMultiplier(currentStreak + 1) : 1.0;

      let cashTransferred = 0;
      let spyCashBounty = 0;
      let knockoutBonus = 0;
      let isKnockout = false;
      let defenderPinnedUntil: Date | null = null;

      // SPY ACTION MECHANICS
      if (isSpy) {
        if (combat.success) {
          // Attacker successfully infiltrates and scavenges a stealth cache
          spyCashBounty = Math.floor(Math.random() * 50) + 50; // $50 - $100
          await tx.player.update({
            where: { id: attackerId },
            data: { cash: { increment: spyCashBounty } },
          });
          await tx.cashTransaction.create({
            data: {
              playerId: attackerId,
              type: CashTransactionType.JOB_REWARD,
              amount: spyCashBounty,
              balanceAfter: Number(attackerBefore.cash) + spyCashBounty,
              reference: `Stealth Spy Infiltration: ${defender.username}`,
            },
          });
        }
      } else {
        // FIGHT OR PRANK MECHANICS
        const basePlunder = Math.round(Number(defender.cash) * effectiveStealRate * 100) / 100;
        cashTransferred = combat.success
          ? Math.min(Number(defender.cash), Math.round(basePlunder * streakBonusMultiplier * 100) / 100)
          : 0;

        if (cashTransferred > 0) {
          const debited = await tx.player.updateMany({
            where: { id: defenderId, cash: { gte: cashTransferred } },
            data: { cash: { decrement: cashTransferred } },
          });
          if (debited.count !== 1) throw new Error('Defender cash changed during battle. Please retry.');
          await tx.player.update({ where: { id: attackerId }, data: { cash: { increment: cashTransferred } } });

          const [attackerAfter, defenderAfter] = await Promise.all([
            tx.player.findUniqueOrThrow({ where: { id: attackerId } }),
            tx.player.findUniqueOrThrow({ where: { id: defenderId } }),
          ]);
          await tx.cashTransaction.createMany({
            data: [
              {
                playerId: attackerId,
                type: CashTransactionType.PVP_STEAL_CREDIT,
                amount: cashTransferred,
                balanceAfter: attackerAfter.cash,
                reference: `${defender.username} (${actionType.toUpperCase()}, Streak: ${currentStreak + 1}x, Mult: ${streakBonusMultiplier}x)`,
              },
              {
                playerId: defenderId,
                type: CashTransactionType.PVP_STEAL_DEBIT,
                amount: -cashTransferred,
                balanceAfter: defenderAfter.cash,
                reference: `${attackerBefore.username}${hasSmartLock ? ' [35% Lock Shield]' : ''}`,
              },
            ],
          });
        }

        // Check for KNOCKOUT & PINNING of defender
        if (combat.success) {
          // In physical fights, damage defender energy; in pranks, drain defender morale
          const defenderCurrentEnergy = Math.max(0, (defender.energy ?? 10) - (isPhysicalFight ? 2 : 0));
          const defenderCurrentMorale = Math.max(0, (defender.morale ?? 10) - (isPrank ? 3 : 0));

          // Pinning trigger: energy reaches 0 OR morale reaches 0 OR high streak decisive win
          if (defenderCurrentEnergy <= 0 || defenderCurrentMorale <= 0 || currentStreak >= 3 || cashTransferred >= 250) {
            isKnockout = true;
            defenderPinnedUntil = new Date(now.getTime() + 180 * 1000); // 3 minutes hospital rest
            knockoutBonus = 100; // Extra $100 knockout bounty!
            await tx.player.update({
              where: { id: attackerId },
              data: { cash: { increment: knockoutBonus } },
            });
            await tx.cashTransaction.create({
              data: {
                playerId: attackerId,
                type: CashTransactionType.PVP_STEAL_CREDIT,
                amount: knockoutBonus,
                balanceAfter: Number(attackerBefore.cash) + (cashTransferred || 0) + knockoutBonus,
                reference: `Knockout Bounty: ${defender.username}`,
              },
            });
          }

          await tx.player.update({
            where: { id: defenderId },
            data: {
              energy: defenderCurrentEnergy,
              morale: defenderCurrentMorale,
              ...(defenderPinnedUntil ? { pinnedUntil: defenderPinnedUntil } : {}),
            },
          });
        }
      }

      // Update Win / Loss Statistics and Daily Quests
      if (combat.success) {
        const newStreak = isSpy ? currentStreak : currentStreak + 1;
        const newHighest = Math.max(attackerBefore.highestStreak || 0, newStreak);
        await tx.player.update({
          where: { id: attackerId },
          data: {
            ...(!isSpy ? { winStreak: newStreak, highestStreak: newHighest, totalPvPWins: { increment: 1 } } : {}),
            totalPlundered: { increment: cashTransferred + spyCashBounty + knockoutBonus },
          },
        });
        if (!isSpy) {
          await tx.player.update({
            where: { id: defenderId },
            data: { totalPvPLosses: { increment: 1 } },
          });
        }

        // Daily Quest update
        const today = new Date().toISOString().split('T')[0];
        let state = (attackerBefore as any).dailyQuestsState;
        if ((attackerBefore as any).dailyQuestsDate !== today || !state) {
          state = {
            'dq-jobs': { progress: 0, claimed: false },
            'dq-pvp': { progress: 0, claimed: false },
            'dq-bank': { progress: 0, claimed: false },
            bonusClaimed: false,
          };
        }
        state['dq-pvp'] = state['dq-pvp'] || { progress: 0, claimed: false };
        state['dq-pvp'].progress = (state['dq-pvp'].progress || 0) + 1;
        await tx.player.update({
          where: { id: attackerId },
          data: {
            dailyQuestsDate: today,
            dailyQuestsState: state,
          },
        });
      } else {
        if (!isSpy) {
          await tx.player.update({
            where: { id: attackerId },
            data: {
              winStreak: 0,
              totalPvPLosses: { increment: 1 },
            },
          });
          await tx.player.update({
            where: { id: defenderId },
            data: {
              totalPvPWins: { increment: 1 },
            },
          });
        }
      }

      // Record Battle Log
      const battleActionEnum = isPhysicalFight
        ? BattleAction.FIGHT
        : isSpy
        ? BattleAction.SPY
        : BattleAction.PRANK;

      const battle = await tx.battle.create({
        data: {
          attackerId,
          defenderId,
          action: battleActionEnum,
          success: combat.success,
          cashStolen: cashTransferred + spyCashBounty + knockoutBonus,
        },
      });

      const [attackerAfter, defenderAfter] = await Promise.all([
        tx.player.findUniqueOrThrow({ where: { id: attackerId } }),
        tx.player.findUniqueOrThrow({ where: { id: defenderId } }),
      ]);

      // If spy was successful, fetch intel dossier
      let spyIntel = null;
      if (isSpy && combat.success) {
        cashTransferred = spyCashBounty;
        const [rooms, occupants] = await Promise.all([
          tx.towerRoom.findMany({ where: { playerId: defenderId } }),
          tx.roomOccupant.findMany(),
        ]);
        const allies = typeof tx?.ally?.findMany === 'function'
          ? await tx.ally.findMany()
          : STATIC_ALLIES_CATALOG;
        const alliesMap = new Map(allies.map((a: any) => [a.id, a]));
        const defenderRoomIds = new Set(rooms.map((r: any) => r.id));
        const defenderOccupants = occupants.filter((o: any) => defenderRoomIds.has(o.towerRoomId));

        const detailedDormmates = defenderOccupants.map((occ: any) => {
          const ally = alliesMap.get(occ.allyId);
          return {
            name: ally?.name || 'Dormmate',
            tier: ally?.tier || 'common',
            level: occ.level || 1,
            powerBonus: ally ? Math.round(ally.power * (occ.level ? occ.level * 1.2 : 1)) : 0,
            smartnessBonus: ally ? Math.round(ally.smartness * (occ.level ? occ.level * 1.2 : 1)) : 0,
          };
        });

        const winOddsPower = this.combat.calculateWinProbability('fight', attackerAfter, defenderAfter);
        const winOddsSmartness = this.combat.calculateWinProbability('prank', attackerAfter, defenderAfter);
        const fightWinProbability = Math.round(winOddsPower * 100);
        const prankWinProbability = Math.round(winOddsSmartness * 100);

        spyIntel = {
          unbankedCash: Number(defenderAfter.cash),
          bankVaultCash: Number(defenderAfter.bankCash || 0),
          power: Number(defenderAfter.power || 0),
          smartness: Number(defenderAfter.smartness || 0),
          targetCash: Number(defenderAfter.cash),
          targetBankCash: Number(defenderAfter.bankCash || 0),
          targetPower: Number(defenderAfter.power || 0),
          targetSmartness: Number(defenderAfter.smartness || 0),
          hasSmartLock,
          isPinned: Boolean(defenderAfter.pinnedUntil && new Date(defenderAfter.pinnedUntil).getTime() > now.getTime()),
          dormmates: detailedDormmates.map((d: any) => `${d.name} (Lv.${d.level}, +${d.powerBonus} PWR, +${d.smartnessBonus} SMRT)`),
          detailedDormmates,
          winOddsPower,
          winOddsSmartness,
          fightWinProbability,
          prankWinProbability,
        };
      }

      return {
        battle,
        combat,
        attackerId,
        defenderId,
        action: rawAction,
        actionType,
        energySpent: this.pvpEnergyCost,
        moraleSpent: 0,
        cashTransferred,
        spyCashBounty,
        knockoutBonus,
        isKnockout,
        isDefenderPinned: Boolean(defenderPinnedUntil),
        attackerCash: Number(attackerAfter.cash),
        defenderCash: Number(defenderAfter.cash),
        attackerEnergy: attackerAfter.energy,
        attackerMorale: attackerAfter.morale,
        winStreak: attackerAfter.winStreak,
        highestStreak: attackerAfter.highestStreak,
        streakBonusMultiplier,
        hasSmartLockDefended: hasSmartLock,
        spyIntel,
      };
    }, { isolationLevel: 'Serializable' });
  }

  async getPlayerBattleFeed(playerId: string, limit = 20) {
    return this.battleRepo.getBattleFeed(playerId, limit);
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    return this.battleRepo.deleteTestRecords(playerIds);
  }

  async scout(attackerId: string, defenderId: string) {
    const [attacker, defender, rooms, occupants, defenderFurn] = await Promise.all([
      this.prisma.player.findUnique({ where: { id: attackerId } }),
      this.prisma.player.findUnique({ where: { id: defenderId } }),
      this.prisma.towerRoom.findMany({ where: { playerId: defenderId } }),
      this.prisma.roomOccupant.findMany(),
      this.prisma.playerDormFurniture.findMany({ where: { playerId: defenderId } }),
    ]);

    if (!attacker || !defender) throw new Error('Player not found.');

    const allies = typeof this.prisma?.ally?.findMany === 'function'
      ? await this.prisma.ally.findMany()
      : STATIC_ALLIES_CATALOG;

    const now = this.now();
    const alliesMap = new Map(allies.map((a: any) => [a.id, a]));
    const defenderRoomIds = new Set(rooms.map((r: any) => r.id));
    const defenderOccupants = occupants.filter((o: any) => defenderRoomIds.has(o.towerRoomId));

    const dormmates = defenderOccupants.map((occ: any) => {
      const ally = alliesMap.get(occ.allyId);
      return {
        name: ally?.name || 'Dormmate',
        tier: ally?.tier || 'common',
        level: occ.level || 1,
        powerBonus: ally ? Math.round(ally.power * (occ.level ? occ.level * 1.2 : 1)) : 0,
        smartnessBonus: ally ? Math.round(ally.smartness * (occ.level ? occ.level * 1.2 : 1)) : 0,
      };
    });

    const attackerTierMultiplier = getAvatarTierMultiplier(attacker.avatarId);
    const defenderTierMultiplier = getAvatarTierMultiplier(defender.avatarId);

    const effectiveAttacker = {
      power: Math.max(1, Math.round(attacker.power * (1 + attackerTierMultiplier))),
      smartness: Math.max(1, Math.round(attacker.smartness * (1 + attackerTierMultiplier))),
    };

    const effectiveDefender = {
      power: Math.max(1, Math.round(defender.power * (1 + defenderTierMultiplier))),
      smartness: Math.max(1, Math.round(defender.smartness * (1 + defenderTierMultiplier))),
    };

    const punchWinChance = this.combat.calculateWinProbability('fight', effectiveAttacker, effectiveDefender);
    const faceOffWinChance = this.combat.calculateWinProbability('prank', effectiveAttacker, effectiveDefender);

    const hasSmartLock = defenderFurn.some((f: any) => f.furnitureId === 'furn-lock');
    const effectiveRate = hasSmartLock ? this.stealRate * 0.65 : this.stealRate;
    const estimatedPlunder = Math.round(Number(defender.cash) * effectiveRate);

    let threatRating: 'EASY PREY' | 'EVEN MATCH' | 'HIGH RISK' | 'APEX BOSS' = 'EVEN MATCH';
    const totalAttacker = effectiveAttacker.power + effectiveAttacker.smartness;
    const totalDefender = effectiveDefender.power + effectiveDefender.smartness;

    if (totalAttacker >= totalDefender * 1.4) threatRating = 'EASY PREY';
    else if (totalDefender >= totalAttacker * 1.5) threatRating = 'APEX BOSS';
    else if (totalDefender > totalAttacker * 1.1) threatRating = 'HIGH RISK';

    const pinnedDate = defender.pinnedUntil ? new Date(defender.pinnedUntil) : null;
    const isPinned = Boolean(pinnedDate && pinnedDate.getTime() > now.getTime());
    const pinnedSecondsRemaining = isPinned ? Math.max(0, Math.ceil((pinnedDate!.getTime() - now.getTime()) / 1000)) : 0;

    return {
      defender: {
        id: defender.id,
        username: defender.username,
        power: defender.power,
        smartness: defender.smartness,
        pocketCash: Number(defender.cash),
        bankProtectedCash: Number(defender.bankCash ?? 0),
        winStreak: Number(defender.winStreak ?? 0),
        totalPvPWins: Number(defender.totalPvPWins ?? 0),
        unlockedSuites: rooms.filter((r: any) => r.unlocked !== false).length,
        equippedTitle: defender.equippedTitle || 'Freshman Novice',
        avatarId: defender.avatarId || 'avatar-coder',
        avatarAura: defender.avatarAura || 'aura-none',
        avatarFrame: defender.avatarFrame || 'frame-neon',
        avatarOutfit: defender.avatarOutfit || 'outfit-hoodie',
        avatarHeadwear: defender.avatarHeadwear || 'headwear-none',
        avatarAccessory: defender.avatarAccessory || 'acc-laptop',
        customBio: defender.customBio || '',
        dormmates,
        hasSmartLock,
        isPinned,
        pinnedUntil: pinnedDate ? pinnedDate.toISOString() : null,
        pinnedSecondsRemaining,
      },
      combatAssessment: {
        punchWinChance: Math.round(punchWinChance * 100),
        faceOffWinChance: Math.round(faceOffWinChance * 100),
        threatRating,
        estimatedPlunder,
      },
    };
  }

  async getLeaderboards() {
    const allPlayers = await this.prisma.player.findMany();
    
    // Top Plunderers
    const topPlunderers = [...allPlayers]
      .sort((a, b) => Number(b.totalPlundered || 0) - Number(a.totalPlundered || 0))
      .slice(0, 10)
      .map((p, idx) => ({
        rank: idx + 1,
        id: p.id,
        username: p.username,
        totalPlundered: Number(p.totalPlundered || 0),
        wins: Number(p.totalPvPWins || 0),
        avatarId: p.avatarId,
        avatarFrame: p.avatarFrame,
        avatarAura: p.avatarAura,
        avatarOutfit: p.avatarOutfit,
        avatarHeadwear: p.avatarHeadwear,
        avatarAccessory: p.avatarAccessory,
        equippedTitle: p.equippedTitle,
      }));

    // Top Net Worth (Pocket Cash + Bank Vault Cash)
    const topNetWorth = [...allPlayers]
      .sort((a, b) => (Number(b.cash) + Number(b.bankCash || 0)) - (Number(a.cash) + Number(a.bankCash || 0)))
      .slice(0, 10)
      .map((p, idx) => ({
        rank: idx + 1,
        id: p.id,
        username: p.username,
        cash: Number(p.cash),
        bankCash: Number(p.bankCash || 0),
        netWorth: Number(p.cash) + Number(p.bankCash || 0),
        avatarId: p.avatarId,
        avatarFrame: p.avatarFrame,
        avatarAura: p.avatarAura,
        avatarOutfit: p.avatarOutfit,
        avatarHeadwear: p.avatarHeadwear,
        avatarAccessory: p.avatarAccessory,
        equippedTitle: p.equippedTitle,
      }));

    // Top Win Streaks
    const topStreaks = [...allPlayers]
      .sort((a, b) => Number(b.highestStreak || b.winStreak || 0) - Number(a.highestStreak || a.winStreak || 0))
      .slice(0, 10)
      .map((p, idx) => ({
        rank: idx + 1,
        id: p.id,
        username: p.username,
        currentStreak: Number(p.winStreak || 0),
        highestStreak: Number(p.highestStreak || 0),
        avatarId: p.avatarId,
        avatarFrame: p.avatarFrame,
        avatarAura: p.avatarAura,
        avatarOutfit: p.avatarOutfit,
        avatarHeadwear: p.avatarHeadwear,
        avatarAccessory: p.avatarAccessory,
        equippedTitle: p.equippedTitle,
      }));

    // Combat Overlords (Total Stats)
    const topTitans = [...allPlayers]
      .sort((a, b) => (b.power + b.smartness) - (a.power + a.smartness))
      .slice(0, 10)
      .map((p, idx) => ({
        rank: idx + 1,
        id: p.id,
        username: p.username,
        power: p.power,
        smartness: p.smartness,
        totalStats: p.power + p.smartness,
        avatarId: p.avatarId,
        avatarFrame: p.avatarFrame,
        avatarAura: p.avatarAura,
        avatarOutfit: p.avatarOutfit,
        avatarHeadwear: p.avatarHeadwear,
        avatarAccessory: p.avatarAccessory,
        equippedTitle: p.equippedTitle,
      }));

    return {
      topPlunderers,
      topNetWorth,
      topStreaks,
      topTitans,
    };
  }
}



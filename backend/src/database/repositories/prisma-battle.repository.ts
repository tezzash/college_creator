import { getPrismaClient } from '../prisma-client';
import { BattleAction } from '../prisma.service';
import {
  BattleEntity,
  BattleFeedItem,
  BattleOpponentInfo,
  BattleRepository,
  CreateBattleInput,
} from './battle.repository.interface';

export class PrismaBattleRepository implements BattleRepository {
  private readonly getPrisma: () => any;

  constructor(prismaProvider?: () => any) {
    this.getPrisma = prismaProvider || (() => getPrismaClient());
  }

  private get prisma() {
    return this.getPrisma();
  }

  private mapOpponent(row: any): BattleOpponentInfo | undefined {
    if (!row) return undefined;
    return {
      id: row.id,
      username: row.username,
      avatarId: row.avatarId,
      avatarAura: row.avatarAura,
      avatarFrame: row.avatarFrame,
      avatarOutfit: row.avatarOutfit,
      avatarHeadwear: row.avatarHeadwear,
      avatarAccessory: row.avatarAccessory,
      equippedTitle: row.equippedTitle,
    };
  }

  async createBattle(data: CreateBattleInput, tx?: any): Promise<BattleEntity> {
    const client = tx || this.prisma;
    const actionEnum =
      data.action === 'fight' || data.action === 'punch' || data.action === BattleAction.FIGHT || data.action === BattleAction.PUNCH
        ? BattleAction.FIGHT
        : data.action === 'spy' || data.action === BattleAction.SPY
        ? BattleAction.SPY
        : BattleAction.PRANK;

    const row = await client.battle.create({
      data: {
        attackerId: data.attackerId,
        defenderId: data.defenderId,
        action: actionEnum,
        success: data.success,
        cashStolen: data.cashStolen,
      },
      include: {
        attacker: {
          select: {
            id: true,
            username: true,
            avatarId: true,
            avatarAura: true,
            avatarFrame: true,
            avatarOutfit: true,
            avatarHeadwear: true,
            avatarAccessory: true,
            equippedTitle: true,
          },
        },
        defender: {
          select: {
            id: true,
            username: true,
            avatarId: true,
            avatarAura: true,
            avatarFrame: true,
            avatarOutfit: true,
            avatarHeadwear: true,
            avatarAccessory: true,
            equippedTitle: true,
          },
        },
      },
    });

    return {
      id: row.id,
      attackerId: row.attackerId,
      defenderId: row.defenderId,
      action: row.action,
      success: row.success,
      cashStolen: typeof row.cashStolen === 'number' ? row.cashStolen : Number(row.cashStolen),
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      attacker: this.mapOpponent(row.attacker),
      defender: this.mapOpponent(row.defender),
    };
  }

  async getBattleFeed(playerId: string, limit = 20): Promise<BattleFeedItem[]> {
    const battles = await this.prisma.battle.findMany({
      where: {
        OR: [{ attackerId: playerId }, { defenderId: playerId }],
      },
      include: {
        attacker: {
          select: {
            id: true,
            username: true,
            avatarId: true,
            avatarAura: true,
            avatarFrame: true,
            avatarOutfit: true,
            avatarHeadwear: true,
            avatarAccessory: true,
            equippedTitle: true,
          },
        },
        defender: {
          select: {
            id: true,
            username: true,
            avatarId: true,
            avatarAura: true,
            avatarFrame: true,
            avatarOutfit: true,
            avatarHeadwear: true,
            avatarAccessory: true,
            equippedTitle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return battles.map((b: any) => {
      const isAttacker = b.attackerId === playerId;
      const isVictim = b.defenderId === playerId;
      const won = (isAttacker && b.success) || (isVictim && !b.success);
      return {
        id: b.id,
        isAttacker,
        isDefense: isVictim,
        action: b.action,
        success: b.success,
        won,
        cashStolen: typeof b.cashStolen === 'number' ? b.cashStolen : Number(b.cashStolen || 0),
        createdAt: b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt),
        opponent: isAttacker ? this.mapOpponent(b.defender) : this.mapOpponent(b.attacker),
      };
    });
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    if (!playerIds.length) return 0;
    const res = await this.prisma.battle.deleteMany({
      where: {
        OR: [{ attackerId: { in: playerIds } }, { defenderId: { in: playerIds } }],
      },
    });
    return res.count;
  }
}

import { randomUUID } from 'crypto';
import {
  BattleEntity,
  BattleFeedItem,
  BattleOpponentInfo,
  BattleRepository,
  CreateBattleInput,
} from './battle.repository.interface';

export class InMemoryBattleRepository implements BattleRepository {
  private battles: BattleEntity[] = [];
  private playerMap: Map<string, BattleOpponentInfo> = new Map();

  setOpponentInfo(player: BattleOpponentInfo) {
    this.playerMap.set(player.id, player);
  }

  async createBattle(data: CreateBattleInput, _tx?: any): Promise<BattleEntity> {
    const battle: BattleEntity = {
      id: `battle-${randomUUID()}`,
      attackerId: data.attackerId,
      defenderId: data.defenderId,
      action: data.action,
      success: data.success,
      cashStolen: data.cashStolen,
      createdAt: new Date(),
      attacker: this.playerMap.get(data.attackerId),
      defender: this.playerMap.get(data.defenderId),
    };
    this.battles.unshift(battle);
    return { ...battle };
  }

  async getBattleFeed(playerId: string, limit = 20): Promise<BattleFeedItem[]> {
    const userBattles = this.battles
      .filter((b) => b.attackerId === playerId || b.defenderId === playerId)
      .slice(0, limit);

    return userBattles.map((b) => {
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
        cashStolen: b.cashStolen,
        createdAt: b.createdAt,
        opponent: isAttacker ? b.defender : b.attacker,
      };
    });
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    const set = new Set(playerIds);
    const prev = this.battles.length;
    this.battles = this.battles.filter((b) => !set.has(b.attackerId) && !set.has(b.defenderId));
    return prev - this.battles.length;
  }
}

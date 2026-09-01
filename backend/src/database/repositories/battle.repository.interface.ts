import { BattleAction } from '../prisma.service';

export interface BattleOpponentInfo {
  id: string;
  username: string;
  avatarId?: string;
  avatarAura?: string;
  avatarFrame?: string;
  avatarOutfit?: string;
  avatarHeadwear?: string;
  avatarAccessory?: string;
  equippedTitle?: string;
}

export interface BattleEntity {
  id: string;
  attackerId: string;
  defenderId: string;
  action: BattleAction | string;
  success: boolean;
  cashStolen: number;
  createdAt: Date;
  attacker?: BattleOpponentInfo;
  defender?: BattleOpponentInfo;
}

export interface CreateBattleInput {
  attackerId: string;
  defenderId: string;
  action: BattleAction | string;
  success: boolean;
  cashStolen: number;
}

export interface BattleFeedItem {
  id: string;
  isAttacker: boolean;
  isDefense: boolean;
  action: BattleAction | string;
  success: boolean;
  won: boolean;
  cashStolen: number;
  createdAt: Date;
  opponent?: BattleOpponentInfo;
}

export interface BattleRepository {
  createBattle(data: CreateBattleInput, tx?: any): Promise<BattleEntity>;
  getBattleFeed(playerId: string, limit?: number): Promise<BattleFeedItem[]>;
  deleteTestRecords(playerIds: string[]): Promise<number>;
}

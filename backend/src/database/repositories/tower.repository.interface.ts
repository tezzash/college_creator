export const TOWER_UNLOCK_COSTS: Readonly<Record<number, number>> = Object.freeze({
  1: 250,
  2: 500,
  3: 900,
  4: 1500,
  5: 2500,
  6: 4200,
  7: 7000,
  8: 12000,
});

export interface PersistentRoomOccupantEntity {
  id: string;
  towerRoomId: string;
  allyId: string;
  level: number;
  totalInvested: number;
  hiredAt: Date;
  ally?: {
    id: string;
    name: string;
    tier: string;
    power: number;
    smartness: number;
    hireCost: number;
  };
}

export interface PersistentTowerRoomEntity {
  id: string;
  playerId: string;
  roomNumber: number;
  unlockCost: number;
  unlocked: boolean;
  unlockedAt: Date;
  occupants?: PersistentRoomOccupantEntity[];
}

export interface TowerRepository {
  list(playerId: string): Promise<PersistentTowerRoomEntity[]>;
  findRoom(playerId: string, roomNumber: number): Promise<PersistentTowerRoomEntity | null>;
  findRoomById(roomId: string): Promise<PersistentTowerRoomEntity | null>;
  unlock(playerId: string, roomNumber: number): Promise<PersistentTowerRoomEntity>;
  deleteTestRecords(playerIds: string[]): Promise<number>;
}

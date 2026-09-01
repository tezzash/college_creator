import {
  PersistentTowerRoomEntity,
  PersistentRoomOccupantEntity,
  TOWER_UNLOCK_COSTS,
  TowerRepository,
} from './tower.repository.interface';

export class InMemoryTowerRepository implements TowerRepository {
  private readonly rooms = new Map<string, PersistentTowerRoomEntity>();
  private readonly occupants = new Map<string, PersistentRoomOccupantEntity>();

  async list(playerId: string): Promise<PersistentTowerRoomEntity[]> {
    const results: PersistentTowerRoomEntity[] = [];
    for (let i = 1; i <= 8; i++) {
      const key = `${playerId}-${i}`;
      const existing = this.rooms.get(key);
      if (existing) {
        const roomOccupants = Array.from(this.occupants.values()).filter((o) => o.towerRoomId === existing.id);
        results.push({ ...existing, occupants: roomOccupants });
      } else {
        results.push({
          id: `room-${playerId}-${i}`,
          playerId,
          roomNumber: i,
          unlockCost: TOWER_UNLOCK_COSTS[i] || 250,
          unlocked: false,
          unlockedAt: new Date(),
          occupants: [],
        });
      }
    }
    return results;
  }

  async findRoom(playerId: string, roomNumber: number): Promise<PersistentTowerRoomEntity | null> {
    const key = `${playerId}-${roomNumber}`;
    const room = this.rooms.get(key);
    if (!room) return null;
    const roomOccupants = Array.from(this.occupants.values()).filter((o) => o.towerRoomId === room.id);
    return { ...room, occupants: roomOccupants };
  }

  async findRoomById(roomId: string): Promise<PersistentTowerRoomEntity | null> {
    const room = Array.from(this.rooms.values()).find((r) => r.id === roomId);
    if (!room) return null;
    const roomOccupants = Array.from(this.occupants.values()).filter((o) => o.towerRoomId === room.id);
    return { ...room, occupants: roomOccupants };
  }

  async unlock(playerId: string, roomNumber: number): Promise<PersistentTowerRoomEntity> {
    if (!Number.isInteger(roomNumber) || roomNumber < 1 || roomNumber > 8) {
      throw new Error('roomNumber must be an integer between 1 and 8.');
    }
    const unlockCost = TOWER_UNLOCK_COSTS[roomNumber];
    if (unlockCost === undefined) throw new Error('Tower room not found.');

    const key = `${playerId}-${roomNumber}`;
    const existing = this.rooms.get(key);
    if (existing?.unlocked) throw new Error('Tower room already unlocked.');

    const unlockedRoom: PersistentTowerRoomEntity = {
      id: existing?.id || `room-${playerId}-${roomNumber}`,
      playerId,
      roomNumber,
      unlockCost,
      unlocked: true,
      unlockedAt: new Date(),
      occupants: [],
    };
    this.rooms.set(key, unlockedRoom);
    return { ...unlockedRoom };
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    let count = 0;
    const set = new Set(playerIds);
    for (const [k, r] of this.rooms.entries()) {
      if (set.has(r.playerId)) {
        this.rooms.delete(k);
        count++;
      }
    }
    return count;
  }
}

import {
  DormFurnitureItemEntity,
  FurnitureRepository,
  PlayerFurnitureEntity,
  STATIC_DORM_FURNITURE_CATALOG,
} from './furniture.repository.interface';

export class InMemoryFurnitureRepository implements FurnitureRepository {
  private readonly playerFurniture = new Map<string, PlayerFurnitureEntity>();

  async getCatalog(): Promise<DormFurnitureItemEntity[]> {
    return [...STATIC_DORM_FURNITURE_CATALOG.map((f) => ({ ...f }))];
  }

  async getPlayerFurniture(playerId: string): Promise<PlayerFurnitureEntity[]> {
    return Array.from(this.playerFurniture.values()).filter((pf) => pf.playerId === playerId);
  }

  async getDormFurnitureWithOwnership(playerId: string): Promise<DormFurnitureItemEntity[]> {
    const owned = await this.getPlayerFurniture(playerId);
    const ownedMap = new Map<string, PlayerFurnitureEntity>();
    for (const o of owned) {
      ownedMap.set(o.furnitureId, o);
    }

    return STATIC_DORM_FURNITURE_CATALOG.map((item) => {
      const ownedRecord = ownedMap.get(item.id);
      return {
        ...item,
        isOwned: Boolean(ownedRecord),
        equippedAt: ownedRecord ? ownedRecord.equippedAt.toISOString() : null,
      };
    });
  }

  async buyFurniture(
    playerId: string,
    furnitureId: string
  ): Promise<{ furniture: DormFurnitureItemEntity; player: any }> {
    const furniture = STATIC_DORM_FURNITURE_CATALOG.find((f) => f.id === furnitureId);
    if (!furniture) throw new Error('Furniture item not found.');

    const key = `${playerId}-${furnitureId}`;
    if (this.playerFurniture.has(key)) {
      throw new Error('You already own and have equipped this dorm upgrade.');
    }

    const record: PlayerFurnitureEntity = {
      id: `pf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId,
      furnitureId,
      equippedAt: new Date(),
    };
    this.playerFurniture.set(key, record);

    return {
      furniture: {
        ...furniture,
        isOwned: true,
        equippedAt: record.equippedAt.toISOString(),
      },
      player: { id: playerId },
    };
  }

  async hasFurniture(playerId: string, furnitureId: string): Promise<boolean> {
    const key = `${playerId}-${furnitureId}`;
    return this.playerFurniture.has(key);
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    let count = 0;
    const set = new Set(playerIds);
    for (const [k, v] of this.playerFurniture.entries()) {
      if (set.has(v.playerId)) {
        this.playerFurniture.delete(k);
        count++;
      }
    }
    return count;
  }
}

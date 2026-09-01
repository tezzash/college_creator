import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import {
  DormFurnitureItemEntity,
  FurnitureRepository,
  PlayerFurnitureEntity,
  STATIC_DORM_FURNITURE_CATALOG,
} from './furniture.repository.interface';

export class PrismaFurnitureRepository implements FurnitureRepository {
  constructor(private readonly prismaProvider: () => any = () => getPrismaClient()) {}

  private get prisma(): any {
    return this.prismaProvider();
  }

  async getCatalog(): Promise<DormFurnitureItemEntity[]> {
    return [...STATIC_DORM_FURNITURE_CATALOG.map((f) => ({ ...f }))];
  }

  async getPlayerFurniture(playerId: string): Promise<PlayerFurnitureEntity[]> {
    const rows = await this.prisma.playerDormFurniture.findMany({
      where: { playerId },
      orderBy: { equippedAt: 'asc' },
    });
    return rows.map((r: any) => ({
      id: r.id,
      playerId: r.playerId,
      furnitureId: r.furnitureId,
      equippedAt: r.equippedAt instanceof Date ? r.equippedAt : new Date(r.equippedAt),
    }));
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

    return this.prisma.$transaction(
      async (tx: any) => {
        const alreadyOwned = await tx.playerDormFurniture.findUnique({
          where: { playerId_furnitureId: { playerId, furnitureId } },
        });
        if (alreadyOwned) {
          throw new Error('You already own and have equipped this dorm upgrade.');
        }

        const charged = await tx.player.updateMany({
          where: { id: playerId, cash: { gte: furniture.cost } },
          data: { cash: { decrement: furniture.cost } },
        });

        if (charged.count !== 1) {
          const exists = await tx.player.findUnique({ where: { id: playerId } });
          if (!exists) throw new Error('Player not found.');
          throw new Error(`Insufficient cash. ${furniture.name} costs $${furniture.cost.toLocaleString()}.`);
        }

        await tx.playerDormFurniture.create({
          data: { playerId, furnitureId },
        });

        const updated = await tx.player.findUniqueOrThrow({ where: { id: playerId } });

        if (tx.cashTransaction) {
          await tx.cashTransaction.create({
            data: {
              playerId,
              type: 'FURNITURE_PURCHASE',
              amount: -furniture.cost,
              balanceAfter: updated.cash,
              reference: `Bought ${furniture.name}`,
            },
          });
        }

        return {
          furniture: {
            ...furniture,
            isOwned: true,
            equippedAt: new Date().toISOString(),
          },
          player: updated,
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async hasFurniture(playerId: string, furnitureId: string): Promise<boolean> {
    const found = await this.prisma.playerDormFurniture.findUnique({
      where: { playerId_furnitureId: { playerId, furnitureId } },
    });
    return Boolean(found);
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    if (playerIds.length === 0) return 0;
    const res = await this.prisma.playerDormFurniture.deleteMany({
      where: { playerId: { in: playerIds } },
    });
    return res.count;
  }
}

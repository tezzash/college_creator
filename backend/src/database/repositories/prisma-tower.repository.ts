import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import {
  PersistentTowerRoomEntity,
  PersistentRoomOccupantEntity,
  TOWER_UNLOCK_COSTS,
  TowerRepository,
} from './tower.repository.interface';
import { STATIC_ALLIES_CATALOG } from './allies.repository.interface';

export class PrismaTowerRepository implements TowerRepository {
  constructor(private readonly prismaProvider: () => any = () => getPrismaClient()) {}

  private get prisma(): any {
    return this.prismaProvider();
  }

  private mapOccupant(row: any): PersistentRoomOccupantEntity {
    const staticAlly = STATIC_ALLIES_CATALOG.find((a) => a.id === row.allyId);
    return {
      id: row.id,
      towerRoomId: row.towerRoomId,
      allyId: row.allyId,
      level: row.level,
      totalInvested: typeof row.totalInvested === 'number' ? row.totalInvested : Number(row.totalInvested),
      hiredAt: row.hiredAt instanceof Date ? row.hiredAt : new Date(row.hiredAt),
      ally: staticAlly ? { ...staticAlly } : row.ally,
    };
  }

  private mapRoom(row: any): PersistentTowerRoomEntity {
    return {
      id: row.id,
      playerId: row.playerId,
      roomNumber: row.roomNumber,
      unlockCost: typeof row.unlockCost === 'number' ? row.unlockCost : Number(row.unlockCost),
      unlocked: Boolean(row.unlocked),
      unlockedAt: row.unlockedAt instanceof Date ? row.unlockedAt : new Date(row.unlockedAt || Date.now()),
      occupants: Array.isArray(row.occupants) ? row.occupants.map((o: any) => this.mapOccupant(o)) : [],
    };
  }

  async list(playerId: string): Promise<PersistentTowerRoomEntity[]> {
    const existingRooms = await this.prisma.towerRoom.findMany({
      where: { playerId },
      include: { occupants: true },
      orderBy: { roomNumber: 'asc' },
    });

    const roomMap = new Map<number, any>();
    for (const r of existingRooms) {
      roomMap.set(r.roomNumber, r);
    }

    // Return all 8 rooms, initialized if missing from DB
    const results: PersistentTowerRoomEntity[] = [];
    for (let i = 1; i <= 8; i++) {
      const existing = roomMap.get(i);
      if (existing) {
        results.push(this.mapRoom(existing));
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
    const row = await this.prisma.towerRoom.findUnique({
      where: { playerId_roomNumber: { playerId, roomNumber } },
      include: { occupants: true },
    });
    return row ? this.mapRoom(row) : null;
  }

  async findRoomById(roomId: string): Promise<PersistentTowerRoomEntity | null> {
    const row = await this.prisma.towerRoom.findUnique({
      where: { id: roomId },
      include: { occupants: true },
    });
    return row ? this.mapRoom(row) : null;
  }

  async unlock(playerId: string, roomNumber: number): Promise<PersistentTowerRoomEntity> {
    if (!Number.isInteger(roomNumber) || roomNumber < 1 || roomNumber > 8) {
      throw new Error('roomNumber must be an integer between 1 and 8.');
    }
    const unlockCost = TOWER_UNLOCK_COSTS[roomNumber];
    if (unlockCost === undefined) throw new Error('Tower room not found.');

    return this.prisma.$transaction(
      async (tx: any) => {
        const existing = await tx.towerRoom.findUnique({
          where: { playerId_roomNumber: { playerId, roomNumber } },
          include: { occupants: true },
        });

        if (existing?.unlocked) {
          throw new Error('Tower room already unlocked.');
        }

        const charged = await tx.player.updateMany({
          where: { id: playerId, cash: { gte: unlockCost } },
          data: { cash: { decrement: unlockCost } },
        });

        if (charged.count !== 1) {
          const player = await tx.player.findUnique({ where: { id: playerId }, select: { id: true } });
          if (!player) throw new Error('Player not found.');
          throw new Error('Insufficient cash.');
        }

        let room: any;
        if (existing) {
          room = await tx.towerRoom.update({
            where: { id: existing.id },
            data: { unlockCost, unlocked: true },
            include: { occupants: true },
          });
        } else {
          room = await tx.towerRoom.create({
            data: { playerId, roomNumber, unlockCost, unlocked: true },
            include: { occupants: true },
          });
        }

        const updatedPlayer = await tx.player.findUniqueOrThrow({ where: { id: playerId }, select: { cash: true } });

        if (tx.cashTransaction) {
          await tx.cashTransaction.create({
            data: {
              playerId,
              type: 'TOWER_ROOM_UNLOCK',
              amount: -unlockCost,
              balanceAfter: updatedPlayer.cash,
              reference: room.id,
            },
          });
        }

        return this.mapRoom(room);
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    if (playerIds.length === 0) return 0;
    const res = await this.prisma.towerRoom.deleteMany({
      where: { playerId: { in: playerIds } },
    });
    return res.count;
  }
}

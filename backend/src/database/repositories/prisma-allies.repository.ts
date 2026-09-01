import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import {
  AlliesRepository,
  AllyDefinitionEntity,
  ALLY_LEVEL_MULTIPLIERS,
  ALLY_UPGRADE_COST_RATIOS,
  STATIC_ALLIES_CATALOG,
} from './allies.repository.interface';
import { PersistentRoomOccupantEntity } from './tower.repository.interface';

export class PrismaAlliesRepository implements AlliesRepository {
  constructor(private readonly prismaProvider: () => any = () => getPrismaClient()) {}

  private get prisma(): any {
    return this.prismaProvider();
  }

  private mapOccupant(row: any, allyDef?: AllyDefinitionEntity): PersistentRoomOccupantEntity {
    const staticAlly = allyDef || STATIC_ALLIES_CATALOG.find((a) => a.id === row.allyId);
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

  async listAllies(): Promise<AllyDefinitionEntity[]> {
    return [...STATIC_ALLIES_CATALOG.map((a) => ({ ...a }))];
  }

  async findAllyById(id: string): Promise<AllyDefinitionEntity | null> {
    const ally = STATIC_ALLIES_CATALOG.find((a) => a.id === id);
    return ally ? { ...ally } : null;
  }

  async hire(
    playerId: string,
    allyId: string,
    towerRoomId: string
  ): Promise<{ occupant: PersistentRoomOccupantEntity; player: any; ally: AllyDefinitionEntity }> {
    const ally = STATIC_ALLIES_CATALOG.find((a) => a.id === allyId);
    if (!ally) throw new Error('Ally not found.');

    return this.prisma.$transaction(
      async (tx: any) => {
        const [player, room] = await Promise.all([
          tx.player.findUnique({ where: { id: playerId } }),
          tx.towerRoom.findUnique({ where: { id: towerRoomId } }),
        ]);

        if (!player) throw new Error('Player not found.');
        if (!room || room.playerId !== playerId || !room.unlocked) {
          throw new Error('Unlocked tower room not found.');
        }

        const [occupied, alreadyHired] = await Promise.all([
          tx.roomOccupant.findUnique({ where: { towerRoomId } }),
          tx.roomOccupant.findFirst({
            where: {
              towerRoom: { playerId },
              allyId,
            },
          }),
        ]);

        if (occupied) throw new Error('Tower room is already occupied.');
        if (alreadyHired) throw new Error('Ally already hired.');

        const charged = await tx.player.updateMany({
          where: { id: playerId, cash: { gte: ally.hireCost } },
          data: { cash: { decrement: ally.hireCost } },
        });

        if (charged.count !== 1) throw new Error('Insufficient cash.');

        const createdOccupant = await tx.roomOccupant.create({
          data: {
            towerRoomId,
            allyId,
            level: 1,
            totalInvested: ally.hireCost,
          },
        });

        const updatedPlayer = await tx.player.findUniqueOrThrow({ where: { id: playerId } });

        if (tx.cashTransaction) {
          await tx.cashTransaction.create({
            data: {
              playerId,
              type: 'ALLY_HIRE',
              amount: -ally.hireCost,
              balanceAfter: updatedPlayer.cash,
              reference: createdOccupant.id,
            },
          });
        }

        return {
          occupant: this.mapOccupant(createdOccupant, ally),
          player: updatedPlayer,
          ally: { ...ally },
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async upgrade(
    playerId: string,
    towerRoomId: string
  ): Promise<{
    occupant: PersistentRoomOccupantEntity;
    player: any;
    ally: AllyDefinitionEntity;
    previousLevel: number;
    newLevel: number;
    costPaid: number;
  }> {
    return this.prisma.$transaction(
      async (tx: any) => {
        const [player, room, occupant] = await Promise.all([
          tx.player.findUnique({ where: { id: playerId } }),
          tx.towerRoom.findUnique({ where: { id: towerRoomId } }),
          tx.roomOccupant.findUnique({ where: { towerRoomId } }),
        ]);

        if (!player) throw new Error('Player not found.');
        if (!room || room.playerId !== playerId || !room.unlocked) throw new Error('Tower room not found.');
        if (!occupant) throw new Error('No dormmate occupant found in this suite.');

        const ally = STATIC_ALLIES_CATALOG.find((a) => a.id === occupant.allyId);
        if (!ally) throw new Error('Dormmate data not found.');

        const currentLevel = occupant.level || 1;
        if (currentLevel >= 5) {
          throw new Error('Dormmate is already at Maximum Level (Level 5 Master Scholar).');
        }

        const nextLevel = currentLevel + 1;
        const costMultiplier = ALLY_UPGRADE_COST_RATIOS[nextLevel] || 1.5;
        const upgradeCost = Math.round(ally.hireCost * costMultiplier);

        const charged = await tx.player.updateMany({
          where: { id: playerId, cash: { gte: upgradeCost } },
          data: { cash: { decrement: upgradeCost } },
        });

        if (charged.count !== 1) {
          throw new Error(`Insufficient cash. Upgrade requires $${upgradeCost.toLocaleString()}.`);
        }

        const currentTotalInvested = Number(occupant.totalInvested || ally.hireCost);
        const updatedOccupant = await tx.roomOccupant.update({
          where: { id: occupant.id },
          data: {
            level: nextLevel,
            totalInvested: currentTotalInvested + upgradeCost,
          },
        });

        const updatedPlayer = await tx.player.findUniqueOrThrow({ where: { id: playerId } });

        if (tx.cashTransaction) {
          await tx.cashTransaction.create({
            data: {
              playerId,
              type: 'ALLY_UPGRADE',
              amount: -upgradeCost,
              balanceAfter: updatedPlayer.cash,
              reference: occupant.id,
            },
          });
        }

        return {
          occupant: this.mapOccupant(updatedOccupant, ally),
          player: updatedPlayer,
          ally: { ...ally },
          previousLevel: currentLevel,
          newLevel: nextLevel,
          costPaid: upgradeCost,
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async evict(
    playerId: string,
    towerRoomId: string
  ): Promise<{ refundAmount: number; player: any; roomNumber: number; allyName: string }> {
    return this.prisma.$transaction(
      async (tx: any) => {
        const [player, room, occupant] = await Promise.all([
          tx.player.findUnique({ where: { id: playerId } }),
          tx.towerRoom.findUnique({ where: { id: towerRoomId } }),
          tx.roomOccupant.findUnique({ where: { towerRoomId } }),
        ]);

        if (!player) throw new Error('Player not found.');
        if (!room || room.playerId !== playerId) throw new Error('Tower room not found.');
        if (!occupant) throw new Error('Suite is already empty.');

        const ally = STATIC_ALLIES_CATALOG.find((a) => a.id === occupant.allyId);
        const totalInvested = Number(occupant.totalInvested || ally?.hireCost || 0);
        const refundAmount = Math.floor(totalInvested * 0.5);

        await tx.roomOccupant.delete({ where: { id: occupant.id } });

        const updatedPlayer = await tx.player.update({
          where: { id: playerId },
          data: { cash: { increment: refundAmount } },
        });

        if (tx.cashTransaction) {
          await tx.cashTransaction.create({
            data: {
              playerId,
              type: 'ALLY_EVICT_REFUND',
              amount: refundAmount,
              balanceAfter: updatedPlayer.cash,
              reference: room.id,
            },
          });
        }

        return {
          refundAmount,
          player: updatedPlayer,
          roomNumber: room.roomNumber,
          allyName: ally?.name || 'Dormmate',
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async listOccupantsForPlayer(playerId: string): Promise<PersistentRoomOccupantEntity[]> {
    const rows = await this.prisma.roomOccupant.findMany({
      where: { towerRoom: { playerId } },
    });
    return rows.map((r: any) => this.mapOccupant(r));
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    if (playerIds.length === 0) return 0;
    const res = await this.prisma.roomOccupant.deleteMany({
      where: { towerRoom: { playerId: { in: playerIds } } },
    });
    return res.count;
  }
}

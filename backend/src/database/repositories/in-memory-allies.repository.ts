import {
  AlliesRepository,
  AllyDefinitionEntity,
  ALLY_LEVEL_MULTIPLIERS,
  ALLY_UPGRADE_COST_RATIOS,
  STATIC_ALLIES_CATALOG,
} from './allies.repository.interface';
import { PersistentRoomOccupantEntity } from './tower.repository.interface';

export class InMemoryAlliesRepository implements AlliesRepository {
  private readonly occupants = new Map<string, PersistentRoomOccupantEntity>();

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

    const occupied = this.occupants.get(towerRoomId);
    if (occupied) throw new Error('Tower room is already occupied.');

    const occupant: PersistentRoomOccupantEntity = {
      id: `occ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      towerRoomId,
      allyId,
      level: 1,
      totalInvested: ally.hireCost,
      hiredAt: new Date(),
      ally: { ...ally },
    };

    this.occupants.set(towerRoomId, occupant);
    return {
      occupant: { ...occupant },
      player: { id: playerId },
      ally: { ...ally },
    };
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
    const occupant = this.occupants.get(towerRoomId);
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

    occupant.level = nextLevel;
    occupant.totalInvested = Number(occupant.totalInvested || ally.hireCost) + upgradeCost;

    return {
      occupant: { ...occupant },
      player: { id: playerId },
      ally: { ...ally },
      previousLevel: currentLevel,
      newLevel: nextLevel,
      costPaid: upgradeCost,
    };
  }

  async evict(
    playerId: string,
    towerRoomId: string
  ): Promise<{ refundAmount: number; player: any; roomNumber: number; allyName: string }> {
    const occupant = this.occupants.get(towerRoomId);
    if (!occupant) throw new Error('Suite is already empty.');

    const ally = STATIC_ALLIES_CATALOG.find((a) => a.id === occupant.allyId);
    const totalInvested = Number(occupant.totalInvested || ally?.hireCost || 0);
    const refundAmount = Math.floor(totalInvested * 0.5);

    this.occupants.delete(towerRoomId);

    return {
      refundAmount,
      player: { id: playerId },
      roomNumber: 1,
      allyName: ally?.name || 'Dormmate',
    };
  }

  async listOccupantsForPlayer(playerId: string): Promise<PersistentRoomOccupantEntity[]> {
    return Array.from(this.occupants.values());
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    const count = this.occupants.size;
    this.occupants.clear();
    return count;
  }
}

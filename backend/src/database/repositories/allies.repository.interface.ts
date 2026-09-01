import { PersistentRoomOccupantEntity } from './tower.repository.interface';
import { ALLY_LEVEL_MULTIPLIERS, ALLY_UPGRADE_COST_RATIOS } from '../prisma.service';

export { ALLY_LEVEL_MULTIPLIERS, ALLY_UPGRADE_COST_RATIOS };


export interface AllyDefinitionEntity {
  id: string;
  name: string;
  tier: string;
  power: number;
  smartness: number;
  hireCost: number;
}

export const STATIC_ALLIES_CATALOG: AllyDefinitionEntity[] = [
  { id: 'ally-tutor', name: 'Campus Tutor', tier: 'common', power: 0, smartness: 4, hireCost: 250 },
  { id: 'ally-athlete', name: 'Varsity Athlete', tier: 'rare', power: 5, smartness: 0, hireCost: 450 },
  { id: 'ally-ra', name: 'Resident Advisor', tier: 'rare', power: 3, smartness: 3, hireCost: 650 },
  { id: 'ally-captain', name: 'Club Captain', tier: 'epic', power: 4, smartness: 6, hireCost: 900 },
  { id: 'ally-coder', name: 'Hacker Prodigy', tier: 'epic', power: 1, smartness: 10, hireCost: 1200 },
  { id: 'ally-bouncer', name: 'Campus Bouncer', tier: 'epic', power: 10, smartness: 1, hireCost: 1200 },
  { id: 'ally-legend', name: 'Campus Legend', tier: 'legendary', power: 10, smartness: 8, hireCost: 1800 },
  { id: 'ally-valedictorian', name: "Dean's Scholar", tier: 'legendary', power: 2, smartness: 18, hireCost: 2500 },
  { id: 'ally-champion', name: 'All-Star Champion', tier: 'legendary', power: 18, smartness: 2, hireCost: 2500 },
];

export interface AlliesRepository {
  listAllies(): Promise<AllyDefinitionEntity[]>;
  findAllyById(id: string): Promise<AllyDefinitionEntity | null>;
  hire(playerId: string, allyId: string, towerRoomId: string): Promise<{ occupant: PersistentRoomOccupantEntity; player: any; ally: AllyDefinitionEntity }>;
  upgrade(playerId: string, towerRoomId: string): Promise<{ occupant: PersistentRoomOccupantEntity; player: any; ally: AllyDefinitionEntity; previousLevel: number; newLevel: number; costPaid: number }>;
  evict(playerId: string, towerRoomId: string): Promise<{ refundAmount: number; player: any; roomNumber: number; allyName: string }>;
  listOccupantsForPlayer(playerId: string): Promise<PersistentRoomOccupantEntity[]>;
  deleteTestRecords(playerIds: string[]): Promise<number>;
}

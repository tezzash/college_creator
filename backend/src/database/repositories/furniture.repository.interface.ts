export interface DormFurnitureItemEntity {
  id: string;
  name: string;
  category: string;
  cost: number;
  description: string;
  bonusText: string;
  icon: string;
  isOwned?: boolean;
  equippedAt?: Date | string | null;
}

export interface PlayerFurnitureEntity {
  id: string;
  playerId: string;
  furnitureId: string;
  equippedAt: Date;
}

export const STATIC_DORM_FURNITURE_CATALOG: DormFurnitureItemEntity[] = [
  {
    id: 'furn-espresso',
    name: 'Espresso Overclock Station',
    category: 'energy',
    cost: 1500,
    description: 'Brews ultra-caffeinated roast. Grants +2 Maximum Energy capacity (12 Max Energy).',
    bonusText: '+2 Max Energy Capacity',
    icon: 'Coffee',
  },
  {
    id: 'furn-lock',
    name: 'Biometric Smart Vault Lock',
    category: 'defense',
    cost: 2500,
    description: 'Military-grade biometric door lock. Reduces cash plundered by rivals by 35% on defense.',
    bonusText: '-35% Plunder Loss on Defense',
    icon: 'ShieldCheck',
  },
  {
    id: 'furn-server',
    name: 'Liquid-Cooled Neural Rig',
    category: 'smartness',
    cost: 3500,
    description: 'Multi-GPU computing workstation. Amplifies total Dormmate Smartness output by +20%.',
    bonusText: '+20% Total Smartness Multiplier',
    icon: 'Server',
  },
  {
    id: 'furn-rack',
    name: 'Titan Power Cage & Barbell',
    category: 'power',
    cost: 3500,
    description: 'Heavy duty steel squat rack. Amplifies total Dormmate Power output by +20%.',
    bonusText: '+20% Total Power Multiplier',
    icon: 'Dumbbell',
  },
];

export interface FurnitureRepository {
  getCatalog(): Promise<DormFurnitureItemEntity[]>;
  getPlayerFurniture(playerId: string): Promise<PlayerFurnitureEntity[]>;
  getDormFurnitureWithOwnership(playerId: string): Promise<DormFurnitureItemEntity[]>;
  buyFurniture(playerId: string, furnitureId: string): Promise<{ furniture: DormFurnitureItemEntity; player: any }>;
  hasFurniture(playerId: string, furnitureId: string): Promise<boolean>;
  deleteTestRecords(playerIds: string[]): Promise<number>;
}

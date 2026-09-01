import {
  AlliesRepository,
  type AllyDefinitionEntity,
  STATIC_ALLIES_CATALOG,
  PrismaAlliesRepository,
} from './repositories';
import { PrismaService } from './prisma.service';

export type { AllyDefinitionEntity };


export interface PersistentAllyInput {
  id?: string;
  name: string;
  tier: string;
  power: number;
  smartness: number;
  hireCost: number;
}

export class DatabaseAlliesService {
  private readonly alliesRepository: AlliesRepository;

  constructor(repositoryOrPrisma?: AlliesRepository | PrismaService) {
    if (
      repositoryOrPrisma &&
      'listAllies' in repositoryOrPrisma &&
      typeof (repositoryOrPrisma as any).listAllies === 'function' &&
      'hire' in repositoryOrPrisma &&
      typeof (repositoryOrPrisma as any).hire === 'function'
    ) {
      this.alliesRepository = repositoryOrPrisma as AlliesRepository;
    } else if (repositoryOrPrisma && 'roomOccupant' in repositoryOrPrisma) {
      this.alliesRepository = new PrismaAlliesRepository(() => repositoryOrPrisma);
    } else {
      this.alliesRepository = new PrismaAlliesRepository();
    }
  }

  async listAllies(): Promise<AllyDefinitionEntity[]> {
    return this.alliesRepository.listAllies();
  }

  async hire(playerId: string, allyId: string, towerRoomId: string) {
    return this.alliesRepository.hire(playerId, allyId, towerRoomId);
  }

  async upgrade(playerId: string, towerRoomId: string) {
    return this.alliesRepository.upgrade(playerId, towerRoomId);
  }

  async evict(playerId: string, towerRoomId: string) {
    return this.alliesRepository.evict(playerId, towerRoomId);
  }

  async createAlly(input: PersistentAllyInput) {
    if (!input.name.trim()) throw new Error('ally name is required.');
    if (!input.tier.trim()) throw new Error('ally tier is required.');
    if (!Number.isInteger(input.power) || input.power < 0) throw new Error('power must be a non-negative integer.');
    if (!Number.isInteger(input.smartness) || input.smartness < 0) throw new Error('smartness must be a non-negative integer.');
    if (input.power === 0 && input.smartness === 0) throw new Error('ally must provide a stat bonus.');
    if (!Number.isFinite(input.hireCost) || input.hireCost <= 0) throw new Error('hireCost must be positive.');

    return {
      id: input.id || `ally-${Date.now()}`,
      name: input.name.trim(),
      tier: input.tier.trim(),
      power: input.power,
      smartness: input.smartness,
      hireCost: input.hireCost,
    };
  }
}

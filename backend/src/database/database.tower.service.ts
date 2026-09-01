import {
  PersistentTowerRoomEntity,
  TowerRepository,
  TOWER_UNLOCK_COSTS,
  PrismaTowerRepository,
} from './repositories';
import { PrismaService } from './prisma.service';

export interface PersistentTowerRoomInput {
  roomNumber: number;
}


export class DatabaseTowerService {
  private readonly towerRepository: TowerRepository;

  constructor(repositoryOrPrisma?: TowerRepository | PrismaService) {
    if (
      repositoryOrPrisma &&
      'list' in repositoryOrPrisma &&
      typeof (repositoryOrPrisma as any).list === 'function' &&
      'unlock' in repositoryOrPrisma &&
      typeof (repositoryOrPrisma as any).unlock === 'function'
    ) {
      this.towerRepository = repositoryOrPrisma as TowerRepository;
    } else if (repositoryOrPrisma && 'towerRoom' in repositoryOrPrisma) {
      this.towerRepository = new PrismaTowerRepository(() => repositoryOrPrisma);
    } else {
      this.towerRepository = new PrismaTowerRepository();
    }
  }

  async unlock(playerId: string, input: PersistentTowerRoomInput): Promise<PersistentTowerRoomEntity> {
    if (!Number.isInteger(input.roomNumber) || input.roomNumber <= 0) {
      throw new Error('roomNumber must be a positive integer.');
    }
    return this.towerRepository.unlock(playerId, input.roomNumber);
  }

  async list(playerId: string): Promise<PersistentTowerRoomEntity[]> {
    return this.towerRepository.list(playerId);
  }
}

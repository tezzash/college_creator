import { randomUUID } from 'crypto';
import {
  JobDefinitionEntity,
  JobRepository,
  PrismaJobRepository,
} from './repositories';
import { PrismaService } from './prisma.service';

export interface PersistentJobDefinition {
  id?: string;
  name: string;
  durationSeconds: number;
  rewardCash: number;
}

export class DatabaseJobsService {
  private readonly jobRepository: JobRepository;
  private readonly now: () => Date;

  constructor(
    repositoryOrPrisma?: JobRepository | PrismaService,
    now: () => Date = () => new Date()
  ) {
    this.now = now;
    if (repositoryOrPrisma && 'listJobs' in repositoryOrPrisma && typeof (repositoryOrPrisma as any).listJobs === 'function') {
      this.jobRepository = repositoryOrPrisma as JobRepository;
    } else if (repositoryOrPrisma && 'job' in repositoryOrPrisma) {
      this.jobRepository = new PrismaJobRepository(() => repositoryOrPrisma);
    } else {
      this.jobRepository = new PrismaJobRepository();
    }
  }

  async createJob(input: PersistentJobDefinition) {
    if (!input.name?.trim()) throw new Error('job name is required.');
    if (!Number.isInteger(input.durationSeconds) || input.durationSeconds <= 0) {
      throw new Error('durationSeconds must be a positive integer.');
    }
    if (!Number.isFinite(input.rewardCash) || input.rewardCash <= 0) {
      throw new Error('rewardCash must be positive.');
    }
    return this.jobRepository.upsertJob({
      id: input.id || randomUUID(),
      name: input.name.trim(),
      durationSeconds: input.durationSeconds,
      rewardCash: input.rewardCash,
    });
  }

  async listJobs(): Promise<JobDefinitionEntity[]> {
    return this.jobRepository.listJobs();
  }

  async start(playerId: string, jobId: string) {
    return this.jobRepository.startJob(playerId, jobId, this.now());
  }

  async getActive(playerId: string) {
    return this.jobRepository.findActiveJob(playerId);
  }

  async collect(playerId: string, activeJobId: string) {
    const result = await this.jobRepository.collectJob(activeJobId, playerId, this.now());
    return {
      activeJob: result.activeJob,
      rewardCash: result.rewardCash,
      player: result.player,
    };
  }

  async cancel(playerId: string, activeJobId?: string) {
    return this.jobRepository.cancelJob(playerId, activeJobId);
  }
}

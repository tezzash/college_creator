import {
  ActiveJobEntity,
  CollectJobResult,
  DEFAULT_JOBS_CATALOG,
  JobDefinitionEntity,
  JobRepository,
} from './job.repository.interface';
import { randomUUID } from 'crypto';

export class InMemoryJobRepository implements JobRepository {
  private jobs = new Map<string, JobDefinitionEntity>();
  private activeJobs = new Map<string, ActiveJobEntity>();
  private playerStats = new Map<string, { cash: number; totalJobsCompleted: number }>();

  constructor() {
    for (const j of DEFAULT_JOBS_CATALOG) {
      this.jobs.set(j.id, { ...j });
    }
  }

  async seedDefaultJobs(): Promise<void> {
    for (const j of DEFAULT_JOBS_CATALOG) {
      this.jobs.set(j.id, { ...j });
    }
  }

  async listJobs(): Promise<JobDefinitionEntity[]> {
    return Array.from(this.jobs.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async findJobById(id: string): Promise<JobDefinitionEntity | null> {
    const job = this.jobs.get(id);
    return job ? { ...job } : null;
  }

  async upsertJob(job: JobDefinitionEntity): Promise<JobDefinitionEntity> {
    if (!job.name?.trim()) throw new Error('Job name is required.');
    if (!Number.isInteger(job.durationSeconds) || job.durationSeconds <= 0) {
      throw new Error('durationSeconds must be a positive integer.');
    }
    if (!Number.isFinite(job.rewardCash) || job.rewardCash <= 0) {
      throw new Error('rewardCash must be positive.');
    }
    const item: JobDefinitionEntity = {
      id: job.id || randomUUID(),
      name: job.name.trim(),
      durationSeconds: job.durationSeconds,
      rewardCash: job.rewardCash,
    };
    this.jobs.set(item.id, item);
    return { ...item };
  }

  async findActiveJob(playerId: string): Promise<ActiveJobEntity | null> {
    for (const aj of this.activeJobs.values()) {
      if (aj.playerId === playerId && !aj.collected) {
        return {
          ...aj,
          job: this.jobs.get(aj.jobId) ? { ...this.jobs.get(aj.jobId)! } : undefined,
        };
      }
    }
    return null;
  }

  async findActiveJobById(id: string): Promise<ActiveJobEntity | null> {
    const aj = this.activeJobs.get(id);
    if (!aj) return null;
    return {
      ...aj,
      job: this.jobs.get(aj.jobId) ? { ...this.jobs.get(aj.jobId)! } : undefined,
    };
  }

  async startJob(playerId: string, jobId: string, startedAt?: Date): Promise<ActiveJobEntity> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found.');

    for (const aj of this.activeJobs.values()) {
      if (aj.playerId === playerId && !aj.collected) {
        throw new Error('Player already has an active job.');
      }
    }

    const start = startedAt || new Date();
    const finishesAt = new Date(start.getTime() + job.durationSeconds * 1000);
    const id = randomUUID();

    const created: ActiveJobEntity = {
      id,
      playerId,
      jobId,
      startedAt: start,
      finishesAt,
      collected: false,
      job: { ...job },
    };

    this.activeJobs.set(id, created);
    return { ...created };
  }

  async collectJob(activeJobId: string, playerId: string, now?: Date): Promise<CollectJobResult> {
    const active = this.activeJobs.get(activeJobId);
    if (!active || active.playerId !== playerId || active.collected) {
      throw new Error('Active job not found.');
    }

    const currentTime = (now || new Date()).getTime();
    const finishTime = active.finishesAt.getTime();
    if (currentTime < finishTime) {
      const remainingSec = Math.ceil((finishTime - currentTime) / 1000);
      throw new Error(`Job is not finished yet (${remainingSec}s remaining).`);
    }

    const job = this.jobs.get(active.jobId);
    const reward = job ? job.rewardCash : 0;

    active.collected = true;
    active.job = job ? { ...job } : undefined;

    const stats = this.playerStats.get(playerId) || { cash: 1000, totalJobsCompleted: 0 };
    stats.cash += reward;
    stats.totalJobsCompleted += 1;
    this.playerStats.set(playerId, stats);

    return {
      activeJob: { ...active },
      rewardCash: reward,
      totalJobsCompleted: stats.totalJobsCompleted,
      playerCash: stats.cash,
    };
  }

  async cancelJob(playerId: string, activeJobId?: string): Promise<{ success: boolean; message: string }> {
    for (const aj of this.activeJobs.values()) {
      if (aj.playerId === playerId && !aj.collected && (!activeJobId || aj.id === activeJobId)) {
        aj.collected = true;
        return { success: true, message: 'Active job cancelled successfully.' };
      }
    }
    return { success: true, message: 'No active job to cancel.' };
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    let count = 0;
    for (const [id, aj] of Array.from(this.activeJobs.entries())) {
      if (playerIds.includes(aj.playerId)) {
        this.activeJobs.delete(id);
        count++;
      }
    }
    return count;
  }
}

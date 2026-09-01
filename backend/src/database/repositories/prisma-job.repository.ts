import { PrismaClient, Job as PrismaJobModel, ActiveJob as PrismaActiveJobModel } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import {
  ActiveJobEntity,
  CollectJobResult,
  DEFAULT_JOBS_CATALOG,
  JobDefinitionEntity,
  JobRepository,
} from './job.repository.interface';

export class PrismaJobRepository implements JobRepository {
  constructor(private readonly prismaProvider: () => any = () => getPrismaClient()) {}

  private get prisma(): any {
    return this.prismaProvider();
  }

  private mapJobRow(row: PrismaJobModel): JobDefinitionEntity {
    return {
      id: row.id,
      name: row.name,
      durationSeconds: row.durationSeconds,
      rewardCash: typeof row.rewardCash === 'number' ? row.rewardCash : Number(row.rewardCash),
    };
  }

  private mapActiveJobRow(
    row: PrismaActiveJobModel & { job?: PrismaJobModel | null }
  ): ActiveJobEntity {
    return {
      id: row.id,
      playerId: row.playerId,
      jobId: row.jobId,
      startedAt: row.startedAt,
      finishesAt: row.finishesAt,
      collected: row.collected,
      job: row.job ? this.mapJobRow(row.job) : undefined,
    };
  }

  async seedDefaultJobs(): Promise<void> {
    for (const j of DEFAULT_JOBS_CATALOG) {
      await this.prisma.job.upsert({
        where: { id: j.id },
        update: {
          name: j.name,
          durationSeconds: j.durationSeconds,
          rewardCash: j.rewardCash,
        },
        create: {
          id: j.id,
          name: j.name,
          durationSeconds: j.durationSeconds,
          rewardCash: j.rewardCash,
        },
      });
    }
  }

  async listJobs(): Promise<JobDefinitionEntity[]> {
    const rows = await this.prisma.job.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map((r: any) => this.mapJobRow(r));
  }

  async findJobById(id: string): Promise<JobDefinitionEntity | null> {
    const row = await this.prisma.job.findUnique({
      where: { id },
    });
    return row ? this.mapJobRow(row) : null;
  }

  async upsertJob(job: JobDefinitionEntity): Promise<JobDefinitionEntity> {
    if (!job.name?.trim()) throw new Error('Job name is required.');
    if (!Number.isInteger(job.durationSeconds) || job.durationSeconds <= 0) {
      throw new Error('durationSeconds must be a positive integer.');
    }
    if (!Number.isFinite(job.rewardCash) || job.rewardCash <= 0) {
      throw new Error('rewardCash must be positive.');
    }

    const row = await this.prisma.job.upsert({
      where: { id: job.id },
      update: {
        name: job.name.trim(),
        durationSeconds: job.durationSeconds,
        rewardCash: job.rewardCash,
      },
      create: {
        id: job.id,
        name: job.name.trim(),
        durationSeconds: job.durationSeconds,
        rewardCash: job.rewardCash,
      },
    });
    return this.mapJobRow(row);
  }

  async findActiveJob(playerId: string): Promise<ActiveJobEntity | null> {
    const row = await this.prisma.activeJob.findFirst({
      where: { playerId, collected: false },
      include: { job: true },
      orderBy: { startedAt: 'desc' },
    });
    return row ? this.mapActiveJobRow(row) : null;
  }

  async findActiveJobById(id: string): Promise<ActiveJobEntity | null> {
    const row = await this.prisma.activeJob.findUnique({
      where: { id },
      include: { job: true },
    });
    return row ? this.mapActiveJobRow(row) : null;
  }

  async startJob(playerId: string, jobId: string, startedAt?: Date): Promise<ActiveJobEntity> {
    return this.prisma.$transaction(
      async (tx: any) => {
        let job = await tx.job.findUnique({ where: { id: jobId } });
        if (!job) {
          const fallback = DEFAULT_JOBS_CATALOG.find((j) => j.id === jobId);
          if (fallback) {
            job = await tx.job.create({
              data: {
                id: fallback.id,
                name: fallback.name,
                durationSeconds: fallback.durationSeconds,
                rewardCash: fallback.rewardCash,
              },
            });
          } else {
            throw new Error('Job not found.');
          }
        }

        const active = await tx.activeJob.findFirst({
          where: { playerId, collected: false },
        });
        if (active) throw new Error('Player already has an active job.');

        const player = await tx.player.findUnique({
          where: { id: playerId },
          select: { id: true },
        });
        if (!player) throw new Error('Player not found.');

        const start = startedAt || new Date();
        const finishesAt = new Date(start.getTime() + job.durationSeconds * 1000);

        const created = await tx.activeJob.create({
          data: {
            playerId,
            jobId,
            startedAt: start,
            finishesAt,
            collected: false,
          },
          include: { job: true },
        });

        return this.mapActiveJobRow(created);
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async collectJob(activeJobId: string, playerId: string, now?: Date): Promise<CollectJobResult> {
    return this.prisma.$transaction(
      async (tx: any) => {
        const active = await tx.activeJob.findFirst({
          where: { id: activeJobId, playerId, collected: false },
          include: { job: true },
        });
        if (!active) throw new Error('Active job not found.');

        const currentTime = (now || new Date()).getTime();
        const finishTime = active.finishesAt.getTime();
        if (currentTime < finishTime) {
          const remainingSec = Math.ceil((finishTime - currentTime) / 1000);
          throw new Error(`Job is not finished yet (${remainingSec}s remaining).`);
        }

        const reward = Number(active.job?.rewardCash || 0);

        const updatedPlayer = await tx.player.update({
          where: { id: playerId },
          data: {
            cash: { increment: reward },
            totalJobsCompleted: { increment: 1 },
          },
        });

        const completed = await tx.activeJob.update({
          where: { id: active.id },
          data: { collected: true },
          include: { job: true },
        });

        if (tx.cashTransaction) {
          await tx.cashTransaction.create({
            data: {
              playerId,
              type: 'JOB_REWARD',
              amount: reward,
              balanceAfter: updatedPlayer.cash,
              reference: `Job Reward: ${active.job?.name || active.jobId}`,
            },
          });
        }

        // Update daily quest state
        const today = new Date().toISOString().split('T')[0];
        let state = (updatedPlayer as any).dailyQuestsState;
        if ((updatedPlayer as any).dailyQuestsDate !== today || !state) {
          state = {
            'dq-jobs': { progress: 0, claimed: false },
            'dq-pvp': { progress: 0, claimed: false },
            'dq-bank': { progress: 0, claimed: false },
            bonusClaimed: false,
          };
        }
        state['dq-jobs'] = state['dq-jobs'] || { progress: 0, claimed: false };
        state['dq-jobs'].progress = (state['dq-jobs'].progress || 0) + 1;

        await tx.player.update({
          where: { id: playerId },
          data: {
            dailyQuestsDate: today,
            dailyQuestsState: state,
          },
        });

        const playerEntity = {
          ...updatedPlayer,
          cash: typeof updatedPlayer.cash === 'number' ? updatedPlayer.cash : Number(updatedPlayer.cash),
          bankCash: typeof updatedPlayer.bankCash === 'number' ? updatedPlayer.bankCash : Number(updatedPlayer.bankCash),
          totalPlundered: typeof updatedPlayer.totalPlundered === 'number' ? updatedPlayer.totalPlundered : Number(updatedPlayer.totalPlundered),
          totalBankDeposited: typeof updatedPlayer.totalBankDeposited === 'number' ? updatedPlayer.totalBankDeposited : Number(updatedPlayer.totalBankDeposited),
        };

        return {
          activeJob: this.mapActiveJobRow(completed),
          rewardCash: reward,
          totalJobsCompleted: updatedPlayer.totalJobsCompleted,
          playerCash: Number(updatedPlayer.cash),
          player: playerEntity,
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async cancelJob(playerId: string, activeJobId?: string): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(
      async (tx: any) => {
        const active = await tx.activeJob.findFirst({
          where: {
            ...(activeJobId ? { id: activeJobId } : {}),
            playerId,
            collected: false,
          },
        });
        if (!active) {
          return { success: true, message: 'No active job to cancel.' };
        }
        await tx.activeJob.update({
          where: { id: active.id },
          data: { collected: true },
        });
        return { success: true, message: 'Active job cancelled successfully.' };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    if (!playerIds.length) return 0;
    const res = await this.prisma.activeJob.deleteMany({
      where: { playerId: { in: playerIds } },
    });
    return res.count;
  }
}

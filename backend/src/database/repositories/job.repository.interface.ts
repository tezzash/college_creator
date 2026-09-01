export interface JobDefinitionEntity {
  id: string;
  name: string;
  durationSeconds: number;
  rewardCash: number;
}

export interface ActiveJobEntity {
  id: string;
  playerId: string;
  jobId: string;
  startedAt: Date;
  finishesAt: Date;
  collected: boolean;
  job?: JobDefinitionEntity;
}

export interface CollectJobResult {
  activeJob: ActiveJobEntity;
  rewardCash: number;
  totalJobsCompleted: number;
  playerCash: number;
  player?: any;
}

export interface JobRepository {
  listJobs(): Promise<JobDefinitionEntity[]>;
  findJobById(id: string): Promise<JobDefinitionEntity | null>;
  upsertJob(job: JobDefinitionEntity): Promise<JobDefinitionEntity>;
  seedDefaultJobs(): Promise<void>;

  findActiveJob(playerId: string): Promise<ActiveJobEntity | null>;
  findActiveJobById(id: string): Promise<ActiveJobEntity | null>;
  startJob(playerId: string, jobId: string, startedAt?: Date): Promise<ActiveJobEntity>;
  collectJob(activeJobId: string, playerId: string, now?: Date): Promise<CollectJobResult>;
  cancelJob(playerId: string, activeJobId?: string): Promise<{ success: boolean; message: string }>;
  deleteTestRecords(playerIds: string[]): Promise<number>;
}

export const DEFAULT_JOBS_CATALOG: JobDefinitionEntity[] = [
  { id: 'job-study', name: 'Study Session', durationSeconds: 30, rewardCash: 100 },
  { id: 'job-freelance', name: 'Freelance Gig', durationSeconds: 90, rewardCash: 300 },
  { id: 'job-night-shift', name: 'Night Shift', durationSeconds: 180, rewardCash: 750 },
];

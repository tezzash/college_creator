-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "reward_cash" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_jobs" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishes_at" TIMESTAMP(3) NOT NULL,
    "collected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "active_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "active_jobs_player_id_collected_idx" ON "active_jobs"("player_id", "collected");

-- CreateIndex
CREATE INDEX "active_jobs_finishes_at_idx" ON "active_jobs"("finishes_at");

-- AddForeignKey
ALTER TABLE "active_jobs" ADD CONSTRAINT "active_jobs_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_jobs" ADD CONSTRAINT "active_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

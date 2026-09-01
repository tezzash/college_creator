import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaJobRepository } from './repositories/prisma-job.repository';
import { getPrismaClient } from './prisma-client';
import { DatabaseJobsService } from './database.jobs.service';

test('Jobs PostgreSQL Persistence Verification Suite (REAL POSTGRESQL TEST)', async (t) => {
  const prisma = getPrismaClient();
  const repo = new PrismaJobRepository(() => prisma);
  let virtualNow = new Date();
  const jobsService = new DatabaseJobsService(repo, () => virtualNow);

  // Ensure default jobs are seeded in PostgreSQL
  await repo.seedDefaultJobs();

  // Helper to create isolated test player
  async function createTestPlayer(initialCash = 1000) {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const testId = `pg-jobs-${uniqueSuffix}`;
    const testUsername = `JobsUser_${uniqueSuffix}`;
    const testEmail = `jobs_${uniqueSuffix}@campus.edu`;

    const created = await prisma.player.create({
      data: {
        id: testId,
        username: testUsername,
        email: testEmail,
        passwordHash: 'scrypt$hash$testing',
        cash: initialCash,
        totalJobsCompleted: 0,
      },
    });

    return { id: created.id, username: created.username, email: created.email, cash: Number(created.cash) };
  }

  await t.test('1. Catalog: Default jobs exist in PostgreSQL with correct duration and rewards', async () => {
    const jobs = await jobsService.listJobs();
    assert.ok(jobs.length >= 3, 'Must have at least 3 jobs available');

    const study = jobs.find((j) => j.id === 'job-study');
    assert.ok(study, 'Study Session job must exist');
    assert.equal(study?.durationSeconds, 30);
    assert.equal(study?.rewardCash, 100);

    const freelance = jobs.find((j) => j.id === 'job-freelance');
    assert.ok(freelance, 'Freelance Gig job must exist');
    assert.equal(freelance?.durationSeconds, 90);
    assert.equal(freelance?.rewardCash, 300);

    const nightShift = jobs.find((j) => j.id === 'job-night-shift');
    assert.ok(nightShift, 'Night Shift job must exist');
    assert.equal(nightShift?.durationSeconds, 180);
    assert.equal(nightShift?.rewardCash, 750);
  });

  await t.test('2. Start Job: Stores active job in PostgreSQL with server-authoritative timestamps', async () => {
    const p = await createTestPlayer();
    try {
      virtualNow = new Date('2026-09-01T12:00:00.000Z');
      const activeJob = await jobsService.start(p.id, 'job-study');

      assert.ok(activeJob.id, 'Active job must have an ID');
      assert.equal(activeJob.playerId, p.id);
      assert.equal(activeJob.jobId, 'job-study');
      assert.equal(activeJob.collected, false);
      assert.equal(activeJob.startedAt.toISOString(), '2026-09-01T12:00:00.000Z');
      assert.equal(activeJob.finishesAt.toISOString(), '2026-09-01T12:00:30.000Z');

      // Verify raw PostgreSQL row
      const dbRow = await prisma.activeJob.findUniqueOrThrow({
        where: { id: activeJob.id },
        include: { job: true },
      });
      assert.equal(dbRow.playerId, p.id);
      assert.equal(dbRow.collected, false);
      assert.equal(dbRow.job.name, 'Study Session');

      // Verify getActive
      const active = await jobsService.getActive(p.id);
      assert.ok(active, 'getActive must return the current active job');
      assert.equal(active?.id, activeJob.id);
    } finally {
      await prisma.activeJob.deleteMany({ where: { playerId: p.id } });
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });

  await t.test('3. Concurrency & Active Limit: Prevents starting multiple concurrent jobs', async () => {
    const p = await createTestPlayer();
    try {
      virtualNow = new Date('2026-09-01T12:00:00.000Z');
      await jobsService.start(p.id, 'job-study');

      // Attempting to start a second job while one is active should throw
      await assert.rejects(
        () => jobsService.start(p.id, 'job-freelance'),
        /already has an active job/
      );

      // Verify in PostgreSQL that only 1 active job exists
      const count = await prisma.activeJob.count({
        where: { playerId: p.id, collected: false },
      });
      assert.equal(count, 1, 'There must be exactly 1 active job in PostgreSQL');
    } finally {
      await prisma.activeJob.deleteMany({ where: { playerId: p.id } });
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });

  await t.test('4. Timing Enforcement: Rejects premature collection before finishesAt', async () => {
    const p = await createTestPlayer();
    try {
      virtualNow = new Date('2026-09-01T12:00:00.000Z');
      const activeJob = await jobsService.start(p.id, 'job-study');

      // Advance time by only 10s (job requires 30s)
      virtualNow = new Date('2026-09-01T12:00:10.000Z');
      await assert.rejects(
        () => jobsService.collect(p.id, activeJob.id),
        /Job is not finished yet/
      );

      // Ensure job is still uncollected in PostgreSQL
      const dbRow = await prisma.activeJob.findUniqueOrThrow({ where: { id: activeJob.id } });
      assert.equal(dbRow.collected, false);

      // Ensure player cash and totalJobsCompleted are unchanged
      const playerRow = await prisma.player.findUniqueOrThrow({ where: { id: p.id } });
      assert.equal(Number(playerRow.cash), 1000);
      assert.equal(playerRow.totalJobsCompleted, 0);
    } finally {
      await prisma.activeJob.deleteMany({ where: { playerId: p.id } });
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });

  await t.test('5. Completion & Reward: Credits cash and increments totalJobsCompleted in PostgreSQL', async () => {
    const p = await createTestPlayer(1000);
    try {
      virtualNow = new Date('2026-09-01T12:00:00.000Z');
      const activeJob = await jobsService.start(p.id, 'job-study');

      // Advance time past completion (35s)
      virtualNow = new Date('2026-09-01T12:00:35.000Z');
      const result = await jobsService.collect(p.id, activeJob.id);

      assert.equal(result.rewardCash, 100);
      assert.equal(result.activeJob.collected, true);

      // Verify player row in PostgreSQL has updated cash and totalJobsCompleted
      const updatedPlayer = await prisma.player.findUniqueOrThrow({ where: { id: p.id } });
      assert.equal(Number(updatedPlayer.cash), 1100, 'Cash should increase by $100');
      assert.equal(updatedPlayer.totalJobsCompleted, 1, 'totalJobsCompleted should be 1');

      // Verify activeJob row in PostgreSQL is marked collected
      const dbActiveJob = await prisma.activeJob.findUniqueOrThrow({ where: { id: activeJob.id } });
      assert.equal(dbActiveJob.collected, true);

      // Verify getActive returns null now
      const active = await jobsService.getActive(p.id);
      assert.equal(active, null, 'No active job should be returned after collection');
    } finally {
      await prisma.activeJob.deleteMany({ where: { playerId: p.id } });
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });

  await t.test('6. Double Collection Protection: Cannot collect the same job twice', async () => {
    const p = await createTestPlayer(1000);
    try {
      virtualNow = new Date('2026-09-01T12:00:00.000Z');
      const activeJob = await jobsService.start(p.id, 'job-study');

      // Complete and collect once
      virtualNow = new Date('2026-09-01T12:00:35.000Z');
      await jobsService.collect(p.id, activeJob.id);

      // Second collect attempt must fail
      await assert.rejects(
        () => jobsService.collect(p.id, activeJob.id),
        /Active job not found/
      );

      // Verify player cash was NOT credited twice
      const playerRow = await prisma.player.findUniqueOrThrow({ where: { id: p.id } });
      assert.equal(Number(playerRow.cash), 1100, 'Cash must only be credited once');
      assert.equal(playerRow.totalJobsCompleted, 1, 'Job counter must only increment once');
    } finally {
      await prisma.activeJob.deleteMany({ where: { playerId: p.id } });
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });

  await t.test('7. Cancel Job: Clears active status in PostgreSQL allowing immediate restart', async () => {
    const p = await createTestPlayer();
    try {
      virtualNow = new Date('2026-09-01T12:00:00.000Z');
      const activeJob = await jobsService.start(p.id, 'job-night-shift');

      // Cancel the active job
      const cancelResult = await jobsService.cancel(p.id, activeJob.id);
      assert.equal(cancelResult.success, true);

      // Verify getActive is null
      const active = await jobsService.getActive(p.id);
      assert.equal(active, null);

      // Start a different job immediately
      const newJob = await jobsService.start(p.id, 'job-study');
      assert.ok(newJob.id);
      assert.equal(newJob.jobId, 'job-study');
    } finally {
      await prisma.activeJob.deleteMany({ where: { playerId: p.id } });
      await prisma.player.delete({ where: { id: p.id } }).catch(() => {});
    }
  });
});

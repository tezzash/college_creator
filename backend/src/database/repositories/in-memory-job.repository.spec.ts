import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryJobRepository } from './in-memory-job.repository';

test('InMemoryJobRepository Unit Tests', async (t) => {
  const repo = new InMemoryJobRepository();

  await t.test('listJobs returns seeded catalog', async () => {
    const jobs = await repo.listJobs();
    assert.equal(jobs.length, 3);
    assert.ok(jobs.some((j) => j.id === 'job-study'));
  });

  await t.test('startJob creates active job and calculates finish time', async () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const active = await repo.startJob('p1', 'job-study', start);

    assert.equal(active.playerId, 'p1');
    assert.equal(active.jobId, 'job-study');
    assert.equal(active.finishesAt.toISOString(), '2026-01-01T00:00:30.000Z');
  });

  await t.test('startJob prevents concurrent active jobs for same player', async () => {
    await assert.rejects(
      () => repo.startJob('p1', 'job-freelance'),
      /already has an active job/
    );
  });

  await t.test('collectJob blocks collection before completion', async () => {
    const active = await repo.findActiveJob('p1');
    assert.ok(active);

    await assert.rejects(
      () => repo.collectJob(active.id, 'p1', new Date('2026-01-01T00:00:10.000Z')),
      /not finished yet/
    );
  });

  await t.test('collectJob succeeds after completion and rewards cash', async () => {
    const active = await repo.findActiveJob('p1');
    assert.ok(active);

    const result = await repo.collectJob(active.id, 'p1', new Date('2026-01-01T00:00:35.000Z'));
    assert.equal(result.rewardCash, 100);
    assert.equal(result.totalJobsCompleted, 1);
    assert.equal(result.activeJob.collected, true);

    const activeAfter = await repo.findActiveJob('p1');
    assert.equal(activeAfter, null);
  });

  await t.test('cancelJob clears active job', async () => {
    const active = await repo.startJob('p2', 'job-night-shift');
    assert.ok(active);

    const cancelRes = await repo.cancelJob('p2', active.id);
    assert.equal(cancelRes.success, true);

    const activeAfter = await repo.findActiveJob('p2');
    assert.equal(activeAfter, null);
  });
});

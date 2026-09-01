import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALPHA_GAME_CONFIG } from '../game-config';
import { EnergyService } from './energy.service';

const service = new EnergyService(ALPHA_GAME_CONFIG);
const start = new Date('2026-08-12T00:00:00.000Z');

describe('EnergyService (IN-MEMORY TEST SUITE)', () => {
  it('regenerates energy based on elapsed configured intervals (420s = 1 energy, 840s = 2 energy)', () => {
    // 1 interval (420s = 7m) -> 5 + 1 = 6
    const single = service.regenerate({ energy: 5, lastEnergyUpdate: start }, new Date('2026-08-12T00:07:00.000Z'));
    assert.equal(single.energy, 6);
    assert.equal(single.lastEnergyUpdate.toISOString(), '2026-08-12T00:07:00.000Z');

    // 2 intervals + 30s remainder (870s = 14m 30s) -> 5 + 2 = 7, remainder 30s preserved
    const result = service.regenerate({ energy: 5, lastEnergyUpdate: start }, new Date('2026-08-12T00:14:30.000Z'));
    assert.equal(result.energy, 7);
    assert.equal(result.lastEnergyUpdate.toISOString(), '2026-08-12T00:14:00.000Z');
  });

  it('caps energy at max (10) and uses now when full', () => {
    const result = service.regenerate({ energy: 9, lastEnergyUpdate: start }, new Date('2026-08-12T00:14:00.000Z'));

    assert.equal(result.energy, 10);
    assert.equal(result.lastEnergyUpdate.toISOString(), '2026-08-12T00:14:00.000Z');
  });

  it('spends PvP energy after regeneration', () => {
    const result = service.spendForPvp({ energy: 0, lastEnergyUpdate: start }, new Date('2026-08-12T00:07:00.000Z'));

    assert.equal(result.energy, 0);
  });

  it('sets lastEnergyUpdate to now when spending from max capacity (10 -> 9)', () => {
    const actionTime = new Date('2026-08-12T01:00:00.000Z'); // 1 hour later
    const result = service.spendForPvp({ energy: 10, lastEnergyUpdate: start }, actionTime);

    assert.equal(result.energy, 9);
    assert.equal(result.lastEnergyUpdate.toISOString(), actionTime.toISOString());
  });

  it('preserves fractional remainder seconds when spending below max capacity', () => {
    // Player is at 6 energy, last updated at 00:00:00.
    // At 00:03:00 (180s elapsed), player spends 1 energy.
    // Elapsed (180s) is less than 420s (0 regenerated).
    // Energy becomes 5, and lastEnergyUpdate remains 00:00:00 so the 180s of progress is preserved.
    const actionTime = new Date('2026-08-12T00:03:00.000Z');
    const result = service.spendForPvp({ energy: 6, lastEnergyUpdate: start }, actionTime);

    assert.equal(result.energy, 5);
    assert.equal(result.lastEnergyUpdate.toISOString(), start.toISOString());

    // 240s later (at 00:07:00 total elapsed 420s from start), player regenerates +1 energy to 6.
    const regenAfter = service.regenerate(result, new Date('2026-08-12T00:07:00.000Z'));
    assert.equal(regenAfter.energy, 6);
  });

  it('rejects invalid energy operations', () => {
    assert.throws(() => service.regenerate({ energy: 11, lastEnergyUpdate: start }, start), /energy/);
    assert.throws(() => service.regenerate({ energy: 1, lastEnergyUpdate: start }, new Date('2026-08-11T23:59:00.000Z')), /before/);
    assert.throws(() => service.spendForPvp({ energy: 0, lastEnergyUpdate: start }, start), /Not enough/);
  });
});

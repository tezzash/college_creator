import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  it('1. valid development configuration', () => {
    const config = new ConfigService({ NODE_ENV: 'development' }).load();
    assert.equal(config.environment, 'development');
    assert.equal(config.port, 3000);
  });

  it('2. valid test configuration', () => {
    const config = new ConfigService({ NODE_ENV: 'test', JWT_SECRET: 'testsecret' }).load();
    assert.equal(config.environment, 'test');
  });

  it('3. valid production configuration', () => {
    const config = new ConfigService({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db', JWT_SECRET: 'super-secure-production-secret-key-32chars' }).load();
    assert.equal(config.environment, 'production');
    assert.equal(config.databaseUrl, 'postgres://db');
  });

  it('4. invalid port', () => {
    assert.throws(() => new ConfigService({ PORT: '0' }).load(), /PORT/);
    assert.throws(() => new ConfigService({ PORT: 'abc' }).load(), /PORT/);
  });

  it('5. missing port if required', () => {
    const config = new ConfigService({}).load();
    assert.equal(config.port, 3000);
  });

  it('6. invalid environment', () => {
    assert.throws(() => new ConfigService({ NODE_ENV: 'staging' }).load(), /NODE_ENV/);
  });

  it('7. missing production database configuration (warns)', () => {
    // Should not throw, only warn
    new ConfigService({ NODE_ENV: 'production', JWT_SECRET: 'super-secure-production-secret-key-32chars' }).load();
  });

  it('8. missing production auth secret (warns)', () => {
    new ConfigService({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db' }).load();
  });

  it('9. insecure/default production auth secret (warns)', () => {
    new ConfigService({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db', JWT_SECRET: 'short-secret' }).load();
    new ConfigService({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db', JWT_SECRET: 'development-only-secret-change-me-please-32chars' }).load();
  });

  it('10. valid production secret', () => {
    const config = new ConfigService({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db', JWT_SECRET: 'super-secure-production-secret-key-32chars' }).load();
    assert.equal(config.jwtSecret, 'super-secure-production-secret-key-32chars');
  });

  it('11. PORT from environment is respected', () => {
    const config = new ConfigService({ PORT: '3001' }).load();
    assert.equal(config.port, 3001);
  });

  it('12. development PORT fallback works', () => {
    const config = new ConfigService({}).load();
    assert.equal(config.port, 3000);
  });

  it('13. CORS origin configuration parses single or multiple origins', () => {
    const single = new ConfigService({ CORS_ORIGIN: 'https://my-app.com' }).load();
    assert.equal(single.corsOrigin, 'https://my-app.com');
    assert.deepEqual(single.corsOrigins, ['https://my-app.com']);

    const multi = new ConfigService({ CORS_ORIGINS: 'https://app1.com, https://app2.com' }).load();
    assert.equal(multi.corsOrigin, 'https://app1.com');
    assert.deepEqual(multi.corsOrigins, ['https://app1.com', 'https://app2.com']);
  });
});

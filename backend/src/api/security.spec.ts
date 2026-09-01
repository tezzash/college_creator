import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const PORT = 3001;
const TRUSTED_ORIGIN = 'https://legitimate-app.com';

test('API Security Hardening Tests', async (t) => {
  // Spawn the server on a different port for testing
  const env: Record<string, string | undefined> = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: 'production',
    CORS_ORIGINS: `${TRUSTED_ORIGIN},https://secondary-trusted.com`,
    JWT_SECRET: 'test-secret-at-least-32-chars-long-so-it-is-secure',
    DATABASE_URL: 'postgres://test',
  };
  delete env.NGINX_PORT;
  delete env.APPLET_ID;
  
  const serverProcess = spawn('node', ['dist/server.cjs'], { env });
  let stderr = '';
  serverProcess.stderr.on('data', (d) => { stderr += d.toString(); });
  serverProcess.stdout.on('data', (d) => { console.log(d.toString()); });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  if (stderr) {
    console.error('SERVER STDERR:', stderr);
  }
  
  try {
    await t.test('PORT: Server respects environment-provided PORT (3001)', async () => {
      const res = await fetch(`http://localhost:${PORT}/api/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
    });

    await t.test('CORS: Reject unconfigured origin in production', async () => {
      const res = await fetch(`http://localhost:${PORT}/api/health`, {
        headers: { 'Origin': 'http://evil.com' }
      });
      assert.strictEqual(res.status, 500);
      const text = await res.text();
      assert.ok(text.includes('Internal Server Error') || text.includes('Not allowed by CORS'));
    });

    await t.test('CORS: Reject attacker.run.app unless explicitly configured', async () => {
      const res = await fetch(`http://localhost:${PORT}/api/health`, {
        headers: { 'Origin': 'https://attacker.run.app' }
      });
      assert.strictEqual(res.status, 500);
      const text = await res.text();
      assert.ok(text.includes('Internal Server Error') || text.includes('Not allowed by CORS'));
    });

    await t.test('CORS: Reject attacker.aistudio.google.com unless explicitly configured', async () => {
      const res = await fetch(`http://localhost:${PORT}/api/health`, {
        headers: { 'Origin': 'https://attacker.aistudio.google.com' }
      });
      assert.strictEqual(res.status, 500);
      const text = await res.text();
      assert.ok(text.includes('Internal Server Error') || text.includes('Not allowed by CORS'));
    });

    await t.test('CORS: Allow legitimate configured origin in production', async () => {
      const res = await fetch(`http://localhost:${PORT}/api/health`, {
        headers: { 'Origin': TRUSTED_ORIGIN }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), TRUSTED_ORIGIN);
    });

    await t.test('CORS: Allow requests without Origin (curl / mobile)', async () => {
      const res = await fetch(`http://localhost:${PORT}/api/health`);
      assert.strictEqual(res.status, 200);
    });

    await t.test('Error Sanitization: Exposing Prisma details is blocked', async () => {
      const res = await fetch(`http://localhost:${PORT}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'foo', password: '' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'login and password are required.');
    });

    await t.test('Oversized input rejected', async () => {
      const bigString = 'a'.repeat(200000); // 200kb
      const res = await fetch(`http://localhost:${PORT}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: bigString, password: 'password' })
      });
      assert.strictEqual(res.status, 413); // Payload Too Large
    });
    
    await t.test('Unauthenticated access blocked', async () => {
      const res = await fetch(`http://localhost:${PORT}/me`);
      assert.strictEqual(res.status, 401);
    });

    await t.test('Rate limiting triggers on auth', async () => {
      // Max 20 requests per 15 min for /auth
      let lastStatus = 200;
      for (let i = 0; i < 25; i++) {
        const res = await fetch(`http://localhost:${PORT}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: 'user', password: 'password' })
        });
        lastStatus = res.status;
      }
      assert.strictEqual(lastStatus, 429);
    });

  } finally {
    serverProcess.kill();
  }
});

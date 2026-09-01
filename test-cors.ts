import { spawn } from 'node:child_process';
const PORT = 3001;
const env = { ...process.env, PORT: String(PORT), NODE_ENV: 'production', JWT_SECRET: 'test-secret-at-least-32-chars-long-so-it-is-secure', DATABASE_URL: 'postgres://test' };
const serverProcess = spawn('npx', ['tsx', 'server.ts'], { env });
setTimeout(async () => {
  const res = await fetch(`http://localhost:${PORT}/api/health`, { headers: { 'Origin': 'http://evil.com' } });
  console.log(res.status);
  console.log(await res.text());
  serverProcess.kill();
}, 3000);

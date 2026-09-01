import { ConfigService } from './backend/src/config/config.service';

process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = 'postgres://campus-memory-sqlite';
process.env.JWT_SECRET = 'college-geeks-secure-jwt-key-auto-generated-production-secret-32chars';

try {
  const config = new ConfigService().load();
  console.log("SUCCESS:", config);
} catch (e) {
  console.error("FAIL:", e);
}

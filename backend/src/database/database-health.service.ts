import { PrismaClient } from '@prisma/client';
import { getPrismaClient, sanitizeDatabaseUrl } from './prisma-client';

export interface DatabaseHealthResult {
  isHealthy: boolean;
  latencyMs: number;
  error?: string;
  timestamp: string;
}

export type PrismaClientProvider = () => PrismaClient | null;

/**
 * Service to verify real database connectivity independently from
 * basic application process liveness.
 */
export class DatabaseHealthService {
  constructor(private readonly clientProvider: PrismaClientProvider = () => getPrismaClient()) {}

  async checkHealth(): Promise<DatabaseHealthResult> {
    const start = Date.now();
    try {
      const client = this.clientProvider();
      if (!client) {
        return {
          isHealthy: false,
          latencyMs: 0,
          error: 'PrismaClient is not initialized',
          timestamp: new Date().toISOString(),
        };
      }

      // Execute a minimal ping query against PostgreSQL
      await client.$queryRawUnsafe('SELECT 1');

      return {
        isHealthy: true,
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const rawError = err?.message || String(err);
      const sanitized = sanitizeDatabaseUrl(rawError);
      return {
        isHealthy: false,
        latencyMs: Date.now() - start,
        error: sanitized,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

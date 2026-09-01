import { PrismaClient } from '@prisma/client';

let prismaClientInstance: PrismaClient | null = null;

export interface PrismaClientOptions {
  databaseUrl?: string;
  logQueries?: boolean;
}

/**
 * Sanitizes connection strings so that database credentials / passwords
 * are never exposed in error logs, debug traces, or telemetry.
 */
export function sanitizeDatabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '[undefined]';
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = '*****';
    }
    return parsed.toString();
  } catch {
    return rawUrl.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1*****$2');
  }
}

/**
 * Returns a reusable singleton instance of PrismaClient.
 * Connection is lazily initialized on first access rather than on module load.
 */
export function getPrismaClient(options: PrismaClientOptions = {}): PrismaClient {
  if (!prismaClientInstance) {
    const datasourceUrl = options.databaseUrl || process.env.DATABASE_URL;
    prismaClientInstance = new PrismaClient({
      datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
      log: options.logQueries ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });
  }
  return prismaClientInstance;
}

/**
 * Gracefully disconnects the singleton PrismaClient instance.
 */
export async function disconnectPrismaClient(): Promise<void> {
  if (prismaClientInstance) {
    await prismaClientInstance.$disconnect();
    prismaClientInstance = null;
  }
}

/**
 * Helper for testing environments to reset singleton state.
 */
export function resetPrismaClientInstanceForTesting(): void {
  prismaClientInstance = null;
}

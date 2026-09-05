import { AppConfig } from './config.types';

type EnvironmentReader = Record<string, string | undefined>;

const DEFAULT_PORT = 3000;
const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';
const VALID_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export class ConfigService {
  constructor(private readonly env: EnvironmentReader = process.env) {}

  load(): AppConfig {
    const environment = this.readEnvironment();
    const port = this.readPort();
    const rawSecret = this.readOptional('JWT_SECRET');

    const corsRaw = this.readOptional('CORS_ORIGINS') ?? this.readOptional('CORS_ORIGIN');
    const parsedOrigins = corsRaw
      ? corsRaw.split(',').map((o) => o.trim()).filter(Boolean)
      : [];
    const validOrigins = parsedOrigins.filter((o) => o === '*' || o.startsWith('http://') || o.startsWith('https://'));
    const corsOrigins = validOrigins.length > 0 ? validOrigins : [DEFAULT_CORS_ORIGIN];
    const corsOrigin = corsOrigins[0] ?? DEFAULT_CORS_ORIGIN;

    const config: AppConfig = {
      environment,
      port,
      databaseUrl: this.readOptional('DATABASE_URL'),
      jwtSecret: rawSecret,
      corsOrigin,
      corsOrigins,
    };

    this.validateProductionSecrets(config);

    if (!config.jwtSecret || config.jwtSecret.length < 32) {
      config.jwtSecret = 'development-only-secret-change-me-please-32chars';
    }

    return config;
  }

  private readEnvironment(): AppConfig['environment'] {
    const raw = this.readOptional('NODE_ENV')?.toLowerCase();
    if (!raw) return 'development';
    if (raw === 'prod' || raw === 'production') return 'production';
    if (raw === 'dev' || raw === 'development') return 'development';
    if (raw === 'test') return 'test';
    if (VALID_ENVIRONMENTS.includes(raw as AppConfig['environment'])) {
      return raw as AppConfig['environment'];
    }
    throw new Error(`Invalid NODE_ENV: ${raw}`);
  }

  private readPort(): number {
    const rawPort = this.readOptional('PORT');
    if (!rawPort) return DEFAULT_PORT;
    const port = Number(rawPort);
    if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
      throw new Error(`Invalid PORT: ${rawPort}`);
    }
    return port;
  }

  private readOptional(name: string): string | undefined {
    const value = this.env[name]?.trim();
    return value ? value : undefined;
  }

  private validateProductionSecrets(config: AppConfig): void {
    if (config.environment === 'production') {
      const missing: string[] = [];
      if (!this.readOptional('DATABASE_URL')) missing.push('DATABASE_URL');
      
      const secret = this.readOptional('JWT_SECRET');
      if (!secret) missing.push('JWT_SECRET');
      
      if (missing.length > 0) {
        console.warn(`WARNING: Missing required production variables: ${missing.join(', ')}. The application may not function correctly.`);
      }
      
      if (secret && secret.length < 32) {
        console.warn('WARNING: JWT_SECRET length must be at least 32 characters in production');
      }
      if (secret === 'development-only-secret-change-me-please-32chars') {
        console.warn('WARNING: JWT_SECRET must not be the default secret in production');
      }
    }
  }
}

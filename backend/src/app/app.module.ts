import {
  DatabaseAlliesService,
  DatabaseBattleService,
  DatabaseJobsService,
  DatabasePlayerService,
  DatabaseTowerService,
  DatabaseWalletService,
  PrismaService,
  getPrismaClient,
} from '../database/index';
import { AppConfig, ConfigService } from '../config/index';
import { CombatService } from '../combat/index';
import { GameConfigService } from '../game-config/index';
import { HealthService } from '../health/index';
import { AuthService } from '../auth/index';

export class AppModule {
  readonly config: AppConfig;
  readonly healthService: HealthService;
  readonly prisma: any;
  readonly databasePlayerService: DatabasePlayerService;
  readonly databaseJobsService: DatabaseJobsService;
  readonly databaseTowerService: DatabaseTowerService;
  readonly databaseAlliesService: DatabaseAlliesService;
  readonly databaseWalletService: DatabaseWalletService;
  readonly databaseBattleService: DatabaseBattleService;
  readonly authService: AuthService;

  constructor(readonly configService = new ConfigService()) {
    this.config = this.configService.load();
    this.healthService = new HealthService(this.config);
    const dbUrl = this.config.databaseUrl || process.env.DATABASE_URL;
    const isPostgres = !!(dbUrl && !dbUrl.includes('campus-memory'));
    let prismaInstance: any;
    if (isPostgres) {
      try {
        prismaInstance = getPrismaClient({ databaseUrl: this.config.databaseUrl });
      } catch (err) {
        console.warn('Unable to initialize PrismaClient, falling back to in-memory PrismaService:', err);
        prismaInstance = new PrismaService();
      }
    } else {
      prismaInstance = new PrismaService();
    }
    this.prisma = prismaInstance;

    this.databasePlayerService = new DatabasePlayerService(this.prisma);
    this.databaseJobsService = new DatabaseJobsService(this.prisma);
    this.databaseTowerService = new DatabaseTowerService(this.prisma);
    this.databaseAlliesService = new DatabaseAlliesService(this.prisma);
    this.databaseWalletService = new DatabaseWalletService(this.prisma);

    const gameConfig = new GameConfigService().getConfig();
    const combat = new CombatService(gameConfig);
    this.databaseBattleService = new DatabaseBattleService(
      this.prisma,
      combat,
      gameConfig.pvpEnergyCost,
      gameConfig.stealRate,
      gameConfig.maxEnergy,
      gameConfig.energyRegenSeconds,
    );
    this.authService = new AuthService(this.databasePlayerService, this.config.jwtSecret ?? 'development-only-secret-change-me-please-32chars');
  }
}

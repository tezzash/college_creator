import {
  WalletRepository,
  PrismaWalletRepository,
  WalletEntity,
  WalletMutationResult,
  BankDepositResult,
  BankWithdrawResult,
  CashTransactionEntity,
  ListTransactionsOptions,
} from './repositories';
import { CashTransactionType, PrismaService } from './prisma.service';

export class DatabaseWalletService {
  private readonly walletRepository: WalletRepository;

  constructor(repositoryOrPrisma?: WalletRepository | PrismaService) {
    if (
      repositoryOrPrisma &&
      'getWallet' in repositoryOrPrisma &&
      typeof (repositoryOrPrisma as any).getWallet === 'function'
    ) {
      this.walletRepository = repositoryOrPrisma as WalletRepository;
    } else if (repositoryOrPrisma && 'player' in repositoryOrPrisma) {
      this.walletRepository = new PrismaWalletRepository(() => repositoryOrPrisma);
    } else {
      this.walletRepository = new PrismaWalletRepository();
    }
  }

  async getWallet(playerId: string): Promise<WalletEntity> {
    return this.walletRepository.getWallet(playerId);
  }

  async addCash(
    playerId: string,
    amount: number,
    type: CashTransactionType | string,
    reference?: string,
    idempotencyKey?: string
  ): Promise<WalletMutationResult> {
    return this.walletRepository.addCash(playerId, amount, type, reference, idempotencyKey);
  }

  async spendCash(
    playerId: string,
    amount: number,
    type: CashTransactionType | string,
    reference?: string,
    idempotencyKey?: string
  ): Promise<WalletMutationResult> {
    return this.walletRepository.spendCash(playerId, amount, type, reference, idempotencyKey);
  }

  async depositBank(playerId: string, amount: number): Promise<BankDepositResult> {
    return this.walletRepository.depositBank(playerId, amount);
  }

  async withdrawBank(playerId: string, amount: number): Promise<BankWithdrawResult> {
    return this.walletRepository.withdrawBank(playerId, amount);
  }

  async listTransactions(
    playerId: string,
    options?: ListTransactionsOptions
  ): Promise<CashTransactionEntity[]> {
    return this.walletRepository.listTransactions(playerId, options);
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    return this.walletRepository.deleteTestRecords(playerIds);
  }
}

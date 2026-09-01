import { getPrismaClient } from '../prisma-client';
import {
  BankDepositResult,
  BankWithdrawResult,
  CashTransactionEntity,
  ListTransactionsOptions,
  WalletEntity,
  WalletMutationResult,
  WalletRepository,
} from './wallet.repository.interface';
import { CashTransactionType } from '../prisma.service';

export class PrismaWalletRepository implements WalletRepository {
  private readonly getPrisma: () => any;

  constructor(prismaProvider?: () => any) {
    this.getPrisma = prismaProvider || (() => getPrismaClient());
  }

  private get prisma() {
    return this.getPrisma();
  }

  private mapTransaction(row: any): CashTransactionEntity {
    return {
      id: row.id,
      playerId: row.playerId,
      type: row.type,
      amount: typeof row.amount === 'number' ? row.amount : Number(row.amount),
      balanceAfter: typeof row.balanceAfter === 'number' ? row.balanceAfter : Number(row.balanceAfter),
      reference: row.reference || null,
      idempotencyKey: row.idempotencyKey || null,
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    };
  }

  private validateAmount(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Transaction amount must be a positive number.');
    }
  }

  async getWallet(playerId: string): Promise<WalletEntity> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, cash: true, bankCash: true, totalBankDeposited: true },
    });
    if (!player) throw new Error('Player not found.');

    return {
      playerId: player.id,
      cash: typeof player.cash === 'number' ? player.cash : Number(player.cash),
      bankCash: typeof player.bankCash === 'number' ? player.bankCash : Number(player.bankCash),
      totalBankDeposited:
        typeof player.totalBankDeposited === 'number'
          ? player.totalBankDeposited
          : Number(player.totalBankDeposited),
    };
  }

  async addCash(
    playerId: string,
    amount: number,
    type: CashTransactionType | string,
    reference?: string,
    idempotencyKey?: string
  ): Promise<WalletMutationResult> {
    this.validateAmount(amount);

    return this.prisma.$transaction(
      async (tx: any) => {
        if (idempotencyKey) {
          const existing = await tx.cashTransaction.findUnique({
            where: { idempotencyKey },
          });
          if (existing) {
            const player = await tx.player.findUniqueOrThrow({ where: { id: playerId } });
            return {
              player,
              transaction: this.mapTransaction(existing),
              previousBalance: Number(existing.balanceAfter) - Number(existing.amount),
              newBalance: Number(existing.balanceAfter),
            };
          }
        }

        const playerBefore = await tx.player.findUnique({
          where: { id: playerId },
          select: { id: true, cash: true },
        });
        if (!playerBefore) throw new Error('Player not found.');

        const previousBalance =
          typeof playerBefore.cash === 'number' ? playerBefore.cash : Number(playerBefore.cash);

        const updated = await tx.player.update({
          where: { id: playerId },
          data: { cash: { increment: amount } },
        });

        const newBalance =
          typeof updated.cash === 'number' ? updated.cash : Number(updated.cash);

        const txRow = await tx.cashTransaction.create({
          data: {
            playerId,
            type,
            amount,
            balanceAfter: updated.cash,
            reference: reference || null,
            idempotencyKey: idempotencyKey || null,
          },
        });

        return {
          player: updated,
          transaction: this.mapTransaction(txRow),
          previousBalance,
          newBalance,
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async spendCash(
    playerId: string,
    amount: number,
    type: CashTransactionType | string,
    reference?: string,
    idempotencyKey?: string
  ): Promise<WalletMutationResult> {
    this.validateAmount(amount);

    return this.prisma.$transaction(
      async (tx: any) => {
        if (idempotencyKey) {
          const existing = await tx.cashTransaction.findUnique({
            where: { idempotencyKey },
          });
          if (existing) {
            const player = await tx.player.findUniqueOrThrow({ where: { id: playerId } });
            return {
              player,
              transaction: this.mapTransaction(existing),
              previousBalance: Number(existing.balanceAfter) - Number(existing.amount),
              newBalance: Number(existing.balanceAfter),
            };
          }
        }

        const playerBefore = await tx.player.findUnique({
          where: { id: playerId },
          select: { id: true, cash: true },
        });
        if (!playerBefore) throw new Error('Player not found.');

        const previousBalance =
          typeof playerBefore.cash === 'number' ? playerBefore.cash : Number(playerBefore.cash);

        const charged = await tx.player.updateMany({
          where: { id: playerId, cash: { gte: amount } },
          data: { cash: { decrement: amount } },
        });

        if (charged.count !== 1) {
          throw new Error('Insufficient cash.');
        }

        const updated = await tx.player.findUniqueOrThrow({ where: { id: playerId } });
        const newBalance =
          typeof updated.cash === 'number' ? updated.cash : Number(updated.cash);

        const txRow = await tx.cashTransaction.create({
          data: {
            playerId,
            type,
            amount: -amount,
            balanceAfter: updated.cash,
            reference: reference || null,
            idempotencyKey: idempotencyKey || null,
          },
        });

        return {
          player: updated,
          transaction: this.mapTransaction(txRow),
          previousBalance,
          newBalance,
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async depositBank(playerId: string, amount: number): Promise<BankDepositResult> {
    this.validateAmount(amount);
    const intAmount = Math.floor(amount);
    if (intAmount < 10) throw new Error('Minimum deposit amount is $10.');

    const fee = Math.floor(intAmount * 0.05); // 5% banking security fee
    const netDeposit = intAmount - fee;

    return this.prisma.$transaction(
      async (tx: any) => {
        const charged = await tx.player.updateMany({
          where: { id: playerId, cash: { gte: intAmount } },
          data: {
            cash: { decrement: intAmount },
            bankCash: { increment: netDeposit },
            totalBankDeposited: { increment: netDeposit },
          },
        });

        if (charged.count !== 1) {
          const exists = await tx.player.findUnique({ where: { id: playerId }, select: { id: true } });
          if (!exists) throw new Error('Player not found.');
          throw new Error('Insufficient pocket cash to deposit.');
        }

        const updated = await tx.player.findUniqueOrThrow({ where: { id: playerId } });

        const [depositTx, feeTx] = await Promise.all([
          tx.cashTransaction.create({
            data: {
              playerId,
              type: CashTransactionType.BANK_DEPOSIT,
              amount: netDeposit,
              balanceAfter: updated.cash,
              reference: `Net Bank Deposit (Gross: $${intAmount})`,
            },
          }),
          tx.cashTransaction.create({
            data: {
              playerId,
              type: CashTransactionType.BANK_DEPOSIT_FEE,
              amount: -fee,
              balanceAfter: updated.cash,
              reference: '5% Bank Processing Fee',
            },
          }),
        ]);

        return {
          player: updated,
          depositedNet: netDeposit,
          fee,
          depositTransaction: this.mapTransaction(depositTx),
          feeTransaction: this.mapTransaction(feeTx),
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async withdrawBank(playerId: string, amount: number): Promise<BankWithdrawResult> {
    this.validateAmount(amount);
    const intAmount = Math.floor(amount);
    if (intAmount < 1) throw new Error('Minimum withdrawal amount is $1.');

    return this.prisma.$transaction(
      async (tx: any) => {
        const withdrawn = await tx.player.updateMany({
          where: { id: playerId, bankCash: { gte: intAmount } },
          data: {
            bankCash: { decrement: intAmount },
            cash: { increment: intAmount },
          },
        });

        if (withdrawn.count !== 1) {
          const exists = await tx.player.findUnique({ where: { id: playerId }, select: { id: true } });
          if (!exists) throw new Error('Player not found.');
          throw new Error('Insufficient funds in Campus Bank vault.');
        }

        const updated = await tx.player.findUniqueOrThrow({ where: { id: playerId } });

        const txRow = await tx.cashTransaction.create({
          data: {
            playerId,
            type: CashTransactionType.BANK_WITHDRAW,
            amount: intAmount,
            balanceAfter: updated.cash,
            reference: 'ATM Vault Withdrawal',
          },
        });

        return {
          player: updated,
          withdrawn: intAmount,
          transaction: this.mapTransaction(txRow),
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  async listTransactions(
    playerId: string,
    options?: ListTransactionsOptions
  ): Promise<CashTransactionEntity[]> {
    const where: any = { playerId };
    if (options?.type) {
      where.type = options.type;
    }

    const rows = await this.prisma.cashTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return rows.map((r: any) => this.mapTransaction(r));
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    if (!playerIds.length) return 0;
    const res = await this.prisma.cashTransaction.deleteMany({
      where: { playerId: { in: playerIds } },
    });
    return res.count;
  }
}

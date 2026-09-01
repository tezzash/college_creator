import { randomUUID } from 'crypto';
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

export class InMemoryWalletRepository implements WalletRepository {
  private readonly wallets = new Map<string, WalletEntity>();
  private readonly transactions: CashTransactionEntity[] = [];

  private validateAmount(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Transaction amount must be a positive number.');
    }
  }

  setWallet(playerId: string, wallet: Partial<WalletEntity>) {
    const current = this.wallets.get(playerId) || {
      playerId,
      cash: 1000,
      bankCash: 0,
      totalBankDeposited: 0,
    };
    this.wallets.set(playerId, { ...current, ...wallet });
  }

  async getWallet(playerId: string): Promise<WalletEntity> {
    let wallet = this.wallets.get(playerId);
    if (!wallet) {
      wallet = { playerId, cash: 1000, bankCash: 0, totalBankDeposited: 0 };
      this.wallets.set(playerId, wallet);
    }
    return { ...wallet };
  }

  async addCash(
    playerId: string,
    amount: number,
    type: CashTransactionType | string,
    reference?: string,
    idempotencyKey?: string
  ): Promise<WalletMutationResult> {
    this.validateAmount(amount);

    if (idempotencyKey) {
      const existing = this.transactions.find((t) => t.idempotencyKey === idempotencyKey);
      if (existing) {
        const wallet = await this.getWallet(playerId);
        return {
          player: { id: playerId, ...wallet },
          transaction: { ...existing },
          previousBalance: existing.balanceAfter - existing.amount,
          newBalance: existing.balanceAfter,
        };
      }
    }

    const wallet = await this.getWallet(playerId);
    const previousBalance = wallet.cash;
    wallet.cash += amount;
    this.wallets.set(playerId, wallet);

    const transaction: CashTransactionEntity = {
      id: randomUUID(),
      playerId,
      type,
      amount,
      balanceAfter: wallet.cash,
      reference: reference || null,
      idempotencyKey: idempotencyKey || null,
      createdAt: new Date(),
    };
    this.transactions.push(transaction);

    return {
      player: { id: playerId, ...wallet },
      transaction,
      previousBalance,
      newBalance: wallet.cash,
    };
  }

  async spendCash(
    playerId: string,
    amount: number,
    type: CashTransactionType | string,
    reference?: string,
    idempotencyKey?: string
  ): Promise<WalletMutationResult> {
    this.validateAmount(amount);

    if (idempotencyKey) {
      const existing = this.transactions.find((t) => t.idempotencyKey === idempotencyKey);
      if (existing) {
        const wallet = await this.getWallet(playerId);
        return {
          player: { id: playerId, ...wallet },
          transaction: { ...existing },
          previousBalance: existing.balanceAfter - existing.amount,
          newBalance: existing.balanceAfter,
        };
      }
    }

    const wallet = await this.getWallet(playerId);
    if (wallet.cash < amount) {
      throw new Error('Insufficient cash.');
    }

    const previousBalance = wallet.cash;
    wallet.cash -= amount;
    this.wallets.set(playerId, wallet);

    const transaction: CashTransactionEntity = {
      id: randomUUID(),
      playerId,
      type,
      amount: -amount,
      balanceAfter: wallet.cash,
      reference: reference || null,
      idempotencyKey: idempotencyKey || null,
      createdAt: new Date(),
    };
    this.transactions.push(transaction);

    return {
      player: { id: playerId, ...wallet },
      transaction,
      previousBalance,
      newBalance: wallet.cash,
    };
  }

  async depositBank(playerId: string, amount: number): Promise<BankDepositResult> {
    this.validateAmount(amount);
    const intAmount = Math.floor(amount);
    if (intAmount < 10) throw new Error('Minimum deposit amount is $10.');

    const fee = Math.floor(intAmount * 0.05);
    const netDeposit = intAmount - fee;

    const wallet = await this.getWallet(playerId);
    if (wallet.cash < intAmount) {
      throw new Error('Insufficient pocket cash to deposit.');
    }

    wallet.cash -= intAmount;
    wallet.bankCash += netDeposit;
    wallet.totalBankDeposited += netDeposit;
    this.wallets.set(playerId, wallet);

    const depositTransaction: CashTransactionEntity = {
      id: randomUUID(),
      playerId,
      type: CashTransactionType.BANK_DEPOSIT,
      amount: netDeposit,
      balanceAfter: wallet.cash,
      reference: `Net Bank Deposit (Gross: $${intAmount})`,
      idempotencyKey: null,
      createdAt: new Date(),
    };

    const feeTransaction: CashTransactionEntity = {
      id: randomUUID(),
      playerId,
      type: CashTransactionType.BANK_DEPOSIT_FEE,
      amount: -fee,
      balanceAfter: wallet.cash,
      reference: '5% Bank Processing Fee',
      idempotencyKey: null,
      createdAt: new Date(),
    };

    this.transactions.push(depositTransaction, feeTransaction);

    return {
      player: { id: playerId, ...wallet },
      depositedNet: netDeposit,
      fee,
      depositTransaction,
      feeTransaction,
    };
  }

  async withdrawBank(playerId: string, amount: number): Promise<BankWithdrawResult> {
    this.validateAmount(amount);
    const intAmount = Math.floor(amount);
    if (intAmount < 1) throw new Error('Minimum withdrawal amount is $1.');

    const wallet = await this.getWallet(playerId);
    if (wallet.bankCash < intAmount) {
      throw new Error('Insufficient funds in Campus Bank vault.');
    }

    wallet.bankCash -= intAmount;
    wallet.cash += intAmount;
    this.wallets.set(playerId, wallet);

    const transaction: CashTransactionEntity = {
      id: randomUUID(),
      playerId,
      type: CashTransactionType.BANK_WITHDRAW,
      amount: intAmount,
      balanceAfter: wallet.cash,
      reference: 'ATM Vault Withdrawal',
      idempotencyKey: null,
      createdAt: new Date(),
    };

    this.transactions.push(transaction);

    return {
      player: { id: playerId, ...wallet },
      withdrawn: intAmount,
      transaction,
    };
  }

  async listTransactions(
    playerId: string,
    options?: ListTransactionsOptions
  ): Promise<CashTransactionEntity[]> {
    let list = this.transactions.filter((t) => t.playerId === playerId);
    if (options?.type) {
      list = list.filter((t) => t.type === options.type);
    }
    list = list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    return list.slice(offset, offset + limit).map((t) => ({ ...t }));
  }

  async deleteTestRecords(playerIds: string[]): Promise<number> {
    if (!playerIds.length) return 0;
    const initialCount = this.transactions.length;
    const set = new Set(playerIds);
    for (let i = this.transactions.length - 1; i >= 0; i--) {
      if (set.has(this.transactions[i].playerId)) {
        this.transactions.splice(i, 1);
      }
    }
    for (const pid of playerIds) {
      this.wallets.delete(pid);
    }
    return initialCount - this.transactions.length;
  }
}

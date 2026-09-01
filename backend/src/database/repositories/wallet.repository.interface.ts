import { CashTransactionType } from '../prisma.service';

export interface WalletEntity {
  playerId: string;
  cash: number;
  bankCash: number;
  totalBankDeposited: number;
}

export interface CashTransactionEntity {
  id: string;
  playerId: string;
  type: CashTransactionType | string;
  amount: number;
  balanceAfter: number;
  reference?: string | null;
  idempotencyKey?: string | null;
  createdAt: Date;
}

export interface WalletMutationResult {
  player: any;
  transaction: CashTransactionEntity;
  previousBalance: number;
  newBalance: number;
}

export interface BankDepositResult {
  player: any;
  depositedNet: number;
  fee: number;
  depositTransaction: CashTransactionEntity;
  feeTransaction: CashTransactionEntity;
}

export interface BankWithdrawResult {
  player: any;
  withdrawn: number;
  transaction: CashTransactionEntity;
}

export interface ListTransactionsOptions {
  limit?: number;
  offset?: number;
  type?: CashTransactionType | string;
}

export interface WalletRepository {
  getWallet(playerId: string): Promise<WalletEntity>;
  addCash(
    playerId: string,
    amount: number,
    type: CashTransactionType | string,
    reference?: string,
    idempotencyKey?: string
  ): Promise<WalletMutationResult>;
  spendCash(
    playerId: string,
    amount: number,
    type: CashTransactionType | string,
    reference?: string,
    idempotencyKey?: string
  ): Promise<WalletMutationResult>;
  depositBank(playerId: string, amount: number): Promise<BankDepositResult>;
  withdrawBank(playerId: string, amount: number): Promise<BankWithdrawResult>;
  listTransactions(
    playerId: string,
    options?: ListTransactionsOptions
  ): Promise<CashTransactionEntity[]>;
  deleteTestRecords(playerIds: string[]): Promise<number>;
}

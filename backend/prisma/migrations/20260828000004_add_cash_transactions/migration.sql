-- CreateEnum
CREATE TYPE "CashTransactionType" AS ENUM (
    'STARTING_CASH',
    'JOB_REWARD',
    'TOWER_ROOM_UNLOCK',
    'ALLY_HIRE',
    'ALLY_UPGRADE',
    'ALLY_EVICT',
    'ALLY_EVICT_REFUND',
    'PVP_STEAL_CREDIT',
    'PVP_STEAL_DEBIT',
    'ADMIN_ADJUSTMENT',
    'BANK_DEPOSIT',
    'BANK_DEPOSIT_FEE',
    'BANK_WITHDRAW',
    'FURNITURE_PURCHASE',
    'COSMETIC_PURCHASE'
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "type" "CashTransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balance_after" DECIMAL(18,2) NOT NULL,
    "reference" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_transactions_idempotency_key_key" ON "cash_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "cash_transactions_player_id_created_at_idx" ON "cash_transactions"("player_id", "created_at");

-- CreateIndex
CREATE INDEX "cash_transactions_player_id_idx" ON "cash_transactions"("player_id");

-- CreateIndex
CREATE INDEX "cash_transactions_type_idx" ON "cash_transactions"("type");

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

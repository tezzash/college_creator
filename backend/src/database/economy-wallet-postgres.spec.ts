import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'crypto';
import { getPrismaClient } from './prisma-client';
import {
  PrismaWalletRepository,
  PrismaJobRepository,
  PrismaTowerRepository,
  PrismaAlliesRepository,
  PrismaFurnitureRepository,
} from './repositories';
import { DatabaseWalletService } from './database.wallet.service';
import { DatabasePlayerService } from './database.player.service';
import { DatabaseJobsService } from './database.jobs.service';
import { DatabaseTowerService } from './database.tower.service';
import { DatabaseAlliesService } from './database.allies.service';
import { CashTransactionType } from './prisma.service';

describe('Phase 14 — Economy & Wallet PostgreSQL Persistence', () => {
  const prisma = getPrismaClient();
  const walletRepo = new PrismaWalletRepository(() => prisma);
  const jobRepo = new PrismaJobRepository(() => prisma);
  const towerRepo = new PrismaTowerRepository(() => prisma);
  const alliesRepo = new PrismaAlliesRepository(() => prisma);
  const furnitureRepo = new PrismaFurnitureRepository(() => prisma);

  const walletService = new DatabaseWalletService(walletRepo);
  const playerService = new DatabasePlayerService(prisma as any, undefined, furnitureRepo, walletRepo);
  const jobsService = new DatabaseJobsService(jobRepo);
  const towerService = new DatabaseTowerService(towerRepo);
  const alliesService = new DatabaseAlliesService(alliesRepo);

  const createdPlayerIds: string[] = [];
  const createdJobIds: string[] = [];

  const createTestStudent = async (prefix: string, startingCash = 1000) => {
    const id = `test-econ-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const username = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const email = `${username.toLowerCase()}@campus.test`;

    const player = await playerService.create({
      id,
      username,
      email,
      passwordHash: 'argon2-test-hash',
      cash: startingCash,
    });

    createdPlayerIds.push(id);
    return player;
  };

  before(async () => {
    await prisma.$queryRawUnsafe('SELECT 1');
  });

  after(async () => {
    if (createdPlayerIds.length > 0) {
      await walletRepo.deleteTestRecords(createdPlayerIds).catch(() => {});
      await furnitureRepo.deleteTestRecords(createdPlayerIds).catch(() => {});
      await alliesRepo.deleteTestRecords(createdPlayerIds).catch(() => {});
      await towerRepo.deleteTestRecords(createdPlayerIds).catch(() => {});
      await jobRepo.deleteTestRecords(createdPlayerIds).catch(() => {});
      await prisma.player.deleteMany({
        where: { id: { in: createdPlayerIds } },
      }).catch(() => {});
    }

    if (createdJobIds.length > 0) {
      await prisma.job.deleteMany({
        where: { id: { in: createdJobIds } },
      }).catch(() => {});
    }
  });

  it('1. Starting Balance: initializes player with cash and zero bank balance, creates STARTING_CASH transaction', async () => {
    const student = await createTestStudent('init', 1250);
    assert.equal(student.cash, 1250);
    assert.equal(student.bankCash, 0);

    const wallet = await walletService.getWallet(student.id);
    assert.equal(wallet.cash, 1250);
    assert.equal(wallet.bankCash, 0);
    assert.equal(wallet.totalBankDeposited, 0);

    const txs = await walletService.listTransactions(student.id);
    assert.ok(txs.length >= 1);
    const startTx = txs.find((t) => t.type === CashTransactionType.STARTING_CASH || t.type === 'STARTING_CASH');
    assert.ok(startTx);
    assert.equal(startTx?.amount, 1250);
    assert.equal(startTx?.balanceAfter, 1250);
  });

  it('2. Atomic Add Cash: increments cash balance and creates transaction record', async () => {
    const student = await createTestStudent('add_cash', 500);
    const result = await walletService.addCash(
      student.id,
      250,
      CashTransactionType.ADMIN_ADJUSTMENT,
      'Campus scholarship stipend'
    );

    assert.equal(result.previousBalance, 500);
    assert.equal(result.newBalance, 750);
    assert.equal(result.transaction.amount, 250);
    assert.equal(result.transaction.balanceAfter, 750);
    assert.equal(result.transaction.reference, 'Campus scholarship stipend');

    const wallet = await walletService.getWallet(student.id);
    assert.equal(wallet.cash, 750);
  });

  it('3. Atomic Spend Cash: decrements balance and records negative amount in ledger', async () => {
    const student = await createTestStudent('spend_cash', 800);
    const result = await walletService.spendCash(
      student.id,
      300,
      CashTransactionType.COSMETIC_PURCHASE,
      'Campus Bookstore purchase'
    );

    assert.equal(result.previousBalance, 800);
    assert.equal(result.newBalance, 500);
    assert.equal(result.transaction.amount, -300);
    assert.equal(result.transaction.balanceAfter, 500);

    const wallet = await walletService.getWallet(student.id);
    assert.equal(wallet.cash, 500);
  });

  it('4. Insufficient Funds: rejects spend when balance too low and leaves balance untouched', async () => {
    const student = await createTestStudent('insufficient', 200);

    await assert.rejects(
      () => walletService.spendCash(student.id, 500, CashTransactionType.COSMETIC_PURCHASE),
      /Insufficient cash\./
    );

    const wallet = await walletService.getWallet(student.id);
    assert.equal(wallet.cash, 200);
  });

  it('5. Concurrency Spend: 5 concurrent $200 spends against $500 balance result in 2 successes and 3 failures', async () => {
    const student = await createTestStudent('concur_spend', 500);

    const spendPromises = Array.from({ length: 5 }).map((_, i) =>
      walletService
        .spendCash(student.id, 200, CashTransactionType.COSMETIC_PURCHASE, `Concurrent attempt ${i + 1}`)
        .then(() => ({ success: true }))
        .catch((err) => ({ success: false, error: err.message }))
    );

    const results = await Promise.all(spendPromises);
    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    assert.equal(successes.length, 2);
    assert.equal(failures.length, 3);

    const finalWallet = await walletService.getWallet(student.id);
    assert.equal(finalWallet.cash, 100);
    assert.ok(finalWallet.cash >= 0);
  });

  it('6. Bank Deposit: deposits cash into vault with 5% security fee and two ledger entries', async () => {
    const student = await createTestStudent('bank_dep', 2000);

    const result = await walletService.depositBank(student.id, 1000);
    assert.equal(result.fee, 50);
    assert.equal(result.depositedNet, 950);

    const wallet = await walletService.getWallet(student.id);
    assert.equal(wallet.cash, 1000);
    assert.equal(wallet.bankCash, 950);
    assert.equal(wallet.totalBankDeposited, 950);

    const txs = await walletService.listTransactions(student.id);
    const depositTx = txs.find((t) => t.type === CashTransactionType.BANK_DEPOSIT || t.type === 'BANK_DEPOSIT');
    const feeTx = txs.find((t) => t.type === CashTransactionType.BANK_DEPOSIT_FEE || t.type === 'BANK_DEPOSIT_FEE');

    assert.ok(depositTx);
    assert.equal(depositTx?.amount, 950);
    assert.ok(feeTx);
    assert.equal(feeTx?.amount, -50);
  });

  it('7. Bank Deposit Validation: rejects deposit under $10 and deposit exceeding cash', async () => {
    const student = await createTestStudent('dep_val', 100);

    await assert.rejects(
      () => walletService.depositBank(student.id, 9),
      /Minimum deposit amount is \$10\./
    );

    await assert.rejects(
      () => walletService.depositBank(student.id, 500),
      /Insufficient pocket cash to deposit\./
    );
  });

  it('8. Bank Withdrawal: withdraws cash from vault to pocket atomically and logs BANK_WITHDRAW', async () => {
    const student = await createTestStudent('bank_wth', 2000);

    await walletService.depositBank(student.id, 1000); // 950 in bank, 1000 in pocket

    const withdrawRes = await walletService.withdrawBank(student.id, 400);
    assert.equal(withdrawRes.withdrawn, 400);

    const wallet = await walletService.getWallet(student.id);
    assert.equal(wallet.bankCash, 550);
    assert.equal(wallet.cash, 1400);

    const txs = await walletService.listTransactions(student.id);
    const withdrawTx = txs.find((t) => t.type === CashTransactionType.BANK_WITHDRAW || t.type === 'BANK_WITHDRAW');
    assert.ok(withdrawTx);
    assert.equal(withdrawTx?.amount, 400);
  });

  it('9. Bank Withdrawal Validation: rejects withdrawal exceeding vault funds', async () => {
    const student = await createTestStudent('bank_wth_ex', 1000);
    await walletService.depositBank(student.id, 500); // 475 in bank

    await assert.rejects(
      () => walletService.withdrawBank(student.id, 600),
      /Insufficient funds in Campus Bank vault\./
    );
  });

  it('10. Concurrent Bank Withdrawal: prevents overdraft and preserves balance invariant', async () => {
    const student = await createTestStudent('concur_wth', 1500);
    await walletService.depositBank(student.id, 500); // 475 in bank, 1000 in cash

    const withdrawPromises = [
      walletService.withdrawBank(student.id, 200).then(() => true).catch(() => false),
      walletService.withdrawBank(student.id, 200).then(() => true).catch(() => false),
      walletService.withdrawBank(student.id, 200).then(() => true).catch(() => false),
      walletService.withdrawBank(student.id, 200).then(() => true).catch(() => false),
    ];

    const results = await Promise.all(withdrawPromises);
    const successCount = results.filter(Boolean).length;

    assert.ok(successCount <= 2);
    assert.ok(successCount >= 1);

    const finalWallet = await walletService.getWallet(student.id);
    assert.equal(finalWallet.bankCash, 475 - successCount * 200);
    assert.equal(finalWallet.cash, 1000 + successCount * 200);
    assert.ok(finalWallet.bankCash >= 0);
  });

  it('11. Job Rewards Persistence: adds cash and records JOB_REWARD transaction', async () => {
    const student = await createTestStudent('job_econ', 500);

    const jobId = `job-test-${Date.now()}`;
    createdJobIds.push(jobId);
    await jobsService.createJob({
      id: jobId,
      name: 'Library Archival Sprint',
      durationSeconds: 1,
      rewardCash: 350,
    });

    const active = await jobsService.start(student.id, jobId);
    await new Promise((r) => setTimeout(r, 1100));

    const collectRes = await jobsService.collect(student.id, active.id);
    assert.equal(collectRes.rewardCash, 350);
    assert.equal(collectRes.player.cash, 850);

    const txs = await walletService.listTransactions(student.id);
    const jobTx = txs.find((t) => t.type === CashTransactionType.JOB_REWARD || t.type === 'JOB_REWARD');
    assert.ok(jobTx);
    assert.equal(jobTx?.amount, 350);
    assert.equal(jobTx?.balanceAfter, 850);
  });

  it('12. Tower Room Unlock Persistence: deducts cash and logs TOWER_ROOM_UNLOCK transaction', async () => {
    const student = await createTestStudent('tower_econ', 2000);

    const unlockedRoom = await towerService.unlock(student.id, { roomNumber: 2 });
    assert.equal(unlockedRoom.unlocked, true);
    assert.equal(unlockedRoom.roomNumber, 2);

    const wallet = await walletService.getWallet(student.id);
    assert.equal(wallet.cash, 2000 - unlockedRoom.unlockCost);

    const txs = await walletService.listTransactions(student.id);
    const roomTx = txs.find((t) => t.type === CashTransactionType.TOWER_ROOM_UNLOCK || t.type === 'TOWER_ROOM_UNLOCK');
    assert.ok(roomTx);
    assert.equal(roomTx?.amount, -unlockedRoom.unlockCost);
  });

  it('13. Allies Economy Persistence: deducts for hire & upgrade, refunds 50% on eviction with ledger', async () => {
    const student = await createTestStudent('ally_econ', 5000);
    const suites = await towerService.list(student.id);
    const room1 = suites.find((s) => s.roomNumber === 1)!;

    // 1. Hire
    const alliesList = await alliesService.listAllies();
    const ally = alliesList[0];
    const hireRes = await alliesService.hire(student.id, ally.id, room1.id);
    assert.equal(hireRes.occupant.level, 1);

    const cashAfterHire = 5000 - ally.hireCost;
    const walletAfterHire = await walletService.getWallet(student.id);
    assert.equal(walletAfterHire.cash, cashAfterHire);

    // 2. Upgrade
    const upgradeRes = await alliesService.upgrade(student.id, room1.id);
    assert.equal(upgradeRes.newLevel, 2);

    const cashAfterUpgrade = cashAfterHire - upgradeRes.costPaid;
    const walletAfterUpgrade = await walletService.getWallet(student.id);
    assert.equal(walletAfterUpgrade.cash, cashAfterUpgrade);

    // 3. Evict with refund
    const evictRes = await alliesService.evict(student.id, room1.id);
    const expectedRefund = Math.floor((ally.hireCost + upgradeRes.costPaid) * 0.5);
    assert.equal(evictRes.refundAmount, expectedRefund);

    const walletAfterEvict = await walletService.getWallet(student.id);
    assert.equal(walletAfterEvict.cash, cashAfterUpgrade + expectedRefund);

    // Ledger verification
    const txs = await walletService.listTransactions(student.id);
    assert.ok(txs.some((t) => t.type === CashTransactionType.ALLY_HIRE || t.type === 'ALLY_HIRE'));
    assert.ok(txs.some((t) => t.type === CashTransactionType.ALLY_UPGRADE || t.type === 'ALLY_UPGRADE'));
    assert.ok(txs.some((t) => t.type === CashTransactionType.ALLY_EVICT_REFUND || t.type === 'ALLY_EVICT_REFUND' || t.type === 'ALLY_EVICT'));
  });

  it('14. Dorm Furniture Persistence: deducts cash and logs FURNITURE_PURCHASE transaction', async () => {
    const student = await createTestStudent('furn_econ', 3000);
    const catalog = await furnitureRepo.getCatalog();
    const item = catalog[0];

    const result = await furnitureRepo.buyFurniture(student.id, item.id);
    assert.equal(result.furniture.isOwned, true);

    const wallet = await walletService.getWallet(student.id);
    assert.equal(wallet.cash, 3000 - item.cost);

    const txs = await walletService.listTransactions(student.id);
    const furnTx = txs.find((t) => t.type === CashTransactionType.FURNITURE_PURCHASE || t.type === 'FURNITURE_PURCHASE');
    assert.ok(furnTx);
    assert.equal(furnTx?.amount, -item.cost);
  });

  it('15. PvP Steal Cash Transfer: updates wallets and logs debit/credit transactions', async () => {
    const attacker = await createTestStudent('pvp_atk', 1000);
    const defender = await createTestStudent('pvp_def', 2000);

    const stealAmount = 250;
    await walletService.spendCash(
      defender.id,
      stealAmount,
      CashTransactionType.PVP_STEAL_DEBIT,
      `Plundered by ${attacker.username}`
    );
    await walletService.addCash(
      attacker.id,
      stealAmount,
      CashTransactionType.PVP_STEAL_CREDIT,
      `Plundered from ${defender.username}`
    );

    const attackerWallet = await walletService.getWallet(attacker.id);
    const defenderWallet = await walletService.getWallet(defender.id);

    assert.equal(attackerWallet.cash, 1250);
    assert.equal(defenderWallet.cash, 1750);

    const attackerTxs = await walletService.listTransactions(attacker.id);
    const defenderTxs = await walletService.listTransactions(defender.id);

    assert.ok(attackerTxs.some((t) => t.type === CashTransactionType.PVP_STEAL_CREDIT || t.type === 'PVP_STEAL_CREDIT'));
    assert.ok(defenderTxs.some((t) => t.type === CashTransactionType.PVP_STEAL_DEBIT || t.type === 'PVP_STEAL_DEBIT'));
  });

  it('16. Idempotency Key: prevents duplicate financial mutations', async () => {
    const student = await createTestStudent('idempotent', 1000);
    const idempotencyKey = `idem-${randomUUID()}`;

    const res1 = await walletService.addCash(
      student.id,
      200,
      CashTransactionType.JOB_REWARD,
      'Quest bonus reward',
      idempotencyKey
    );
    assert.equal(res1.newBalance, 1200);

    const res2 = await walletService.addCash(
      student.id,
      200,
      CashTransactionType.JOB_REWARD,
      'Quest bonus reward',
      idempotencyKey
    );
    assert.equal(res2.newBalance, 1200);

    const wallet = await walletService.getWallet(student.id);
    assert.equal(wallet.cash, 1200);
  });

  it('17. History & Filtering: correctly filters by type and supports pagination', async () => {
    const student = await createTestStudent('hist_filter', 2000);

    await walletService.addCash(student.id, 100, CashTransactionType.JOB_REWARD);
    await walletService.addCash(student.id, 200, CashTransactionType.ADMIN_ADJUSTMENT);
    await walletService.depositBank(student.id, 500);

    const jobTxs = await walletService.listTransactions(student.id, {
      type: CashTransactionType.JOB_REWARD,
    });
    assert.ok(jobTxs.every((t) => t.type === CashTransactionType.JOB_REWARD || t.type === 'JOB_REWARD'));

    const page1 = await walletService.listTransactions(student.id, { limit: 2, offset: 0 });
    const page2 = await walletService.listTransactions(student.id, { limit: 2, offset: 2 });

    assert.ok(page1.length <= 2);
    assert.ok(page2.length <= 2);
    if (page1.length > 0 && page2.length > 0) {
      assert.notEqual(page1[0].id, page2[0].id);
    }
  });
});

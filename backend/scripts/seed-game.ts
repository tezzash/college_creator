import { PrismaClient } from '@prisma/client';
import { CANONICAL_BOTS } from '../src/database/canonical-bots';

const prisma = new PrismaClient();

async function main() {
  const jobs = [
    { id: 'job-study', name: 'Study Session', durationSeconds: 30, rewardCash: 100 },
    { id: 'job-freelance', name: 'Freelance Gig', durationSeconds: 90, rewardCash: 300 },
    { id: 'job-night-shift', name: 'Night Shift', durationSeconds: 180, rewardCash: 750 },
  ];
  for (const job of jobs) {
    await prisma.job.upsert({ where: { id: job.id }, update: job, create: job });
  }

  for (const bot of CANONICAL_BOTS) {
    await prisma.player.upsert({
      where: { id: bot.id },
      update: {
        username: bot.username,
        email: bot.email,
        isBot: true,
        cash: bot.cash,
        bankCash: bot.bankCash,
        energy: bot.energy,
        morale: bot.morale,
        power: bot.power,
        smartness: bot.smartness,
        winStreak: bot.winStreak,
        highestStreak: bot.highestStreak,
        totalPvPWins: bot.totalPvPWins,
        totalPvPLosses: bot.totalPvPLosses,
        totalPlundered: bot.totalPlundered,
        equippedTitle: bot.equippedTitle,
        avatarId: bot.avatarId,
        avatarFrame: bot.avatarFrame,
        avatarOutfit: bot.avatarOutfit,
        avatarAccessory: bot.avatarAccessory,
        customBio: bot.customBio,
        claimedMilestones: bot.claimedMilestones,
        totalJobsCompleted: bot.totalJobsCompleted,
        totalBankDeposited: bot.totalBankDeposited,
      },
      create: {
        id: bot.id,
        username: bot.username,
        email: bot.email,
        passwordHash: bot.passwordHash,
        isBot: true,
        cash: bot.cash,
        bankCash: bot.bankCash,
        energy: bot.energy,
        morale: bot.morale,
        power: bot.power,
        smartness: bot.smartness,
        winStreak: bot.winStreak,
        highestStreak: bot.highestStreak,
        totalPvPWins: bot.totalPvPWins,
        totalPvPLosses: bot.totalPvPLosses,
        totalPlundered: bot.totalPlundered,
        equippedTitle: bot.equippedTitle,
        avatarId: bot.avatarId,
        avatarFrame: bot.avatarFrame,
        avatarOutfit: bot.avatarOutfit,
        avatarAccessory: bot.avatarAccessory,
        customBio: bot.customBio,
        claimedMilestones: bot.claimedMilestones,
        totalJobsCompleted: bot.totalJobsCompleted,
        totalBankDeposited: bot.totalBankDeposited,
      },
    });
  }

  console.log(`Seeded ${jobs.length} jobs and ${CANONICAL_BOTS.length} canonical bots.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

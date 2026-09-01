-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "cash" DECIMAL(18,2) NOT NULL DEFAULT 1000,
    "bank_cash" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "energy" INTEGER NOT NULL DEFAULT 10,
    "morale" INTEGER NOT NULL DEFAULT 10,
    "power" INTEGER NOT NULL DEFAULT 0,
    "smartness" INTEGER NOT NULL DEFAULT 0,
    "win_streak" INTEGER NOT NULL DEFAULT 0,
    "highest_streak" INTEGER NOT NULL DEFAULT 0,
    "total_pvp_wins" INTEGER NOT NULL DEFAULT 0,
    "total_pvp_losses" INTEGER NOT NULL DEFAULT 0,
    "total_plundered" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "equipped_title" TEXT NOT NULL DEFAULT 'Freshman Novice',
    "avatar_id" TEXT NOT NULL DEFAULT 'avatar-coder',
    "avatar_aura" TEXT NOT NULL DEFAULT 'aura-none',
    "avatar_frame" TEXT NOT NULL DEFAULT 'frame-neon',
    "avatar_outfit" TEXT NOT NULL DEFAULT 'outfit-hoodie',
    "avatar_headwear" TEXT NOT NULL DEFAULT 'headwear-none',
    "avatar_accessory" TEXT NOT NULL DEFAULT 'acc-laptop',
    "owned_cosmetics" TEXT[] DEFAULT ARRAY['avatar-coder', 'avatar-varsity', 'avatar-scholar', 'avatar-freshman', 'aura-none', 'outfit-hoodie', 'headwear-none', 'acc-laptop', 'frame-neon']::TEXT[],
    "custom_bio" TEXT NOT NULL DEFAULT 'Ready to conquer the campus empire! 💻💸',
    "claimed_milestones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total_jobs_completed" INTEGER NOT NULL DEFAULT 0,
    "total_bank_deposited" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "daily_streak" INTEGER NOT NULL DEFAULT 1,
    "daily_quests_date" TEXT,
    "daily_quests_state" JSONB,
    "pinned_until" TIMESTAMP(3),
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "last_energy_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_morale_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_username_key" ON "players"("username");

-- CreateIndex
CREATE UNIQUE INDEX "players_email_key" ON "players"("email");

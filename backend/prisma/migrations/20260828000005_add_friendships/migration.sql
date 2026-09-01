-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BattleAction" AS ENUM ('FIGHT', 'PUNCH', 'PRANK', 'SPY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "battles" (
    "id" TEXT NOT NULL,
    "attacker_id" TEXT NOT NULL,
    "defender_id" TEXT NOT NULL,
    "action" "BattleAction" NOT NULL,
    "success" BOOLEAN NOT NULL,
    "cash_stolen" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "friendships" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "last_gift_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "battles_attacker_id_created_at_idx" ON "battles"("attacker_id", "created_at");
CREATE INDEX IF NOT EXISTS "battles_defender_id_created_at_idx" ON "battles"("defender_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_sender_id_receiver_id_key" ON "friendships"("sender_id", "receiver_id");
CREATE INDEX IF NOT EXISTS "friendships_sender_id_status_idx" ON "friendships"("sender_id", "status");
CREATE INDEX IF NOT EXISTS "friendships_receiver_id_status_idx" ON "friendships"("receiver_id", "status");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "battles" ADD CONSTRAINT "battles_attacker_id_fkey" FOREIGN KEY ("attacker_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "battles" ADD CONSTRAINT "battles_defender_id_fkey" FOREIGN KEY ("defender_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "friendships" ADD CONSTRAINT "friendships_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "friendships" ADD CONSTRAINT "friendships_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "tower_rooms" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "room_number" INTEGER NOT NULL,
    "unlock_cost" DECIMAL(18,2) NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tower_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_occupants" (
    "id" TEXT NOT NULL,
    "tower_room_id" TEXT NOT NULL,
    "ally_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "total_invested" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "hired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_occupants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_dorm_furniture" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "furniture_id" TEXT NOT NULL,
    "equipped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_dorm_furniture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tower_rooms_player_id_room_number_key" ON "tower_rooms"("player_id", "room_number");

-- CreateIndex
CREATE INDEX "tower_rooms_player_id_idx" ON "tower_rooms"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_occupants_tower_room_id_key" ON "room_occupants"("tower_room_id");

-- CreateIndex
CREATE INDEX "room_occupants_ally_id_idx" ON "room_occupants"("ally_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_dorm_furniture_player_id_furniture_id_key" ON "player_dorm_furniture"("player_id", "furniture_id");

-- CreateIndex
CREATE INDEX "player_dorm_furniture_player_id_idx" ON "player_dorm_furniture"("player_id");

-- AddForeignKey
ALTER TABLE "tower_rooms" ADD CONSTRAINT "tower_rooms_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_occupants" ADD CONSTRAINT "room_occupants_tower_room_id_fkey" FOREIGN KEY ("tower_room_id") REFERENCES "tower_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_dorm_furniture" ADD CONSTRAINT "player_dorm_furniture_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

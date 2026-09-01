-- Phase 20: Supabase Row Level Security & Database Hardening Migration

-- 1. Helper function to extract current player identity from Supabase JWT claims or session context
CREATE OR REPLACE FUNCTION public.current_player_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'),
    nullif(current_setting('app.current_player_id', true), '')
  )::text;
$$;

-- 2. Enable Row Level Security on all 10 domain tables
ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "friendships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "active_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tower_rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "room_occupants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "player_dorm_furniture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battles" ENABLE ROW LEVEL SECURITY;

-- 3. PLAYERS Policies
-- Public/Authenticated players can read player rows (backend strips sensitive fields like email and password_hash in DTOs)
CREATE POLICY "players_select_policy" ON "players"
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "players_insert_policy" ON "players"
  FOR INSERT TO authenticated
  WITH CHECK (id = public.current_player_id());

CREATE POLICY "players_update_policy" ON "players"
  FOR UPDATE TO authenticated
  USING (id = public.current_player_id())
  WITH CHECK (id = public.current_player_id());

-- 4. MESSAGES Policies
CREATE POLICY "messages_select_policy" ON "messages"
  FOR SELECT TO authenticated
  USING (sender_id = public.current_player_id() OR receiver_id = public.current_player_id());

CREATE POLICY "messages_insert_policy" ON "messages"
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = public.current_player_id());

CREATE POLICY "messages_update_policy" ON "messages"
  FOR UPDATE TO authenticated
  USING (receiver_id = public.current_player_id() OR sender_id = public.current_player_id())
  WITH CHECK (receiver_id = public.current_player_id() OR sender_id = public.current_player_id());

CREATE POLICY "messages_delete_policy" ON "messages"
  FOR DELETE TO authenticated
  USING (sender_id = public.current_player_id() OR receiver_id = public.current_player_id());

-- 5. FRIENDSHIPS Policies
CREATE POLICY "friendships_select_policy" ON "friendships"
  FOR SELECT TO authenticated
  USING (sender_id = public.current_player_id() OR receiver_id = public.current_player_id());

CREATE POLICY "friendships_insert_policy" ON "friendships"
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = public.current_player_id());

CREATE POLICY "friendships_update_policy" ON "friendships"
  FOR UPDATE TO authenticated
  USING (receiver_id = public.current_player_id() OR sender_id = public.current_player_id())
  WITH CHECK (receiver_id = public.current_player_id() OR sender_id = public.current_player_id());

CREATE POLICY "friendships_delete_policy" ON "friendships"
  FOR DELETE TO authenticated
  USING (sender_id = public.current_player_id() OR receiver_id = public.current_player_id());

-- 6. JOBS (Catalog) Policies
CREATE POLICY "jobs_select_policy" ON "jobs"
  FOR SELECT TO authenticated, anon
  USING (true);

-- 7. ACTIVE_JOBS Policies
CREATE POLICY "active_jobs_select_policy" ON "active_jobs"
  FOR SELECT TO authenticated
  USING (player_id = public.current_player_id());

CREATE POLICY "active_jobs_insert_policy" ON "active_jobs"
  FOR INSERT TO authenticated
  WITH CHECK (player_id = public.current_player_id());

CREATE POLICY "active_jobs_update_policy" ON "active_jobs"
  FOR UPDATE TO authenticated
  USING (player_id = public.current_player_id())
  WITH CHECK (player_id = public.current_player_id());

CREATE POLICY "active_jobs_delete_policy" ON "active_jobs"
  FOR DELETE TO authenticated
  USING (player_id = public.current_player_id());

-- 8. TOWER_ROOMS Policies
CREATE POLICY "tower_rooms_select_policy" ON "tower_rooms"
  FOR SELECT TO authenticated
  USING (player_id = public.current_player_id());

CREATE POLICY "tower_rooms_insert_policy" ON "tower_rooms"
  FOR INSERT TO authenticated
  WITH CHECK (player_id = public.current_player_id());

CREATE POLICY "tower_rooms_update_policy" ON "tower_rooms"
  FOR UPDATE TO authenticated
  USING (player_id = public.current_player_id())
  WITH CHECK (player_id = public.current_player_id());

CREATE POLICY "tower_rooms_delete_policy" ON "tower_rooms"
  FOR DELETE TO authenticated
  USING (player_id = public.current_player_id());

-- 9. ROOM_OCCUPANTS Policies
CREATE POLICY "room_occupants_select_policy" ON "room_occupants"
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tower_rooms 
    WHERE tower_rooms.id = room_occupants.tower_room_id 
    AND tower_rooms.player_id = public.current_player_id()
  ));

CREATE POLICY "room_occupants_insert_policy" ON "room_occupants"
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tower_rooms 
    WHERE tower_rooms.id = room_occupants.tower_room_id 
    AND tower_rooms.player_id = public.current_player_id()
  ));

CREATE POLICY "room_occupants_update_policy" ON "room_occupants"
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tower_rooms 
    WHERE tower_rooms.id = room_occupants.tower_room_id 
    AND tower_rooms.player_id = public.current_player_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tower_rooms 
    WHERE tower_rooms.id = room_occupants.tower_room_id 
    AND tower_rooms.player_id = public.current_player_id()
  ));

CREATE POLICY "room_occupants_delete_policy" ON "room_occupants"
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tower_rooms 
    WHERE tower_rooms.id = room_occupants.tower_room_id 
    AND tower_rooms.player_id = public.current_player_id()
  ));

-- 10. PLAYER_DORM_FURNITURE Policies
CREATE POLICY "player_dorm_furniture_select_policy" ON "player_dorm_furniture"
  FOR SELECT TO authenticated
  USING (player_id = public.current_player_id());

CREATE POLICY "player_dorm_furniture_insert_policy" ON "player_dorm_furniture"
  FOR INSERT TO authenticated
  WITH CHECK (player_id = public.current_player_id());

CREATE POLICY "player_dorm_furniture_update_policy" ON "player_dorm_furniture"
  FOR UPDATE TO authenticated
  USING (player_id = public.current_player_id())
  WITH CHECK (player_id = public.current_player_id());

CREATE POLICY "player_dorm_furniture_delete_policy" ON "player_dorm_furniture"
  FOR DELETE TO authenticated
  USING (player_id = public.current_player_id());

-- 11. CASH_TRANSACTIONS Policies (Financial Ledger - Read own only, Write strictly server-authoritative)
CREATE POLICY "cash_transactions_select_policy" ON "cash_transactions"
  FOR SELECT TO authenticated
  USING (player_id = public.current_player_id());

-- 12. BATTLES Policies (PvP - Read involved battles only, Write strictly server-authoritative)
CREATE POLICY "battles_select_policy" ON "battles"
  FOR SELECT TO authenticated
  USING (attacker_id = public.current_player_id() OR defender_id = public.current_player_id());

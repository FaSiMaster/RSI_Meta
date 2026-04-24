-- =============================================================================
-- RSI VR Tool — Migration: rsi_kurse Tabelle + RLS-Policies
-- Datum: 2026-04-24 · Version: v0.6.3 (Kurs-Supabase-Sync)
-- =============================================================================
--
-- Zweck:
--   Kurse (Zugangscode-geschuetzte Nutzergruppen) wurden bis v0.6.2 nur in
--   localStorage gespeichert. Folge: Admin legt Kurs an → nur im Admin-Browser
--   sichtbar. Teilnehmer-Devices kennen den Kurs-Code nicht. Diese Migration
--   hebt das auf, indem Kurse analog zu Topics/Scenes/Deficits in Supabase
--   gehalten werden.
--
-- Ausfuehrung:
--   1. Supabase-Dashboard → SQL Editor
--   2. Gesamtes Skript einfuegen und "Run"
--   3. Ueber Advisor pruefen: keine Warnungen fuer rsi_kurse
--   4. Edge Function `admin-write` redeployen (v0.6.3 hat rsi_kurse in
--      ALLOWED_TABLES + TABLE_SCHEMAS)
--
-- Rueckgaengig:
--   DROP TABLE IF EXISTS public.rsi_kurse CASCADE;
-- =============================================================================

-- Tabelle anlegen (analog zu rsi_topics/rsi_scenes/rsi_deficits)
CREATE TABLE IF NOT EXISTS public.rsi_kurse (
  id          text PRIMARY KEY,
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.rsi_kurse ENABLE ROW LEVEL SECURITY;

-- Policy: anon + authenticated duerfen NUR lesen (Schreibzugriffe laufen
-- ausschliesslich ueber Edge Function admin-write mit service_role, analog
-- zu den anderen Content-Tabellen seit v0.6.0).
DROP POLICY IF EXISTS "rsi_kurse_select_all" ON public.rsi_kurse;
CREATE POLICY "rsi_kurse_select_all"
  ON public.rsi_kurse
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Index auf updated_at (fuer eventuelle Inkrement-Syncs spaeter)
CREATE INDEX IF NOT EXISTS rsi_kurse_updated_at_idx
  ON public.rsi_kurse (updated_at DESC);

-- =============================================================================
-- Verifikation
-- =============================================================================
-- Erwartung: 1 Zeile, cmd = SELECT, roles = {anon, authenticated}
--
--   SELECT tablename, policyname, cmd, roles FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'rsi_kurse';
--
-- =============================================================================

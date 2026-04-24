-- =============================================================================
-- RSI VR Tool — Migration: Kurs-Passwort-Haertung (Sprint 3, Schritt 3)
-- Datum: 2026-04-24 · Version: v0.7.0 (Server-Salt-Pfeffern, Hard-Cutover)
-- =============================================================================
--
-- Zweck:
--   Bis v0.6.x wurden Kurs-Passwoerter clientseitig mit reinem SHA-256 (ohne
--   Salt, ohne Pepper) gehashed und als `data.passwort = "kp:<hash>"` in
--   rsi_kurse abgelegt. RLS erlaubte anon SELECT → jeder Teilnehmer konnte
--   den Hash der gesamten Kurs-Tabelle lesen und offline gegen Rainbow-Tables
--   oder schwache Passwoerter ausfuehren.
--
-- Diese Migration haertet den Flow auf drei Ebenen:
--   1. Neues Format: PBKDF2-HMAC-SHA256 mit 100_000 Iterationen +
--      per-Kurs-Salt + globalem Server-Pepper (Supabase Secret
--      KURS_PASSWORT_PEPPER). GPU-Brute-Force wird von ~10^9/s auf
--      ~10^3/s gebremst.
--   2. Separate Spalte `passwort_hash` (NICHT in data-JSONB).
--   3. Column-Level-Grants: anon + authenticated duerfen nur noch (id, data)
--      lesen — passwort_hash bleibt ausschliesslich der SERVICE_ROLE
--      vorbehalten (Edge Function kurs-auth zum Verifizieren).
--
-- Hard-Cutover:
--   Laufende Kurs-Passwoerter werden ungueltig. Administratoren setzen die
--   Passwoerter im Admin-Dashboard neu. Das Feld `data.passwort` wird durch
--   UPDATE aus allen Zeilen entfernt — Klartext oder v1-Hash sind wertlos,
--   sobald passwort_hash leer ist (Kurs gilt als "ohne Passwort").
--
-- Ausfuehrung:
--   1. Supabase-Dashboard → SQL Editor
--   2. Gesamtes Skript einfuegen und "Run"
--   3. Supabase-Secrets setzen:
--        KURS_PASSWORT_PEPPER = 32 hex bytes (z.B. `openssl rand -hex 32`)
--   4. Edge Functions deployen:
--        - admin-write (v0.7.0 mit Server-Hashing fuer rsi_kurse)
--        - kurs-auth (neu)
--
-- Rueckgaengig:
--   ALTER TABLE public.rsi_kurse DROP COLUMN IF EXISTS passwort_hash;
--   GRANT SELECT ON public.rsi_kurse TO anon, authenticated;
-- =============================================================================

-- 1. Neue Spalte fuer gehashtes Passwort
ALTER TABLE public.rsi_kurse
  ADD COLUMN IF NOT EXISTS passwort_hash TEXT NULL;

COMMENT ON COLUMN public.rsi_kurse.passwort_hash IS
  'PBKDF2-HMAC-SHA256 (100k iter) mit Salt+Pepper. Format kp:v2:<salt_hex>:<hash_hex>. Nur SERVICE_ROLE darf SELECT.';

-- 2. Hard-Cutover: Klartext- und v1-Hashes aus data entfernen
--    Laufende Kurse werden dadurch passwortlos — Admin muss neu setzen.
UPDATE public.rsi_kurse
SET data = data - 'passwort'
WHERE data ? 'passwort';

-- 3. Column-Level-Grants — anon/authenticated nur noch id + data
REVOKE ALL ON public.rsi_kurse FROM anon;
REVOKE ALL ON public.rsi_kurse FROM authenticated;

-- SELECT auf ausgewaehlte Spalten (RLS filtert Rows zusaetzlich)
GRANT SELECT (id, data, updated_at) ON public.rsi_kurse TO anon;
GRANT SELECT (id, data, updated_at) ON public.rsi_kurse TO authenticated;

-- Keine INSERT/UPDATE/DELETE-Rechte fuer anon/authenticated — laeuft via
-- Edge Function admin-write mit SERVICE_ROLE.

-- =============================================================================
-- Verifikation
-- =============================================================================
-- A) Spalte angelegt:
--     SELECT column_name, is_nullable, data_type FROM information_schema.columns
--     WHERE table_schema='public' AND table_name='rsi_kurse';
--
-- B) Column-Grants fuer anon:
--     SELECT column_name, privilege_type FROM information_schema.column_privileges
--     WHERE table_name='rsi_kurse' AND grantee='anon';
--     → Erwartung: (id, SELECT), (data, SELECT), (updated_at, SELECT)
--     → NICHT in der Liste: passwort_hash
--
-- C) Keine data.passwort-Eintraege mehr:
--     SELECT id FROM public.rsi_kurse WHERE data ? 'passwort';
--     → Erwartung: 0 Zeilen
-- =============================================================================

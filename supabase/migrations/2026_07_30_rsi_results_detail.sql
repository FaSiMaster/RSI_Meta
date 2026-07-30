-- Migration: rsi_results um Detaildaten für den PDF-Befundbericht erweitern
-- Version: v0.11.0 · 2026-07-30
--
-- Hintergrund: Bisher landeten nur die Kopfzahlen eines Durchlaufs in Supabase
-- (punkte, prozent, dauer, bestanden). Die Bewertung pro Defizit lag
-- ausschliesslich im localStorage des jeweiligen Geräts. Für den Kurs-Export
-- im Admin-Bereich muss sie serverseitig verfügbar sein.
--
-- Inhalt der Spalte (Bewertungsdaten, KEINE Personendaten — der Username
-- bleibt in der Spalte `username` als SHA-256-Hash):
--   { maxPunkte, gefunden, total, versuch, pflichtGefunden, pflichtTotal,
--     topicId, defizitResults: [ { deficitId, kategorieRichtig, punkteRoh,
--     punkteFinal, dauerSekunden, wichtigkeitKorrekt, abweichungKorrekt,
--     nacaKorrekt, userWichtigkeit, userAbweichung, userUnfallschwere } ] }
--
-- Ausführen im Supabase Dashboard → SQL Editor.
-- Idempotent: mehrfaches Ausführen ist unschädlich.

alter table rsi_results
  add column if not exists detail jsonb;

comment on column rsi_results.detail is
  'v0.11.0 — Detaildaten je Durchlauf fuer den PDF-Befundbericht (Bewertungen pro Defizit). Keine Personendaten.';

-- Verifikation (sollte die Spalte mit Typ jsonb zeigen):
--   select column_name, data_type
--   from information_schema.columns
--   where table_name = 'rsi_results' and column_name = 'detail';
--
-- Gegenprobe nach dem ersten neuen Durchlauf:
--   select scene_id, punkte, jsonb_array_length(detail->'defizitResults') as befunde
--   from rsi_results
--   where detail is not null
--   order by created_at desc
--   limit 5;

#!/usr/bin/env node
// Einmaliges Diagnose-Script: scannt rsi_topics / rsi_scenes / rsi_deficits
// auf fehlende / leere i18n-Felder (nameI18n, beschreibungI18n, ...).
// Anon-Key reicht, weil RLS SELECT fuer alle drei Tabellen erlaubt.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '..', '.env.local')
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
  if (m) acc[m[1]] = m[2]
  return acc
}, {})

const URL = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY
if (!URL || !KEY) { console.error('Supabase-ENV fehlt'); process.exit(1) }

async function fetchAll(table) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=*`, {
    headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

function isBadML(x) {
  if (x == null) return true
  if (typeof x !== 'object') return true
  const de = x.de
  if (typeof de !== 'string' || de.trim() === '') return true
  return false
}

function scan(rows, i18nKeys, label) {
  const issues = []
  for (const r of rows) {
    const d = r.data ?? {}
    const probs = []
    for (const k of i18nKeys) {
      if (isBadML(d[k])) probs.push(k)
    }
    if (probs.length) {
      issues.push({ id: r.id, topic_id: r.topic_id, scene_id: r.scene_id, missing: probs, data: d })
    }
  }
  console.log(`\n=== ${label}: ${rows.length} rows, ${issues.length} mit Problemen ===`)
  for (const i of issues) {
    console.log(`  id=${i.id}`, i.topic_id ? `topic=${i.topic_id}` : '', i.scene_id ? `scene=${i.scene_id}` : '')
    console.log(`    fehlende/leere i18n-Keys:`, i.missing.join(', '))
    for (const k of i.missing) {
      console.log(`    ${k}:`, JSON.stringify(i.data[k]))
    }
  }
  return issues
}

const [topics, scenes, deficits] = await Promise.all([
  fetchAll('rsi_topics'),
  fetchAll('rsi_scenes'),
  fetchAll('rsi_deficits'),
])

scan(topics,   ['nameI18n', 'beschreibungI18n'],            'rsi_topics')
scan(scenes,   ['nameI18n', 'beschreibungI18n', 'kontextI18n'], 'rsi_scenes')
scan(deficits, ['nameI18n', 'beschreibungI18n'],            'rsi_deficits')

// Delad växtdata för ett frö: arten (plant_facts) och sorten (plant_varieties).
// Läses direkt från Supabase. Saknas arten, eller saknar fröet koppling till sin
// sort, frågar appen /api/link-variety en gång, som slår upp och sparar det delade.
// Påsen gäller: se sowingFor i lib/packet.js för hur påsens uppgifter går först.

import { supabase } from './supabase'
import { callAi } from './api'
import { MONTHS } from './scanForm'

const FACT_COLUMNS = 'key, species, swedish_name, family, frost_sensitive, requires_pretreatment, pretreatment_note, maintenance_level, companion_planting, sowing_note, status'
const VARIETY_COLUMNS = 'key, species_key, cultivar, sow_indoor_months, sow_outdoor_months, days_to_germination_min, days_to_germination_max, sowing_depth_cm, light_germination, status'

const normalize = v => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim()

async function factsByKey(key) {
  if (!key) return null
  const { data } = await supabase.from('plant_facts').select(FACT_COLUMNS).eq('key', key).maybeSingle()
  return data || null
}

async function factsByName(name) {
  if (!name) return null
  const { data } = await supabase.from('plant_names').select(`plant_facts(${FACT_COLUMNS})`).eq('name', name).maybeSingle()
  return data?.plant_facts || null
}

/** Det som redan finns sparat för fröet. Gör inga AI-anrop. */
export async function loadPlantData(seed) {
  let variety = null
  if (seed.variety_key) {
    const { data } = await supabase.from('plant_varieties').select(VARIETY_COLUMNS).eq('key', seed.variety_key).maybeSingle()
    variety = data || null
  }
  const facts = await factsByKey(variety?.species_key || normalize(seed.species))
    || await factsByName(normalize(seed.species))
    || await factsByName(normalize(seed.name))
  return { variety, facts }
}

/** Behöver fröet kopplas? Arten saknas, eller påsen har en sort som inte är kopplad. */
export function needsLink(seed, { variety, facts }) {
  if (!seed.species && !seed.name) return false
  return !facts || Boolean(seed.cultivar && !variety)
}

// Fröer som inte gick att koppla under den här sessionen, så att vi inte frågar igen.
const failed = new Set()

/** Kopplar fröet till den delade datan och sparar variety_key på fröet. */
export async function linkSeed(seed) {
  if (failed.has(seed.id)) return null
  try {
    const res = await callAi('/api/link-variety', { species: seed.species || '', name: seed.name || '', cultivar: seed.cultivar || '' })
    if (res.variety?.key && res.variety.key !== seed.variety_key) {
      await supabase.from('seeds').update({ variety_key: res.variety.key }).eq('id', seed.id)
    }
    return { variety: res.variety || null, facts: res.facts || null }
  } catch (e) {
    failed.add(seed.id)
    console.warn('Kunde inte koppla fröet till delad växtdata', e)
    return null
  }
}

// ── Visning ────────────────────────────────────────────────────────────────

/** [3, 4, 5, 9] → "mars–maj, september" */
export function monthText(months) {
  if (!months?.length) return null
  const sorted = [...new Set(months)].sort((a, b) => a - b)
  const ranges = []
  for (const m of sorted) {
    const last = ranges[ranges.length - 1]
    if (last && m === last[1] + 1) last[1] = m
    else ranges.push([m, m])
  }
  return ranges.map(([a, b]) => (a === b ? MONTHS[a - 1] : `${MONTHS[a - 1]}–${MONTHS[b - 1]}`)).join(', ')
}

export function germinationText(min, max) {
  if (min && max && min !== max) return `${min}–${max} dagar`
  const d = min || max
  return d ? `${d} dagar` : null
}

export function depthText(cm) {
  if (cm === null || cm === undefined) return null
  return `${String(cm).replace('.', ',')} cm`
}

export const MAINTENANCE = { low: 'Lättskött', medium: 'Vanlig skötsel', high: 'Kräver lite extra' }

export const AMOUNT_TEXT = { full: 'Full', half: 'Halv', little: 'Lite kvar', empty: 'Slut' }

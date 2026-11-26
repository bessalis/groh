// Odlingskärl och sådagar (fas 2). Ett kärl är en kruka, ett brätte med ett
// antal platser eller friland/pallkrage. En sådd är en gång man sått i ett kärl.
// Varje planta (plants) vet vilken sådd den hör till och vilka platser den har.
// Se supabase/migrations/20261128090000_containers_and_sowings.sql.

import { supabase } from './supabase'
import { sowingFor } from './packet'
import { isoDate } from './timeline'
import { currentSeason, markDone, suggestionFor, varietiesFor } from './sowing'

// Färgduttarna. Visas med tokens (--mark-*), aldrig som hexkod.
export const COLORS = [
  { key: 'yellow', label: 'Gul', definite: 'Gula' },
  { key: 'white', label: 'Vit', definite: 'Vita' },
  { key: 'wine', label: 'Vinröd', definite: 'Vinröda' },
  { key: 'blue', label: 'Blå', definite: 'Blå' },
  { key: 'green', label: 'Grön', definite: 'Gröna' },
  { key: 'black', label: 'Svart', definite: 'Svarta' },
]

export const KINDS = {
  tray: { label: 'Brätte', definite: 'brättet' },
  pot: { label: 'Kruka', definite: 'krukan' },
  bed: { label: 'Friland eller pallkrage', definite: 'frilandet' },
}

export const DEFAULT_TRAY_SLOTS = 7

// Steg som betyder att plantan har lämnat kärlet.
const LEFT_CONTAINER = ['pot_up', 'plant_out', 'thin']

/** Kärlets namn: det egna, annars färg + sort ("Gula brättet"). */
export function containerLabel(c) {
  if (c?.name?.trim()) return c.name.trim()
  if (c?.kind === 'bed') return 'Friland'
  const color = COLORS.find(x => x.key === c?.color)
  return `${color?.definite || ''} ${KINDS[c?.kind]?.definite || 'kärlet'}`.trim()
}

export const slotCount = c => (c.kind === 'pot' ? 1 : c.kind === 'tray' ? c.slots || DEFAULT_TRAY_SLOTS : null)

export async function listContainers() {
  const { data, error } = await supabase.from('containers').select('*')
    .is('archived_at', null).order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createContainer({ name, color, kind, slots }) {
  const { data, error } = await supabase.from('containers')
    .insert({ name: name?.trim() || null, color, kind, slots: kind === 'tray' ? slots : kind === 'pot' ? 1 : null })
    .select('*').single()
  if (error) throw error
  return data
}

export async function archiveContainer(id) {
  const { error } = await supabase.from('containers').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

const stepDone = (plant, step) => (plant.plant_steps || []).some(s => s.step === step && s.done_date)
export const inContainer = plant => !LEFT_CONTAINER.some(step => stepDone(plant, step))
export const hasGerminated = plant => stepDone(plant, 'germinate')

/** Sådder med kärl och plantor. Bara de där något fortfarande står kvar i kärlet. */
export async function loadActiveSowings() {
  const { data, error } = await supabase.from('sowings')
    .select('id, sown_date, note, container_id, containers(*), plants(id, seed_id, season, template, slots, plant_steps(step, planned_date, done_date, note), seeds(*))')
    .order('sown_date', { ascending: false })
  if (error) throw error
  const sowings = (data || [])
    .map(s => ({ ...s, container: s.containers, plants: (s.plants || []).filter(p => p.seeds && !p.seeds.is_archived) }))
    .filter(s => s.container && s.plants.some(inContainer))
  const varieties = await varietiesFor(sowings.flatMap(s => s.plants.map(p => p.seeds)))
  return sowings.map(s => ({
    ...s,
    plants: s.plants
      .map(p => ({ ...p, seed: p.seeds, variety: varieties.get(p.seeds.variety_key) || null }))
      .sort((a, b) => (a.slots?.[0] ?? 999) - (b.slots?.[0] ?? 999)),
  }))
}

/** Upptagna platser per kärl: { [containerId]: Map(plats → fröets namn) }. */
export function occupiedSlots(sowings) {
  const out = {}
  for (const s of sowings) {
    const map = (out[s.container_id] ||= new Map())
    for (const p of s.plants) if (inContainer(p)) for (const n of p.slots || []) map.set(n, p.seed.name)
  }
  return out
}

/**
 * Sparar en sådag: en rad i sowings, och för varje frö en planta med platser.
 * entries = [{ seed, slots: [1, 2] }]. Sådd-steget markeras gjort med datumet.
 */
export async function saveSowing({ container, date, entries, frost, season = currentSeason(new Date(`${date}T12:00:00Z`)) }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: sowing, error } = await supabase.from('sowings')
    .insert({ user_id: user.id, container_id: container.id, sown_date: date })
    .select('id').single()
  if (error) throw error

  for (const { seed, slots } of entries) {
    const suggested = suggestionFor(seed, null, frost, { season }).template
    const template = container.kind === 'bed' ? (suggested === 'bulb' ? 'bulb' : 'direct') : 'indoor'
    // Finns fröet redan i årets sådd men inte sått, används den raden.
    // Är det redan sått i ett annat kärl blir det en ny planta (en andra omgång).
    const { data: existing } = await supabase.from('plants')
      .select('id, seed_id, sowing_id').eq('seed_id', seed.id).eq('season', season).is('sowing_id', null)
      .not('template', 'is', null).order('created_at', { ascending: true }).limit(1)
    let plant = existing?.[0]
    const fields = { sowing_id: sowing.id, slots: slots?.length ? slots : null, template }
    if (plant) {
      const { error: upErr } = await supabase.from('plants').update(fields).eq('id', plant.id)
      if (upErr) throw upErr
    } else {
      const { data: created, error: insErr } = await supabase.from('plants')
        .insert({ user_id: user.id, seed_id: seed.id, season, ...fields })
        .select('id, seed_id').single()
      if (insErr) throw insErr
      plant = created
    }
    await markDone(plant, template === 'bulb' ? 'plant_bulb' : 'sow', date)
  }
  return sowing.id
}

/** Dagar sedan sådden (sådagen = dag 0). */
export function dayOf(sownDate, today = isoDate(new Date())) {
  return Math.round((new Date(`${today}T12:00:00Z`) - new Date(`${sownDate}T12:00:00Z`)) / 86400000)
}

function germinationRange(plant) {
  const { values } = sowingFor(plant.seed, plant.variety)
  const min = values?.days_to_germination_min || null
  const max = values?.days_to_germination_max || null
  if (!min && !max) return null
  return { min: min || max, max: max || min }
}

const nameList = names => {
  const unique = [...new Set(names)]
  return unique.length <= 1 ? unique[0] || '' : `${unique.slice(0, -1).join(', ')} och ${unique.at(-1)}`
}
const rangeText = r => (r.min === r.max ? `${r.min} dagar` : `${r.min}–${r.max} dagar`)

/**
 * En lugn text om vad som händer i kärlet just nu, som i en gravidapp.
 * Bygger bara på groningstiden (påsen först, sedan sorten). Ingen AI.
 */
export function waitingText(sowing, today = isoDate(new Date())) {
  const day = dayOf(sowing.sown_date, today)
  const waiting = sowing.plants.filter(p => inContainer(p) && !hasGerminated(p))
  if (day < 0) return 'Sådden ligger framåt i tiden.'
  if (!waiting.length) {
    return 'Allt har grott. Ge plantorna så mycket ljus du kan, annars blir de långa och rangliga. Nästa steg är att skola om när de fått sina första riktiga blad.'
  }
  const withRange = waiting.map(p => ({ p, r: germinationRange(p) })).filter(x => x.r)
  const late = withRange.filter(x => day > x.r.max)
  const due = withRange.filter(x => day >= x.r.min && day <= x.r.max)
  const early = withRange.filter(x => day < x.r.min)

  if (day === 0) return 'Sådagen. Håll jorden fuktig men inte blöt, gärna med lock eller plast tills något tittar fram.'
  if (late.length) {
    return `${nameList(late.map(x => x.p.seed.name))} brukar ha grott vid det här laget. Det kan vara för kallt eller för torrt, men vissa fröer tar längre tid än påsen säger. Ge det några dagar till.`
  }
  if (due.length) {
    return `Nu kan ${nameList(due.map(x => x.p.seed.name))} börja titta fram. Titta gärna till brättet varje dag och ta av locket när de första bladen syns.`
  }
  if (early.length) {
    const first = early.reduce((a, b) => (a.r.min <= b.r.min ? a : b))
    return `Ingenting syns än, och det ska det inte heller. ${first.p.seed.name} brukar gro efter ${rangeText(first.r)}. Håll jorden fuktig men inte blöt.`
  }
  return 'Fröerna gror i sin egen takt. Håll jorden fuktig men inte blöt, och bocka av det som tittat fram.'
}

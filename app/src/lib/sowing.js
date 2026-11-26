// Årets sådd (fas 2): vilka fröer som ska sås en säsong, och stegen i deras
// tidslinje. En rad i plants per frö och säsong, det som hänt i plant_steps.
// Planerade datum räknas ut i lib/timeline.js och sparas inte.
// Se supabase/migrations/20261127090000_sowing_plan.sql.

import { supabase } from './supabase'
import { sowingFor } from './packet'
import { readZone } from './zone'
import { buildTimeline, lastFrost, suggestStart, suggestTemplate, isoDate, TEMPLATES } from './timeline'

const VARIETY_COLUMNS = 'key, sow_indoor_months, sow_outdoor_months, days_to_germination_min, days_to_germination_max, sowing_depth_cm, light_germination'

// Fröets fas följer tidslinjen, så att startsidan och kalendern stämmer.
const PHASE_AFTER = { sow: 'seed', plant_bulb: 'seed', germinate: 'seedling', sprout: 'seedling', pot_up: 'seedling', harden_off: 'seedling', thin: 'growing', plant_out: 'growing' }

export const currentSeason = () => new Date().getFullYear()

/** Användarens frostinställning: zon och eventuellt eget datum ('MM-DD'). */
export async function frostSettings() {
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  return { zone: readZone(user).zone, override: user?.user_metadata?.last_frost || null }
}

export async function saveFrostOverride(monthDay) {
  const { error } = await supabase.auth.updateUser({ data: { last_frost: monthDay || null } })
  if (error) throw error
}

async function varietiesFor(seeds) {
  const keys = [...new Set(seeds.map(s => s.variety_key).filter(Boolean))]
  if (!keys.length) return new Map()
  const { data } = await supabase.from('plant_varieties').select(VARIETY_COLUMNS).in('key', keys)
  return new Map((data || []).map(v => [v.key, v]))
}

/** Säsongens planteringar med frö och steg. */
export async function loadSeason(season = currentSeason()) {
  const { data, error } = await supabase.from('plants')
    .select('id, seed_id, season, template, plant_steps(step, planned_date, done_date, note), seeds(*)')
    .eq('season', season).not('template', 'is', null)
  if (error) throw error
  const plants = (data || []).filter(p => p.seeds && !p.seeds.is_archived)
  const varieties = await varietiesFor(plants.map(p => p.seeds))
  return plants.map(p => ({ ...p, seed: p.seeds, variety: varieties.get(p.seeds.variety_key) || null }))
}

/** Planteringen för ett frö den här säsongen, eller null. */
export async function plantForSeed(seedId, season = currentSeason()) {
  const { data } = await supabase.from('plants')
    .select('id, seed_id, season, template, plant_steps(step, planned_date, done_date, note)')
    .eq('seed_id', seedId).eq('season', season).not('template', 'is', null)
    .order('created_at', { ascending: true }).limit(1)
  return data?.[0] || null
}

/** Förslag för ett frö: mall och första datum. */
export function suggestionFor(seed, variety, frostCtx, { season = currentSeason(), category } = {}) {
  const { values } = sowingFor(seed, variety)
  const template = suggestTemplate(values, { category })
  const frost = lastFrost(season, frostCtx)
  const start = suggestStart(template, values, { year: season, frost, frostSensitive: Boolean(seed.frost_sensitive) })
  return { template, start: isoDate(start) }
}

export async function addToSeason(seed, { template, start }, season = currentSeason()) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('plants')
    .insert({ user_id: user.id, seed_id: seed.id, season, template, sown_date: null })
    .select('id').single()
  if (error) throw error
  const first = TEMPLATES[template].steps[0]
  const { error: stepErr } = await supabase.from('plant_steps').insert({ plant_id: data.id, step: first, planned_date: start })
  if (stepErr) throw stepErr
  return data.id
}

export async function removeFromSeason(plantId) {
  const { error } = await supabase.from('plants').delete().eq('id', plantId)
  if (error) throw error
}

async function saveStep(plantId, step, fields) {
  const { error } = await supabase.from('plant_steps')
    .upsert({ plant_id: plantId, step, ...fields }, { onConflict: 'plant_id,step' })
  if (error) throw error
}

/** Markera ett steg som gjort (datum = i dag om inget anges). Uppdaterar fröets fas. */
export async function markDone(plant, step, date = isoDate(new Date())) {
  await saveStep(plant.id, step, { done_date: date })
  const patch = { current_phase: PHASE_AFTER[step] }
  if (step === 'sow' || step === 'plant_bulb') patch.sown_date = date
  await supabase.from('seeds').update(patch).eq('id', plant.seed_id)
}

export async function undoDone(plant, step) {
  await saveStep(plant.id, step, { done_date: null })
}

export async function movePlanned(plant, step, date) {
  await saveStep(plant.id, step, { planned_date: date || null })
}

/** Tidslinjen för en plantering. */
export function timelineFor(plant, seed, variety, frostCtx) {
  const { values } = sowingFor(seed, variety)
  const frost = lastFrost(plant.season, frostCtx)
  const steps = plant.plant_steps || []
  const done = Object.fromEntries(steps.filter(s => s.done_date).map(s => [s.step, s.done_date]))
  const moved = Object.fromEntries(steps.filter(s => s.planned_date).map(s => [s.step, s.planned_date]))
  const first = TEMPLATES[plant.template].steps[0]
  const start = done[first] || moved[first] || isoDate(suggestStart(plant.template, values, { year: plant.season, frost, frostSensitive: Boolean(seed.frost_sensitive) }))
  return buildTimeline({ template: plant.template, start, values, frost, frostSensitive: Boolean(seed.frost_sensitive), done, moved })
}

/** Nästa steg som inte är gjort, eller null när allt är klart. */
export const nextStep = timeline => timeline.find(s => !s.done) || null

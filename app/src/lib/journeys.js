// Gro-resor. En resa är samma frö sått samma dag, också om fröerna står i
// olika kärl. Tretton praktväddar sådda i dag är en resa; tre till om två
// veckor blir en ny. Resan räknas fram ur plants och plant_steps och sparas
// inte för sig: ett steg på resan sparas på alla dess plantor.
//
// Faserna är OG-faserna på fröets sida (Frö → Grodd → Växer → Mogen) och
// räknas fram ur stegen, så att fröets sida, brättet och Årets sådd alltid
// visar samma sak.

import { supabase } from './supabase'
import { markDone, undoDone, varietiesFor } from './sowing'
import { isoDate } from './timeline'

export const PHASES = [
  { id: 'seed', label: 'Frö', icon: 'seed' },
  { id: 'seedling', label: 'Grodd', icon: 'seedling' },
  { id: 'growing', label: 'Växer', icon: 'grown' },
  { id: 'mature', label: 'Mogen', icon: 'mature' },
]
const ORDER = PHASES.map(p => p.id)

export const PHASE_OF_STEP = {
  sow: 'seed', plant_bulb: 'seed',
  germinate: 'seedling', sprout: 'seedling',
  pot_up: 'growing', harden_off: 'growing', plant_out: 'growing', thin: 'growing',
  mature: 'mature',
}

const SOW_STEPS = ['sow', 'plant_bulb']

/** Det steg som sparas när man trycker på en fas, för plantans mall. Null = finns inte för mallen. */
export function stepForPhase(phase, template) {
  if (phase === 'seed') return template === 'bulb' ? 'plant_bulb' : 'sow'
  if (phase === 'seedling') return template === 'bulb' ? 'sprout' : 'germinate'
  if (phase === 'growing') return template === 'indoor' ? 'pot_up' : template === 'direct' ? 'thin' : null
  if (phase === 'mature') return 'mature'
  return null
}

const doneSteps = plant => (plant.plant_steps || []).filter(s => s.done_date)
export const sownDateOf = plant => doneSteps(plant).find(s => SOW_STEPS.includes(s.step))?.done_date || null

/** Fasen en planta (eller resa) har nått: den senaste fasen bland gjorda steg. */
export function phaseOf(plants) {
  let i = -1
  for (const p of plants) for (const s of doneSteps(p)) i = Math.max(i, ORDER.indexOf(PHASE_OF_STEP[s.step]))
  return i >= 0 ? ORDER[i] : null
}

/** Nyckeln som binder ihop en resa: frö + sådatum. */
export const journeyKey = plant => `${plant.seed_id}|${sownDateOf(plant) || plant.id}`

/**
 * Grupperar plantor till resor. Plantorna behöver seed_id, plant_steps och
 * gärna sowings (kärl och platser). Osådda plantor (bara planerade) är inga resor.
 */
export function groupJourneys(plants) {
  const map = new Map()
  for (const p of plants) {
    const sownDate = sownDateOf(p)
    if (!sownDate) continue
    const key = journeyKey(p)
    if (!map.has(key)) map.set(key, { key, seedId: p.seed_id, sownDate, plants: [] })
    map.get(key).plants.push(p)
  }
  return [...map.values()]
    .map(j => ({ ...j, phase: phaseOf(j.plants), template: j.plants[0].template }))
    .sort((a, b) => b.sownDate.localeCompare(a.sownDate))
}

/** Alla plantor i samma resa som `plant`, bland `plants`. */
export const sameJourney = (plants, plant) => plants.filter(p => journeyKey(p) === journeyKey(plant))

/** Var resans fröer står: kärl och platser. */
export function placesOf(journey) {
  return journey.plants
    .filter(p => p.sowing?.container)
    .map(p => ({ container: p.sowing.container, slots: p.slots || [] }))
}

/** Fröets resor (alla säsonger), med kärl, steg och snabbloggen. */
export async function loadJourneys(seed) {
  const { data, error } = await supabase.from('plants')
    .select('id, seed_id, season, template, slots, sowing_id, sowings(id, sown_date, containers(*)), plant_steps(step, planned_date, done_date, note), growth_logs(id, plant_id, logged_at, note, conditions, photo_path)')
    .eq('seed_id', seed.id).not('template', 'is', null)
  if (error) throw error
  const varieties = await varietiesFor([seed])
  const variety = varieties.get(seed.variety_key) || null
  const plants = (data || []).map(p => ({
    ...p, seed, variety,
    sowing: p.sowings ? { ...p.sowings, container: p.sowings.containers } : null,
  }))
  return groupJourneys(plants)
}

/** Sätt resan i en fas: sparar fasens steg på alla plantor, och ångrar senare steg om man går bakåt. */
export async function setJourneyPhase(journey, phase, date = isoDate(new Date())) {
  const target = ORDER.indexOf(phase)
  for (const plant of journey.plants) {
    for (const s of doneSteps(plant)) {
      if (ORDER.indexOf(PHASE_OF_STEP[s.step]) > target) await undoDone(plant, s.step)
    }
    const step = stepForPhase(phase, plant.template)
    const already = doneSteps(plant).some(s => PHASE_OF_STEP[s.step] === phase)
    if (step && !already) await markDone(plant, step, date)
  }
  // Fröets fas (startsidan, kalendern) följer resan.
  await supabase.from('seeds').update({ current_phase: phase }).eq('id', journey.seedId)
}

/** Markera eller ångra ett steg på hela resan. */
export async function setJourneyStep(plants, step, done, date = isoDate(new Date())) {
  for (const p of plants) {
    if (done) await markDone(p, step, date)
    else await undoDone(p, step)
  }
}

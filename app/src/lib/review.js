import { supabase } from './supabase'

// Höstbokslut: gå igenom årets sådder, spara hur det gick och stäng sådden.
export const SEASON = new Date().getFullYear()

// Bokslutet erbjuds från september till och med december.
export function isReviewTime(date = new Date()) {
  return date.getMonth() >= 8
}

export const OUTCOMES = {
  good: 'Blev bra',
  so_so: 'Sådär',
  failed: 'Blev inget',
}

export const REASONS = [
  ['grodde_inte', 'Grodde inte'],
  ['fros', 'Frös'],
  ['sniglar', 'Sniglar'],
  ['torka', 'Torka'],
  ['glomde', 'Glömde'],
  ['annat', 'Annat'],
]
const REASON_LABEL = Object.fromEntries(REASONS)

// Årets sådder som inte fått sitt bokslut än.
export async function loadPending() {
  const [{ data: seeds, error }, { data: done }] = await Promise.all([
    supabase.from('seeds').select('id, name, species, sown_date, current_phase, thumb, thumb_note').eq('is_archived', false),
    supabase.from('season_reviews').select('seed_id').eq('season', SEASON),
  ])
  if (error) throw error
  const reviewed = new Set((done || []).map(r => r.seed_id))
  return (seeds || [])
    .filter(s => !reviewed.has(s.id))
    .filter(s => (s.sown_date && new Date(s.sown_date).getFullYear() === SEASON) || s.current_phase)
    .sort((a, b) => (a.sown_date || '').localeCompare(b.sown_date || ''))
}

// Sparar bokslutet för ett frö. Sådden nollställs så att påsen står redo till
// nästa år; det som blev inget hamnar i Komposten (arkivet) och kan plockas tillbaka.
export async function saveReview(seed, { outcome, reasons = [], note = '', growAgain = null, savedSeeds = false }) {
  const { data: { user } } = await supabase.auth.getUser()
  const cleanNote = note.trim() || null
  // "Odla igen" och "sparade frön" frågas bara när det blev bra
  const again = outcome === 'good' ? growAgain : outcome === 'failed' ? false : null

  const { error } = await supabase.from('season_reviews').insert({
    user_id: user.id,
    seed_id: seed.id,
    season: SEASON,
    seed_name: seed.name,
    species: seed.species || null,
    outcome,
    reasons: outcome === 'failed' ? reasons : [],
    note: cleanNote,
    grow_again: again,
    saved_seeds: outcome === 'good' ? savedSeeds : false,
    sown_date: seed.sown_date || null,
    phase_at_review: seed.current_phase || null,
  })
  if (error) throw error

  const summary = outcome === 'failed'
    ? [`${SEASON}: blev inget`, reasons.map(r => REASON_LABEL[r]).join(', '), cleanNote].filter(Boolean).join(' · ')
    : [`${SEASON}: ${OUTCOMES[outcome].toLowerCase()}`, cleanNote].filter(Boolean).join(' · ')

  const update = {
    sown_date: null,
    current_phase: null,
    thumb_note: summary,
    thumb: outcome === 'failed' ? 'down' : again ? 'up' : null,
    ...(outcome === 'failed' ? { is_archived: true } : {}),
  }
  const { error: updateError } = await supabase.from('seeds').update(update).eq('id', seed.id)
  if (updateError) throw updateError
}

export async function loadSummary() {
  const { data } = await supabase.from('season_reviews')
    .select('seed_name, outcome, grow_again, saved_seeds')
    .eq('season', SEASON)
  return data || []
}

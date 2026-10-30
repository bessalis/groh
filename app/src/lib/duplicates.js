// Dubbletter vid skanning: finns påsens växt redan bland användarens fröer?
// Appen slår aldrig ihop på egen hand. Den föreslår och användaren väljer:
// komplettera det befintliga fröet, spara som en ny påse eller hoppa över.

// Fälten som hämtas för jämförelsen och kompletteringen.
export const SEED_FIELDS = 'id, name, species, cultivar, supplier, packed_for_season, best_before, amount, sow_indoor_months, sow_outdoor_months, days_to_germination_min, days_to_germination_max, sowing_depth_cm, light_germination, frost_sensitive, requires_pretreatment, pretreatment_notes, front_photo_path, back_photo_path'

// "Luktärt 'Cupani'" och "luktärt cupani" ska räknas som samma.
export function norm(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/['’]s\b/g, '')            // Cupani's → Cupani
    .replace(/[‘’'"“”´`]/g, '')
    .replace(/\bsort\b/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const same = (a, b) => norm(a) !== '' && norm(a) === norm(b)
const missing = v => norm(v) === ''

/**
 * Hittar ett befintligt frö som troligen är samma växt som påsen.
 * values: påsens värden (scanForm-format). seeds: användarens fröer.
 * Latinskt namn + sort i första hand; annars svenskt namn + sort.
 * Saknar ett av fröerna sort räknas det som samma om resten stämmer,
 * eftersom fröer inlagda för hand ofta saknar sort.
 */
export function findDuplicate(values, seeds) {
  if (!values) return null
  const cultivarFits = s => same(s.cultivar, values.cultivar) || missing(s.cultivar) || missing(values.cultivar)
  const exact = s => (same(s.species, values.species) || same(s.name, values.name)) && same(s.cultivar, values.cultivar)
  const likely = s => (same(s.species, values.species) || same(s.name, values.name)) && cultivarFits(s)
  return seeds.find(exact) || seeds.find(likely) || null
}

/** Förvalt beslut: komplettera ett frö utan påsfoto (troligen inlagt för hand), annars ny påse. */
export function defaultChoice(existing) {
  if (!existing) return 'new'
  return existing.front_photo_path ? 'new' : 'merge'
}

const LABELS = {
  species: 'latinskt namn', cultivar: 'sort', supplier: 'fröfirma', packed_for_season: 'årgång',
  best_before: 'bäst före', amount: 'mängd', sow_indoor_months: 'såmånader inne', sow_outdoor_months: 'såmånader ute',
  days_to_germination_min: 'groningstid', days_to_germination_max: 'groningstid', sowing_depth_cm: 'sådjup',
  light_germination: 'ljusgroning', frost_sensitive: 'frostkänslighet', requires_pretreatment: 'förbehandling',
  pretreatment_notes: 'förbehandling', front_photo_path: 'foton', back_photo_path: 'foton',
}

const isEmpty = v => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)

/**
 * Det som ska fyllas i på ett befintligt frö. Bara tomma fält fylls i; det
 * användaren redan har skrivit ändras aldrig. Namn, anteckningar, betyg, sådatum,
 * fas och liknande rörs inte alls. Ja/nej-fält sätts bara till ja (en nej-ruta
 * på ett handinlagt frö betyder oftast "inte ifyllt").
 */
export function mergePatch(existing, packetSeed) {
  const patch = {}
  for (const key of Object.keys(LABELS)) {
    const value = packetSeed[key]
    if (isEmpty(value)) continue
    if (typeof value === 'boolean') {
      if (value === true && existing[key] !== true) patch[key] = true
    } else if (isEmpty(existing[key])) {
      patch[key] = value
    }
  }
  return patch
}

/** Vad kompletteringen fyller i, som läsbar text ("sort, fröfirma och foton"). */
export function describePatch(patch) {
  const names = [...new Set(Object.keys(patch).map(k => LABELS[k]))]
  if (!names.length) return ''
  return names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' och ' + names.at(-1)
}

// Tidslinje per frö (fas 2). Ren uträkning utan databas, så att den går att testa.
//
// Tre mallar:
//   indoor  förodlas inomhus: så → gror → skola om → härda av → plantera ut
//   direct  direktsådd på friland: så → gror → gallra
//   bulb    lök eller knöl: sätt → spirar
//
// Datum räknas från sista frostdatum där användaren bor (zonens ungefärliga
// datum, går att ändra) och sådata enligt sowingFor (påsen först, sedan sorten).
// Är ett steg gjort räknas stegen efter om från det faktiska datumet, men en
// frostkänslig växt planteras aldrig ut eller sås ute före frostdatum.

const DAY = 86400000

// Ungefärligt sista frostdatum per odlingszon (I–VIII), månad-dag. Grov
// tumregel för en vanlig vår; användaren kan ändra sitt eget.
export const LAST_FROST_BY_ZONE = {
  1: '05-01', 2: '05-10', 3: '05-15', 4: '05-25', 5: '06-01', 6: '06-05', 7: '06-10', 8: '06-20',
}

export const STEP_LABELS = {
  sow: 'Så',
  germinate: 'Gror',
  pot_up: 'Skola om',
  harden_off: 'Härda av',
  plant_out: 'Plantera ut',
  thin: 'Gallra',
  plant_bulb: 'Sätt',
  sprout: 'Spirar',
}

export const TEMPLATES = {
  indoor: { label: 'Förodlas inomhus', steps: ['sow', 'germinate', 'pot_up', 'harden_off', 'plant_out'] },
  direct: { label: 'Direktsådd på friland', steps: ['sow', 'germinate', 'thin'] },
  bulb: { label: 'Lök eller knöl', steps: ['plant_bulb', 'sprout'] },
}

const DEFAULT_GERMINATION_DAYS = 10
const POT_UP_AFTER_GERMINATION = 21
const HARDEN_OFF_DAYS = 7
const FROST_MARGIN_SENSITIVE = 7       // frostkänsliga ut en vecka efter frostdatum
const DIRECT_BEFORE_FROST_HARDY = 21   // tåliga kan sås ute tre veckor före frost
const BULB_BEFORE_FROST_HARDY = 14
const THIN_AFTER_GERMINATION = 14
const SPROUT_AFTER_PLANTING = 21
const INDOOR_WEEKS_BEFORE_FROST = 8    // när påsen inte säger något
const INDOOR_MAX_WEEKS_BEFORE_FROST = 12   // tidigast så här långt före frost

const toDate = s => new Date(`${s}T12:00:00Z`)
const iso = d => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * DAY)
const later = (a, b) => (a > b ? a : b)

/** Sista frostdatum ett visst år: användarens eget (MM-DD) eller zonens. */
export function lastFrost(year, { zone, override } = {}) {
  const md = /^\d{2}-\d{2}$/.test(override || '') ? override : LAST_FROST_BY_ZONE[zone] || LAST_FROST_BY_ZONE[2]
  return toDate(`${year}-${md}`)
}

const monthStart = (year, month) => toDate(`${year}-${String(month).padStart(2, '0')}-01`)

/** Föreslagen mall utifrån sådata: inomhusmånader → indoor, annars utomhus → direct. */
export function suggestTemplate(values, { category } = {}) {
  if (category === 'onion') return 'bulb'
  if (values?.sow_indoor_months?.length) return 'indoor'
  if (values?.sow_outdoor_months?.length) return 'direct'
  return 'indoor'
}

function germinationDays(values) {
  const { days_to_germination_min: min, days_to_germination_max: max } = values || {}
  if (min && max) return Math.round((min + max) / 2)
  return min || max || DEFAULT_GERMINATION_DAYS
}

/** Föreslaget första datum (så eller sätt) för mallen, året `year`. */
export function suggestStart(template, values, { year, frost, frostSensitive }) {
  if (template === 'indoor') {
    const months = values?.sow_indoor_months
    if (!months?.length) return addDays(frost, -INDOOR_WEEKS_BEFORE_FROST * 7)
    // Påsen gäller: början av dess tidigaste inomhusmånad. I en kall zon kan den
    // vara orimligt tidig; då flyttas starten fram till 12 veckor före frost,
    // men aldrig förbi påsens sista inomhusmånad.
    const first = monthStart(year, Math.min(...months))
    const lastMonthEnd = addDays(monthStart(year + (Math.max(...months) === 12 ? 1 : 0), Math.max(...months) % 12 + 1), -1)
    const earliest = addDays(frost, -INDOOR_MAX_WEEKS_BEFORE_FROST * 7)
    const start = later(first, earliest)
    return start > lastMonthEnd ? lastMonthEnd : start
  }
  if (template === 'direct') {
    const byFrost = frostSensitive ? addDays(frost, FROST_MARGIN_SENSITIVE) : addDays(frost, -DIRECT_BEFORE_FROST_HARDY)
    const months = values?.sow_outdoor_months
    return months?.length ? later(monthStart(year, Math.min(...months)), byFrost) : byFrost
  }
  return frostSensitive ? frost : addDays(frost, -BULB_BEFORE_FROST_HARDY)
}

/**
 * Räknar ut stegen. done = { [steg]: 'YYYY-MM-DD' } för det som redan hänt,
 * moved = { [steg]: 'YYYY-MM-DD' } för planerade datum som användaren flyttat.
 * Båda styr stegen efter. Svarar [{ step, label, date, done, moved }] i ordning.
 */
export function buildTimeline({ template, start, values, frost, frostSensitive, done = {}, moved = {} }) {
  const germ = germinationDays(values)
  const outDate = frostSensitive ? addDays(frost, FROST_MARGIN_SENSITIVE) : frost
  const planned = {}
  const at = step => (done[step] ? toDate(done[step]) : moved[step] ? toDate(moved[step]) : planned[step])
  const s = toDate(start)

  if (template === 'indoor') {
    planned.sow = s
    planned.germinate = addDays(at('sow'), germ)
    planned.pot_up = addDays(at('germinate'), POT_UP_AFTER_GERMINATION)
    // Ut tidigast vid frostdatum, och inte förrän plantan hunnit skolas om.
    planned.plant_out = later(outDate, addDays(at('pot_up'), HARDEN_OFF_DAYS + 7))
    planned.harden_off = addDays(planned.plant_out, -HARDEN_OFF_DAYS)
    const hardened = done.harden_off || moved.harden_off
    if (hardened) planned.plant_out = later(planned.plant_out, addDays(toDate(hardened), HARDEN_OFF_DAYS))
  } else if (template === 'direct') {
    planned.sow = s
    planned.germinate = addDays(at('sow'), germ)
    planned.thin = addDays(at('germinate'), THIN_AFTER_GERMINATION)
  } else {
    planned.plant_bulb = s
    planned.sprout = addDays(at('plant_bulb'), SPROUT_AFTER_PLANTING)
  }

  return TEMPLATES[template].steps.map(step => ({
    step, label: STEP_LABELS[step], date: iso(at(step)), done: Boolean(done[step]), moved: !done[step] && Boolean(moved[step]),
  }))
}

export { iso as isoDate }

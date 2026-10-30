// Gemensamt för granskning av skannade fröpåsar (en påse och batchläget).
// Läsningen från AI:n har null för saknade uppgifter; formuläret har tomma
// strängar och listor. toValues ger tillbaka samma form som läsningen.

export const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
export const AMOUNTS = [['full', 'Full'], ['half', 'Halv'], ['little', 'Lite kvar'], ['empty', 'Slut']]
export const LABELS = {
  name: 'Namn', cultivar: 'Sort', species: 'Latinskt namn', supplier: 'Fröfirma',
  packed_for_season: 'Årgång', best_before: 'Bäst före', sow_indoor_months: 'Förodla inne',
  sow_outdoor_months: 'Så ute', days_to_germination_min: 'Groningstid', days_to_germination_max: 'Groningstid',
  sowing_depth_cm: 'Sådjup', light_germination: 'Ljusgroende', frost_sensitive: 'Frostkänslig',
  pretreatment_note: 'Förbehandling', sowing_note: 'Anteckning',
}

export const EMPTY = {
  name: '', cultivar: '', species: '', supplier: '', packed_for_season: '', best_before: '',
  sow_indoor_months: [], sow_outdoor_months: [], days_to_germination_min: '', days_to_germination_max: '',
  sowing_depth_cm: '', light_germination: false, frost_sensitive: false, pretreatment_note: '', sowing_note: '',
}

// Läsningen (null för saknat) → formulärets värden (tomma strängar och listor).
export function toForm(reading) {
  const form = { ...EMPTY }
  for (const key of Object.keys(EMPTY)) {
    const v = reading?.[key]
    if (v === null || v === undefined) continue
    form[key] = typeof EMPTY[key] === 'string' ? String(v) : v
  }
  return form
}

// Formulärets värden → samma form som läsningen (null för tomt), för att jämföra och spara.
export function toValues(form) {
  const text = v => (v.trim() ? v.trim() : null)
  const number = v => (String(v).trim() === '' ? null : Number(String(v).replace(',', '.')))
  const months = v => (v.length ? [...v].sort((a, b) => a - b) : null)
  return {
    name: text(form.name), cultivar: text(form.cultivar), species: text(form.species), supplier: text(form.supplier),
    packed_for_season: number(form.packed_for_season), best_before: form.best_before || null,
    sow_indoor_months: months(form.sow_indoor_months), sow_outdoor_months: months(form.sow_outdoor_months),
    days_to_germination_min: number(form.days_to_germination_min), days_to_germination_max: number(form.days_to_germination_max),
    sowing_depth_cm: number(form.sowing_depth_cm), light_germination: form.light_germination, frost_sensitive: form.frost_sensitive,
    pretreatment_note: text(form.pretreatment_note), sowing_note: text(form.sowing_note),
  }
}

export function errorText(e) {
  if (e?.status === 429) return 'Dagens gräns för AI-läsningar är nådd. Fyll i fröet själv eller försök i morgon.'
  if (e?.status === 422 || e?.status === 413) return e.message
  return 'Det gick inte att läsa påsen just nu.'
}

/** Raden i seeds för en bekräftad påse. */
export function seedFrom(values, amount, paths) {
  return {
    name: values.name, species: values.species, cultivar: values.cultivar, supplier: values.supplier,
    packed_for_season: values.packed_for_season, best_before: values.best_before, amount: amount || null,
    sow_indoor_months: values.sow_indoor_months, sow_outdoor_months: values.sow_outdoor_months,
    days_to_germination_min: values.days_to_germination_min, days_to_germination_max: values.days_to_germination_max,
    sowing_depth_cm: values.sowing_depth_cm, light_germination: values.light_germination,
    frost_sensitive: values.frost_sensitive,
    requires_pretreatment: Boolean(values.pretreatment_note), pretreatment_notes: values.pretreatment_note,
    notes: values.sowing_note,
    sowing_type: !values.sow_indoor_months && values.sow_outdoor_months ? 'outdoor' : 'indoor',
    front_photo_path: paths?.frontPath || null, back_photo_path: paths?.backPath || null,
  }
}

/** Fält som AI:n var osäker på, med svenska namn (utan dubbletter). */
export function uncertainLabels(reading) {
  return [...new Set((reading?.uncertain || []).map(k => LABELS[k]).filter(Boolean))]
}

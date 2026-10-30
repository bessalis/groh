// Påsen gäller: det som står på användarens egen fröpåse (seeds) går före
// sortens delade uppgifter (plant_varieties). Sorten fyller bara i det som saknas.
// Fälten heter likadant i båda tabellerna.

export const SOWING_FIELDS = [
  'sow_indoor_months',
  'sow_outdoor_months',
  'days_to_germination_min',
  'days_to_germination_max',
  'sowing_depth_cm',
  'light_germination',
]

const isSet = v => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)

/**
 * Sådata som gäller för en påse, och var varje uppgift kommer ifrån.
 * from[fält] är 'packet' (påsen), 'variety' (delad sortdata, kan vara AI-utkast) eller null.
 */
export function sowingFor(seed, variety) {
  const values = {}
  const from = {}
  for (const field of SOWING_FIELDS) {
    if (isSet(seed?.[field])) { values[field] = seed[field]; from[field] = 'packet' }
    else if (isSet(variety?.[field])) { values[field] = variety[field]; from[field] = 'variety' }
    else { values[field] = null; from[field] = null }
  }
  return { values, from }
}

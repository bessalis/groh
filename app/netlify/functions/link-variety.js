import { requireUser, readJson, cleanText, json } from '../lib/auth.js'
import { lookupFacts } from '../lib/lookup.js'
import { dbAvailable, varietyKey, findVariety, saveVariety } from '../lib/db.js'

// Kopplar en fröpåse till den delade datan: arten i plant_facts och, om påsen
// har ett sortnamn, sorten i plant_varieties. Skriver bara i de delade tabellerna.
// Appen sparar själv variety_key på användarens frö (egen rad, egen behörighet).
//
// Arten slås upp på latinskt namn i första hand, annars på det svenska namnet.
// Ett AI-anrop görs bara om arten inte redan finns sparad (räknas mot taket).
// Sorten skapas utan sådata; den fylls på i fas 2 (ett uppslag per sort, delas).

export default async (req) => {
  const { error, user } = await requireUser(req)
  if (error) return error

  const body = await readJson(req)
  const species = cleanText(body?.species, 120)
  const name = cleanText(body?.name, 80)
  const cultivar = cleanText(body?.cultivar, 80)
  if (!species && !name) return json({ error: 'Namn saknas' }, 400)

  const result = await lookupFacts(species || name, user?.id)
  if (result.error) return json({ error: result.error }, result.status)

  const { facts } = result
  let variety = null
  const key = facts.key && cultivar ? varietyKey(facts.key, cultivar) : null
  if (key && dbAvailable()) {
    try {
      await saveVariety({ key, species_key: facts.key, cultivar })
      variety = await findVariety(key)
    } catch (e) {
      console.error('Kunde inte spara sorten', e)
    }
  }

  const { model: _model, ...shared } = facts
  return Response.json({ facts: shared, category: result.category, variety, source: result.source })
}

export const config = { path: '/api/link-variety' }

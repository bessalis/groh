import { requireUser, readJson, cleanText, json } from '../lib/auth.js'
import { lookupFacts } from '../lib/lookup.js'

// Uppslag från Lägg till frö. Själva uppslaget (sparat svar eller AI) ligger i lib/lookup.js.
export default async (req) => {
  const { error, user } = await requireUser(req)
  if (error) return error

  const body = await readJson(req)
  const raw = cleanText(body?.name, 80)
  if (!raw) return json({ error: 'Namn saknas' }, 400)

  const result = await lookupFacts(raw, user?.id)
  if (result.error) return json({ error: result.error }, result.status)

  // Det appen får tillbaka: faktan plus varifrån den kommer.
  const { key: _key, model: _model, ...facts } = result.facts
  return Response.json({ ...facts, category: result.category, source: result.source, cache: result.cache })
}

export const config = { path: '/api/ai-lookup' }

import { requireUser, readJson, json } from '../lib/auth.js'
import { dbAvailable, rest, listObjects, removeObjects, deleteAuthUser } from '../lib/db.js'

// Raderar den inloggade användarens konto och all egen data.
//   1. påsfotona och loggfotona i seed-packets (en mapp per användare)
//   2. odlingsloggar, skördar, plantor, fröer och platser (tabellerna utan
//      "on delete cascade" mot användaren, i rätt ordning)
//   3. själva kontot; skanningar, höstbokslut och AI-räknaren följer med (cascade)
// Den delade växtdatan (arter, sorter, namn, tips, fröbilder) är inte knuten
// till någon användare och ligger kvar.
// Kräver { confirm: 'RADERA' } så att den inte kan anropas av misstag.

export default async (req) => {
  const { error, user } = await requireUser(req)
  if (error) return error
  if (!dbAvailable()) return json({ error: 'Databasnyckeln saknas i Netlify' }, 500)

  const body = await readJson(req)
  if (body?.confirm !== 'RADERA') return json({ error: 'Bekräftelse saknas' }, 400)

  const uid = user.id
  const eq = `user_id=eq.${encodeURIComponent(uid)}`
  try {
    await removeObjects('seed-packets', await listObjects('seed-packets', `${uid}/`))

    const plants = (await rest(`plants?${eq}&select=id`)) || []
    if (plants.length) {
      const ids = `in.(${plants.map(p => p.id).join(',')})`
      await rest(`growth_logs?plant_id=${ids}`, { method: 'DELETE' })
      await rest(`harvests?plant_id=${ids}`, { method: 'DELETE' })
    }
    await rest(`plants?${eq}`, { method: 'DELETE' })
    await rest(`seeds?${eq}`, { method: 'DELETE' })
    await rest(`locations?${eq}`, { method: 'DELETE' })

    await deleteAuthUser(uid)
  } catch (e) {
    console.error('Kunde inte radera kontot', uid, e)
    return json({ error: 'Kontot kunde inte raderas helt. Försök igen, eller hör av dig så hjälper vi till.' }, 500)
  }
  return Response.json({ deleted: true })
}

export const config = { path: '/api/delete-account' }

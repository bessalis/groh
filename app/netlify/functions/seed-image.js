import { randomBytes } from 'node:crypto'
import { requireUser, readJson, cleanText, json } from '../lib/auth.js'
import { dbAvailable, normalizeName, rest, findFactsByKey, findVariety, signedUploadUrl, downloadObject, uploadObject, publicUrl, saveSeedImage } from '../lib/db.js'
import { normalizeSeedImage, SIZES } from '../lib/normalize.js'
import { computeQueue } from '../lib/imageQueue.js'

// Fröbilder: bara för admin (app_metadata.role = 'admin', sätts i Supabase).
// Uppladdning = godkännande. Ingen AI, bara bildbehandling.
//
//   { action: 'queue' }             → sorter och arter som saknar bild, flest användare först
//   { action: 'upload-url', key }   → engångslänk för originalet i seed-image-originals
//   { action: 'publish', key, originalPath }
//        → normaliserar originalet, lägger två WebP med slumpnamn i den publika
//          bucketen seed-images och sparar raden i seed_images.
//
// key är sortens nyckel ('lathyrus odoratus|cupani') eller artens ('lathyrus odoratus').
// En ny bild för samma nyckel ersätter raden; de gamla filerna ligger kvar.

const ORIGINALS = 'seed-image-originals'
const PUBLIC = 'seed-images'

const slug = value => normalizeName(value).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bild'

// Vilken art nyckeln hör till, om den finns.
async function speciesFor(key) {
  if (key.includes('|')) {
    const variety = await findVariety(key)
    return variety?.species_key || null
  }
  const facts = await findFactsByKey(key)
  return facts?.key || null
}

export default async (req) => {
  const { error, user } = await requireUser(req)
  if (error) return error
  if (user?.app_metadata?.role !== 'admin') return json({ error: 'Bara admin kan ladda upp fröbilder' }, 403)
  if (!dbAvailable()) return json({ error: 'Databasnyckeln saknas i Netlify' }, 500)

  const body = await readJson(req)

  if (body?.action === 'queue') {
    // Alla användares fröer (inte komposten), bara de fält som behövs för att räkna.
    const [seeds, varieties, facts, names, images] = await Promise.all([
      rest('seeds?is_archived=eq.false&select=user_id,variety_key,species,name'),
      rest('plant_varieties?select=key,species_key'),
      rest('plant_facts?select=key'),
      rest('plant_names?select=name,key'),
      rest('seed_images?select=key'),
    ])
    return Response.json(computeQueue({
      seeds: seeds || [], varieties: varieties || [], factKeys: (facts || []).map(f => f.key),
      names: names || [], imageKeys: (images || []).map(i => i.key),
    }))
  }

  const key = normalizeName(cleanText(body?.key, 200))
  if (!key) return json({ error: 'Bildnyckel saknas' }, 400)

  const speciesKey = await speciesFor(key)
  if (!speciesKey) return json({ error: 'Hittar ingen art eller sort med den nyckeln' }, 404)

  if (body?.action === 'upload-url') {
    const ext = ['png', 'jpg', 'jpeg', 'webp'].includes(body?.ext) ? body.ext : 'png'
    const path = `${slug(speciesKey)}/${slug(key)}-${Date.now()}.${ext}`
    return Response.json(await signedUploadUrl(ORIGINALS, path))
  }

  if (body?.action === 'publish') {
    const originalPath = cleanText(body?.originalPath, 300)
    if (!originalPath || originalPath.includes('..')) return json({ error: 'Originalet saknas' }, 400)

    let normalized
    try {
      normalized = await normalizeSeedImage(await downloadObject(ORIGINALS, originalPath))
    } catch (e) {
      console.error('Kunde inte göra om bilden', e)
      return json({ error: 'Bilden gick inte att läsa. Prova PNG, JPEG eller WebP.' }, 422)
    }

    // Svårgissade namn: slumpkod per uppladdning.
    const code = randomBytes(12).toString('base64url')
    const small_path = `${code}-${SIZES.small}.webp`
    const large_path = `${code}-${SIZES.large}.webp`
    await uploadObject(PUBLIC, small_path, normalized.small, 'image/webp')
    await uploadObject(PUBLIC, large_path, normalized.large, 'image/webp')
    await saveSeedImage({ key, species_key: speciesKey, small_path, large_path, original_path: originalPath, made_with: 'chatgpt' })

    return Response.json({
      key, small: publicUrl(PUBLIC, small_path), large: publicUrl(PUBLIC, large_path),
      trimmed: normalized.trimmed, bytes: { small: normalized.small.length, large: normalized.large.length },
    })
  }

  return json({ error: 'Okänd åtgärd' }, 400)
}

export const config = { path: '/api/seed-image' }

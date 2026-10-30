// Skanning av fröpåsar: foton i bucketen seed-packets, AI:ns läsning och
// användarens rättningar i seed_scans och seed_scan_items. Se CLAUDE.md.
import { supabase } from './supabase'
import { callAi } from './api'

const BUCKET = 'seed-packets'

export async function startScan() {
  const { data, error } = await supabase.from('seed_scans').insert({ status: 'capturing' }).select('id').single()
  if (error) throw error
  return data.id
}

/** Laddar upp ett komprimerat foto. side: 'front' | 'back'. Returnerar sökvägen. */
export async function uploadPhoto(scanId, position, side, photo) {
  const { data: { user } } = await supabase.auth.getUser()
  const ext = photo.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${user.id}/${scanId}/${position}-${side}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, photo.blob, { contentType: photo.type, upsert: true })
  if (error) throw error
  return path
}

/** Låter AI:n läsa påsen. Returnerar { reading, model }. */
export function readPacket(front, back) {
  return callAi('/api/scan-packet', {
    front: { type: front.type, data: front.base64 },
    back: back ? { type: back.type, data: back.base64 } : undefined,
  })
}

export async function saveItem(scanId, position, fields) {
  const { data, error } = await supabase.from('seed_scan_items')
    .upsert({ scan_id: scanId, position, ...fields }, { onConflict: 'scan_id,position' })
    .select('id').single()
  if (error) throw error
  return data.id
}

/** Det användaren ändrat jämfört med AI:ns läsning. */
export function corrections(reading, final) {
  const diff = {}
  for (const [key, value] of Object.entries(final)) {
    if (!(key in (reading || {}))) continue
    // En kryssruta kan inte vara "vet inte": AI:ns null och en orörd ruta är samma sak.
    if ((reading[key] ?? null) === null && value === false) continue
    if (JSON.stringify(reading[key] ?? null) !== JSON.stringify(value ?? null)) diff[key] = value ?? null
  }
  return diff
}

/**
 * Sparar fröet och markerar påsen som bekräftad och skanningen som klar.
 * final: formulärets värden i samma form som AI:ns läsning, för att spara vad som rättats.
 */
export async function confirmPacket({ scanId, itemId, seed, reading, final }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('seeds')
    .insert({ ...seed, user_id: user.id, is_archived: false, source: 'scan' })
    .select('id').single()
  if (error) throw error
  await supabase.from('seed_scan_items')
    .update({ status: 'confirmed', seed_id: data.id, corrections: corrections(reading, final) })
    .eq('id', itemId)
  await supabase.from('seed_scans').update({ status: 'done' }).eq('id', scanId)
  return data.id
}

export async function abandonScan(scanId) {
  if (scanId) await supabase.from('seed_scans').update({ status: 'abandoned' }).eq('id', scanId)
}

/** Tillfällig länk till ett privat påsfoto (en timme). */
export async function photoUrl(path) {
  if (!path) return null
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl || null
}

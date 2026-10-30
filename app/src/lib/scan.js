// Skanning av fröpåsar: foton i bucketen seed-packets, AI:ns läsning och
// användarens rättningar i seed_scans och seed_scan_items. Se CLAUDE.md.
import { supabase } from './supabase'
import { callAi } from './api'
import { mergePatch, SEED_FIELDS } from './duplicates'

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
 * Sparar påsen och markerar den som bekräftad (och skanningen som klar om finish).
 * final: formulärets värden i samma form som AI:ns läsning, för att spara vad som rättats.
 * mergeInto: ett befintligt frö att komplettera i stället för att skapa ett nytt.
 * Då fylls bara tomma fält i (se mergePatch i lib/duplicates.js).
 */
export async function confirmPacket({ scanId, itemId, seed, reading, final, finish = true, mergeInto = null }) {
  let seedId
  if (mergeInto) {
    const patch = mergePatch(mergeInto, seed)
    if (Object.keys(patch).length) {
      const { error } = await supabase.from('seeds').update(patch).eq('id', mergeInto.id)
      if (error) throw error
    }
    seedId = mergeInto.id
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('seeds')
      .insert({ ...seed, user_id: user.id, is_archived: false, source: 'scan' })
      .select('id').single()
    if (error) throw error
    seedId = data.id
  }
  await supabase.from('seed_scan_items')
    .update({ status: 'confirmed', seed_id: seedId, corrections: corrections(reading, final) })
    .eq('id', itemId)
  if (finish) await setScanStatus(scanId, 'done')
  return seedId
}

/** Användarens fröer (inte komposten), för att hitta dubbletter. */
export async function loadMySeeds() {
  const { data } = await supabase.from('seeds').select(SEED_FIELDS).eq('is_archived', false)
  return data || []
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

export async function updateItem(itemId, fields) {
  const { error } = await supabase.from('seed_scan_items').update(fields).eq('id', itemId)
  if (error) throw error
}

export async function setScanStatus(scanId, status) {
  const { error } = await supabase.from('seed_scans').update({ status }).eq('id', scanId)
  if (error) throw error
}

/** Senaste skanningen som är läst men inte klar, med antal påsar kvar att spara. */
export async function findOpenScan() {
  const { data } = await supabase.from('seed_scans')
    .select('id, created_at, seed_scan_items(status)')
    .eq('status', 'reviewing')
    .order('created_at', { ascending: false })
    .limit(1)
  const scan = data?.[0]
  if (!scan) return null
  const left = (scan.seed_scan_items || []).filter(i => i.status === 'pending').length
  return left ? { id: scan.id, createdAt: scan.created_at, left } : null
}

/** Påsarna i en skanning, i ordning, med tillfälliga länkar till fotona. */
export async function loadScanItems(scanId) {
  const { data, error } = await supabase.from('seed_scan_items')
    .select('id, position, front_photo_path, back_photo_path, ai_status, ai_reading, status')
    .eq('scan_id', scanId)
    .order('position')
  if (error) throw error
  return Promise.all((data || []).map(async item => ({
    ...item,
    frontUrl: await photoUrl(item.front_photo_path),
    backUrl: await photoUrl(item.back_photo_path),
  })))
}

/** Hämtar ett sparat påsfoto igen, t.ex. för att läsa om en påse efter "fortsätt senare". */
export async function downloadPhoto(path) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) throw error
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(data)
  })
  return { blob: data, type: data.type || (path.endsWith('.webp') ? 'image/webp' : 'image/jpeg'), base64 }
}

/** Hittar påsarna i ett gruppfoto. Returnerar { packets: [{ x0, y0, x1, y1, label }] }. */
export function detectPackets(photo) {
  return callAi('/api/detect-packets', { image: { type: photo.type, data: photo.base64 } })
}

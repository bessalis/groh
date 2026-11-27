// Snabbloggen: en anteckning, ett foto och förhållanden på en gro-resa.
// Sparas i growth_logs på resans första planta (resan är samma frö och
// sådatum, så det spelar ingen roll vilken). Fotot komprimeras som påsfotona
// och läggs i den privata bucketen seed-packets, i användarens mapp, så att
// det raderas med kontot. Inget skickas till AI.
// Se supabase/migrations/20261129090000_journeys_and_log.sql.

import { supabase } from './supabase'
import { compressPhoto } from './photo'
import { photoUrl } from './scan'

export const CONDITIONS = [
  { key: 'cold', label: 'Kyla' },
  { key: 'warm', label: 'Värme' },
  { key: 'dry', label: 'Torka' },
  { key: 'wet', label: 'För blött' },
  { key: 'low_light', label: 'Lite ljus' },
  { key: 'poor_germination', label: 'Dålig grobarhet' },
  { key: 'pests', label: 'Skadedjur' },
]
export const conditionLabel = key => CONDITIONS.find(c => c.key === key)?.label || key

/** Resans loggar, senaste först. */
export const logsOf = journey => journey.plants.flatMap(p => p.growth_logs || [])
  .sort((a, b) => b.logged_at.localeCompare(a.logged_at))

export async function addLog(journey, { note, conditions, file }) {
  const plantId = journey.plants[0].id
  const id = crypto.randomUUID()
  let photo_path = null
  if (file) {
    const { data: { user } } = await supabase.auth.getUser()
    const photo = await compressPhoto(file)
    const ext = photo.type === 'image/webp' ? 'webp' : 'jpg'
    photo_path = `${user.id}/logs/${plantId}/${id}.${ext}`
    const { error } = await supabase.storage.from('seed-packets').upload(photo_path, photo.blob, { contentType: photo.type })
    if (error) throw error
  }
  const { error } = await supabase.from('growth_logs')
    .insert({ id, plant_id: plantId, note: note?.trim() || null, conditions: conditions || [], photo_path })
  if (error) throw error
}

export async function removeLog(log) {
  if (log.photo_path) await supabase.storage.from('seed-packets').remove([log.photo_path])
  const { error } = await supabase.from('growth_logs').delete().eq('id', log.id)
  if (error) throw error
}

export const logPhotoUrl = path => photoUrl(path)

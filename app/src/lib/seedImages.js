// Fröbilder i appen: sortens plansch, annars artens som reserv, annars ingen
// (då visas en platshållare). Bilderna ligger i den publika bucketen seed-images
// och listan över dem hämtas en gång per besök (den är liten och ändras sällan).

import { supabase } from './supabase'

const normalize = v => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim()

let index = null      // Promise<{ images: Map<key, row>, names: Map<name, key> }>

export function loadImageIndex({ refresh = false } = {}) {
  if (!index || refresh) {
    index = Promise.all([
      supabase.from('seed_images').select('key, species_key, small_path, large_path'),
      supabase.from('plant_names').select('name, key'),
    ]).then(([imgs, names]) => ({
      images: new Map((imgs.data || []).map(r => [r.key, r])),
      names: new Map((names.data || []).map(n => [n.name, n.key])),
    })).catch(() => ({ images: new Map(), names: new Map() }))
  }
  return index
}

function url(path) {
  return supabase.storage.from('seed-images').getPublicUrl(path).data.publicUrl
}

/**
 * Bilden för ett frö, eller null. Ordning: sortens bild (variety_key), artens bild
 * (artnyckeln i variety_key, det latinska namnet eller det svenska namnet).
 * Svarar { small, large, key, kind: 'variety' | 'species' }.
 */
export function imageFor(seed, { images, names }) {
  const candidates = []
  if (seed.variety_key) candidates.push([seed.variety_key, 'variety'], [seed.variety_key.split('|')[0], 'species'])
  const latin = normalize(seed.species)
  if (latin) candidates.push([latin, 'species'], [names.get(latin), 'species'])
  candidates.push([names.get(normalize(seed.name)), 'species'])
  for (const [key, kind] of candidates) {
    const row = key && images.get(key)
    if (row) return { small: url(row.small_path), large: url(row.large_path), key, kind }
  }
  return null
}

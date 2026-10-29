import { callAi } from './api'

// Groh:s åtta växtkategorier. Ikonerna ligger i assets/icons/categories/
// (tillfälligt från Phosphor, MIT) och visas med CategoryIcon.jsx.
export const CATEGORIES = {
  fruit_veg:     { label: 'Fruktgrönsak' },
  root:          { label: 'Rotfrukt' },
  onion:         { label: 'Lök' },
  leafy:         { label: 'Blad och kål' },
  legume:        { label: 'Baljväxt' },
  herb:          { label: 'Krydda eller ört' },
  annual_flower: { label: 'Sommarblomma' },
  perennial:     { label: 'Perenn eller lökväxt' },
}

export const PHASE_LABEL = { seed: 'Frö', seedling: 'Groddplanta', growing: 'Växer', mature: 'Mogen' }

// Samma nyckel som serverfunktionerna: latinskt namn, annars fröets namn, i gemener.
export function plantKey(seed) {
  return String(seed?.species || seed?.name || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

const cache = new Map()

// Hämtar kategori för en lista fröer. Saknas kategori klassar servern några åt
// gången, så vi frågar igen tills alla har en (högst fyra extra varv).
export async function fetchCategories(seeds, onUpdate) {
  const plants = seeds.map(s => ({ name: s.name, species: s.species }))
  const result = {}
  for (const s of seeds) { const k = plantKey(s); if (cache.has(k)) result[k] = cache.get(k) }
  if (plants.every(p => cache.has(plantKey(p)))) { onUpdate?.(result); return result }

  for (let round = 0; round < 5; round++) {
    const before = Object.keys(result).length
    const data = await callAi('/api/categorize', { plants })
    Object.entries(data.categories || {}).forEach(([k, v]) => { cache.set(k, v); result[k] = v })
    onUpdate?.({ ...result })
    // Sluta om allt är klart, eller om varvet inte gav något nytt (t.ex. namn som inte är växter)
    if (!data.pending || Object.keys(result).length === before) break
  }
  return result
}

// Kön över fröbilder som saknas: vilka sorter och arter användarna har som inte
// har någon egen bild, sorterad efter hur många användare som har dem.
// Ren funktion så att den går att testa; serverfunktionen hämtar raderna.

const normalize = v => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * seeds:      [{ user_id, variety_key, species, name }]  (alla användares, ej komposten)
 * varieties:  [{ key, species_key }]
 * factKeys:   artnycklar i plant_facts
 * names:      [{ name, key }] ur plant_names
 * imageKeys:  nycklar som har en bild i seed_images
 *
 * Svarar { items: [{ key, kind, users, seeds, reserve }], unlinked }
 *   kind:     'variety' eller 'species'
 *   reserve:  sorten saknar egen bild men arten har en (visas då med artens bild)
 *   unlinked: fröer som inte går att koppla till någon art än
 */
export function computeQueue({ seeds, varieties, factKeys, names, imageKeys }) {
  const speciesOfVariety = new Map(varieties.map(v => [v.key, v.species_key]))
  const facts = new Set(factKeys)
  const nameToKey = new Map(names.map(n => [n.name, n.key]))
  const images = new Set(imageKeys)

  const speciesFor = seed => {
    const latin = normalize(seed.species)
    if (latin && facts.has(latin)) return latin
    return nameToKey.get(latin) || nameToKey.get(normalize(seed.name)) || null
  }

  const counts = new Map()   // key → { kind, users: Set, seeds }
  let unlinked = 0
  for (const seed of seeds) {
    let key, kind
    if (seed.variety_key && speciesOfVariety.has(seed.variety_key)) { key = seed.variety_key; kind = 'variety' }
    else { key = speciesFor(seed); kind = 'species' }
    if (!key) { unlinked++; continue }
    if (images.has(key)) continue
    const entry = counts.get(key) || { kind, users: new Set(), seeds: 0 }
    entry.users.add(seed.user_id)
    entry.seeds++
    counts.set(key, entry)
  }

  const items = [...counts].map(([key, e]) => ({
    key,
    kind: e.kind,
    users: e.users.size,
    seeds: e.seeds,
    reserve: e.kind === 'variety' && images.has(speciesOfVariety.get(key)),
  }))
  // Flest användare först. Sorter utan reservbild före dem som har en.
  items.sort((a, b) => b.users - a.users || Number(a.reserve) - Number(b.reserve) || b.seeds - a.seeds || a.key.localeCompare(b.key))
  return { items, unlinked }
}

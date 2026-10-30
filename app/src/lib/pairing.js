// Ordning och ihopparning av påsar i gruppfoton.
// Påsarna vänds där de ligger, så varje baksida hamnar ungefär där framsidan låg.
// De två fotona är sällan tagna exakt likadant, så lägena jämförs relativt
// till området som alla påsar täcker i respektive foto (flytt och zoom tar ut varandra).

const center = b => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 })

/** Läsordning: rad för rad uppifrån, vänster till höger inom raden. */
export function readingOrder(boxes) {
  if (!boxes.length) return []
  const avgH = boxes.reduce((s, b) => s + (b.y1 - b.y0), 0) / boxes.length
  const sorted = [...boxes].sort((a, b) => center(a).y - center(b).y)
  const rows = []
  for (const box of sorted) {
    const row = rows.find(r => Math.abs(center(r[0]).y - center(box).y) < avgH * 0.5)
    if (row) row.push(box)
    else rows.push([box])
  }
  return rows.flatMap(r => r.sort((a, b) => center(a).x - center(b).x))
}

function normalizer(boxes) {
  const x0 = Math.min(...boxes.map(b => b.x0)), x1 = Math.max(...boxes.map(b => b.x1))
  const y0 = Math.min(...boxes.map(b => b.y0)), y1 = Math.max(...boxes.map(b => b.y1))
  const w = Math.max(x1 - x0, 1e-6), h = Math.max(y1 - y0, 1e-6)
  return b => { const c = center(b); return { x: (c.x - x0) / w, y: (c.y - y0) / h } }
}

/**
 * Parar ihop framsidor med baksidor efter läge. Returnerar en lista lika lång som
 * fronts där varje plats är index i backs, eller null om ingen baksida passar.
 * Närmaste par väljs först (girigt), och par som ligger för långt isär lämnas tomma.
 */
export function pairByPosition(fronts, backs, maxDistance = 0.35) {
  const result = fronts.map(() => null)
  if (!fronts.length || !backs.length) return result
  const nf = normalizer(fronts), nb = normalizer(backs)
  const candidates = []
  fronts.forEach((f, i) => backs.forEach((b, j) => {
    const a = nf(f), c = nb(b)
    candidates.push({ i, j, d: Math.hypot(a.x - c.x, a.y - c.y) })
  }))
  candidates.sort((a, b) => a.d - b.d)
  const usedBack = new Set()
  for (const { i, j, d } of candidates) {
    if (d > maxDistance) break
    if (result[i] !== null || usedBack.has(j)) continue
    result[i] = j
    usedBack.add(j)
  }
  return result
}

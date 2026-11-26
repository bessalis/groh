// Gör om en fröbild (Linnéas plansch från ChatGPT) till två visningsstorlekar.
// Ingen AI, bara bildbehandling med sharp:
//   1. vänder bilden rätt (EXIF) och gör bakgrunden genomskinlig: en genomskinlig
//      behålls, och en enfärgad (t.ex. svart från ChatGPT) tas bort där den hänger
//      ihop med bildens kanter, så att bilden passar både ljust och mörkt läge
//   2. beskär bort tom bakgrund runt motivet
//   3. centrerar motivet i ett stående 3:4-format med lika mycket luft runt om
//   4. sparar WebP i två bredder, 480 px (listor) och 1200 px (fröets sida),
//      men aldrig större än originalet

import sharp from 'sharp'

export const SIZES = { small: 480, large: 1200 }
const ASPECT = 3 / 4          // bredd / höjd, stående som en plansch
const AIR = 0.08              // luft runt motivet, andel av motivets längsta sida
const TRIM_THRESHOLD = 24     // hur mycket bakgrunden får variera (papperstextur)
const MAX_BYTES = 1024 * 1024 // bucketens gräns

// Bakgrunden: medelvärdet av fyra små rutor i hörnen. Är hörnen genomskinliga
// behålls genomskinligheten, så att bilden passar både ljust och mörkt läge.
async function backgroundOf(buffer, width, height) {
  const box = Math.max(1, Math.round(Math.min(width, height) * 0.02))
  const corners = [[0, 0], [width - box, 0], [0, height - box], [width - box, height - box]]
  const sums = [0, 0, 0, 0]
  for (const [left, top] of corners) {
    const part = await sharp(buffer).extract({ left, top, width: box, height: box }).ensureAlpha().toBuffer()
    const { channels } = await sharp(part).stats()
    for (let i = 0; i < 4; i++) sums[i] += channels[i].mean
  }
  const [r, g, b, alpha] = sums.map(s => Math.round(s / corners.length))
  return alpha < 128 ? { r: 0, g: 0, b: 0, alpha: 0 } : { r, g, b }
}

// Tar bort en enfärgad bakgrund: fyller från kanterna genom alla bildpunkter som
// liknar bakgrundsfärgen och gör dem genomskinliga. Bara det som hänger ihop med
// kanten räknas, så mörka detaljer inne i motivet (rötter, frön) ligger kvar.
// Närmast motivet tonas genomskinligheten ut, så att kanten inte blir hackig.
const CLEAR = 18   // så här nära bakgrundsfärgen: helt genomskinligt
const EDGE = 48    // upp till så här nära: delvis genomskinligt (kantutjämning)
async function removeBackground(buffer, bg) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const dist = i => Math.max(Math.abs(data[i] - bg.r), Math.abs(data[i + 1] - bg.g), Math.abs(data[i + 2] - bg.b))
  const seen = new Uint8Array(w * h)
  const stack = []
  const push = (x, y) => { const p = y * w + x; if (!seen[p]) { seen[p] = 1; stack.push(p) } }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  let cleared = 0
  while (stack.length) {
    const p = stack.pop()
    const i = p * 4
    const d = dist(i)
    if (d > EDGE) continue
    data[i + 3] = d <= CLEAR ? 0 : Math.round(data[i + 3] * (d - CLEAR) / (EDGE - CLEAR))
    cleared++
    if (d > CLEAR) continue   // kantutjämning: gå inte vidare in i motivet
    const x = p % w, y = (p - x) / w
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }
  return { buffer: await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer(), cleared: cleared / (w * h) }
}

async function toWebp(image, width, height) {
  for (let quality = 76; quality >= 50; quality -= 8) {
    const buffer = await image.clone().resize(width, height).webp({ quality, alphaQuality: 75, effort: 6 }).toBuffer()
    if (buffer.length <= MAX_BYTES || quality <= 50) return buffer
  }
}

/**
 * Normaliserar en bild. Svarar { small, large, background, trimmed } där small och large är WebP-buffertar.
 * Kastar fel om bilden inte går att läsa.
 */
export async function normalizeSeedImage(input) {
  const source = sharp(input, { failOn: 'error' }).rotate()
  const { data: oriented, info } = await source.toBuffer({ resolveWithObject: true })
  const background = await backgroundOf(oriented, info.width, info.height)

  // Genomskinlig bakgrund behålls. En enfärgad tas bort, så att alla bilder blir
  // genomskinliga. Blir nästan inget kvar (bakgrunden var inte enfärgad) används
  // bilden som den är, med bakgrundsfärgen som ram.
  let transparent = background.alpha === 0
  let flattened
  if (transparent) {
    flattened = await sharp(oriented).ensureAlpha().toBuffer()
  } else {
    const removed = await removeBackground(oriented, background)
    transparent = removed.cleared > 0.05 && removed.cleared < 0.97
    flattened = transparent ? removed.buffer : await sharp(oriented).flatten({ background }).toBuffer()
  }
  let trimmed = true
  let content
  try {
    content = await sharp(flattened).trim(transparent ? { threshold: TRIM_THRESHOLD } : { background, threshold: TRIM_THRESHOLD }).toBuffer({ resolveWithObject: true })
  } catch {
    trimmed = false   // hela bilden är bakgrund eller trim misslyckades: använd som den är
  }
  if (!content || content.info.width < 16 || content.info.height < 16) {
    trimmed = false
    content = await sharp(flattened).toBuffer({ resolveWithObject: true })
  }
  const { width: w, height: h } = content.info

  // Stående ram med lika mycket luft runt motivet.
  const air = Math.round(Math.max(w, h) * AIR)
  let frameW = w + 2 * air
  let frameH = h + 2 * air
  if (frameW / frameH > ASPECT) frameH = Math.round(frameW / ASPECT)
  else frameW = Math.round(frameH * ASPECT)
  const left = Math.floor((frameW - w) / 2)
  const top = Math.floor((frameH - h) / 2)

  const frameBg = transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : background
  const framed = sharp(await sharp(content.data)
    .extend({ left, right: frameW - w - left, top, bottom: frameH - h - top, background: frameBg })
    .toBuffer())

  // Förstora aldrig: är originalet mindre än storleken blir bilden så stor som originalet.
  const heightFor = width => Math.round(width / ASPECT)
  const widthFor = size => Math.min(size, frameW)
  const [small, large] = await Promise.all([
    toWebp(framed, widthFor(SIZES.small), heightFor(widthFor(SIZES.small))),
    toWebp(framed, widthFor(SIZES.large), heightFor(widthFor(SIZES.large))),
  ])
  return { small, large, background, trimmed, transparent }
}

// Gör om en fröbild (Linnéas plansch från ChatGPT) till två visningsstorlekar.
// Ingen AI, bara bildbehandling med sharp:
//   1. vänder bilden rätt (EXIF); genomskinlig bakgrund behålls, annars används
//      färgen i hörnen som bakgrund
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

  // Genomskinlig bakgrund: behåll alfakanalen och beskär efter den.
  // Annars: platt bild mot bakgrundsfärgen, sedan bort med tom kant.
  const transparent = background.alpha === 0
  const flattened = transparent
    ? await sharp(oriented).ensureAlpha().toBuffer()
    : await sharp(oriented).flatten({ background }).toBuffer()
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

  const framed = sharp(await sharp(content.data)
    .extend({ left, right: frameW - w - left, top, bottom: frameH - h - top, background })
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

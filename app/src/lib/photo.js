// Komprimerar foton från kameran innan de laddas upp eller skickas till AI:n.
// Längsta sidan högst 1600 px räcker för att läsa texten på en fröpåse.
// WebP där webbläsaren kan skapa det, annars JPEG (äldre Safari gör om WebP till PNG).
//
// Gruppfoton (flera påsar på ett foto) laddas i full upplösning med loadSource.
// AI:n hittar påsarna i en nedskalad kopia (forDetection), och varje påse klipps
// sedan ut ur originalet (cropPhoto) så att den lilla texten blir skarp.

const MAX_SIDE = 1600
const DETECT_SIDE = 1568    // AI:n skalar ändå ner större bilder till ungefär så här
const MAX_BYTES = 2 * 1024 * 1024

function toBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Laddar ett foto i full upplösning, med rätt rotation från kameran. Stäng med .close?.() när du är klar. */
export async function loadSource(file) {
  // createImageBitmap följer fotots EXIF-rotation, så stående bilder blir rätt.
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { /* reserv nedan */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Ritar en del av källbilden (sx, sy, sw, sh i pixlar) med längsta sidan högst maxSide
// och komprimerar. Returnerar { blob, type, base64, width, height }.
async function encode(source, sx, sy, sw, sh, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(sw, sh))
  const width = Math.max(1, Math.round(sw * scale))
  const height = Math.max(1, Math.round(sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(source, sx, sy, sw, sh, 0, 0, width, height)

  let blob = await toBlob(canvas, 'image/webp', 0.82)
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.84)
  for (let q = 0.7; blob.size > MAX_BYTES && q >= 0.4; q -= 0.1) {
    blob = await toBlob(canvas, blob.type, q)
  }
  if (blob.size > MAX_BYTES) throw new Error('Fotot blev för stort')
  return { blob, type: blob.type, base64: await toBase64(blob), width, height }
}

/** Ett foto av en påse: hela bilden, komprimerad. */
export async function compressPhoto(file) {
  const source = await loadSource(file)
  try {
    return await encode(source, 0, 0, source.width, source.height, MAX_SIDE)
  } finally {
    source.close?.()
  }
}

/** Nedskalad kopia av ett gruppfoto, för att hitta påsarna. */
export function forDetection(source) {
  return encode(source, 0, 0, source.width, source.height, DETECT_SIDE)
}

/**
 * Klipper ut en påse ur gruppfotot i full upplösning.
 * box: { x0, y0, x1, y1 } som andel av bilden. pad: extra marginal runt rutan,
 * eftersom AI:ns rutor är ungefärliga och hellre ska ta med lite bord än kapa text.
 */
export function cropPhoto(source, box, pad = 0.04) {
  const W = source.width
  const H = source.height
  const padX = (box.x1 - box.x0) * pad + 0.01
  const padY = (box.y1 - box.y0) * pad + 0.01
  const x0 = Math.max(0, box.x0 - padX) * W
  const y0 = Math.max(0, box.y0 - padY) * H
  const x1 = Math.min(1, box.x1 + padX) * W
  const y1 = Math.min(1, box.y1 + padY) * H
  return encode(source, x0, y0, x1 - x0, y1 - y0, MAX_SIDE)
}

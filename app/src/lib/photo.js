// Komprimerar ett foto från kameran innan det laddas upp eller skickas till AI:n.
// Längsta sidan högst 1600 px räcker för att läsa texten på en fröpåse.
// WebP där webbläsaren kan skapa det, annars JPEG (äldre Safari gör om WebP till PNG).

const MAX_SIDE = 1600
const MAX_BYTES = 2 * 1024 * 1024

function toBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

async function loadImage(file) {
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

/** Returnerar { blob, type, base64, width, height }. */
export async function compressPhoto(file) {
  const source = await loadImage(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height))
  const width = Math.round(source.width * scale)
  const height = Math.round(source.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(source, 0, 0, width, height)
  source.close?.()

  let blob = await toBlob(canvas, 'image/webp', 0.8)
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.82)
  for (let q = 0.7; blob.size > MAX_BYTES && q >= 0.4; q -= 0.1) {
    blob = await toBlob(canvas, blob.type, q)
  }
  if (blob.size > MAX_BYTES) throw new Error('Fotot blev för stort')

  return { blob, type: blob.type, base64: await toBase64(blob), width, height }
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

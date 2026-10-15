/**
 * Client-side image compression used before uploading to Supabase Storage.
 *
 * Photos straight from a phone or camera are routinely 5–15 MB, which is slow
 * to upload and heavy to serve on a storefront. Before a file leaves the
 * browser we downscale it to a sensible display size and re-encode it (WebP
 * when the browser supports it, otherwise JPEG), lowering the quality only as
 * far as needed to reach a target size — so a 10 MB shot lands around 200 KB
 * while still looking sharp.
 */

export type CompressImageOptions = {
  /** Longest edge, in pixels, after downscaling. */
  maxDimension?: number
  /** Target maximum file size, in bytes. */
  targetBytes?: number
  /** Quality used for the first encode. */
  initialQuality?: number
  /** Quality is never dropped below this while chasing the target size. */
  minQuality?: number
}

const DEFAULTS: Required<CompressImageOptions> = {
  maxDimension: 1600,
  targetBytes: 200 * 1024,
  initialQuality: 0.82,
  minQuality: 0.6,
}

// SVG is vector and GIF may be animated — re-encoding would destroy them.
const PASSTHROUGH_TYPES = new Set(['image/svg+xml', 'image/gif'])

/** True when the file is a raster image we are willing to re-encode. */
export function isCompressibleImage(file: File): boolean {
  return file.type.startsWith('image/') && !PASSTHROUGH_TYPES.has(file.type)
}

type DecodedImage = {
  draw: CanvasImageSource
  width: number
  height: number
  release: () => void
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image failed to decode'))
    image.src = url
  })
}

/** Decodes a file to something drawable, honouring EXIF orientation. */
async function decodeImage(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        draw: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // Fall back to an <img> element below.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await loadImageElement(url)
    return {
      draw: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    }
  } catch {
    URL.revokeObjectURL(url)
    return null
  }
}

let webpSupport: boolean | null = null

/** Cached check for WebP encoding support (broad, but not universal). */
function supportsWebp(): boolean {
  if (webpSupport !== null) return webpSupport
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    webpSupport = false
  }
  return webpSupport
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

/**
 * Encodes at the starting quality, then steps the quality down until the file
 * fits `targetBytes`. Returns the first result that fits, or — when even the
 * quality floor is too large — the smallest encode we produced so we never
 * return something worse than what we started with.
 */
async function encodeWithinBudget(
  canvas: HTMLCanvasElement,
  mime: string,
  targetBytes: number,
  initialQuality: number,
  minQuality: number,
): Promise<Blob | null> {
  let best = await canvasToBlob(canvas, mime, initialQuality)
  if (!best || best.size <= targetBytes) return best

  let quality = initialQuality
  while (quality > minQuality) {
    quality = Math.max(minQuality, Number((quality - 0.08).toFixed(2)))
    const candidate = await canvasToBlob(canvas, mime, quality)
    if (!candidate) break
    if (candidate.size < best.size) best = candidate
    if (candidate.size <= targetBytes) return candidate
  }
  return best
}

function renameForMime(name: string, mime: string): string {
  const base = name.replace(/\.[^./\\]+$/, '') || 'image'
  const extension = mime === 'image/webp' ? '.webp' : '.jpg'
  return `${base}${extension}`
}

/**
 * Compresses an image file and resolves to a new `File`. Non-images, SVG/GIF
 * and files already within the target size are returned untouched, and the
 * original is kept whenever re-encoding would not actually make it smaller.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const { maxDimension, targetBytes, initialQuality, minQuality } = {
    ...DEFAULTS,
    ...options,
  }

  if (!isCompressibleImage(file)) return file
  // Already light enough — leave it exactly as the user supplied it.
  if (file.size <= targetBytes) return file

  const decoded = await decodeImage(file)
  if (!decoded) return file

  try {
    const scale = Math.min(1, maxDimension / Math.max(decoded.width, decoded.height))
    const width = Math.max(1, Math.round(decoded.width * scale))
    const height = Math.max(1, Math.round(decoded.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(decoded.draw, 0, 0, width, height)

    const mime = supportsWebp() ? 'image/webp' : 'image/jpeg'
    const blob = await encodeWithinBudget(
      canvas,
      mime,
      targetBytes,
      initialQuality,
      minQuality,
    )
    if (!blob) return file
    // Re-encoding must be a net win, otherwise keep what the user chose.
    if (blob.size >= file.size) return file

    return new File([blob], renameForMime(file.name, mime), {
      type: mime,
      lastModified: Date.now(),
    })
  } finally {
    decoded.release()
  }
}

/** Compresses several files in order, reusing one canvas per call. */
export async function compressImages(
  files: File[],
  options: CompressImageOptions = {},
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)))
}

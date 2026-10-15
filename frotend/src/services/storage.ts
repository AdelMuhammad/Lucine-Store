import { PRODUCT_IMAGES_BUCKET, isSupabaseConfigured, supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompression'

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Short random suffix so parallel uploads never collide on path. */
function uniqueSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

/**
 * Uploads a single image to the public `product-images` bucket and returns its
 * public URL. Large photos are downscaled and re-encoded in the browser first
 * (see `lib/imageCompression`) so uploads stay fast and the stored files small.
 * Throws when Supabase is not configured or the upload fails so the caller can
 * surface a message in the UI.
 */
export async function uploadProductImage(
  file: File,
  folder = 'products',
): Promise<string> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured')
  }

  const optimized = await compressImage(file)
  const path = `${folder}/${Date.now()}-${uniqueSuffix()}-${
    sanitizeFileName(optimized.name) || 'image'
  }`
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, optimized, {
      cacheControl: '3600',
      upsert: false,
      contentType: optimized.type,
    })

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(path)

  return data.publicUrl
}

/** Uploads several images and resolves to their public URLs, in order. */
export async function uploadProductImages(
  files: File[],
  folder = 'products',
): Promise<string[]> {
  return Promise.all(files.map((file) => uploadProductImage(file, folder)))
}

import { PRODUCT_IMAGES_BUCKET, isSupabaseConfigured, supabase } from '../lib/supabase'

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Uploads a single image to the public `product-images` bucket and returns its
 * public URL. Throws when Supabase is not configured or the upload fails so
 * the caller can surface a message in the UI.
 */
export async function uploadProductImage(
  file: File,
  folder = 'products',
): Promise<string> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured')
  }

  const path = `${folder}/${Date.now()}-${sanitizeFileName(file.name) || 'image'}`
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

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

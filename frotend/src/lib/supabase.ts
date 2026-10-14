import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function readEnv(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

const supabaseUrl = readEnv(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Whether the app has valid Supabase credentials. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Shared Supabase client, or `null` when credentials are missing.
 *
 * Always guard with `isSupabaseConfigured` (or use the `*_table` helpers in
 * `src/services`) before calling into it.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Persist the Supabase Auth session so signed-in customers and admins
        // stay signed in across reloads.
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

/** Name of the public Storage bucket that holds uploaded product images. */
export const PRODUCT_IMAGES_BUCKET = 'product-images'

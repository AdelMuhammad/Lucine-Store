import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function readEnv(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

const supabaseUrl = readEnv(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Whether the app has valid Supabase credentials. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Public base URL that Supabase auth emails should return the customer to.
 *
 * `VITE_AUTH_REDIRECT_URL` wins when set (useful to keep links on `localhost`
 * while developing), otherwise the public `VITE_SITE_URL` is used so the
 * confirmation/reset links point at the deployed store instead of localhost.
 */
const authRedirectBase =
  readEnv(import.meta.env.VITE_AUTH_REDIRECT_URL) ||
  readEnv(import.meta.env.VITE_SITE_URL) ||
  (typeof window === 'undefined' ? '' : window.location.origin)

/**
 * Builds the absolute URL embedded in Supabase auth emails (sign-up
 * confirmation, password reset). Returns `undefined` when no base is known, in
 * which case Supabase falls back to the project's configured Site URL.
 */
export function authRedirectUrl(path = ''): string | undefined {
  if (!authRedirectBase) return undefined
  const base = authRedirectBase.endsWith('/')
    ? authRedirectBase
    : `${authRedirectBase}/`
  try {
    return new URL(path.replace(/^\/+/, ''), base).toString()
  } catch {
    return undefined
  }
}

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

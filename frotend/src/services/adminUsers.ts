import { supabase } from '../lib/supabase'
import {
  normalizeProfile,
  type AuthProfileRow,
  type AuthResult,
  type AuthRole,
} from './auth'

/**
 * A registered account (a `profiles` row) as shown in the admin console.
 * Derived from `normalizeProfile` so it always matches the auth profile shape.
 */
export type AdminUserRecord = NonNullable<ReturnType<typeof normalizeProfile>>

export type CreateAdminUserInput = {
  fullName: string
  email: string
  password: string
  phone?: string
  role?: AuthRole
}

/**
 * Loads every registered profile.
 *
 * The `profiles read admin` RLS policy lets an admin read all accounts, so the
 * anon key is enough here — no service role involved.
 */
export async function fetchAdminUsers(): Promise<AdminUserRecord[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[supabase] failed to load profiles', error.message)
    return null
  }

  return (data ?? [])
    .map((row) => normalizeProfile(row as Partial<AuthProfileRow>))
    .filter((profile): profile is AdminUserRecord => profile !== null)
}

/**
 * Creates a store account through the `admin-create-user` Edge Function, which
 * holds the service role key and verifies the caller is an admin.
 */
export async function createAdminUser(
  input: CreateAdminUserInput,
): Promise<AuthResult<AdminUserRecord | null>> {
  if (!supabase) return { error: 'no-backend', data: null }

  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: {
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      password: input.password,
      phone: (input.phone ?? '').trim(),
      role: input.role ?? 'customer',
    },
  })

  if (error) {
    return { error: classifyCreateUserError(await readFunctionError(error)), data: null }
  }
  if (data?.error) {
    return { error: classifyCreateUserError(String(data.error)), data: null }
  }

  const profile = data?.profile
    ? normalizeProfile(data.profile as Partial<AuthProfileRow>)
    : null
  return { error: '', data: profile }
}

/** Pulls the JSON error body (or message) out of a failed `functions.invoke`. */
async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context
  if (context && typeof context.clone === 'function') {
    try {
      const body = (await context.clone().json()) as { error?: unknown }
      if (typeof body?.error === 'string') return body.error
    } catch {
      // Body wasn't JSON — fall back to the error message below.
    }
  }
  return error instanceof Error ? error.message : String(error)
}

/** Turns a function/Supabase message into a stable, translatable key. */
function classifyCreateUserError(message: string): string {
  const normalized = message.toLowerCase()
  if (
    normalized.includes('already') ||
    normalized.includes('registered') ||
    normalized.includes('exists')
  ) {
    return 'email-in-use'
  }
  if (
    normalized.includes('weak password') ||
    normalized.includes('at least 6') ||
    normalized.includes('password should')
  ) {
    return 'weak-password'
  }
  if (normalized.includes('invalid-email') || normalized.includes('invalid email')) {
    return 'invalid-email'
  }
  if (normalized.includes('forbidden') || normalized.includes('permission')) {
    return 'forbidden'
  }
  if (
    normalized.includes('failed to send') ||
    normalized.includes('not found') ||
    normalized.includes('function')
  ) {
    return 'function-missing'
  }
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return 'network'
  }
  return 'generic'
}

import { authRedirectUrl, supabase } from '../lib/supabase'
import { asString } from './mappers'

/** Route Supabase auth emails return the customer to after confirmation/reset. */
export const AUTH_CALLBACK_PATH = '/auth/verify'

/** Roles the store supports — drives what a signed-in user may see. */
export type AuthRole = 'customer' | 'admin'

/** Public profile row of a signed-in user (mirrors the `profiles` table). */
export type AuthProfileRow = {
  user_id: string
  email: string
  full_name: string
  role: AuthRole
  phone: string
  birthday: string
  created_at: string
}

export type AuthResult<T = null> = {
  /** Non-empty when the operation failed. Kept as a plain string for the UI. */
  error: string
  data: T
}

function asRole(value: unknown): AuthRole {
  return value === 'admin' ? 'admin' : 'customer'
}

export function normalizeProfile(row: Partial<AuthProfileRow> | null) {
  if (!row) return null
  return {
    id: asString(row.user_id),
    email: asString(row.email),
    fullName: asString(row.full_name),
    role: asRole(row.role),
    phone: asString(row.phone),
    birthday: asString(row.birthday),
    createdAt: asString(row.created_at),
  }
}

/** Reads the signed-in Supabase session, or `null` when signed out/unconfigured. */
export async function getSession(): Promise<{
  user: { id: string; email: string; fullName: string } | null
}> {
  if (!supabase) return { user: null }
  const { data } = await supabase.auth.getSession()
  const sessionUser = data.session?.user
  if (!sessionUser) return { user: null }
  return {
    user: {
      id: sessionUser.id,
      email: sessionUser.email ?? '',
      fullName:
        typeof sessionUser.user_metadata?.full_name === 'string'
          ? sessionUser.user_metadata.full_name
          : '',
    },
  }
}

/**
 * Subscribes to auth state changes (sign-in, sign-out, token refresh).
 * Returns an unsubscribe function.
 */
export function subscribeToAuth(
  onStateChange: (userId: string | null) => void,
): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onStateChange(session?.user.id ?? null)
  })
  return () => data.subscription.unsubscribe()
}

/** Reads the signed-in Supabase user's details, or `null` when signed out. */
export async function getSessionUser(): Promise<{
  id: string
  email: string
  fullName: string
} | null> {
  return (await getSession()).user
}

/** Signs a user in with email + password. */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult<{ id: string } | null>> {
  if (!supabase) return { error: 'no-backend', data: null }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error) {
    return { error: classifyAuthError(error.message), data: null }
  }
  return { error: '', data: data.user ? { id: data.user.id } : null }
}

/**
 * Creates an account. With email confirmation disabled this signs the user in
 * and resolves `'signed-in'`; otherwise it resolves `'confirm'` so the UI can
 * tell the customer to check their inbox.
 */
export async function signUpWithEmail(
  fullName: string,
  email: string,
  password: string,
): Promise<AuthResult<'signed-in' | 'confirm' | null>> {
  if (!supabase) return { error: 'no-backend', data: null }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName.trim() },
      // Send the confirmation link to the deployed store (or whatever
      // `VITE_AUTH_REDIRECT_URL`/`VITE_SITE_URL` points at) instead of the
      // Supabase project's default Site URL, which is localhost in testing.
      emailRedirectTo: authRedirectUrl(AUTH_CALLBACK_PATH),
    },
  })

  if (error) {
    return { error: classifyAuthError(error.message), data: null }
  }
  if (data.session) return { error: '', data: 'signed-in' }

  // Session is only returned when the project allows auto-confirmation. If the
  // project requires email confirmation for sign-up, `data.user` is still set
  // but there is no session yet.
  if (data.user) return { error: '', data: 'confirm' }
  return { error: 'signup', data: null }
}

/** Sends a password-reset email. */
export async function resetPasswordForEmail(
  email: string,
): Promise<AuthResult<null>> {
  if (!supabase) return { error: 'no-backend', data: null }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: authRedirectUrl(AUTH_CALLBACK_PATH),
  })
  return {
    error: error ? classifyAuthError(error.message) : '',
    data: null,
  }
}

/** Re-sends the sign-up confirmation email. */
export async function resendConfirmationEmail(
  email: string,
): Promise<AuthResult<null>> {
  if (!supabase) return { error: 'no-backend', data: null }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: authRedirectUrl(AUTH_CALLBACK_PATH) },
  })
  return {
    error: error ? classifyAuthError(error.message) : '',
    data: null,
  }
}

/** Sets a new password for the signed-in user (used by the reset flow). */
export async function updatePassword(
  password: string,
): Promise<AuthResult<null>> {
  if (!supabase) return { error: 'no-backend', data: null }

  const { error } = await supabase.auth.updateUser({ password })
  return {
    error: error ? classifyAuthError(error.message) : '',
    data: null,
  }
}

/** Signs the current user out. */
export async function signOutCurrentUser(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) console.error('[supabase] sign out failed', error.message)
}

/** Loads a user's `profiles` row, or `null` when it does not exist yet. */
export async function fetchProfile(
  userId: string,
): Promise<ReturnType<typeof normalizeProfile>> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[supabase] failed to load profile', error.message)
    return null
  }
  return normalizeProfile(data as Partial<AuthProfileRow> | null)
}

/** Updates a user's public profile row. */
export async function updateProfile(
  userId: string,
  patch: Partial<Pick<AuthProfileRow, 'full_name' | 'phone' | 'birthday'>>,
): Promise<AuthResult<null>> {
  if (!supabase) return { error: 'no-backend', data: null }
  if (Object.keys(patch).length === 0) return { error: '', data: null }

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', userId)

  return { error: error ? classifyAuthError(error.message) : '', data: null }
}

/** Turns a Supabase error message into a stable, translatable key. */
function classifyAuthError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) {
    return 'invalid-credentials'
  }
  if (normalized.includes('already registered')) {
    return 'email-in-use'
  }
  if (
    normalized.includes('weak password') ||
    normalized.includes('at least 6 characters')
  ) {
    return 'weak-password'
  }
  if (normalized.includes('rate limit')) return 'rate-limit'
  if (normalized.includes('email not confirmed')) return 'email-unconfirmed'
  if (
    normalized.includes('expired') ||
    (normalized.includes('invalid') && normalized.includes('token'))
  ) {
    return 'link-expired'
  }
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return 'network'
  }
  if (
    normalized.includes('password should be different') ||
    normalized.includes('same as the old')
  ) {
    return 'same-password'
  }
  return 'generic'
}

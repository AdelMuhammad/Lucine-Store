import { create } from 'zustand'
import * as authService from '../../../services/auth'
import type { AuthRole } from '../../../services/auth'
import { useAccountStore } from './useAccountStore'
import { useSupportStore } from '../../support/store/useSupportStore'
import { useNotificationStore } from '../../notifications/store/useNotificationStore'

/** Signed-in identity exposed to the rest of the app. */
export type AuthUser = {
  id: string
  email: string
  fullName: string
  role: AuthRole
  phone?: string
  birthday?: string
}

export type AuthStatus = 'loading' | 'authenticated' | 'guest'

export type SignUpOutcome = 'signed-in' | 'confirm' | 'error'

type SignInInput = { email: string; password: string }
type SignUpInput = SignInInput & { fullName: string }

type AuthState = {
  status: AuthStatus
  user: AuthUser | null
  /** Stable, translatable error key set by the last failed auth action. */
  error: string
  hydrate: () => Promise<void>
  signUp: (input: SignUpInput) => Promise<SignUpOutcome>
  signIn: (input: SignInInput) => Promise<boolean>
  resetPassword: (email: string) => Promise<boolean>
  resendConfirmation: (email: string) => Promise<boolean>
  updatePassword: (password: string) => Promise<boolean>
  updateUser: (patch: { fullName?: string; phone?: string; birthday?: string }) => Promise<void>
  signOut: () => Promise<void>
  continueAsGuest: () => void
  clearError: () => void
}

function buildUser(input: {
  id: string
  email: string
  fullName: string
  role?: AuthRole
  phone?: string
  birthday?: string
}): AuthUser {
  return {
    id: input.id,
    email: input.email,
    fullName: input.fullName,
    role: input.role ?? 'customer',
    phone: input.phone ?? '',
    birthday: input.birthday ?? '',
  }
}

/**
 * After a session is established the "identity" used by the storefront follows
 * the account: conversations created while signed in are keyed on the user id,
 * orders hydrate from that user's rows, and notifications are re-read through
 * the user's RLS policies.
 */
function linkIdentityToStores(user: AuthUser): void {
  const account = useAccountStore.getState()
  const profile = account.profile

  const [firstName = '', ...rest] = user.fullName.trim().split(/\s+/)
  account.saveProfile({
    ...profile,
    firstName: profile.firstName || firstName,
    lastName: profile.lastName || rest.join(' '),
    email: user.email || profile.email,
    phone: user.phone || profile.phone,
    birthday: user.birthday || profile.birthday,
  })

  useSupportStore.setState({
    customerId: user.id,
    customerName: user.fullName,
    customerEmail: user.email,
  })

  // Load the account's own orders for customers, or every order for admins.
  // Notifications are re-read through the user's RLS policies as well.
  if (user.role === 'admin') {
    void account.hydrateOrders()
  } else {
    void account.hydrateOrders(user.id)
  }
  void useNotificationStore.getState().hydrate()
}

async function resolveSupabaseUser(
  id: string,
  email: string,
  fullName: string,
): Promise<AuthUser> {
  const profile = await authService.fetchProfile(id)
  return buildUser({
    id,
    email,
    fullName: profile?.fullName || fullName || email,
    role: profile?.role ?? 'customer',
    phone: profile?.phone,
    birthday: profile?.birthday,
  })
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'loading',
  user: null,
  error: '',

  hydrate: async () => {
    const sessionUser = await authService.getSessionUser()
    if (!sessionUser) {
      set({ status: 'guest' })
      return
    }

    const identity = await resolveSupabaseUser(
      sessionUser.id,
      sessionUser.email,
      sessionUser.fullName,
    )
    set({ status: 'authenticated', user: identity, error: '' })
    linkIdentityToStores(identity)
  },

  signUp: async ({ fullName, email, password }) => {
    set({ error: '' })

    const result = await authService.signUpWithEmail(fullName, email, password)
    if (result.error) {
      set({ error: result.error })
      return 'error'
    }
    if (result.data === 'confirm') {
      set({ status: 'guest' })
      return 'confirm'
    }

    // Signed in immediately after sign-up — build the profile from the session.
    const sessionUser = await authService.getSessionUser()
    if (!sessionUser) {
      set({ error: 'generic' })
      return 'error'
    }
    const identity = await resolveSupabaseUser(
      sessionUser.id,
      sessionUser.email,
      sessionUser.fullName,
    )
    set({ status: 'authenticated', user: identity, error: '' })
    linkIdentityToStores(identity)
    return 'signed-in'
  },

  signIn: async ({ email, password }) => {
    set({ error: '' })

    const result = await authService.signInWithEmail(email, password)
    if (result.error || !result.data) {
      set({ error: result.error || 'generic', status: 'guest' })
      return false
    }

    const sessionUser = await authService.getSessionUser()
    const identity = sessionUser
      ? await resolveSupabaseUser(sessionUser.id, sessionUser.email, sessionUser.fullName)
      : buildUser({ id: result.data.id, email, fullName: '' })
    set({ status: 'authenticated', user: identity, error: '' })
    linkIdentityToStores(identity)
    return true
  },

  resetPassword: async (email) => {
    set({ error: '' })
    const result = await authService.resetPasswordForEmail(email)
    if (result.error) {
      set({ error: result.error })
      return false
    }
    return true
  },

  resendConfirmation: async (email) => {
    set({ error: '' })
    const result = await authService.resendConfirmationEmail(email)
    if (result.error) {
      set({ error: result.error })
      return false
    }
    return true
  },

  updatePassword: async (password) => {
    set({ error: '' })
    const result = await authService.updatePassword(password)
    if (result.error) {
      set({ error: result.error })
      return false
    }
    return true
  },

  updateUser: async (patch) => {
    const current = get().user
    if (!current) return

    const next = { ...current }
    if (patch.fullName !== undefined) next.fullName = patch.fullName.trim()
    if (patch.phone !== undefined) next.phone = patch.phone.trim()
    if (patch.birthday !== undefined) next.birthday = patch.birthday
    set({ user: next })

    await authService.updateProfile(current.id, {
      full_name: next.fullName,
      phone: next.phone,
      birthday: next.birthday,
    })
  },

  signOut: async () => {
    await authService.signOutCurrentUser()

    // The storefront identity resets to an anonymous browser so the previous
    // account's conversations and notifications are no longer linked to it.
    useSupportStore.setState({
      customerId: crypto.randomUUID(),
      customerName: '',
      customerEmail: '',
    })

    set({ status: 'guest', user: null, error: '' })
  },

  continueAsGuest: () => {
    set({ status: 'guest', user: null, error: '' })
  },

  clearError: () => set({ error: '' }),
}))
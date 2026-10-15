import { create } from 'zustand'
import { isSupabaseConfigured } from '../../../lib/supabase'
import {
  createAdminUser,
  fetchAdminUsers,
  type AdminUserRecord,
  type CreateAdminUserInput,
} from '../../../services/adminUsers'

export type AdminUsersStatus = 'idle' | 'loading' | 'ready' | 'error'

type AdminUsersState = {
  users: AdminUserRecord[]
  status: AdminUsersStatus
  /** Stable, translatable key for the last load failure ('' when none). */
  error: string
  /** Loads every registered account; pass `{ force: true }` to refetch. */
  hydrate: (options?: { force?: boolean }) => Promise<void>
  /** Creates an account and prepends it to the list. Returns an error key. */
  createUser: (input: CreateAdminUserInput) => Promise<string>
}

export const useAdminUsersStore = create<AdminUsersState>()((set, get) => ({
  users: [],
  status: 'idle',
  error: '',

  hydrate: async (options) => {
    if (!isSupabaseConfigured) {
      set({ status: 'ready' })
      return
    }
    if (!options?.force && get().status === 'loading') return
    set({ status: 'loading', error: '' })

    const remote = await fetchAdminUsers()
    if (!remote) {
      set({ status: 'error', error: 'load-failed' })
      return
    }
    set({ users: remote, status: 'ready' })
  },

  createUser: async (input) => {
    const result = await createAdminUser(input)
    if (result.error) return result.error

    set((state) => ({
      users: result.data ? [result.data, ...state.users] : state.users,
      status: 'ready',
    }))
    return ''
  },
}))

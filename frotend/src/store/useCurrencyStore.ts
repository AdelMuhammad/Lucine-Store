import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Currency = 'EGP' | 'USD'
type CurrencyMode = 'auto' | 'manual'

type CurrencyState = {
  currency: Currency
  mode: CurrencyMode
  countryCode: string
  usdPerEgp: number
  rateUpdatedAt: number
  locationCheckedAt: number
  error: string
  setCurrency: (currency: Currency) => void
  useAutomaticCurrency: () => void
  initialize: () => Promise<void>
}

type LocationResponse = {
  success?: boolean
  country_code?: string
}

type ExchangeRateResponse = {
  result?: string
  rates?: { USD?: number }
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Request failed (${response.status})`)
    return (await response.json()) as T
  } finally {
    window.clearTimeout(timeout)
  }
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'EGP',
      mode: 'auto',
      countryCode: '',
      usdPerEgp: 0,
      rateUpdatedAt: 0,
      locationCheckedAt: 0,
      error: '',

      setCurrency: (currency) => set({ currency, mode: 'manual', error: '' }),
      useAutomaticCurrency: () => {
        const { countryCode } = get()
        set({
          mode: 'auto',
          currency: countryCode && countryCode !== 'EG' ? 'USD' : 'EGP',
          error: '',
        })
      },

      initialize: async () => {
        const now = Date.now()
        const state = get()
        const shouldCheckLocation =
          state.mode === 'auto' &&
          now - state.locationCheckedAt >= DAY_IN_MS
        const shouldRefreshRate = now - state.rateUpdatedAt >= DAY_IN_MS
        if (!shouldCheckLocation && !shouldRefreshRate) return

        const errors: string[] = []
        const tasks: Promise<void>[] = []

        if (shouldCheckLocation) {
          tasks.push(
            fetchJson<LocationResponse>('https://ipwho.is/')
              .then((result) => {
                if (result.success !== true || !result.country_code) {
                  throw new Error('Location lookup returned no country')
                }
                const countryCode = result.country_code.toUpperCase()
                set((current) => ({
                  countryCode,
                  locationCheckedAt: Date.now(),
                  ...(current.mode === 'auto'
                    ? { currency: countryCode === 'EG' ? 'EGP' : 'USD' }
                    : {}),
                }))
              })
              .catch((error: unknown) => {
                console.error('[currency] location detection failed', error)
                errors.push('location')
              }),
          )
        }

        if (shouldRefreshRate) {
          tasks.push(
            fetchJson<ExchangeRateResponse>(
              'https://open.er-api.com/v6/latest/EGP',
            )
              .then((result) => {
                const rate = result.rates?.USD
                if (result.result !== 'success' || !rate || !Number.isFinite(rate)) {
                  throw new Error('Exchange rate response was invalid')
                }
                set({ usdPerEgp: rate, rateUpdatedAt: Date.now() })
              })
              .catch((error: unknown) => {
                console.error('[currency] exchange rate update failed', error)
                errors.push('rate')
              }),
          )
        }

        set({ error: '' })
        await Promise.all(tasks)
        set({ error: errors.join(',') })
      },
    }),
    {
      name: 'lucine-store-currency',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currency: state.currency,
        mode: state.mode,
        countryCode: state.countryCode,
        usdPerEgp: state.usdPerEgp,
        rateUpdatedAt: state.rateUpdatedAt,
        locationCheckedAt: state.locationCheckedAt,
      }),
    },
  ),
)

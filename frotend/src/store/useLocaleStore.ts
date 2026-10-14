import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Language } from '../lib/i18n'

type LocaleState = {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
      toggleLanguage: () =>
        set({ language: get().language === 'en' ? 'ar' : 'en' }),
    }),
    {
      name: 'lucine-store-locale',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

import { useCallback } from 'react'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  pickLocalized,
  translate,
  type TranslationVars,
} from '../lib/i18n'
import { useLocaleStore } from '../store/useLocaleStore'
import { useCurrencyStore } from '../store/useCurrencyStore'

export function useTranslation() {
  const language = useLocaleStore((state) => state.language)
  const setLanguage = useLocaleStore((state) => state.setLanguage)
  const toggleLanguage = useLocaleStore((state) => state.toggleLanguage)
  const currencyCode = useCurrencyStore((state) => state.currency)
  const usdPerEgp = useCurrencyStore((state) => state.usdPerEgp)
  const currencyMode = useCurrencyStore((state) => state.mode)
  const currencyError = useCurrencyStore((state) => state.error)
  const setCurrency = useCurrencyStore((state) => state.setCurrency)
  const useAutomaticCurrency = useCurrencyStore(
    (state) => state.useAutomaticCurrency,
  )

  const t = useCallback(
    (key: string, vars?: TranslationVars) => translate(language, key, vars),
    [language],
  )

  const localized = useCallback(
    (primary: string, secondary?: string) =>
      pickLocalized(language, primary, secondary),
    [language],
  )

  const currency = useCallback(
    (value: number) => formatCurrency(value, language, currencyCode, usdPerEgp),
    [language, currencyCode, usdPerEgp],
  )

  const number = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, language, options),
    [language],
  )

  const percent = useCallback(
    (value: number, fractionDigits = 0) =>
      formatPercent(value, language, fractionDigits),
    [language],
  )

  const date = useCallback(
    (value: string | number | Date, style: 'short' | 'medium' | 'long' = 'medium') =>
      formatDate(value, language, style),
    [language],
  )

  const dateTime = useCallback(
    (value: string | number | Date, style: 'short' | 'medium' | 'long' = 'medium') =>
      formatDateTime(value, language, style),
    [language],
  )

  return {
    language,
    currencyCode,
    currencyMode,
    currencyError,
    setCurrency,
    useAutomaticCurrency,
    dir: (language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    isRTL: language === 'ar',
    t,
    localized,
    currency,
    number,
    percent,
    date,
    dateTime,
    setLanguage,
    toggleLanguage,
  }
}

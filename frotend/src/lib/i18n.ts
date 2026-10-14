import ar from '../locales/ar.json'
import en from '../locales/en.json'

export type Language = 'en' | 'ar'

export type TranslationVars = Record<string, string | number>

const dictionaries: Record<Language, unknown> = { en, ar }

export const languages: Language[] = ['en', 'ar']

export const locales: Record<Language, string> = {
  en: 'en-US',
  ar: 'ar-EG',
}

/** Resolves a dotted key (e.g. `header.search`) against a dictionary. */
export function translate(
  language: Language,
  key: string,
  vars?: TranslationVars,
): string {
  let current: unknown = dictionaries[language]

  for (const segment of key.split('.')) {
    if (
      current !== null &&
      typeof current === 'object' &&
      segment in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return key
    }
  }

  if (typeof current !== 'string') return key
  if (!vars) return current

  return current.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(vars[name] ?? ''),
  )
}

/** Picks an Arabic value when available, otherwise falls back to English. */
export function pickLocalized(
  language: Language,
  primary: string,
  secondary?: string,
): string {
  if (language === 'ar' && secondary && secondary.trim()) return secondary
  return primary
}

export function formatCurrency(
  value: number,
  language: Language,
  currency: 'EGP' | 'USD' = 'EGP',
  usdPerEgp = 0,
) {
  const amount =
    currency === 'USD' && usdPerEgp > 0 ? value * usdPerEgp : value
  return new Intl.NumberFormat(locales[language], {
    style: 'currency',
    currency: currency === 'USD' && usdPerEgp > 0 ? 'USD' : 'EGP',
  }).format(amount)
}

export function formatNumber(
  value: number,
  language: Language,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locales[language], options).format(value)
}

export function formatPercent(
  value: number,
  language: Language,
  fractionDigits = 0,
) {
  return new Intl.NumberFormat(locales[language], {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100)
}

export function formatDate(
  value: string | number | Date,
  language: Language,
  style: 'short' | 'medium' | 'long' = 'medium',
) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : ''
  return new Intl.DateTimeFormat(locales[language], { dateStyle: style }).format(
    date,
  )
}

export function formatDateTime(
  value: string | number | Date,
  language: Language,
  style: 'short' | 'medium' | 'long' = 'medium',
) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : ''
  return new Intl.DateTimeFormat(locales[language], {
    dateStyle: style,
    timeStyle: 'short',
  }).format(date)
}

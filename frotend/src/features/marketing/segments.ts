/**
 * Audience segments + loyalty tiers, derived from the order history.
 *
 * There is no accounts table, so a "customer" is the set of orders sharing an
 * email/phone/name — exactly what `deriveCustomerRows` builds.
 */
import type { CustomerRow } from '../account/customerRows'
import type { MarketingSettings } from './store/useMarketingStore'

/** The rules the admin can pick when targeting a campaign. */
export type SegmentKind =
  | 'all'
  | 'new'
  | 'repeat'
  | 'vip'
  | 'lapsed'
  | 'city'
  | 'subscribers'

export type SegmentRule = {
  kind: SegmentKind
  /**
   * Threshold for the rule: days for `new`/`lapsed`, spend for `vip`, a city
   * name for `city`. Ignored by `all`/`repeat`/`subscribers`.
   */
  value?: string
}

export const SEGMENT_KINDS: SegmentKind[] = [
  'all',
  'subscribers',
  'new',
  'repeat',
  'vip',
  'lapsed',
  'city',
]

export const DEFAULT_SEGMENT: SegmentRule = { kind: 'all' }

export const SEGMENT_DEFAULTS: Record<SegmentKind, string> = {
  all: '',
  subscribers: '',
  new: '30',
  repeat: '2',
  vip: '500',
  lapsed: '60',
  city: '',
}

/** Someone a campaign can be delivered to. */
export type SegmentRecipient = {
  key: string
  name: string
  email: string
  phone: string
}

export type LoyaltyTier = 'bronze' | 'silver' | 'gold'

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days between an ISO timestamp and `at`. */
export function daysSince(iso: string, at = Date.now()): number {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY
  return Math.floor((at - time) / DAY_MS)
}

/** The city on a customer's most recent order. */
export function customerCity(row: CustomerRow): string {
  return row.orders[0]?.address.city.trim() ?? ''
}

/** Cities present in the customer directory, for the segment picker. */
export function customerCities(rows: CustomerRow[]): string[] {
  const cities = new Set<string>()
  rows.forEach((row) => {
    const city = customerCity(row)
    if (city) cities.add(city)
  })
  return [...cities].sort((first, second) => first.localeCompare(second))
}

function ruleValue(rule: SegmentRule, fallback: number): number {
  const parsed = Number(rule.value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function matchesSegment(
  row: CustomerRow,
  rule: SegmentRule,
  at = Date.now(),
): boolean {
  switch (rule.kind) {
    case 'all':
      return true
    case 'subscribers':
      // Resolved against the newsletter list rather than the order history.
      return false
    case 'repeat':
      return row.orders.length >= ruleValue(rule, 2)
    case 'vip':
      return row.totalSpent >= ruleValue(rule, 500)
    case 'new':
      return (
        row.orders.length === 1 && daysSince(row.lastOrderAt, at) <= ruleValue(rule, 30)
      )
    case 'lapsed':
      return daysSince(row.lastOrderAt, at) >= ruleValue(rule, 60)
    case 'city':
      return (
        customerCity(row).toLocaleLowerCase() ===
        (rule.value ?? '').trim().toLocaleLowerCase()
      )
  }
}

/** Everyone a campaign with this rule would be delivered to. */
export function segmentRecipients(params: {
  rule: SegmentRule
  customers: CustomerRow[]
  subscribers: { email: string; name: string }[]
}): SegmentRecipient[] {
  if (params.rule.kind === 'subscribers') {
    return params.subscribers.map((subscriber) => ({
      key: subscriber.email,
      name: subscriber.name,
      email: subscriber.email,
      phone: '',
    }))
  }

  return params.customers
    .filter((row) => matchesSegment(row, params.rule))
    .map((row) => ({
      key: row.key,
      name: row.name,
      email: row.email,
      phone: row.phone,
    }))
}

/** `couponSummary`-style descriptor so the UI can translate the rule. */
export function describeSegment(rule: SegmentRule): {
  key: string
  value: string
} {
  return {
    key: `segmentDescribe.${rule.kind}`,
    value: rule.value ?? SEGMENT_DEFAULTS[rule.kind],
  }
}

export function loyaltyTier(
  totalSpent: number,
  settings: MarketingSettings,
): LoyaltyTier {
  if (totalSpent >= settings.loyalty.goldSpend) return 'gold'
  if (totalSpent >= settings.loyalty.silverSpend) return 'silver'
  return 'bronze'
}

export function loyaltyPoints(
  totalSpent: number,
  settings: MarketingSettings,
): number {
  return Math.floor(totalSpent * settings.loyalty.pointsPerCurrency)
}

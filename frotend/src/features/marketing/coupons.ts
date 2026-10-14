/**
 * Pure helpers for the coupon engine.
 *
 * Kept free of React/zustand so the admin console, the checkout and the tests
 * all share exactly the same rules for "is this code usable right now".
 */
import type { Coupon, CouponKind, CouponScope } from './store/useCouponStore'

/** How a coupon looks in the admin list and to a shopper at checkout. */
export type CouponStatus =
  | 'active'
  | 'scheduled'
  | 'expired'
  | 'off'
  | 'exhausted'

/** Why a code was rejected — resolved to copy through `couponReason.*`. */
export type CouponErrorReason =
  | 'unknown'
  | 'off'
  | 'scheduled'
  | 'expired'
  | 'exhausted'
  | 'min-subtotal'
  | 'limit'
  | 'first-order'
  | 'scope'

export type CouponEvaluation = {
  ok: boolean
  reason: CouponErrorReason | ''
  discount: number
  freeShipping: boolean
}

export type CouponContext = {
  /** Cart subtotal before any discount. */
  subtotal: number
  /** Subtotal of the items the coupon actually applies to. */
  scopedSubtotal: number
  /** How many times this customer already used the code. */
  usedByCustomer: number
  isFirstOrder: boolean
  /** Override for tests. */
  at?: number
}

export const COUPON_KINDS: CouponKind[] = ['percent', 'fixed', 'free-shipping']
export const COUPON_SCOPES: CouponScope[] = ['all', 'categories', 'products']

/** Codes are stored, matched and typed in upper case without spaces. */
export function normalizeCouponCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export function newMarketingId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

/** Current timestamp as ISO — kept at module scope for the React compiler. */
export function nowIso(): string {
  return new Date().toISOString()
}

/** True when an ISO timestamp is set and still in the future. */
export function isFutureIso(iso: string): boolean {
  const time = Date.parse(iso)
  return Number.isFinite(time) && time > Date.now()
}

/** Where the coupon sits in its lifecycle right now. */
export function couponStatus(coupon: Coupon, at = Date.now()): CouponStatus {
  if (!coupon.isActive) return 'off'
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return 'exhausted'
  }
  if (coupon.startsAt && Date.parse(coupon.startsAt) > at) return 'scheduled'
  if (coupon.endsAt && Date.parse(coupon.endsAt) < at) return 'expired'
  return 'active'
}

/** The money this coupon takes off a given (already scoped) subtotal. */
export function couponDiscount(coupon: Coupon, scopedSubtotal: number): number {
  if (coupon.kind === 'free-shipping') return 0
  if (scopedSubtotal <= 0) return 0
  if (coupon.kind === 'fixed') {
    return Math.min(Math.max(0, coupon.value), scopedSubtotal)
  }
  const percent = Math.min(100, Math.max(0, coupon.value))
  return Math.round(scopedSubtotal * (percent / 100) * 100) / 100
}

/**
 * The full set of rules for redeeming a code. The caller is responsible for
 * narrowing the subtotal down to the items in scope first.
 */
export function evaluateCoupon(
  coupon: Coupon,
  context: CouponContext,
): CouponEvaluation {
  const status = couponStatus(coupon, context.at)

  if (status !== 'active') {
    return {
      ok: false,
      reason: status === 'off' ? 'off' : status,
      discount: 0,
      freeShipping: false,
    }
  }

  if (coupon.minSubtotal > 0 && context.subtotal < coupon.minSubtotal) {
    return { ok: false, reason: 'min-subtotal', discount: 0, freeShipping: false }
  }

  if (coupon.perCustomerLimit > 0 && context.usedByCustomer >= coupon.perCustomerLimit) {
    return { ok: false, reason: 'limit', discount: 0, freeShipping: false }
  }

  if (coupon.firstOrderOnly && !context.isFirstOrder) {
    return { ok: false, reason: 'first-order', discount: 0, freeShipping: false }
  }

  if (coupon.scope !== 'all' && context.scopedSubtotal <= 0) {
    return { ok: false, reason: 'scope', discount: 0, freeShipping: false }
  }

  return {
    ok: true,
    reason: '',
    discount: couponDiscount(coupon, context.scopedSubtotal),
    freeShipping: coupon.kind === 'free-shipping',
  }
}

/**
 * Subtotal of the cart lines a coupon applies to. `all` returns the whole
 * subtotal; scoped coupons only discount the matching products/categories.
 */
export function scopedSubtotalFor(
  coupon: Coupon,
  lines: { price: number; quantity: number; productId: string; category: string }[],
): number {
  if (coupon.scope === 'all') {
    return lines.reduce((total, line) => total + line.price * line.quantity, 0)
  }

  const ids = new Set(coupon.scopeIds)
  return lines
    .filter((line) =>
      coupon.scope === 'products'
        ? ids.has(line.productId)
        : ids.has(line.category),
    )
    .reduce((total, line) => total + line.price * line.quantity, 0)
}

/**
 * A human summary of the offer. The caller renders it with `t(key, { value })`
 * so the amount can be formatted as a currency.
 */
export function couponSummary(coupon: Coupon): {
  key: string
  value: number
} {
  if (coupon.kind === 'free-shipping') {
    return { key: 'couponSummary.freeShipping', value: 0 }
  }
  if (coupon.kind === 'fixed') {
    return { key: 'couponSummary.fixed', value: coupon.value }
  }
  return { key: 'couponSummary.percent', value: coupon.value }
}

/** Where the coupon applies, for the admin table. */
export function couponScopeLabelKey(coupon: Coupon): string {
  return `couponScope.${coupon.scope}`
}

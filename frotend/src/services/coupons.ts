import { supabase } from '../lib/supabase'
import type {
  Coupon,
  CouponKind,
  CouponRedemption,
  CouponScope,
} from '../features/marketing/store/useCouponStore'
import { asArray, asNumber, asOptionalNumber, asString } from './mappers'

type CouponRow = {
  code: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  kind: CouponKind
  value: number
  min_subtotal: number
  starts_at: string | null
  ends_at: string | null
  usage_limit: number | null
  per_customer_limit: number
  first_order_only: boolean
  scope: CouponScope
  scope_ids: string[]
  is_active: boolean
  used_count: number
  created_at: string
}

type RedemptionRow = {
  id: string
  coupon_code: string
  order_id: string
  customer_key: string
  discount: number
  created_at: string
}

function asCouponKind(value: unknown): CouponKind {
  if (value === 'fixed' || value === 'free-shipping') return value
  return 'percent'
}

function asCouponScope(value: unknown): CouponScope {
  if (value === 'categories' || value === 'products') return value
  return 'all'
}

function toCoupon(row: Partial<CouponRow>): Coupon {
  return {
    code: asString(row.code),
    title: asString(row.title),
    title_ar: asString(row.title_ar),
    description: asString(row.description),
    description_ar: asString(row.description_ar),
    kind: asCouponKind(row.kind),
    value: asNumber(row.value),
    minSubtotal: asNumber(row.min_subtotal),
    startsAt: asString(row.starts_at),
    endsAt: asString(row.ends_at),
    usageLimit: asOptionalNumber(row.usage_limit) ?? null,
    perCustomerLimit: asNumber(row.per_customer_limit, 1),
    firstOrderOnly: row.first_order_only === true,
    scope: asCouponScope(row.scope),
    scopeIds: asArray<string>(row.scope_ids).map((id) => asString(id)),
    isActive: row.is_active !== false,
    usedCount: asNumber(row.used_count),
    createdAt: asString(row.created_at),
  }
}

function toRow(coupon: Coupon): CouponRow {
  return {
    code: coupon.code,
    title: coupon.title,
    title_ar: coupon.title_ar,
    description: coupon.description,
    description_ar: coupon.description_ar,
    kind: coupon.kind,
    value: coupon.value,
    min_subtotal: coupon.minSubtotal,
    starts_at: coupon.startsAt || null,
    ends_at: coupon.endsAt || null,
    usage_limit: coupon.usageLimit,
    per_customer_limit: coupon.perCustomerLimit,
    first_order_only: coupon.firstOrderOnly,
    scope: coupon.scope,
    scope_ids: coupon.scopeIds,
    is_active: coupon.isActive,
    used_count: coupon.usedCount,
    created_at: coupon.createdAt || new Date().toISOString(),
  }
}

function toRedemption(row: Partial<RedemptionRow>): CouponRedemption {
  return {
    id: asString(row.id),
    couponCode: asString(row.coupon_code),
    orderId: asString(row.order_id),
    customerKey: asString(row.customer_key),
    discount: asNumber(row.discount),
    createdAt: asString(row.created_at),
  }
}

export async function fetchCoupons(): Promise<Coupon[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('code', { ascending: true })

  if (error) {
    console.error('[supabase] failed to load coupons', error.message)
    return null
  }

  return (data ?? []).map((row) => toCoupon(row as CouponRow))
}

export async function fetchRedemptions(): Promise<CouponRedemption[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('coupon_redemptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[supabase] failed to load coupon redemptions', error.message)
    return null
  }

  return (data ?? []).map((row) => toRedemption(row as RedemptionRow))
}

export async function createCoupon(coupon: Coupon): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('coupons').insert(toRow(coupon))
  if (error) console.error('[supabase] failed to create coupon', error.message)
}

/** Inserts or updates a coupon, keyed by its code. */
export async function saveCoupon(coupon: Coupon): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('coupons')
    .upsert(toRow(coupon), { onConflict: 'code' })
  if (error) console.error('[supabase] failed to save coupon', error.message)
}

export async function upsertCoupons(coupons: Coupon[]): Promise<void> {
  if (!supabase || coupons.length === 0) return
  const { error } = await supabase
    .from('coupons')
    .upsert(coupons.map(toRow), { onConflict: 'code' })
  if (error) console.error('[supabase] failed to sync coupons', error.message)
}

export async function deleteCoupon(code: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('coupons').delete().eq('code', code)
  if (error) console.error('[supabase] failed to delete coupon', error.message)
}

export async function createRedemption(
  redemption: CouponRedemption,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase.from('coupon_redemptions').insert({
    id: redemption.id,
    coupon_code: redemption.couponCode,
    order_id: redemption.orderId,
    customer_key: redemption.customerKey,
    discount: redemption.discount,
    created_at: redemption.createdAt,
  })

  if (error) console.error('[supabase] failed to save redemption', error.message)
}

/**
 * Bumps the denormalised usage counter on the coupon so checkout can enforce a
 * total redemption limit without loading every redemption row.
 */
export async function incrementCouponUsage(code: string): Promise<void> {
  if (!supabase) return

  const { data, error } = await supabase
    .from('coupons')
    .select('used_count')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    console.error('[supabase] failed to read coupon usage', error.message)
    return
  }

  const next = asNumber((data as { used_count?: unknown } | null)?.used_count) + 1
  const { error: updateError } = await supabase
    .from('coupons')
    .update({ used_count: next })
    .eq('code', code)

  if (updateError) {
    console.error('[supabase] failed to update coupon usage', updateError.message)
  }
}

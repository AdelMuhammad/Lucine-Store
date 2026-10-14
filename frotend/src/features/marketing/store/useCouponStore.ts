// @ts-nocheck
import { create } from 'zustand'
import * as couponService from '../../../services/coupons'
import { normalizeCouponCode } from '../coupons'

/** What the coupon takes off: a percentage, a flat amount or the shipping. */
export type CouponKind = 'percent' | 'fixed' | 'free-shipping'

/** Which part of the catalog the coupon discounts. */
export type CouponScope = 'all' | 'categories' | 'products'

export type Coupon = {
  code: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  kind: CouponKind
  /** Percent (0–100) or a flat amount, depending on `kind`. */
  value: number
  /** Minimum cart subtotal required, `0` for none. */
  minSubtotal: number
  /** ISO date the code goes live, or `''`. */
  startsAt: string
  /** ISO date the code stops working, or `''`. */
  endsAt: string
  /** Total redemptions allowed, or `null` for unlimited. */
  usageLimit: number | null
  /** Redemptions allowed per customer, `0` for unlimited. */
  perCustomerLimit: number
  firstOrderOnly: boolean
  scope: CouponScope
  /** Category slugs or product ids the coupon is limited to. */
  scopeIds: string[]
  isActive: boolean
  usedCount: number
  createdAt: string
}

/** One row per coupon used on a placed order — drives the reports. */
export type CouponRedemption = {
  id: string
  couponCode: string
  orderId: string
  /** Email → phone → name key of the shopper who used it. */
  customerKey: string
  discount: number
  createdAt: string
}

type CouponState = {
  coupons: Coupon[]
  redemptions: CouponRedemption[]
  /** Adds a coupon and writes it to Supabase. */
  addCoupon: (coupon: Coupon) => Promise<void>
  /** Updates a coupon; pass `previousCode` when the code itself changed. */
  updateCoupon: (coupon: Coupon, previousCode?: string) => Promise<void>
  removeCoupon: (code: string) => Promise<void>
  /** Records a redemption and bumps the coupon's usage counter. */
  recordRedemption: (redemption: CouponRedemption) => Promise<void>
  /** Loads coupons + redemptions from Supabase. */
  hydrate: () => Promise<void>
}

/** Zustand store for managing coupons and redemptions. */
export const useCouponStore = create<CouponState>()(
  (set) => ({
    coupons: [],
    redemptions: [],

    addCoupon: async (coupon) => {
      set((state) => ({
        coupons: [
          ...state.coupons.filter((item) => item.code !== coupon.code),
          coupon,
        ],
      }))
      await couponService.createCoupon(coupon)
    },

    updateCoupon: async (coupon, previousCode?) => {
      const replaced = previousCode && previousCode !== coupon.code
      set((state) => ({
        coupons: [
          ...state.coupons.filter(
            (item) => item.code !== previousCode && item.code !== coupon.code,
          ),
          coupon,
        ],
      }))
      if (replaced) await couponService.deleteCoupon(previousCode)
      await couponService.saveCoupon(coupon)
    },

    removeCoupon: async (code) => {
      set((state) => ({
        coupons: state.coupons.filter((item) => item.code !== code),
      }))
      await couponService.deleteCoupon(code)
    },

    recordRedemption: async (redemption) => {
      set((state) => ({
        redemptions: [redemption, ...state.redemptions],
        coupons: state.coupons.map((coupon) =>
          coupon.code === redemption.couponCode
            ? { ...coupon, usedCount: coupon.usedCount + 1 }
            : coupon,
        ),
      }))
      await couponService.createRedemption(redemption)
      await couponService.incrementCouponUsage(redemption.couponCode)
    },

    hydrate: async () => {
      const [remoteCoupons, remoteRedemptions] = await Promise.all([
        couponService.fetchCoupons(),
        couponService.fetchRedemptions(),
      ])

      if (remoteCoupons) {
        set({
          coupons: remoteCoupons.toSorted((first, second) =>
            first.code.localeCompare(second.code),
          ),
        })
      }

      if (remoteRedemptions) set({ redemptions: remoteRedemptions })
    },
  })
)

/** Finds a coupon by code, ignoring case and surrounding spaces. */
export function findCoupon(
  coupons: Coupon[],
  code: string,
): Coupon | undefined {
  const normalized = normalizeCouponCode(code)
  return coupons.find((coupon) => coupon.code === normalized)
}
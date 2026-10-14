import { create } from 'zustand'
import * as orderService from '../../../services/orders'
import { notifyOrderStatus } from '../../notifications/store/useNotificationStore'

export type CustomerProfile = {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthday: string
}

export type CustomerAddress = {
  id: string
  label: string
  firstName: string
  lastName: string
  phone: string
  address: string
  buildingNumber?: string
  neighborhood?: string
  apartment: string
  city: string
  region: string
  postalCode: string
  country: string
  isDefault: boolean
}

export type CustomerPreferences = {
  categories: string[]
  styleNotes: string
  emailUpdates: boolean
  productAlerts: boolean
}

export type CustomerOrder = {
  id: string
  createdAt: string
  status:
    | 'placed'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'out-for-delivery'
    | 'delivered'
    | 'cancelled'
  email: string
  phone: string
  address: {
    firstName: string
    lastName: string
    street: string
    buildingNumber?: string
    neighborhood?: string
    apartment?: string
    city: string
    region?: string
    postalCode: string
    country: string
    deliveryNotes: string
  }
  shippingMethod: 'standard' | 'express'
  paymentMethod: 'card' | 'cash'
  items: {
    productId: string
    name: string
    name_ar?: string
    brand: string
    brand_ar?: string
    image: string
    unitPrice: number
    quantity: number
  }[]
  subtotal: number
  shipping: number
  couponCode?: string
  couponDiscount?: number
  referredBy?: string
  /** First-touch attribution captured from `?utm_*` on the storefront. */
  source?: string
  medium?: string
  campaign?: string
  landingPage?: string
  total: number
}

export type CustomerCoupon = {
  id: string
  code: string
  percent: number
  createdAt: string
  source: 'referral'
  orderId: string
}

type AccountState = {
  profile: CustomerProfile
  addresses: CustomerAddress[]
  preferences: CustomerPreferences
  orders: CustomerOrder[]
  readOrderNotificationIds: string[]
  referralCode: string
  activeReferralCode: string
  earnedCoupons: CustomerCoupon[]
  usedCouponCodes: string[]
  saveProfile: (profile: CustomerProfile) => void
  addAddress: (address: CustomerAddress) => void
  updateAddress: (address: CustomerAddress) => void
  removeAddress: (addressId: string) => void
  setDefaultAddress: (addressId: string) => void
  savePreferences: (preferences: CustomerPreferences) => void
  /**
   * Adds an order. The returned promise settles once the row has been written
   * to Supabase (it resolves immediately when Supabase is not configured).
   */
  addOrder: (order: CustomerOrder) => Promise<void>
  /** Updates an order; the promise settles once the row is written back. */
  updateOrder: (order: CustomerOrder) => Promise<void>
  /** Deletes an order; the promise settles once the row is removed. */
  removeOrder: (orderId: string) => Promise<void>
  markOrderNotificationsRead: (orderIds: string[]) => void
  createReferralCode: () => string
  setActiveReferralCode: (code: string) => void
  markCouponUsed: (code: string) => void
  cancelOrder: (orderId: string) => void
  clearAccount: () => void
  /** Loads the signed-in user's orders from Supabase when configured. */
  hydrateOrders: (userId?: string) => Promise<void>
}

const initialProfile: CustomerProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthday: '',
}

const initialPreferences: CustomerPreferences = {
  categories: [],
  styleNotes: '',
  emailUpdates: false,
  productAlerts: false,
}

export const useAccountStore = create<AccountState>()(
  (set, get) => ({
      profile: initialProfile,
      addresses: [],
      preferences: initialPreferences,
      orders: [],
      readOrderNotificationIds: [],
      referralCode: '',
      activeReferralCode: '',
      earnedCoupons: [],
      usedCouponCodes: [],
      saveProfile: (profile) => set({ profile }),
      addAddress: (address) =>
        set((state) => ({
          addresses: address.isDefault
            ? [
                ...state.addresses.map((item) => ({ ...item, isDefault: false })),
                address,
              ]
            : [...state.addresses, address],
        })),
      updateAddress: (address) =>
        set((state) => ({
          addresses: state.addresses.map((item) => ({
            ...(item.id === address.id ? address : item),
            isDefault:
              item.id === address.id
                ? address.isDefault
                : address.isDefault
                  ? false
                  : item.isDefault,
          })),
        })),
      removeAddress: (addressId) =>
        set((state) => {
          const removedAddress = state.addresses.find(
            (address) => address.id === addressId,
          )
          const remaining = state.addresses.filter(
            (address) => address.id !== addressId,
          )

          if (removedAddress?.isDefault && remaining[0]) {
            remaining[0] = { ...remaining[0], isDefault: true }
          }

          return { addresses: remaining }
        }),
      setDefaultAddress: (addressId) =>
        set((state) => ({
          addresses: state.addresses.map((address) => ({
            ...address,
            isDefault: address.id === addressId,
          })),
        })),
      savePreferences: (preferences) => set({ preferences }),
      addOrder: async (order) => {
        set((state) => ({
          orders: [order, ...state.orders],
          readOrderNotificationIds: state.readOrderNotificationIds.filter(
            (orderId) => orderId !== order.id,
          ),
        }))
        notifyOrderStatus({ orderId: order.id, status: order.status })
        await orderService.createOrder(order)
      },
      updateOrder: async (order) => {
        const previous = get().orders.find((item) => item.id === order.id)
        set((state) => ({
          orders: state.orders.map((item) => item.id === order.id ? order : item),
        }))
        if (!previous || previous.status !== order.status) {
          notifyOrderStatus({ orderId: order.id, status: order.status })
        }
        await orderService.updateOrder(order)
      },
      removeOrder: async (orderId) => {
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== orderId),
          readOrderNotificationIds: state.readOrderNotificationIds.filter(
            (id) => id !== orderId,
          ),
        }))
        await orderService.deleteOrder(orderId)
      },
      markOrderNotificationsRead: (orderIds) =>
        set((state) => ({
          readOrderNotificationIds: [
            ...new Set([...state.readOrderNotificationIds, ...orderIds]),
          ],
        })),
      createReferralCode: () => {
        const existingCode = get().referralCode
        if (existingCode) return existingCode

        const code = `FRIEND-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
        set({ referralCode: code })
        return code
      },
      setActiveReferralCode: (code) =>
        set({ activeReferralCode: code.trim().toUpperCase() }),
      markCouponUsed: (code) =>
        set((state) => ({
          usedCouponCodes: state.usedCouponCodes.includes(code)
            ? state.usedCouponCodes
            : [...state.usedCouponCodes, code],
        })),
      cancelOrder: (orderId) => {
        let cancelled: CustomerOrder | undefined
        set((state) => ({
          orders: state.orders.map((order) => {
            if (
              order.id === orderId &&
              ['placed', 'confirmed', 'processing'].includes(order.status)
            ) {
              cancelled = { ...order, status: 'cancelled' }
              return cancelled
            }
            return order
          }),
        }))
        if (cancelled) void orderService.updateOrder(cancelled)
      },
      clearAccount: () =>
        set({
          profile: initialProfile,
          addresses: [],
          preferences: initialPreferences,
          orders: [],
          readOrderNotificationIds: [],
          referralCode: '',
          activeReferralCode: '',
          earnedCoupons: [],
          usedCouponCodes: [],
        }),
      hydrateOrders: async (userId?: string) => {
        // With a user id only that account's orders are loaded (customers).
        // Without one every order the session may read is loaded by RLS.
        const remote = await orderService.fetchOrders(userId)
        if (!remote) return

        set({
          orders: remote.toSorted((first, second) =>
            second.createdAt.localeCompare(first.createdAt),
          ),
        })
      },
    }),
)

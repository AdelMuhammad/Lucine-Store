import type { CustomerOrder } from '../account/store/useAccountStore'

export function orderNumber(id: string) {
  return id.slice(0, 8).toUpperCase()
}

export const orderStatuses: CustomerOrder['status'][] = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'out-for-delivery',
  'delivered',
  'cancelled',
]

export const openOrderStatuses: CustomerOrder['status'][] = [
  'placed',
  'confirmed',
  'processing',
]

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export function orderStatusVariant(
  status: CustomerOrder['status'],
): BadgeVariant {
  switch (status) {
    case 'delivered':
      return 'success'
    case 'cancelled':
      return 'danger'
    case 'processing':
    case 'out-for-delivery':
      return 'warning'
    case 'shipped':
      return 'info'
    default:
      return 'neutral'
  }
}

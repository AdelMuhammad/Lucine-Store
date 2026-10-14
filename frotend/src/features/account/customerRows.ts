import type { CustomerOrder } from './store/useAccountStore'

/**
 * A customer reconstructed from the orders placed with the same email, phone or
 * name. The storefront has no account system yet, so the order history *is* the
 * customer directory.
 */
export type CustomerRow = {
  key: string
  name: string
  email: string
  phone: string
  /** This customer's orders, newest first. */
  orders: CustomerOrder[]
  totalSpent: number
  lastOrderAt: string
}

/** The identity used to group an order under a customer. */
export function customerKeyFor(order: CustomerOrder): string {
  return (
    order.email.trim().toLocaleLowerCase() ||
    order.phone.trim() ||
    `${order.address.firstName} ${order.address.lastName}`.trim()
  )
}

/** Groups orders into customers, most valuable first. */
export function deriveCustomerRows(orders: CustomerOrder[]): CustomerRow[] {
  const map = new Map<string, CustomerRow>()

  orders.forEach((order) => {
    const key = customerKeyFor(order)
    const existing = map.get(key)
    const paid = order.status !== 'cancelled' ? order.total : 0

    if (existing) {
      existing.orders.push(order)
      existing.totalSpent += paid
      if (order.createdAt > existing.lastOrderAt) {
        existing.lastOrderAt = order.createdAt
      }
    } else {
      map.set(key, {
        key,
        name: `${order.address.firstName} ${order.address.lastName}`.trim(),
        email: order.email,
        phone: order.phone,
        orders: [order],
        totalSpent: paid,
        lastOrderAt: order.createdAt,
      })
    }
  })

  return [...map.values()]
    .map((customer) => ({
      ...customer,
      orders: [...customer.orders].sort((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      ),
    }))
    .sort((first, second) => second.totalSpent - first.totalSpent)
}

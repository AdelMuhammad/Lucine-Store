import { supabase } from '../lib/supabase'
import type { CustomerOrder } from '../features/account/store/useAccountStore'
import { asArray, asNumber, asOptionalNumber, asString } from './mappers'

type OrderRow = {
  id: string
  created_at: string
  status: CustomerOrder['status']
  email: string
  phone: string
  address: CustomerOrder['address']
  shipping_method: CustomerOrder['shippingMethod']
  payment_method: CustomerOrder['paymentMethod']
  items: CustomerOrder['items']
  subtotal: number
  shipping: number
  coupon_code: string | null
  coupon_discount: number | null
  referred_by: string | null
  source: string
  medium: string
  campaign: string
  landing_page: string
  total: number
  user_id: string | null
}

function toOrder(row: Partial<OrderRow>): CustomerOrder {
  return {
    id: asString(row.id),
    createdAt: asString(row.created_at),
    status: asString(row.status, 'placed') as CustomerOrder['status'],
    email: asString(row.email),
    phone: asString(row.phone),
    address: (row.address ?? {
      firstName: '',
      lastName: '',
      street: '',
      city: '',
      postalCode: '',
      country: '',
      deliveryNotes: '',
    }) as CustomerOrder['address'],
    shippingMethod: asString(
      row.shipping_method,
      'standard',
    ) as CustomerOrder['shippingMethod'],
    paymentMethod: asString(
      row.payment_method,
      'card',
    ) as CustomerOrder['paymentMethod'],
    items: asArray<CustomerOrder['items'][number]>(row.items),
    subtotal: asNumber(row.subtotal),
    shipping: asNumber(row.shipping),
    couponCode: row.coupon_code ? asString(row.coupon_code) : undefined,
    couponDiscount: asOptionalNumber(row.coupon_discount),
    referredBy: row.referred_by ? asString(row.referred_by) : undefined,
    source: asString(row.source),
    medium: asString(row.medium),
    campaign: asString(row.campaign),
    landingPage: asString(row.landing_page),
    total: asNumber(row.total),
  }
}

function toRow(order: CustomerOrder, userId?: string): OrderRow {
  return {
    id: order.id,
    created_at: order.createdAt,
    status: order.status,
    email: order.email,
    phone: order.phone,
    address: order.address,
    shipping_method: order.shippingMethod,
    payment_method: order.paymentMethod,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    coupon_code: order.couponCode ?? null,
    coupon_discount: order.couponDiscount ?? null,
    referred_by: order.referredBy ?? null,
    source: order.source ?? '',
    medium: order.medium ?? '',
    campaign: order.campaign ?? '',
    landing_page: order.landingPage ?? '',
    total: order.total,
    user_id: userId ?? null,
  }
}

export async function fetchOrders(userId?: string): Promise<CustomerOrder[] | null> {
  if (!supabase) return null

  let request = supabase.from('orders').select('*')
  if (userId) request = request.eq('user_id', userId)
  request = request.order('created_at', { ascending: false })

  const { data, error } = await request

  if (error) {
    console.error('[supabase] failed to load orders', error.message)
    return null
  }

  return (data ?? []).map((row) => toOrder(row as OrderRow))
}

/** How the orders list can be sorted. */
export type OrderSortKey = 'newest' | 'oldest' | 'total-desc' | 'total-asc'

export type OrderPageQuery = {
  /** 1-based page number. */
  page: number
  pageSize: number
  search?: string
  /** A status name, or `all`/empty for no status filter. */
  status?: string
  /** Inclusive ISO lower bound on `created_at`. */
  createdFrom?: string
  /** Inclusive ISO upper bound on `created_at`. */
  createdTo?: string
  sort?: OrderSortKey
}

export type OrderPage = {
  rows: CustomerOrder[]
  total: number
}

/** Strips characters that would break PostgREST's `or=(...)` filter syntax. */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()"\\]/g, ' ').trim()
}

/**
 * Reads a single page of orders, filtered, sorted and paginated **on the
 * server**. Returns `null` when Supabase is unconfigured or the query fails.
 */
export async function fetchOrderPage(
  query: OrderPageQuery,
): Promise<OrderPage | null> {
  if (!supabase) return null

  let request = supabase.from('orders').select('*', { count: 'exact' })

  if (query.status && query.status !== 'all') {
    request = request.eq('status', query.status)
  }
  if (query.createdFrom) request = request.gte('created_at', query.createdFrom)
  if (query.createdTo) request = request.lte('created_at', query.createdTo)

  const term = sanitizeSearchTerm(query.search ?? '')
  if (term) {
    const like = `%${term}%`
    request = request.or(
      [
        `id.ilike.${like}`,
        `email.ilike.${like}`,
        `phone.ilike.${like}`,
        `address->>firstName.ilike.${like}`,
        `address->>lastName.ilike.${like}`,
      ].join(','),
    )
  }

  switch (query.sort) {
    case 'oldest':
      request = request.order('created_at', { ascending: true })
      break
    case 'total-desc':
      request = request.order('total', { ascending: false })
      break
    case 'total-asc':
      request = request.order('total', { ascending: true })
      break
    default:
      request = request.order('created_at', { ascending: false })
  }

  const offset = (query.page - 1) * query.pageSize
  const { data, error, count } = await request.range(
    offset,
    offset + query.pageSize - 1,
  )

  if (error) {
    console.error('[supabase] failed to load an order page', error.message)
    return null
  }

  return {
    rows: (data ?? []).map((row) => toOrder(row as OrderRow)),
    total: count ?? 0,
  }
}

export async function createOrder(order: CustomerOrder): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('orders').insert(toRow(order))
  if (error) console.error('[supabase] failed to create order', error.message)
}

export async function updateOrder(order: CustomerOrder): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('orders')
    .update(toRow(order))
    .eq('id', order.id)
  if (error) console.error('[supabase] failed to update order', error.message)
}

export async function deleteOrder(orderId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('orders').delete().eq('id', orderId)
  if (error) console.error('[supabase] failed to delete order', error.message)
}

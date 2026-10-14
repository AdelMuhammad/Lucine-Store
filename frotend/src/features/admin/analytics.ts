import type { CustomerOrder } from '../account/store/useAccountStore'

/* -------------------------------------------------------------------------- */
/* Date ranges                                                                */
/* -------------------------------------------------------------------------- */

export type RangePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'custom'

export const RANGE_PRESETS: RangePreset[] = [
  'all',
  'today',
  'yesterday',
  'week',
  'month',
]

export const DAY_MS = 24 * 60 * 60 * 1000

export function startOfDay(value: Date): number {
  const copy = new Date(value)
  copy.setHours(0, 0, 0, 0)
  return copy.getTime()
}

/** Inclusive [from, to] window for a preset, or `null` for "everything". */
export function presetWindow(
  preset: RangePreset,
  customFrom: string,
  customTo: string,
): { from: number; to: number } | null {
  const today = startOfDay(new Date())

  switch (preset) {
    case 'today':
      return { from: today, to: today + DAY_MS - 1 }
    case 'yesterday':
      return { from: today - DAY_MS, to: today - 1 }
    case 'week':
      return { from: today - 6 * DAY_MS, to: today + DAY_MS - 1 }
    case 'month':
      return { from: today - 29 * DAY_MS, to: today + DAY_MS - 1 }
    case 'custom': {
      const from = customFrom
        ? Date.parse(customFrom)
        : Number.NEGATIVE_INFINITY
      const to = customTo
        ? Date.parse(customTo) + DAY_MS - 1
        : Number.POSITIVE_INFINITY
      return { from, to }
    }
    default:
      return null
  }
}

/** Local date key (`YYYY-MM-DD`) for a timestamp, in the visitor's timezone. */
export function dateKey(value: string | number | Date): string {
  const date = new Date(value)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/* -------------------------------------------------------------------------- */
/* Daily report                                                                */
/* -------------------------------------------------------------------------- */

export type DailyReportRow = {
  /** Local date key `YYYY-MM-DD`. */
  date: string
  /** Number of non-cancelled orders placed that day. */
  orders: number
  /** Total quantity of items ordered. */
  items: number
  /** Product revenue before discounts and delivery. */
  grossSales: number
  /** Total delivery fees collected. */
  shipping: number
  /** Total coupon/referral discounts applied. */
  couponDiscount: number
  /** Net revenue (grand total). */
  revenue: number
  /** Net revenue per order. */
  averageOrder: number
  /** Estimated profit = gross sales minus estimated cost of goods. */
  profit: number
}

/**
 * Groups non-cancelled orders into daily rows. `profitMarginPercent` is the
 * configured gross margin used to estimate profit per day.
 */
export function buildDailyRows(
  orders: CustomerOrder[],
  window_: { from: number; to: number } | null,
  profitMarginPercent: number,
): DailyReportRow[] {
  const byDay = new Map<string, DailyReportRow>()

  orders.forEach((order) => {
    if (order.status === 'cancelled') return
    const time = Date.parse(order.createdAt)
    if (!Number.isFinite(time)) return
    if (window_ && (time < window_.from || time > window_.to)) return

    const key = dateKey(order.createdAt)
    let row = byDay.get(key)
    if (!row) {
      row = {
        date: key,
        orders: 0,
        items: 0,
        grossSales: 0,
        shipping: 0,
        couponDiscount: 0,
        revenue: 0,
        averageOrder: 0,
        profit: 0,
      }
      byDay.set(key, row)
    }

    row.orders += 1
    row.items += order.items.reduce((total, item) => total + item.quantity, 0)
    row.grossSales += order.subtotal
    row.shipping += order.shipping
    row.couponDiscount += order.couponDiscount ?? 0
    row.revenue += order.total
  })

  const margin = Math.max(0, Math.min(100, profitMarginPercent || 0)) / 100
  return [...byDay.values()]
    .map((row) => ({
      ...row,
      averageOrder: row.orders > 0 ? row.revenue / row.orders : 0,
      profit: row.grossSales * margin,
    }))
    .sort((first, second) => second.date.localeCompare(first.date))
}

/** "2026-10-13" → "13/10/2026", timezone-safe and barcode friendly. */
export function readableDateKey(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export type DayBasket = {
  /** Orders placed on a single local day. */
  orders: CustomerOrder[]
  revenue: number
  profit: number
}

/** Splits a list of orders into "today" and "yesterday" for quick compare. */
export function todayVsYesterday(
  orders: CustomerOrder[],
  profitMarginPercent: number,
): { today: DayBasket; yesterday: DayBasket } {
  const todayKey = dateKey(Date.now())
  const yesterdayKey = dateKey(Date.now() - DAY_MS)
  const margin =
    Math.max(0, Math.min(100, profitMarginPercent || 0)) / 100

  const result: { today: DayBasket; yesterday: DayBasket } = {
    today: { orders: [], revenue: 0, profit: 0 },
    yesterday: { orders: [], revenue: 0, profit: 0 },
  }

  orders.forEach((order) => {
    if (order.status === 'cancelled') return
    const key = dateKey(order.createdAt)
    const basket =
      key === todayKey
        ? result.today
        : key === yesterdayKey
          ? result.yesterday
          : null
    if (!basket) return
    basket.orders.push(order)
    basket.revenue += order.total
    basket.profit += order.subtotal * margin
  })

  return result
}
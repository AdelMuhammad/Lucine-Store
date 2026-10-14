/**
 * Pure helpers for the operations console: procurement & inventory, delivery,
 * invoicing and accounting.
 *
 * Everything here is React-free so it can be shared by the admin pages, the
 * zustand stores and the Supabase services layer. Keeping `Date`/`crypto` calls
 * in module scope also satisfies the React compiler's purity rule, which forbids
 * calling them while a component renders.
 */

/* -------------------------------------------------------------------------- */
/* Ids, dates and money                                                       */
/* -------------------------------------------------------------------------- */

export function newOpsId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

/** Current timestamp as ISO. */
export function nowIso(): string {
  return new Date().toISOString()
}

/** Today as `YYYY-MM-DD` — the value an `<input type="date">` expects. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** A date `days` from today as `YYYY-MM-DD` (payment terms, delivery ETAs). */
export function isoDateInDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Only the `YYYY-MM-DD` part of an ISO timestamp. */
export function toDay(iso: string): string {
  return iso ? iso.slice(0, 10) : ''
}

/** Rounds to 2 decimals so money never carries floating point noise. */
export function round2(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100
}

export function lineTotal(quantity: number, unitPrice: number): number {
  return round2(quantity * unitPrice)
}

export function sumLines(
  lines: readonly { quantity: number; unitPrice: number }[],
): number {
  return round2(
    lines.reduce(
      (total, line) => total + lineTotal(line.quantity, line.unitPrice),
      0,
    ),
  )
}

/* -------------------------------------------------------------------------- */
/* Document totals (purchase orders + invoices)                               */
/* -------------------------------------------------------------------------- */

export type DocumentTotals = {
  /** Sum of the lines before discount. */
  subtotal: number
  /** Subtotal minus the document discount. */
  net: number
  taxAmount: number
  total: number
}

/** Applies discount, VAT and shipping on top of a set of lines. */
export function documentTotals(input: {
  lines: readonly { quantity: number; unitPrice: number }[]
  discount?: number
  shipping?: number
  /** VAT percentage (0–100); `0` keeps documents tax free. */
  taxRate?: number
}): DocumentTotals {
  const subtotal = sumLines(input.lines)
  const net = Math.max(0, round2(subtotal - (input.discount ?? 0)))
  const taxAmount = round2((net * (input.taxRate ?? 0)) / 100)
  const total = round2(net + taxAmount + (input.shipping ?? 0))
  return { subtotal, net, taxAmount, total }
}

/** `PO-2026-0007` style numbering, shared by purchase orders and invoices. */
export function documentNumber(
  prefix: string,
  sequence: number,
  year: number,
): string {
  return `${prefix}-${year}-${String(Math.max(1, sequence)).padStart(4, '0')}`
}

/* -------------------------------------------------------------------------- */
/* Status vocabularies                                                        */
/* -------------------------------------------------------------------------- */

export const purchaseStatuses = [
  'draft',
  'ordered',
  'partial',
  'received',
  'cancelled',
] as const
export type PurchaseStatus = (typeof purchaseStatuses)[number]

export const shipmentStatuses = [
  'pending',
  'picked-up',
  'in-transit',
  'out-for-delivery',
  'delivered',
  'failed',
  'returned',
  'cancelled',
] as const
export type ShipmentStatus = (typeof shipmentStatuses)[number]

/** The happy path, in the order the tracking timeline shows it. */
export const shipmentProgress: ShipmentStatus[] = [
  'pending',
  'picked-up',
  'in-transit',
  'out-for-delivery',
  'delivered',
]

export const invoiceStatuses = ['draft', 'issued', 'paid', 'void'] as const
export type InvoiceStatus = (typeof invoiceStatuses)[number]

export const invoiceKinds = ['sale', 'purchase'] as const
export type InvoiceKind = (typeof invoiceKinds)[number]

export const accountTypes = [
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense',
] as const
export type AccountType = (typeof accountTypes)[number]

export const paymentKinds = ['customer', 'supplier'] as const
export type PaymentKind = (typeof paymentKinds)[number]

export const paymentMethods = ['cash', 'card', 'transfer', 'wallet'] as const
export type PaymentMethod = (typeof paymentMethods)[number]

/** Vehicles an in-house courier can use. */
export const agentVehicles = ['motorcycle', 'car', 'van', 'truck'] as const
export type AgentVehicle = (typeof agentVehicles)[number]

export const expenseCategories = [
  'rent',
  'salaries',
  'marketing',
  'shipping',
  'utilities',
  'supplies',
  'other',
] as const
export type ExpenseCategory = (typeof expenseCategories)[number]

function pick<T extends string>(
  allowed: readonly T[],
  value: unknown,
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function asPurchaseStatus(value: unknown): PurchaseStatus {
  return pick(purchaseStatuses, value, 'draft')
}

export function asShipmentStatus(value: unknown): ShipmentStatus {
  return pick(shipmentStatuses, value, 'pending')
}

export function asInvoiceStatus(value: unknown): InvoiceStatus {
  return pick(invoiceStatuses, value, 'draft')
}

export function asInvoiceKind(value: unknown): InvoiceKind {
  return pick(invoiceKinds, value, 'sale')
}

export function asAccountType(value: unknown): AccountType {
  return pick(accountTypes, value, 'asset')
}

export function asPaymentKind(value: unknown): PaymentKind {
  return pick(paymentKinds, value, 'customer')
}

export function asPaymentMethod(value: unknown): PaymentMethod {
  return pick(paymentMethods, value, 'cash')
}

export function asExpenseCategory(value: unknown): ExpenseCategory {
  return pick(expenseCategories, value, 'other')
}

export function asAgentVehicle(value: unknown): AgentVehicle {
  return pick(agentVehicles, value, 'van')
}

/* -------------------------------------------------------------------------- */
/* Inventory                                                                  */
/* -------------------------------------------------------------------------- */

export type StockState = 'out' | 'low' | 'ok'

/** Whether a tracked quantity needs attention in the inventory screen. */
export function stockState(quantity: number, threshold: number): StockState {
  if (quantity <= 0) return 'out'
  if (quantity <= threshold) return 'low'
  return 'ok'
}

/* -------------------------------------------------------------------------- */
/* Purchase orders                                                            */
/* -------------------------------------------------------------------------- */

export type PurchaseLine = {
  id: string
  productId: string
  name: string
  quantity: number
  receivedQuantity: number
  unitCost: number
}

export type PurchaseLike = {
  status: PurchaseStatus
  items: readonly PurchaseLine[]
}

/** How much of the order has actually arrived, in units and percent. */
export function purchaseProgress(order: PurchaseLike): {
  ordered: number
  received: number
  percent: number
} {
  const ordered = order.items.reduce((total, item) => total + item.quantity, 0)
  const received = order.items.reduce(
    (total, item) => total + item.receivedQuantity,
    0,
  )
  const percent = ordered > 0 ? Math.round((received / ordered) * 100) : 0
  return { ordered, received, percent }
}

/** Lines with units still to arrive. */
export function outstandingLines(
  order: PurchaseLike,
): (PurchaseLine & { outstanding: number })[] {
  return order.items
    .map((item) => ({
      ...item,
      outstanding: Math.max(0, item.quantity - item.receivedQuantity),
    }))
    .filter((item) => item.outstanding > 0)
}

/** Whether every line of the order has been received in full. */
export function isPurchaseComplete(order: PurchaseLike): boolean {
  return (
    order.items.length > 0 &&
    order.items.every((item) => item.receivedQuantity >= item.quantity)
  )
}

/* -------------------------------------------------------------------------- */
/* Double-entry bookkeeping                                                   */
/* -------------------------------------------------------------------------- */

export type JournalLineLike = {
  accountCode: string
  debit: number
  credit: number
}

/** Debit/credit totals plus the balance check shown on journal screens. */
export function journalBalance(lines: readonly JournalLineLike[]): {
  debits: number
  credits: number
  difference: number
  balanced: boolean
} {
  const debits = round2(lines.reduce((total, line) => total + line.debit, 0))
  const credits = round2(lines.reduce((total, line) => total + line.credit, 0))
  const difference = round2(debits - credits)
  return { debits, credits, difference, balanced: difference === 0 }
}

/**
 * Normal balance side per account type: assets and expenses grow on the debit
 * side, everything else on the credit side.
 */
export function isDebitAccount(type: AccountType): boolean {
  return type === 'asset' || type === 'expense'
}

/**
 * Signed balance for an account given its journal lines. Positive means the
 * account holds value on its natural side, which is what the trial balance and
 * the reports display.
 */
export function accountBalance(
  type: AccountType,
  lines: readonly JournalLineLike[],
): number {
  const { debits, credits } = journalBalance(lines)
  return round2(isDebitAccount(type) ? debits - credits : credits - debits)
}

/** VAT amount for a taxable base, honouring the store's configured rate. */
export function vatAmount(base: number, rate: number): number {
  return round2((base * rate) / 100)
}

/** `%` formatting for the settings screen, e.g. `14 (٪)`. */
export function formatRate(rate: number): string {
  return `${round2(rate)}`
}

/* -------------------------------------------------------------------------- */
/* Delivery                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The subset of a shipping zone the rate helpers need. Defined structurally so
 * this module stays free of store imports.
 */
export type ZonedRate = {
  city: string
  fee: number
  codFee: number
  etaDays: number
  isActive?: boolean
}

/**
 * Picks the zone that prices a delivery to `city`: an exact (case-insensitive)
 * city match first, then the catch-all zone saved with an empty city.
 */
export function zoneRateFor<T extends ZonedRate>(
  zones: readonly T[],
  city: string,
): T | undefined {
  const active = zones.filter((zone) => zone.isActive !== false)
  const needle = city.trim().toLocaleLowerCase()
  if (needle) {
    const exact = active.find(
      (zone) => zone.city.trim().toLocaleLowerCase() === needle,
    )
    if (exact) return exact
  }
  return active.find((zone) => zone.city.trim() === '')
}

/** Money the courier has to collect on delivery (0 for prepaid orders). */
export function codAmountFor(order: {
  paymentMethod: 'card' | 'cash'
  total: number
}): number {
  return order.paymentMethod === 'cash' ? round2(order.total) : 0
}

/** Fills a carrier's tracking URL template with the shipment's number. */
export function trackingUrlFor(
  carrier: { trackingUrl: string } | undefined,
  trackingNumber: string,
): string {
  if (!carrier || !carrier.trackingUrl || !trackingNumber) return ''
  return carrier.trackingUrl.replace(/\{tracking\}/g, encodeURIComponent(trackingNumber))
}

/** How far a shipment has moved along the happy path (0 when off-track). */
export function shipmentStep(status: ShipmentStatus): number {
  return shipmentProgress.indexOf(status)
}

/** Statuses that end a delivery attempt for good. */
export function isShipmentClosed(status: ShipmentStatus): boolean {
  return (
    status === 'delivered' ||
    status === 'returned' ||
    status === 'cancelled'
  )
}

/** The next step on the happy path, or `null` once the parcel is done. */
export function nextShipmentStatus(
  status: ShipmentStatus,
): ShipmentStatus | null {
  const index = shipmentProgress.indexOf(status)
  if (index === -1 || index === shipmentProgress.length - 1) return null
  return shipmentProgress[index + 1]
}

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

/** Colour for the shipment status pills used across the delivery screens. */
export function shipmentStatusTone(status: ShipmentStatus): BadgeTone {
  switch (status) {
    case 'delivered':
      return 'success'
    case 'out-for-delivery':
      return 'warning'
    case 'failed':
      return 'danger'
    case 'returned':
      return 'warning'
    case 'picked-up':
    case 'in-transit':
      return 'info'
    default:
      return 'neutral'
  }
}

/** The order status a shipment status implies. */
export function orderStatusForShipment(
  status: ShipmentStatus,
): 'shipped' | 'out-for-delivery' | 'delivered' | 'cancelled' | null {
  switch (status) {
    case 'picked-up':
    case 'in-transit':
      return 'shipped'
    case 'out-for-delivery':
      return 'out-for-delivery'
    case 'delivered':
      return 'delivered'
    case 'returned':
    case 'cancelled':
      return 'cancelled'
    default:
      return null
  }
}

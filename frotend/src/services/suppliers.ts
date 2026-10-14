import { supabase } from '../lib/supabase'
import type {
  PurchaseOrder,
  StockMovement,
  Supplier,
} from '../features/ops/store/useSupplierStore'
import {
  asPurchaseStatus,
  type PurchaseLine,
} from '../features/ops/ops'
import { asArray, asNumber, asString } from './mappers'

/* -------------------------------------------------------------------------- */
/* Suppliers                                                                  */
/* -------------------------------------------------------------------------- */

type SupplierRow = {
  id: string
  name: string
  name_ar: string
  contact_name: string
  phone: string
  email: string
  address: string
  city: string
  country: string
  tax_id: string
  payment_terms: number
  notes: string
  is_active: boolean
  created_at: string
}

function toSupplier(row: Partial<SupplierRow>): Supplier {
  return {
    id: asString(row.id),
    name: asString(row.name),
    name_ar: asString(row.name_ar),
    contactName: asString(row.contact_name),
    phone: asString(row.phone),
    email: asString(row.email),
    address: asString(row.address),
    city: asString(row.city),
    country: asString(row.country),
    taxId: asString(row.tax_id),
    paymentTerms: asNumber(row.payment_terms),
    notes: asString(row.notes),
    isActive: row.is_active !== false,
    createdAt: asString(row.created_at),
  }
}

function supplierRow(supplier: Supplier): SupplierRow {
  return {
    id: supplier.id,
    name: supplier.name,
    name_ar: supplier.name_ar,
    contact_name: supplier.contactName,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    city: supplier.city,
    country: supplier.country,
    tax_id: supplier.taxId,
    payment_terms: supplier.paymentTerms,
    notes: supplier.notes,
    is_active: supplier.isActive,
    created_at: supplier.createdAt || new Date().toISOString(),
  }
}

export async function fetchSuppliers(): Promise<Supplier[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('[supabase] failed to load suppliers', error.message)
    return null
  }

  return (data ?? []).map((row) => toSupplier(row as SupplierRow))
}

export async function saveSupplier(supplier: Supplier): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('suppliers')
    .upsert(supplierRow(supplier), { onConflict: 'id' })

  if (error) console.error('[supabase] failed to save supplier', error.message)
}

export async function upsertSuppliers(suppliers: Supplier[]): Promise<void> {
  if (!supabase || suppliers.length === 0) return

  const { error } = await supabase
    .from('suppliers')
    .upsert(suppliers.map(supplierRow), { onConflict: 'id' })

  if (error) console.error('[supabase] failed to sync suppliers', error.message)
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('suppliers').delete().eq('id', supplierId)
  if (error) console.error('[supabase] failed to delete supplier', error.message)
}

/* -------------------------------------------------------------------------- */
/* Purchase orders                                                            */
/* -------------------------------------------------------------------------- */

type PurchaseOrderRow = {
  id: string
  number: string
  supplier_id: string
  status: string
  ordered_at: string | null
  expected_at: string | null
  received_at: string | null
  notes: string
  items: PurchaseLine[]
  discount: number
  shipping_cost: number
  tax_rate: number
  amount_paid: number
  created_at: string
}

function toLine(value: unknown): PurchaseLine {
  const row = (value ?? {}) as Partial<PurchaseLine>
  return {
    id: asString(row.id),
    productId: asString(row.productId),
    name: asString(row.name),
    quantity: asNumber(row.quantity),
    receivedQuantity: asNumber(row.receivedQuantity),
    unitCost: asNumber(row.unitCost),
  }
}

function toPurchaseOrder(row: Partial<PurchaseOrderRow>): PurchaseOrder {
  return {
    id: asString(row.id),
    number: asString(row.number),
    supplierId: asString(row.supplier_id),
    status: asPurchaseStatus(row.status),
    orderedAt: asString(row.ordered_at),
    expectedAt: asString(row.expected_at),
    receivedAt: asString(row.received_at),
    notes: asString(row.notes),
    items: asArray<unknown>(row.items).map(toLine),
    discount: asNumber(row.discount),
    shippingCost: asNumber(row.shipping_cost),
    taxRate: asNumber(row.tax_rate),
    amountPaid: asNumber(row.amount_paid),
    createdAt: asString(row.created_at),
  }
}

function purchaseOrderRow(order: PurchaseOrder): PurchaseOrderRow {
  return {
    id: order.id,
    number: order.number,
    supplier_id: order.supplierId,
    status: order.status,
    ordered_at: order.orderedAt || null,
    expected_at: order.expectedAt || null,
    received_at: order.receivedAt || null,
    notes: order.notes,
    items: order.items,
    discount: order.discount,
    shipping_cost: order.shippingCost,
    tax_rate: order.taxRate,
    amount_paid: order.amountPaid,
    created_at: order.createdAt || new Date().toISOString(),
  }
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .order('ordered_at', { ascending: false })

  if (error) {
    console.error('[supabase] failed to load purchase orders', error.message)
    return null
  }

  return (data ?? []).map((row) => toPurchaseOrder(row as PurchaseOrderRow))
}

export async function savePurchaseOrder(order: PurchaseOrder): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('purchase_orders')
    .upsert(purchaseOrderRow(order), { onConflict: 'id' })

  if (error) {
    console.error('[supabase] failed to save purchase order', error.message)
  }
}

export async function upsertPurchaseOrders(
  orders: PurchaseOrder[],
): Promise<void> {
  if (!supabase || orders.length === 0) return

  const { error } = await supabase
    .from('purchase_orders')
    .upsert(orders.map(purchaseOrderRow), { onConflict: 'id' })

  if (error) {
    console.error('[supabase] failed to sync purchase orders', error.message)
  }
}

export async function deletePurchaseOrder(orderId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', orderId)
  if (error) {
    console.error('[supabase] failed to delete purchase order', error.message)
  }
}

/* -------------------------------------------------------------------------- */
/* Stock movements                                                            */
/* -------------------------------------------------------------------------- */

type StockMovementRow = {
  id: string
  product_id: string
  quantity: number
  reason: string
  reference: string
  created_at: string
}

function asMovementReason(
  value: unknown,
): StockMovement['reason'] {
  if (value === 'order' || value === 'return' || value === 'adjustment') {
    return value
  }
  return 'purchase'
}

function toStockMovement(row: Partial<StockMovementRow>): StockMovement {
  return {
    id: asString(row.id),
    productId: asString(row.product_id),
    quantity: asNumber(row.quantity),
    reason: asMovementReason(row.reason),
    reference: asString(row.reference),
    createdAt: asString(row.created_at),
  }
}

function stockMovementRow(movement: StockMovement): StockMovementRow {
  return {
    id: movement.id,
    product_id: movement.productId,
    quantity: movement.quantity,
    reason: movement.reason,
    reference: movement.reference,
    created_at: movement.createdAt || new Date().toISOString(),
  }
}

export async function fetchStockMovements(): Promise<StockMovement[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[supabase] failed to load stock movements', error.message)
    return null
  }

  return (data ?? []).map((row) => toStockMovement(row as StockMovementRow))
}

export async function upsertStockMovements(
  movements: StockMovement[],
): Promise<void> {
  if (!supabase || movements.length === 0) return

  const { error } = await supabase
    .from('stock_movements')
    .upsert(movements.map(stockMovementRow), { onConflict: 'id' })

  if (error) {
    console.error('[supabase] failed to sync stock movements', error.message)
  }
}

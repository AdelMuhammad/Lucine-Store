import { create } from 'zustand'
import * as supplierService from '../../../services/suppliers'
import { useProductStore } from '../../products/store/useProductStore'
import {
  isPurchaseComplete,
  newOpsId,
  nowIso,
  todayIso,
  type PurchaseLine,
  type PurchaseStatus,
} from '../ops'

/** A vendor the store buys stock from. */
export type Supplier = {
  id: string
  name: string
  name_ar: string
  contactName: string
  phone: string
  email: string
  address: string
  city: string
  country: string
  taxId: string
  /** Payment terms in days; `0` means due on receipt. */
  paymentTerms: number
  notes: string
  isActive: boolean
  createdAt: string
}

export type { PurchaseLine }

/** A restocking order sent to a supplier. */
export type PurchaseOrder = {
  id: string
  /** Human reference, e.g. `PO-2026-0004`. */
  number: string
  supplierId: string
  status: PurchaseStatus
  /** Dates as `YYYY-MM-DD`. */
  orderedAt: string
  expectedAt: string
  receivedAt: string
  notes: string
  items: PurchaseLine[]
  /** Flat discount taken off the goods subtotal. */
  discount: number
  /** Freight paid to bring the order in. */
  shippingCost: number
  /** VAT percentage applied to the goods subtotal. */
  taxRate: number
  /** How much has already been paid to the supplier. */
  amountPaid: number
  createdAt: string
}

/** Every stock change, so the inventory screen can show an audit trail. */
export type StockMovement = {
  id: string
  productId: string
  /** Positive = stock in, negative = stock out. */
  quantity: number
  reason: 'purchase' | 'order' | 'return' | 'adjustment'
  /** The document that caused it (PO number, order id, note…). */
  reference: string
  createdAt: string
}

type SupplierState = {
  suppliers: Supplier[]
  purchaseOrders: PurchaseOrder[]
  movements: StockMovement[]
  addSupplier: (supplier: Supplier) => Promise<void>
  updateSupplier: (supplier: Supplier) => Promise<void>
  removeSupplier: (supplierId: string) => Promise<void>
  addPurchaseOrder: (order: PurchaseOrder) => Promise<void>
  updatePurchaseOrder: (order: PurchaseOrder) => Promise<void>
  removePurchaseOrder: (orderId: string) => Promise<void>
  /**
   * Books units in against a purchase order: raises the products' stock, keeps
   * the latest buying price on the product and logs a stock movement per line.
   * Pass `receipts` (line id → units) to receive a partial delivery; omit it to
   * receive everything still outstanding.
   */
  receivePurchaseOrder: (
    orderId: string,
    receipts?: Record<string, number>,
  ) => Promise<void>
  /** Manual stock correction (± units) made from the inventory screen. */
  adjustStock: (
    productId: string,
    delta: number,
    reference: string,
  ) => Promise<void>
  /** Loads suppliers, purchase orders and movements from Supabase. */
  hydrate: () => Promise<void>
}

export const useSupplierStore = create<SupplierState>()(
  (set, get) => ({
      suppliers: [],
      purchaseOrders: [],
      movements: [],

      addSupplier: async (supplier) => {
        set((state) => ({ suppliers: [...state.suppliers, supplier] }))
        await supplierService.saveSupplier(supplier)
      },
      updateSupplier: async (supplier) => {
        set((state) => ({
          suppliers: state.suppliers.map((item) =>
            item.id === supplier.id ? supplier : item,
          ),
        }))
        await supplierService.saveSupplier(supplier)
      },
      removeSupplier: async (supplierId) => {
        set((state) => ({
          suppliers: state.suppliers.filter((item) => item.id !== supplierId),
        }))
        await supplierService.deleteSupplier(supplierId)
      },

      addPurchaseOrder: async (order) => {
        set((state) => ({ purchaseOrders: [order, ...state.purchaseOrders] }))
        await supplierService.savePurchaseOrder(order)
      },
      updatePurchaseOrder: async (order) => {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((item) =>
            item.id === order.id ? order : item,
          ),
        }))
        await supplierService.savePurchaseOrder(order)
      },
      removePurchaseOrder: async (orderId) => {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.filter(
            (item) => item.id !== orderId,
          ),
        }))
        await supplierService.deletePurchaseOrder(orderId)
      },

      receivePurchaseOrder: async (orderId, receipts) => {
        const order = get().purchaseOrders.find((item) => item.id === orderId)
        if (!order || order.status === 'cancelled') return

        const productStore = useProductStore.getState()
        const movements: StockMovement[] = []
        let receivedUnits = 0

        const items = order.items.map((item) => {
          const outstanding = Math.max(0, item.quantity - item.receivedQuantity)
          const requested = receipts ? (receipts[item.id] ?? 0) : outstanding
          const received = Math.max(0, Math.min(Math.floor(requested), outstanding))
          if (received <= 0) return item

          const product = productStore.products.find(
            (entry) => entry.id === item.productId,
          )
          if (product) {
            const current = product.stockQuantity ?? 0
            productStore.updateProduct({
              ...product,
              stockQuantity: current + received,
              costPrice: item.unitCost > 0 ? item.unitCost : product.costPrice,
            })
          }

          movements.push({
            id: newOpsId('movement'),
            productId: item.productId,
            quantity: received,
            reason: 'purchase',
            reference: order.number || order.id,
            createdAt: nowIso(),
          })
          receivedUnits += received

          return { ...item, receivedQuantity: item.receivedQuantity + received }
        })

        if (receivedUnits === 0) return

        const complete = isPurchaseComplete({ status: order.status, items })
        const updated: PurchaseOrder = {
          ...order,
          items,
          status: complete ? 'received' : 'partial',
          receivedAt: complete ? todayIso() : order.receivedAt,
        }

        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((item) =>
            item.id === updated.id ? updated : item,
          ),
          movements: [...movements, ...state.movements],
        }))

        await supplierService.savePurchaseOrder(updated)
        await supplierService.upsertStockMovements(movements)
      },

      adjustStock: async (productId, delta, reference) => {
        const units = Math.trunc(delta)
        if (!units) return
        const productStore = useProductStore.getState()
        const product = productStore.products.find((entry) => entry.id === productId)
        if (!product) return

        productStore.updateProduct({
          ...product,
          stockQuantity: Math.max(0, (product.stockQuantity ?? 0) + units),
        })

        const movement: StockMovement = {
          id: newOpsId('movement'),
          productId,
          quantity: units,
          reason: 'adjustment',
          reference,
          createdAt: nowIso(),
        }

        set((state) => ({ movements: [movement, ...state.movements] }))
        await supplierService.upsertStockMovements([movement])
      },

      hydrate: async () => {
        const [remoteSuppliers, remoteOrders, remoteMovements] =
          await Promise.all([
            supplierService.fetchSuppliers(),
            supplierService.fetchPurchaseOrders(),
            supplierService.fetchStockMovements(),
          ])

          if (remoteSuppliers) {
            set({
              suppliers: remoteSuppliers.toSorted((first, second) =>
                first.name.localeCompare(second.name),
              ),
            })
          }

          if (remoteOrders) {
            set({
              purchaseOrders: remoteOrders.toSorted((first, second) =>
                second.orderedAt.localeCompare(first.orderedAt),
              ),
            })
          }

          if (remoteMovements) {
            set({
              movements: remoteMovements.toSorted((first, second) =>
                second.createdAt.localeCompare(first.createdAt),
              ),
            })
          }
      },
    }),
)

/** Looks a supplier up by id, for labels and defaults. */
export function findSupplier(
  suppliers: readonly Supplier[],
  supplierId: string,
): Supplier | undefined {
  return suppliers.find((supplier) => supplier.id === supplierId)
}

/** Supplier labels are bilingual; this picks the one matching the UI language. */
export function supplierName(supplier: Supplier | undefined, arabic: boolean): string {
  if (!supplier) return ''
  return arabic ? supplier.name_ar || supplier.name : supplier.name
}

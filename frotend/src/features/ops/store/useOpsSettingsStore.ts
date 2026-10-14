import { create } from 'zustand'
import * as opsService from '../../../services/ops'
import { documentNumber } from '../ops'

/**
 * Store-wide settings for the operations console: company identity for the
 * printed documents, VAT rate, document numbering and inventory thresholds.
 * A single row in `ops_settings` holds the whole object, mirroring how the
 * marketing settings are stored.
 */
export type OpsSettings = {
  companyName: string
  companyNameAr: string
  taxNumber: string
  address: string
  phone: string
  email: string
  currency: string
  /** VAT percentage applied to invoices (0–100); `0` keeps them tax free. */
  vatRate: number
  /** Prefix + running number for customer invoices. */
  invoicePrefix: string
  nextInvoiceNumber: number
  /** Prefix + running number for supplier purchase orders. */
  purchasePrefix: string
  nextPurchaseNumber: number
  /** Inventory: quantities at or below this level are flagged as low. */
  lowStockThreshold: number
  /** Delivery: allow cash-on-delivery orders and the fee charged for them. */
  codEnabled: boolean
  defaultCodFee: number
  /** Accounting: the first day of the fiscal year (month-day agnostic date). */
  fiscalYearStart: string
}

export const defaultOpsSettings: OpsSettings = {
  companyName: '',
  companyNameAr: '',
  taxNumber: '',
  address: '',
  phone: '',
  email: '',
  currency: 'USD',
  vatRate: 0,
  invoicePrefix: 'INV',
  nextInvoiceNumber: 1,
  purchasePrefix: 'PO',
  nextPurchaseNumber: 1,
  lowStockThreshold: 3,
  codEnabled: true,
  defaultCodFee: 0,
  fiscalYearStart: '2026-01-01',
}

type OpsSettingsState = {
  settings: OpsSettings
  /** Merges the given fields and persists them to Supabase. */
  updateSettings: (patch: Partial<OpsSettings>) => Promise<void>
  /** Formats the next invoice/PO number and advances the counter. */
  takeDocumentNumber: (kind: 'invoice' | 'purchase') => string
  /** Loads the settings row from Supabase when configured. */
  hydrate: () => Promise<void>
}

export const useOpsSettingsStore = create<OpsSettingsState>()(
  (set, get) => ({
      settings: { ...defaultOpsSettings },
      updateSettings: async (patch) => {
        const next: OpsSettings = { ...get().settings, ...patch }
        set({ settings: next })
        await opsService.saveOpsSettings(next)
      },
      takeDocumentNumber: (kind) => {
        const settings = get().settings
        const year = new Date().getFullYear()
        const isInvoice = kind === 'invoice'
        const sequence = isInvoice
          ? settings.nextInvoiceNumber
          : settings.nextPurchaseNumber
        const prefix = isInvoice
          ? settings.invoicePrefix
          : settings.purchasePrefix

        set({
          settings: isInvoice
            ? { ...settings, nextInvoiceNumber: sequence + 1 }
            : { ...settings, nextPurchaseNumber: sequence + 1 },
        })

        return documentNumber(prefix || (isInvoice ? 'INV' : 'PO'), sequence, year)
      },
      hydrate: async () => {
        const remote = await opsService.fetchOpsSettings()
        if (remote) {
          set({ settings: { ...defaultOpsSettings, ...remote } })
        }
      },
    }),
)

import { supabase } from '../lib/supabase'
import type { OpsSettings } from '../features/ops/store/useOpsSettingsStore'
import { defaultOpsSettings } from '../features/ops/store/useOpsSettingsStore'
import { asBoolean, asNumber, asString } from './mappers'

/**
 * Operations settings live in a single JSONB row (`ops_settings`), the same
 * shape the marketing settings use. Every read is sanitised so a partially filled
 * row still yields a usable object.
 */
export async function fetchOpsSettings(): Promise<Partial<OpsSettings> | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('ops_settings')
    .select('data')
    .eq('id', 'default')
    .maybeSingle()

  if (error) {
    console.error('[supabase] failed to load ops settings', error.message)
    return null
  }

  const stored = (data as { data?: unknown } | null)?.data
  if (!stored || typeof stored !== 'object') return null

  const row = stored as Partial<OpsSettings>

  return {
    companyName: asString(row.companyName),
    companyNameAr: asString(row.companyNameAr),
    taxNumber: asString(row.taxNumber),
    address: asString(row.address),
    phone: asString(row.phone),
    email: asString(row.email),
    currency: asString(row.currency, defaultOpsSettings.currency),
    vatRate: asNumber(row.vatRate, defaultOpsSettings.vatRate),
    invoicePrefix: asString(
      row.invoicePrefix,
      defaultOpsSettings.invoicePrefix,
    ),
    nextInvoiceNumber: asNumber(
      row.nextInvoiceNumber,
      defaultOpsSettings.nextInvoiceNumber,
    ),
    purchasePrefix: asString(
      row.purchasePrefix,
      defaultOpsSettings.purchasePrefix,
    ),
    nextPurchaseNumber: asNumber(
      row.nextPurchaseNumber,
      defaultOpsSettings.nextPurchaseNumber,
    ),
    lowStockThreshold: asNumber(
      row.lowStockThreshold,
      defaultOpsSettings.lowStockThreshold,
    ),
    codEnabled: asBoolean(row.codEnabled, defaultOpsSettings.codEnabled),
    defaultCodFee: asNumber(row.defaultCodFee, defaultOpsSettings.defaultCodFee),
    fiscalYearStart: asString(
      row.fiscalYearStart,
      defaultOpsSettings.fiscalYearStart,
    ),
  }
}

export async function saveOpsSettings(
  settings: OpsSettings,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase.from('ops_settings').upsert(
    { id: 'default', data: settings, updated_at: new Date().toISOString() },
    { onConflict: 'id' },
  )

  if (error) console.error('[supabase] failed to save ops settings', error.message)
}

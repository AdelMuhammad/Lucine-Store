import { supabase } from '../lib/supabase'
import type { AccountType } from '../features/ops/ops'

/* -------------------------------------------------------------------------- */
/* Accounts (Chart of Accounts)                                               */
/* -------------------------------------------------------------------------- */

type AccountRow = {
  code: string
  name: string
  name_ar: string
  type: AccountType
  is_active: boolean
  created_at: string
}

function toAccountRow(row: Partial<AccountRow>): AccountRow {
  return {
    code: row.code ?? '',
    name: row.name ?? '',
    name_ar: row.name_ar ?? '',
    type: row.type as AccountType,
    is_active: row.is_active !== false,
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

export async function fetchAccounts(): Promise<AccountRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('code', { ascending: true })

  if (error) {
    console.error('[supabase] failed to load accounts', error.message)
    return []
  }
  return (data ?? []).map(toAccountRow)
}

export async function saveAccount(account: {
  code: string
  name: string
  name_ar: string
  type: AccountType
  isActive?: boolean
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('accounts')
    .upsert({
      code: account.code,
      name: account.name,
      name_ar: account.name_ar,
      type: account.type,
      is_active: account.isActive,
    })
  if (error) console.error('[supabase] failed to save account', error.message)
}

export async function deleteAccount(code: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('accounts').delete().eq('code', code)
  if (error) console.error('[supabase] failed to delete account', error.message)
}

/* -------------------------------------------------------------------------- */
/* Journal Entries                                                            */
/* -------------------------------------------------------------------------- */

type JournalEntryRow = {
  id: string
  entry_date: string
  description: string
  description_ar: string
  source_type: string
  source_id: string
  lines: any[]
  created_at: string
}

function toJournalEntryRow(row: Partial<JournalEntryRow>): JournalEntryRow {
  return {
    id: row.id ?? '',
    entry_date: row.entry_date ?? new Date().toISOString().split('T')[0],
    description: row.description ?? '',
    description_ar: row.description_ar ?? '',
    source_type: row.source_type ?? '',
    source_id: row.source_id ?? '',
    lines: row.lines ?? [],
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

export async function fetchJournalEntries(): Promise<JournalEntryRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[supabase] failed to load journal entries', error.message)
    return []
  }
  return (data ?? []).map(toJournalEntryRow)
}

export async function saveJournalEntry(entry: {
  entry_date: string
  description: string
  description_ar: string
  source_type: string
  source_id: string
  lines: any[]
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('journal_entries')
    .upsert({
      entry_date: entry.entry_date,
      description: entry.description,
      description_ar: entry.description_ar,
      source_type: entry.source_type,
      source_id: entry.source_id,
      lines: entry.lines,
    })
  if (error) console.error('[supabase] failed to save journal entry', error.message)
}

export async function deleteJournalEntry(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('journal_entries').delete().eq('id', id)
  if (error) console.error('[supabase] failed to delete journal entry', error.message)
}

/* -------------------------------------------------------------------------- */
/* Expenses                                                                    */
/* -------------------------------------------------------------------------- */

type ExpenseRow = {
  id: string
  expense_date: string
  description: string
  description_ar: string
  category: string
  amount: number
  payment_method: string
  reference: string
  notes: string
  created_at: string
}

function toExpenseRow(row: Partial<ExpenseRow>): ExpenseRow {
  return {
    id: row.id ?? '',
    expense_date: row.expense_date ?? new Date().toISOString().split('T')[0],
    description: row.description ?? '',
    description_ar: row.description_ar ?? '',
    category: row.category ?? 'other',
    amount: row.amount ?? 0,
    payment_method: row.payment_method ?? 'cash',
    reference: row.reference ?? '',
    notes: row.notes ?? '',
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

export async function fetchExpenses(): Promise<ExpenseRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })

  if (error) {
    console.error('[supabase] failed to load expenses', error.message)
    return []
  }
  return (data ?? []).map(toExpenseRow)
}

export async function saveExpense(expense: {
  expense_date: string
  description: string
  description_ar: string
  category: string
  amount: number
  payment_method: string
  reference: string
  notes: string
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('expenses')
    .upsert(toExpenseRow(expense), { onConflict: 'id' })
  if (error) console.error('[supabase] failed to save expense', error.message)
}

export async function deleteExpense(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) console.error('[supabase] failed to delete expense', error.message)
}

/* -------------------------------------------------------------------------- */
/* Payments                                                                    */
/* -------------------------------------------------------------------------- */

type PaymentRow = {
  id: string
  payment_date: string
  amount: number
  kind: string
  payment_method: string
  order_id: string
  supplier_id: string
  notes: string
  created_at: string
}

function toPaymentRow(row: Partial<PaymentRow>): PaymentRow {
  return {
    id: row.id ?? '',
    payment_date: row.payment_date ?? new Date().toISOString().split('T')[0],
    amount: row.amount ?? 0,
    kind: row.kind ?? 'customer',
    payment_method: row.payment_method ?? 'cash',
    order_id: row.order_id ?? '',
    supplier_id: row.supplier_id ?? '',
    notes: row.notes ?? '',
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

export async function fetchPayments(): Promise<PaymentRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false })

  if (error) {
    console.error('[supabase] failed to load payments', error.message)
    return []
  }
  return (data ?? []).map(toPaymentRow)
}

export async function savePayment(payment: {
  payment_date: string
  amount: number
  kind: string
  payment_method: string
  order_id: string
  supplier_id: string
  notes: string
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('payments')
    .upsert(toPaymentRow(payment), { onConflict: 'id' })
  if (error) console.error('[supabase] failed to save payment', error.message)
}

export async function deletePayment(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) console.error('[supabase] failed to delete payment', error.message)
}
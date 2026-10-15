import { supabase } from '../lib/supabase'
import type { AccountType } from '../features/ops/ops'

/** Expense categories accepted by the `expenses.category` CHECK constraint. */
const EXPENSE_CATEGORIES = new Set([
  'rent',
  'salaries',
  'marketing',
  'shipping',
  'utilities',
  'supplies',
  'other',
])

/** Payment methods accepted by the `method` CHECK constraint. */
const PAYMENT_METHODS = new Set(['cash', 'card', 'transfer', 'wallet'])

/** Payment directions accepted by the `payments.kind` CHECK constraint. */
const PAYMENT_KINDS = new Set(['customer', 'supplier'])

/** Journal origins accepted by the `journal_entries.source_type` constraint. */
const JOURNAL_SOURCES = new Set([
  'order',
  'invoice',
  'purchase-order',
  'expense',
  'payment',
  'manual',
])

/**
 * Normalises free-form UI values to the exact strings the CHECK constraints
 * allow, so a save is never rejected for an unknown label.
 */
function oneOf(value: unknown, allowed: Set<string>, fallback: string): string {
  const candidate = String(value ?? '').trim().toLowerCase()
  return allowed.has(candidate) ? candidate : fallback
}

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

/**
 * Shape of a row in `journal_entries`. The database stores the narrative as a
 * single `memo` column (see `supabase/schema.sql`), so reads expose it as
 * `description` for the accounting UI.
 */
type JournalEntryRow = {
  id: string
  entry_date: string
  memo: string
  source_type: string
  source_id: string
  lines: any[]
  created_at: string
}

function toJournalEntryRow(row: Partial<JournalEntryRow>): JournalEntryRow {
  return {
    id: row.id ?? '',
    entry_date: row.entry_date ?? new Date().toISOString().split('T')[0],
    memo: row.memo ?? '',
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
  id?: string
  entry_date: string
  description: string
  source_type: string
  source_id: string
  lines: any[]
}): Promise<void> {
  if (!supabase) return
  // `journal_entries.id` is a plain text primary key with no default, so an id
  // must be supplied for inserts.
  const { error } = await supabase
    .from('journal_entries')
    .upsert(
      {
        id: entry.id?.trim() || crypto.randomUUID(),
        entry_date: entry.entry_date,
        memo: entry.description,
        source_type: oneOf(entry.source_type, JOURNAL_SOURCES, 'manual'),
        source_id: entry.source_id,
        lines: entry.lines,
      },
      { onConflict: 'id' },
    )
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

/**
 * Row shape of `expenses`. The table uses `method` for the payment method and
 * has no `reference`/`description_ar` columns — see `supabase/schema.sql`.
 */
type ExpenseRow = {
  id: string
  expense_date: string
  description: string
  category: string
  supplier_id: string
  amount: number
  method: string
  notes: string
  created_at: string
}

function toExpenseRow(row: Partial<ExpenseRow>): ExpenseRow {
  return {
    id: row.id ?? '',
    expense_date: row.expense_date ?? new Date().toISOString().split('T')[0],
    description: row.description ?? '',
    category: row.category ?? 'other',
    supplier_id: row.supplier_id ?? '',
    amount: row.amount ?? 0,
    method: row.method ?? 'cash',
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
  id?: string
  expense_date: string
  description: string
  category: string
  amount: number
  method: string
  notes: string
  supplier_id?: string
}): Promise<void> {
  if (!supabase) return
  // `expenses.id` is a text primary key with no default, so generate one on insert.
  const { error } = await supabase
    .from('expenses')
    .upsert(
      {
        id: expense.id?.trim() || crypto.randomUUID(),
        expense_date: expense.expense_date,
        description: expense.description,
        category: oneOf(expense.category, EXPENSE_CATEGORIES, 'other'),
        supplier_id: expense.supplier_id ?? '',
        amount: expense.amount,
        method: oneOf(expense.method, PAYMENT_METHODS, 'cash'),
        notes: expense.notes,
      },
      { onConflict: 'id' },
    )
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

/**
 * Row shape of `payments`. The table stores the date in `paid_at` and the
 * payment method in `method` (see `supabase/schema.sql`).
 */
type PaymentRow = {
  id: string
  party_name: string
  paid_at: string | null
  amount: number
  kind: string
  method: string
  order_id: string
  supplier_id: string
  notes: string
  created_at: string
}

function toPaymentRow(row: Partial<PaymentRow>): PaymentRow {
  return {
    id: row.id ?? '',
    party_name: row.party_name ?? '',
    paid_at: row.paid_at ?? new Date().toISOString().split('T')[0],
    amount: row.amount ?? 0,
    kind: row.kind ?? 'customer',
    method: row.method ?? 'cash',
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
    .order('paid_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[supabase] failed to load payments', error.message)
    return []
  }
  return (data ?? []).map(toPaymentRow)
}

export async function savePayment(payment: {
  id?: string
  party_name?: string
  paid_at: string
  amount: number
  kind: string
  method: string
  order_id?: string
  supplier_id?: string
  notes?: string
}): Promise<void> {
  if (!supabase) return
  // `payments.id` is a text primary key with no default, so generate one on insert.
  const { error } = await supabase
    .from('payments')
    .upsert(
      {
        id: payment.id?.trim() || crypto.randomUUID(),
        party_name: payment.party_name ?? '',
        paid_at: payment.paid_at,
        amount: payment.amount,
        kind: oneOf(payment.kind, PAYMENT_KINDS, 'customer'),
        method: oneOf(payment.method, PAYMENT_METHODS, 'cash'),
        order_id: payment.order_id ?? '',
        supplier_id: payment.supplier_id ?? '',
        notes: payment.notes ?? '',
      },
      { onConflict: 'id' },
    )
  if (error) console.error('[supabase] failed to save payment', error.message)
}

export async function deletePayment(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) console.error('[supabase] failed to delete payment', error.message)
}
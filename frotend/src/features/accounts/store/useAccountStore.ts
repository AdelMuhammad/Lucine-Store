import { create } from 'zustand'

// Use any types to avoid strict type issues - can be refined later
export const useAccountStore = create(
  (set: any) => ({
      accounts: [],
      journals: [],
      expenses: [],
      payments: [],
      section: 'accounts',

      setSection: (section: string) => set({ section }),

      // Accounts
      fetchAccounts: async () => {
        try {
          const { fetchAccounts } = await import('../../../services/accounts')
          const rows = await fetchAccounts()
          set({
            accounts: rows.map((row) => ({
              code: row.code,
              name: row.name,
              name_ar: row.name_ar,
              type: row.type,
              isActive: row.is_active !== false,
            })),
          })
        } catch {
          set({ accounts: [] })
        }
      },
      addAccount: async (account: any) => {
        set((state: any) => ({ accounts: [...state.accounts, account] }))
        try {
          const { saveAccount } = await import('../../../services/accounts')
          await saveAccount({
            code: account.code,
            name: account.name,
            name_ar: account.name_ar ?? '',
            type: account.type,
            isActive: account.isActive,
          })
        } catch (error) {
          console.error('[supabase] failed to persist account create', error)
        }
      },
      updateAccount: async (account: any) => {
        set((state: any) => ({
          accounts: state.accounts.map((a: any) => (a.code === account.code ? account : a)),
        }))
        try {
          const { saveAccount } = await import('../../../services/accounts')
          await saveAccount({
            code: account.code,
            name: account.name,
            name_ar: account.name_ar ?? '',
            type: account.type,
            isActive: account.isActive,
          })
        } catch (error) {
          console.error('[supabase] failed to persist account update', error)
        }
      },
      removeAccount: async (code: string) => {
        set((state: any) => ({ accounts: state.accounts.filter((a: any) => a.code !== code) }))
        try {
          const { deleteAccount } = await import('../../../services/accounts')
          await deleteAccount(code)
        } catch (error) {
          console.error('[supabase] failed to persist account delete', error)
        }
      },

      // Journals
      fetchJournals: async () => {
        try {
          const { fetchJournalEntries } = await import('../../../services/accounts')
          const rows = await fetchJournalEntries()
          set({
            journals: rows.map((row) => {
              const lines = Array.isArray(row.lines) ? row.lines : []
              const debit = lines.reduce(
                (sum: number, line: any) => sum + (Number(line?.debit) || 0),
                0,
              )
              const credit = lines.reduce(
                (sum: number, line: any) => sum + (Number(line?.credit) || 0),
                0,
              )
              return {
                id: row.id,
                ref: row.source_id,
                date: row.entry_date,
                description: row.memo,
                debit,
                credit,
              }
            }),
          })
        } catch {
          set({ journals: [] })
        }
      },
      addJournalEntry: async (entry: any) => {
        set((state: any) => ({ journals: [...state.journals, entry] }))
        try {
          const { saveJournalEntry } = await import('../../../services/accounts')
          await saveJournalEntry({
            id: entry.id,
            entry_date: entry.entry_date ?? entry.date ?? new Date().toISOString().split('T')[0],
            description: entry.description,
            source_type: entry.source_type ?? 'manual',
            source_id: entry.source_id ?? entry.ref ?? entry.id ?? '',
            lines: entry.lines ?? [],
          })
        } catch (error) {
          console.error('[supabase] failed to persist journal entry', error)
        }
      },
      removeJournalEntry: async (id: string) => {
        set((state: any) => ({ journals: state.journals.filter((j: any) => j.id !== id) }))
        try {
          const { deleteJournalEntry } = await import('../../../services/accounts')
          await deleteJournalEntry(id)
        } catch (error) {
          console.error('[supabase] failed to persist journal delete', error)
        }
      },

      // Expenses
      fetchExpenses: async () => {
        try {
          const { fetchExpenses } = await import('../../../services/accounts')
          const rows = await fetchExpenses()
          set({
            expenses: rows.map((row) => ({
              id: row.id,
              vendor: row.description,
              category: row.category,
              date: row.expense_date,
              amount: row.amount,
            })),
          })
        } catch {
          set({ expenses: [] })
        }
      },
      addExpense: async (expense: any) => {
        set((state: any) => ({ expenses: [...state.expenses, expense] }))
        try {
          const { saveExpense } = await import('../../../services/accounts')
          await saveExpense({
            id: expense.id,
            expense_date: expense.expense_date ?? expense.date ?? new Date().toISOString().split('T')[0],
            description: expense.description ?? expense.vendor ?? '',
            category: expense.category ?? 'other',
            amount: Number(expense.amount) || 0,
            method: expense.method ?? expense.payment_method ?? 'cash',
            notes: expense.notes ?? '',
            supplier_id: expense.supplier_id,
          })
        } catch (error) {
          console.error('[supabase] failed to persist expense', error)
        }
      },
      removeExpense: async (id: string) => {
        set((state: any) => ({ expenses: state.expenses.filter((e: any) => e.id !== id) }))
        try {
          const { deleteExpense } = await import('../../../services/accounts')
          await deleteExpense(id)
        } catch (error) {
          console.error('[supabase] failed to persist expense delete', error)
        }
      },

      // Payments
      fetchPayments: async () => {
        try {
          const { fetchPayments } = await import('../../../services/accounts')
          const rows = await fetchPayments()
          set({
            payments: rows.map((row) => ({
              id: row.id,
              customer: row.party_name || row.notes,
              method: row.method,
              date: row.paid_at,
              amount: row.amount,
            })),
          })
        } catch {
          set({ payments: [] })
        }
      },
      addPayment: async (payment: any) => {
        set((state: any) => ({ payments: [...state.payments, payment] }))
        try {
          const { savePayment } = await import('../../../services/accounts')
          await savePayment({
            id: payment.id,
            party_name: payment.party_name ?? payment.customer ?? '',
            paid_at: payment.paid_at ?? payment.date ?? new Date().toISOString().split('T')[0],
            amount: Number(payment.amount) || 0,
            kind: payment.kind ?? 'customer',
            method: payment.method ?? payment.payment_method ?? 'cash',
            order_id: payment.order_id ?? payment.ref ?? '',
            supplier_id: payment.supplier_id ?? '',
            notes: payment.notes ?? payment.customer ?? '',
          })
        } catch (error) {
          console.error('[supabase] failed to persist payment', error)
        }
      },
      removePayment: async (id: string) => {
        set((state: any) => ({ payments: state.payments.filter((p: any) => p.id !== id) }))
        try {
          const { deletePayment } = await import('../../../services/accounts')
          await deletePayment(id)
        } catch (error) {
          console.error('[supabase] failed to persist payment delete', error)
        }
      },
    })
)
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
          set({ accounts: rows as any })
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
          set({ journals: rows as any })
        } catch {
          set({ journals: [] })
        }
      },
      addJournalEntry: async (entry: any) => {
        set((state: any) => ({ journals: [...state.journals, entry] }))
        try {
          const { saveJournalEntry } = await import('../../../services/accounts')
          await saveJournalEntry({
            entry_date: entry.entry_date ?? entry.date ?? new Date().toISOString().split('T')[0],
            description: entry.description,
            description_ar: entry.description_ar ?? '',
            source_type: entry.source_type ?? entry.ref ?? 'manual',
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
          set({ expenses: rows as any })
        } catch {
          set({ expenses: [] })
        }
      },
      addExpense: async (expense: any) => {
        set((state: any) => ({ expenses: [...state.expenses, expense] }))
        try {
          const { saveExpense } = await import('../../../services/accounts')
          await saveExpense({
            expense_date: expense.expense_date ?? expense.date ?? new Date().toISOString().split('T')[0],
            description: expense.description ?? expense.vendor ?? '',
            description_ar: expense.description_ar ?? '',
            category: expense.category ?? 'other',
            amount: Number(expense.amount) || 0,
            payment_method: expense.payment_method ?? expense.method ?? 'cash',
            reference: expense.reference ?? expense.id ?? '',
            notes: expense.notes ?? '',
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
          set({ payments: rows as any })
        } catch {
          set({ payments: [] })
        }
      },
      addPayment: async (payment: any) => {
        set((state: any) => ({ payments: [...state.payments, payment] }))
        try {
          const { savePayment } = await import('../../../services/accounts')
          await savePayment({
            payment_date: payment.payment_date ?? payment.date ?? new Date().toISOString().split('T')[0],
            amount: Number(payment.amount) || 0,
            kind: payment.kind ?? 'customer',
            payment_method: payment.payment_method ?? payment.method ?? 'cash',
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
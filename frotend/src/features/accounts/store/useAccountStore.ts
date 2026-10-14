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
      fetchAccounts: async () => set({ accounts: [] }),
      addAccount: (account: any) =>
        set((state: any) => ({ accounts: [...state.accounts, account] })),
      updateAccount: (account: any) =>
        set((state: any) => ({
          accounts: state.accounts.map((a: any) => (a.code === account.code ? account : a)),
        })),
      removeAccount: (code: string) =>
        set((state: any) => ({ accounts: state.accounts.filter((a: any) => a.code !== code) })),

      // Journals
      fetchJournals: async () => set({ journals: [] }),
      addJournalEntry: (entry: any) =>
        set((state: any) => ({ journals: [...state.journals, entry] })),
      removeJournalEntry: (id: string) =>
        set((state: any) => ({ journals: state.journals.filter((j: any) => j.id !== id) })),

      // Expenses
      fetchExpenses: async () => set({ expenses: [] }),
      addExpense: (expense: any) =>
        set((state: any) => ({ expenses: [...state.expenses, expense] })),
      removeExpense: (id: string) =>
        set((state: any) => ({ expenses: state.expenses.filter((e: any) => e.id !== id) })),

      // Payments
      fetchPayments: async () => set({ payments: [] }),
      addPayment: (payment: any) =>
        set((state: any) => ({ payments: [...state.payments, payment] })),
      removePayment: (id: string) =>
        set((state: any) => ({ payments: state.payments.filter((p: any) => p.id !== id) })),
    })
)
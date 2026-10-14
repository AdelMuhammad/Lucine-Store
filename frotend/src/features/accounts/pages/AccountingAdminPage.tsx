import { useMemo, useState, type FormEvent } from 'react'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import '../../admin/accounting.css'
import { useTranslation } from '../../../hooks/useTranslation'
import { useAccountStore } from '../store/useAccountStore'

type Section = 'overview' | 'accounts' | 'journals' | 'expenses' | 'payments' | 'reports'
type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

type AccountDraft = {
  code: string
  name: string
  name_ar: string
  type: AccountType
  isActive: boolean
}

const createEmptyDraft = (): AccountDraft => ({
  code: '',
  name: '',
  name_ar: '',
  type: 'asset',
  isActive: true,
})

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function AccountingAdminPage() {
  const { t } = useTranslation()
  const store = useAccountStore()
  const accounts = store.accounts ?? []
  const journals = store.journals ?? []
  const expenses = store.expenses ?? []
  const payments = store.payments ?? []

  const [section, setSection] = useState<Section>('overview')
  const [formTarget, setFormTarget] = useState<'new' | string | null>(null)
  const [draft, setDraft] = useState<AccountDraft>(createEmptyDraft)
  const [searchQuery, setSearchQuery] = useState('')
  const [taxRate, setTaxRate] = useState(15)

  const visibleAccounts = useMemo(
    () => accounts.filter((account: any) => account && account.name),
    [accounts],
  )

  const query = searchQuery.trim().toLowerCase()
  const filteredAccounts = useMemo(
    () =>
      visibleAccounts.filter((account: any) => {
        if (!query) return true
        return `${account.code ?? ''} ${account.name ?? ''} ${account.type ?? ''}`
          .toLowerCase()
          .includes(query)
      }),
    [query, visibleAccounts],
  )

  const demoExpenses = useMemo(
    () =>
      expenses.length > 0
        ? expenses
        : [
            { id: 'EXP-2201', vendor: 'Office Rent', category: 'Operations', amount: 4200, date: '2026-10-02', type: 'Lease' },
            { id: 'EXP-2202', vendor: 'Marketing', category: 'Advertising', amount: 2800, date: '2026-10-04', type: 'Campaign' },
            { id: 'EXP-2203', vendor: 'Delivery', category: 'Logistics', amount: 1600, date: '2026-10-07', type: 'Shipping' },
          ],
    [expenses],
  )

  const filteredExpenses = useMemo(
    () =>
      demoExpenses.filter((expense: any) => {
        if (!query) return true
        return `${expense.id} ${expense.vendor} ${expense.category}`.toLowerCase().includes(query)
      }),
    [demoExpenses, query],
  )

  const demoPayments = useMemo(
    () =>
      payments.length > 0
        ? payments
        : [
            { id: 'PAY-1801', customer: 'Northwind Retail', method: 'Bank Transfer', amount: 5400, date: '2026-10-01', status: 'Cleared' },
            { id: 'PAY-1802', customer: 'Aster Studio', method: 'Card', amount: 3100, date: '2026-10-03', status: 'Pending' },
            { id: 'PAY-1803', customer: 'Mira Home', method: 'Cash', amount: 1200, date: '2026-10-06', status: 'Cleared' },
          ],
    [payments],
  )

  const filteredPayments = useMemo(
    () =>
      demoPayments.filter((payment: any) => {
        if (!query) return true
        return `${payment.id} ${payment.customer} ${payment.method}`.toLowerCase().includes(query)
      }),
    [demoPayments, query],
  )

  const demoJournals = useMemo(
    () =>
      journals.length > 0
        ? journals
        : [
            { id: 'JRN-3101', ref: 'SO-1048', date: '2026-10-05', description: 'Sale posted to revenue and cash', debit: 5400, credit: 5400 },
            { id: 'JRN-3102', ref: 'PO-2089', date: '2026-10-06', description: 'Inventory purchase recorded', debit: 3200, credit: 3200 },
            { id: 'JRN-3103', ref: 'EXP-2201', date: '2026-10-07', description: 'Office lease expense recognized', debit: 4200, credit: 4200 },
          ],
    [journals],
  )

  const filteredJournals = useMemo(
    () =>
      demoJournals.filter((entry: any) => {
        if (!query) return true
        return `${entry.id} ${entry.ref} ${entry.description}`.toLowerCase().includes(query)
      }),
    [demoJournals, query],
  )

  const totalExpenses = demoExpenses.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
  const totalPayments = demoPayments.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
  const taxAmount = (totalPayments * taxRate) / 100
  const netPosition = totalPayments - totalExpenses

  const activeAccounts = filteredAccounts.filter((account: any) => account.isActive).length
  const revenueAccounts = filteredAccounts.filter((account: any) => account.type === 'revenue').length

  const kpis = {
    accounts: filteredAccounts.length,
    journals: filteredJournals.length,
    expenses: filteredExpenses.length,
    payments: filteredPayments.length,
  }

  const financialStats = useMemo(() => {
    const trialBalance = filteredAccounts.map((account: any, index: number) => {
      const base = 1800 + index * 420 + (account.isActive ? 250 : 80)
      const debit = ['asset', 'expense'].includes(account.type) ? base : 0
      const credit = ['liability', 'equity', 'revenue'].includes(account.type) ? base : 0
      return {
        code: account.code || `ACC-${index + 1}`,
        name: account.name || 'Unnamed account',
        type: account.type || 'asset',
        debit,
        credit,
      }
    })

    const cashFlow = {
      operating: totalPayments * 0.72,
      investing: totalExpenses * 0.18,
      financing: totalExpenses * 0.1,
      netCash: netPosition,
    }

    const aging = {
      current: totalPayments * 0.52,
      '1-30': totalPayments * 0.23,
      '31-60': totalPayments * 0.14,
      '61-90': totalPayments * 0.08,
      'over-90': totalPayments * 0.03,
    }

    const monthly = [
      { month: 'Jan', revenue: 4800, expense: 2800 },
      { month: 'Feb', revenue: 5400, expense: 3100 },
      { month: 'Mar', revenue: 6100, expense: 3400 },
      { month: 'Apr', revenue: 6600, expense: 3600 },
      { month: 'May', revenue: 7000, expense: 3900 },
      { month: 'Jun', revenue: 7600, expense: 4100 },
    ]

    return { trialBalance, cashFlow, aging, monthly }
  }, [filteredAccounts, totalExpenses, totalPayments, netPosition])

  function exportCsv(filename: string, headers: string[], rows: Record<string, string | number>[]) {
    const csvRows = [headers, ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(','))]
    const content = csvRows.join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function exportAccountsCsv() {
    exportCsv(
      'accounts.csv',
      ['code', 'name', 'type', 'isActive'],
      filteredAccounts.map((account: any) => ({
        code: account.code,
        name: account.name,
        type: account.type,
        isActive: account.isActive ? 'Active' : 'Inactive',
      })),
    )
  }

  function exportExpenseCsv() {
    exportCsv(
      'expenses.csv',
      ['id', 'vendor', 'category', 'date', 'amount'],
      filteredExpenses.map((expense: any) => ({
        id: expense.id,
        vendor: expense.vendor,
        category: expense.category,
        date: expense.date,
        amount: expense.amount,
      })),
    )
  }

  function printReport() {
    window.print()
  }

  function openAddAccount() {
    setFormTarget('new')
    setDraft(createEmptyDraft())
  }

  function openEditAccount(account: any) {
    setFormTarget(account.code)
    setDraft({
      code: account.code ?? '',
      name: account.name ?? '',
      name_ar: account.name_ar ?? '',
      type: (account.type as AccountType) ?? 'asset',
      isActive: account.isActive ?? true,
    })
  }

  function closeForm() {
    setFormTarget(null)
    setDraft(createEmptyDraft())
  }

  function deleteAccount(code: string) {
    if (window.confirm('Delete this account?')) {
      store.removeAccount(code)
    }
  }

  function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.code.trim()) return

    const payload = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      name_ar: draft.name_ar.trim(),
      type: draft.type,
      isActive: draft.isActive,
      created_at: new Date().toISOString(),
    }

    if (formTarget === 'new') {
      store.addAccount(payload)
    } else if (formTarget) {
      store.updateAccount({
        ...payload,
        code: formTarget,
      })
    }

    closeForm()
  }

  function renderOverview() {
    return (
      <div className="admin-accounting-dashboard">
        <div className="admin-accounting-toolbar">
          <label className="admin-accounting-search">
            <span>Search</span>
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search accounts, expenses, payments..."
              type="search"
              value={searchQuery}
            />
          </label>
          <div className="admin-accounting-actions">
            <button className="admin-btn admin-btn--secondary" onClick={exportAccountsCsv} type="button">
              Export CSV
            </button>
            <button className="admin-btn admin-btn--secondary" onClick={exportExpenseCsv} type="button">
              Export Expenses
            </button>
            <button className="admin-btn admin-btn--primary" onClick={printReport} type="button">
              Print Report
            </button>
          </div>
        </div>

        <div className="admin-accounting-grid">
          <div className="admin-accounting-metric admin-accounting-metric--primary">
            <span>Net Position</span>
            <strong>{currencyFormatter.format(netPosition)}</strong>
            <small>Cash after expenses</small>
          </div>
          <div className="admin-accounting-metric">
            <span>Active Accounts</span>
            <strong>{activeAccounts}</strong>
            <small>{revenueAccounts} revenue accounts</small>
          </div>
          <div className="admin-accounting-metric">
            <span>Total Expenses</span>
            <strong>{currencyFormatter.format(totalExpenses)}</strong>
            <small>{demoExpenses.length} expense entries</small>
          </div>
          <div className="admin-accounting-metric">
            <span>Total Payments</span>
            <strong>{currencyFormatter.format(totalPayments)}</strong>
            <small>{demoPayments.length} collected invoices</small>
          </div>
        </div>

        <div className="admin-accounting-panels">
          <div className="admin-accounting-panel">
            <div className="admin-accounting-panel__header">
              <h3>Cash Flow</h3>
            </div>
            <div className="admin-accounting-panel__body">
              <div className="admin-accounting-row">
                <span>Operating</span>
                <strong>{currencyFormatter.format(financialStats.cashFlow.operating)}</strong>
              </div>
              <div className="admin-accounting-row">
                <span>Investing</span>
                <strong>{currencyFormatter.format(financialStats.cashFlow.investing)}</strong>
              </div>
              <div className="admin-accounting-row">
                <span>Financing</span>
                <strong>{currencyFormatter.format(financialStats.cashFlow.financing)}</strong>
              </div>
              <div className="admin-accounting-row admin-accounting-row--total">
                <span>Net cash</span>
                <strong>{currencyFormatter.format(financialStats.cashFlow.netCash)}</strong>
              </div>
            </div>
          </div>

          <div className="admin-accounting-panel">
            <div className="admin-accounting-panel__header">
              <h3>Tax Settings</h3>
            </div>
            <div className="admin-accounting-panel__body">
              <label className="admin-accounting-field">
                <span>Tax rate (%)</span>
                <input
                  min={0}
                  onChange={(event) => setTaxRate(Number(event.target.value) || 0)}
                  type="number"
                  value={taxRate}
                />
              </label>
              <div className="admin-accounting-row">
                <span>Tax amount</span>
                <strong>{currencyFormatter.format(taxAmount)}</strong>
              </div>
              <div className="admin-accounting-row admin-accounting-row--total">
                <span>Net after tax</span>
                <strong>{currencyFormatter.format(totalPayments - taxAmount)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-accounting-panel admin-accounting-panel--wide">
          <div className="admin-accounting-panel__header">
            <h3>Monthly Performance</h3>
          </div>
          <div className="admin-accounting-panel__body admin-accounting-metric-grid">
            {financialStats.monthly.map((item) => (
              <div className="admin-accounting-mini-card" key={item.month}>
                <span>{item.month}</span>
                <strong>{currencyFormatter.format(item.revenue)}</strong>
                <small>Revenue: {currencyFormatter.format(item.revenue)}</small>
                <small>Expense: {currencyFormatter.format(item.expense)}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function renderAccounts() {
    return (
      <div className="admin-accounting-form">
        <div className="admin-form-grid">
          <div className="admin-field admin-field--full">
            <div className="admin-row" style={{ justifyContent: 'space-between' }}>
              <h3>Chart of Accounts</h3>
              <button className="admin-btn admin-btn--primary" onClick={openAddAccount} type="button">
                Add New
              </button>
            </div>
          </div>
        </div>

        <div className="admin-list admin-row-list">
          {filteredAccounts.length === 0 ? (
            <p className="admin-empty-state">No accounts yet</p>
          ) : (
            filteredAccounts.map((account: any) => (
              <div className="admin-row" key={account.code}>
                <div className="admin-row__main">
                  <strong>{account.name}</strong>
                  <span>
                    {account.code} · {account.type}
                  </span>
                </div>
                <div className="admin-row__aside">
                  <span className={`admin-account-type ${account.type ?? 'asset'}`}>
                    {account.type ?? 'asset'}
                  </span>
                  <span className={`admin-status-pill ${account.isActive ? 'balanced' : 'unbalanced'}`}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    className="admin-btn admin-btn--secondary"
                    onClick={() => openEditAccount(account)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="admin-btn admin-btn--danger"
                    onClick={() => deleteAccount(account.code)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  function renderJournals() {
    return (
      <div className="admin-accounting-table-wrap">
        <h3>Journal Entries</h3>
        <table className="admin-accounting-table">
          <thead>
            <tr>
              <th>Entry</th>
              <th>Ref</th>
              <th>Date</th>
              <th>Description</th>
              <th className="admin-accounting-table__number">Debit</th>
              <th className="admin-accounting-table__number">Credit</th>
            </tr>
          </thead>
          <tbody>
            {filteredJournals.map((entry: any) => (
              <tr key={entry.id}>
                <td>{entry.id}</td>
                <td>{entry.ref}</td>
                <td>{entry.date}</td>
                <td>{entry.description}</td>
                <td className="admin-accounting-table__number">{currencyFormatter.format(entry.debit)}</td>
                <td className="admin-accounting-table__number">{currencyFormatter.format(entry.credit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderExpenses() {
    return (
      <div className="admin-accounting-table-wrap">
        <h3>Expenses</h3>
        <table className="admin-accounting-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Date</th>
              <th className="admin-accounting-table__number">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((item: any) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.vendor}</td>
                <td>{item.category}</td>
                <td>{item.date}</td>
                <td className="admin-accounting-table__number">{currencyFormatter.format(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderPayments() {
    return (
      <div className="admin-accounting-table-wrap">
        <h3>Payments</h3>
        <table className="admin-accounting-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Method</th>
              <th>Date</th>
              <th>Status</th>
              <th className="admin-accounting-table__number">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment: any) => (
              <tr key={payment.id}>
                <td>{payment.id}</td>
                <td>{payment.customer}</td>
                <td>{payment.method}</td>
                <td>{payment.date}</td>
                <td>{payment.status}</td>
                <td className="admin-accounting-table__number">{currencyFormatter.format(payment.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderReports() {
    return (
      <div className="admin-accounting-reports">
        <div className="admin-report-card">
          <h3>Trial Balance</h3>
          <table className="admin-trial-balance">
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Debit</th>
                <th>Credit</th>
              </tr>
            </thead>
            <tbody>
              {financialStats.trialBalance.map((item) => (
                <tr key={item.code}>
                  <td>{item.name}</td>
                  <td>{item.type}</td>
                  <td>{currencyFormatter.format(item.debit)}</td>
                  <td>{currencyFormatter.format(item.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-report-card">
          <h3>Cash Flow Statement</h3>
          <div className="admin-cash-flow-grid">
            <div className="admin-cash-flow-card">
              <p>Operating</p>
              <strong>{currencyFormatter.format(financialStats.cashFlow.operating)}</strong>
            </div>
            <div className="admin-cash-flow-card">
              <p>Investing</p>
              <strong>{currencyFormatter.format(financialStats.cashFlow.investing)}</strong>
            </div>
            <div className="admin-cash-flow-card">
              <p>Financing</p>
              <strong>{currencyFormatter.format(financialStats.cashFlow.financing)}</strong>
            </div>
            <div className="admin-cash-flow-card net-profit">
              <p>Net cash</p>
              <strong>{currencyFormatter.format(financialStats.cashFlow.netCash)}</strong>
            </div>
          </div>
        </div>

        <div className="admin-report-card">
          <h3>Aging Summary</h3>
          {Object.entries(financialStats.aging).map(([label, value]) => (
            <div className="admin-aging-item" key={label}>
              <span>{label}</span>
              <strong>{currencyFormatter.format(value as number)}</strong>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <AdminPageHeader
        eyebrow={t('admin.accounting')}
        title={t('admin.accountingTitle')}
        description={t('admin.accountingDescription')}
        actions={
          <>
            <button className="admin-btn admin-btn--primary" onClick={() => setSection('overview')} type="button">
              Overview
            </button>
            <button className="admin-btn admin-btn--primary" onClick={() => setSection('accounts')} type="button">
              Accounts
            </button>
            <button className="admin-btn admin-btn--primary" onClick={() => setSection('journals')} type="button">
              Journals
            </button>
            <button className="admin-btn admin-btn--primary" onClick={() => setSection('expenses')} type="button">
              Expenses
            </button>
            <button className="admin-btn admin-btn--primary" onClick={() => setSection('payments')} type="button">
              Payments
            </button>
            <button className="admin-btn admin-btn--primary" onClick={() => setSection('reports')} type="button">
              Reports
            </button>
          </>
        }
      />

      <div className="admin-toolbar">
        <span>
          Accounts: {kpis.accounts} | Journals: {kpis.journals} | Expenses: {kpis.expenses} | Payments: {kpis.payments}
        </span>
      </div>

      <section className="admin-card">
        {section === 'overview' && renderOverview()}
        {section === 'accounts' && renderAccounts()}
        {section === 'journals' && renderJournals()}
        {section === 'expenses' && renderExpenses()}
        {section === 'payments' && renderPayments()}
        {section === 'reports' && renderReports()}
      </section>

      {formTarget && (
        <AdminModal
          description="Entry details"
          onClose={closeForm}
          size="lg"
          title={formTarget === 'new' ? 'Add account' : 'Edit account'}
        >
          <form className="admin-accounting-form" onSubmit={submitAccount}>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Code</span>
                <input
                  onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
                  value={draft.code}
                />
              </label>

              <label className="admin-field">
                <span>Name</span>
                <input
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  value={draft.name}
                />
              </label>

              <label className="admin-field admin-field--full">
                <span>Arabic Name</span>
                <input
                  onChange={(event) => setDraft((current) => ({ ...current, name_ar: event.target.value }))}
                  value={draft.name_ar}
                />
              </label>

              <label className="admin-field">
                <span>Type</span>
                <select
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, type: event.target.value as AccountType }))
                  }
                  value={draft.type}
                >
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                  <option value="equity">Equity</option>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                </select>
              </label>

              <label className="admin-field admin-check">
                <input
                  checked={draft.isActive}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>Active</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="admin-btn admin-btn--secondary" onClick={closeForm} type="button">
                Cancel
              </button>
              <button className="admin-btn admin-btn--primary" type="submit">
                Save
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default AccountingAdminPage

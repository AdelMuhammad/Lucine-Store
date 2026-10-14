import { useState, type FormEvent } from 'react'
import {
  Add,
  ContentCopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ShareOutlined,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { referralLink } from '../../account/rewards'
import { deriveCustomerRows } from '../../account/customerRows'
import { useAccountStore } from '../../account/store/useAccountStore'
import { useTranslation } from '../../../hooks/useTranslation'
import { csvFilename, downloadCsv } from '../csv'
import { nowIso } from '../coupons'
import { useMarketingStore, type ReferralCode } from '../store/useMarketingStore'

/** `FRIEND-A1B2C3` — matches the codes the storefront generates. */
function generateCode(name: string): string {
  const slug = name
    .toLocaleUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5)
  const random = crypto.randomUUID().replace(/[^A-Z0-9]/g, '').slice(0, 4)
  return `FRIEND-${slug}${random}`.slice(0, 13)
}

function ReferralsAdminPage() {
  const { t, number, currency } = useTranslation()
  const referralCodes = useMarketingStore((state) => state.referralCodes)
  const addReferralCode = useMarketingStore((state) => state.addReferralCode)
  const removeReferralCode = useMarketingStore((state) => state.removeReferralCode)
  const orders = useAccountStore((state) => state.orders)

  const [adding, setAdding] = useState(false)
  const [ownerKey, setOwnerKey] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [commission, setCommission] = useState('10')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  const customers = deriveCustomerRows(orders)

  const performance = referralCodes.map((code) => {
    const attributed = orders.filter((order) => order.referredBy === code.code)
    const revenue = attributed.reduce((total, order) => total + order.total, 0)
    return {
      ...code,
      orders: attributed.length,
      revenue,
      commissionDue: (revenue * code.commission) / 100,
    }
  })

  function openAdd() {
    setOwnerKey('')
    setOwnerName('')
    setCommission('10')
    setFormError('')
    setAdding(true)
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!ownerKey.trim()) {
      setFormError(t('admin.referralOwnerRequired'))
      return
    }

    const code: ReferralCode = {
      code: generateCode(ownerName || ownerKey),
      ownerKey: ownerKey.trim(),
      ownerName: ownerName.trim(),
      commission: Math.max(0, Number(commission) || 0),
      isActive: true,
      createdAt: nowIso(),
    }

    await addReferralCode(code)
    setNotice(t('admin.referralCreated', { code: code.code }))
    setAdding(false)
  }

  async function handleDelete(code: ReferralCode) {
    if (!window.confirm(t('admin.referralDeleteConfirm', { code: code.code }))) {
      return
    }
    await removeReferralCode(code.code)
  }

  async function copyLink(code: ReferralCode) {
    const link = referralLink(code.code)
    if (!navigator.clipboard) {
      setNotice(link)
      return
    }
    await navigator.clipboard.writeText(link)
    setNotice(t('admin.referralLinkCopied', { code: code.code }))
  }

  function handleExport() {
    downloadCsv(csvFilename('referrals'), [
      [
        t('admin.thCode'),
        t('admin.thOwner'),
        t('admin.thCommission'),
        t('admin.thOrdersColumn'),
        t('admin.thRevenue'),
        t('admin.thCommissionDue'),
      ],
      ...performance.map((row) => [
        row.code,
        row.ownerName || row.ownerKey,
        row.commission,
        row.orders,
        row.revenue,
        row.commissionDue,
      ]),
    ])
  }

  const totals = performance.reduce(
    (accumulator, row) => ({
      orders: accumulator.orders + row.orders,
      revenue: accumulator.revenue + row.revenue,
      commission: accumulator.commission + row.commissionDue,
    }),
    { orders: 0, revenue: 0, commission: 0 },
  )

  return (
    <>
      <AdminPageHeader
        description={t('admin.referralsDescription')}
        eyebrow={t('admin.marketingEyebrow')}
        title={t('admin.navReferrals')}
        actions={
          <>
            <button className="admin-btn" onClick={handleExport} type="button">
              <DownloadOutlined /> {t('admin.exportCsv')}
            </button>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openAdd}
              type="button"
            >
              <Add /> {t('admin.addReferral')}
            </button>
          </>
        }
      />

      {notice && (
        <div className="admin-status-notice">
          {notice}
          <button onClick={() => setNotice('')} type="button">
            ×
          </button>
        </div>
      )}

      <div className="admin-stat-grid">
        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.thOrdersColumn')}</span>
            <span className="admin-stat__icon">
              <ShareOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{number(totals.orders)}</strong>
          <span className="admin-stat__hint">
            {t('admin.referralCodeCount', {
              count: number(referralCodes.length),
            })}
          </span>
        </article>
        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.thRevenue')}</span>
            <span className="admin-stat__icon">
              <ShareOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{currency(totals.revenue)}</strong>
          <span className="admin-stat__hint">{t('admin.referralRevenueHint')}</span>
        </article>
        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.thCommissionDue')}</span>
            <span className="admin-stat__icon">
              <ShareOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{currency(totals.commission)}</strong>
          <span className="admin-stat__hint">{t('admin.referralCommissionHint')}</span>
        </article>
      </div>

      <section className="admin-card">
        {performance.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thCode')}</th>
                  <th>{t('admin.thOwner')}</th>
                  <th>{t('admin.thCommission')}</th>
                  <th>{t('admin.thOrdersColumn')}</th>
                  <th>{t('admin.thRevenue')}</th>
                  <th>{t('admin.thCommissionDue')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {performance.map((row) => (
                  <tr key={row.code}>
                    <td data-label={t('admin.thCode')}>
                      <strong>{row.code}</strong>
                    </td>
                    <td data-label={t('admin.thOwner')}>
                      {row.ownerName || row.ownerKey}
                    </td>
                    <td data-label={t('admin.thCommission')}>
                      {t('admin.percentOff', { percent: number(row.commission) })}
                    </td>
                    <td data-label={t('admin.thOrdersColumn')}>
                      {number(row.orders)}
                    </td>
                    <td data-label={t('admin.thRevenue')}>
                      {currency(row.revenue)}
                    </td>
                    <td data-label={t('admin.thCommissionDue')}>
                      {currency(row.commissionDue)}
                    </td>
                    <td data-label={t('admin.thActions')}>
                      <div className="admin-table__actions">
                        <button
                          aria-label={t('admin.referralCopyLink')}
                          className="admin-icon-btn"
                          onClick={() => void copyLink(row)}
                          type="button"
                        >
                          <ContentCopyOutlined />
                        </button>
                        <button
                          aria-label={t('admin.referralDeleteConfirm', {
                            code: row.code,
                          })}
                          className="admin-icon-btn admin-icon-btn--danger"
                          onClick={() => void handleDelete(row)}
                          type="button"
                        >
                          <DeleteOutlined />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <ShareOutlined />
            <h3>{t('admin.noReferralsTitle')}</h3>
            <p>{t('admin.noReferralsText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openAdd}
              type="button"
            >
              <Add /> {t('admin.addReferral')}
            </button>
          </div>
        )}
      </section>

      {adding && (
        <AdminModal
          description={t('admin.referralModalDescription')}
          onClose={() => setAdding(false)}
          title={t('admin.addReferral')}
        >
          <form className="admin-form" onSubmit={handleAdd}>
            <div className="admin-form-grid">
              <label className="admin-field admin-field--full">
                <span>{t('admin.referralOwnerLabel')}</span>
                <select
                  onChange={(event) => {
                    const value = event.target.value
                    setOwnerKey(value)
                    const found = customers.find((row) => row.key === value)
                    setOwnerName(found?.name ?? ownerName)
                  }}
                  value={ownerKey}
                >
                  <option value="">{t('admin.referralOwnerPick')}</option>
                  {customers.map((row) => (
                    <option key={row.key} value={row.key}>
                      {row.name || row.email || row.phone || row.key}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>{t('admin.thEmail')}</span>
                <input
                  onChange={(event) => setOwnerKey(event.target.value)}
                  placeholder="name@example.com"
                  value={ownerKey}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.thOwner')}</span>
                <input
                  onChange={(event) => setOwnerName(event.target.value)}
                  value={ownerName}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>{t('admin.thCommission')}</span>
                <input
                  max="100"
                  min="0"
                  onChange={(event) => setCommission(event.target.value)}
                  type="number"
                  value={commission}
                />
              </label>
            </div>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button
                className="admin-btn"
                onClick={() => setAdding(false)}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="admin-btn admin-btn--primary" type="submit">
                {t('admin.addReferral')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default ReferralsAdminPage

import { useMemo, useState, type FormEvent } from 'react'
import { DownloadOutlined, RedeemOutlined, SavedSearchOutlined } from '@mui/icons-material'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { deriveCustomerRows } from '../../account/customerRows'
import { useAccountStore } from '../../account/store/useAccountStore'
import { useTranslation } from '../../../hooks/useTranslation'
import { csvFilename, downloadCsv } from '../csv'
import { loyaltyPoints, loyaltyTier, type LoyaltyTier } from '../segments'
import { useMarketingStore } from '../store/useMarketingStore'

const TIERS: LoyaltyTier[] = ['gold', 'silver', 'bronze']

const tierVariant: Record<LoyaltyTier, string> = {
  gold: 'admin-badge--warning',
  silver: 'admin-badge--info',
  bronze: 'admin-badge--neutral',
}

function LoyaltyAdminPage() {
  const { t, number, currency } = useTranslation()
  const settings = useMarketingStore((state) => state.settings)
  const saveSettings = useMarketingStore((state) => state.saveSettings)
  const orders = useAccountStore((state) => state.orders)

  const [pointsPerCurrency, setPointsPerCurrency] = useState(
    String(settings.loyalty.pointsPerCurrency),
  )
  const [silverSpend, setSilverSpend] = useState(String(settings.loyalty.silverSpend))
  const [goldSpend, setGoldSpend] = useState(String(settings.loyalty.goldSpend))
  const [popupDelaySeconds, setPopupDelaySeconds] = useState(
    String(settings.popupDelaySeconds),
  )
  const [notice, setNotice] = useState('')

  const customers = useMemo(() => deriveCustomerRows(orders), [orders])

  const members = customers
    .map((row) => ({
      ...row,
      tier: loyaltyTier(row.totalSpent, settings),
      points: loyaltyPoints(row.totalSpent, settings),
    }))
    .sort((first, second) => second.totalSpent - first.totalSpent)

  const tierCounts = TIERS.map((tier) => ({
    tier,
    count: members.filter((member) => member.tier === tier).length,
  }))

  const pointsOutstanding = members.reduce(
    (total, member) => total + member.points,
    0,
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveSettings({
      ...settings,
      loyalty: {
        pointsPerCurrency: Math.max(0, Number(pointsPerCurrency) || 0),
        silverSpend: Math.max(0, Number(silverSpend) || 0),
        goldSpend: Math.max(0, Number(goldSpend) || 0),
      },
      popupDelaySeconds: Math.max(0, Number(popupDelaySeconds) || 0),
    })
    setNotice(t('admin.loyaltySaved'))
  }

  function handleExport() {
    downloadCsv(csvFilename('loyalty-members'), [
      [
        t('admin.thName'),
        t('admin.thEmail'),
        t('admin.thTier'),
        t('admin.thPoints'),
        t('admin.thSpend'),
        t('admin.thOrdersColumn'),
      ],
      ...members.map((member) => [
        member.name,
        member.email,
        t(`loyaltyTier.${member.tier}`),
        member.points,
        member.totalSpent,
        member.orders.length,
      ]),
    ])
  }

  return (
    <>
      <AdminPageHeader
        description={t('admin.loyaltyDescription')}
        eyebrow={t('admin.marketingEyebrow')}
        title={t('admin.navLoyalty')}
        actions={
          <button className="admin-btn" onClick={handleExport} type="button">
            <DownloadOutlined /> {t('admin.exportCsv')}
          </button>
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
        {tierCounts.map(({ tier, count }) => (
          <article className="admin-stat" key={tier}>
            <div className="admin-stat__top">
              <span className="admin-stat__label">{t(`loyaltyTier.${tier}`)}</span>
              <span className="admin-stat__icon">
                <RedeemOutlined />
              </span>
            </div>
            <strong className="admin-stat__value">{number(count)}</strong>
            <span className="admin-stat__hint">
              {t('admin.loyaltyTierHint', {
                amount: currency(
                  tier === 'gold'
                    ? settings.loyalty.goldSpend
                    : tier === 'silver'
                      ? settings.loyalty.silverSpend
                      : 0,
                ),
              })}
            </span>
          </article>
        ))}
        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.mktPointsOutstanding')}</span>
            <span className="admin-stat__icon">
              <SavedSearchOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{number(pointsOutstanding)}</strong>
          <span className="admin-stat__hint">{t('admin.loyaltyPointsHint')}</span>
        </article>
      </div>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.loyaltyRulesTitle')}</h2>
            <p>{t('admin.loyaltyRulesText')}</p>
          </div>
        </div>
        <div className="admin-card__body">
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t('admin.loyaltyPointsPerLabel')}</span>
                <input
                  min="0"
                  onChange={(event) => setPointsPerCurrency(event.target.value)}
                  type="number"
                  value={pointsPerCurrency}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.loyaltyPopupDelayLabel')}</span>
                <input
                  min="0"
                  onChange={(event) => setPopupDelaySeconds(event.target.value)}
                  type="number"
                  value={popupDelaySeconds}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.loyaltySilverLabel')}</span>
                <input
                  min="0"
                  onChange={(event) => setSilverSpend(event.target.value)}
                  type="number"
                  value={silverSpend}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.loyaltyGoldLabel')}</span>
                <input
                  min="0"
                  onChange={(event) => setGoldSpend(event.target.value)}
                  type="number"
                  value={goldSpend}
                />
              </label>
            </div>
            <div className="admin-form-actions">
              <button className="admin-btn admin-btn--primary" type="submit">
                {t('common.saveChanges')}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.loyaltyMembersTitle')}</h2>
            <p>{t('admin.loyaltyMembersText')}</p>
          </div>
        </div>
        {members.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thName')}</th>
                  <th>{t('admin.thEmail')}</th>
                  <th>{t('admin.thTier')}</th>
                  <th>{t('admin.thPoints')}</th>
                  <th>{t('admin.thSpend')}</th>
                  <th>{t('admin.thOrdersColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {members.slice(0, 25).map((member) => (
                  <tr key={member.key}>
                    <td data-label={t('admin.thName')}>
                      {member.name || t('admin.subscriberNoName')}
                    </td>
                    <td data-label={t('admin.thEmail')}>
                      <span className="admin-table__muted">{member.email}</span>
                    </td>
                    <td data-label={t('admin.thTier')}>
                      <span className={`admin-badge ${tierVariant[member.tier]}`}>
                        {t(`loyaltyTier.${member.tier}`)}
                      </span>
                    </td>
                    <td data-label={t('admin.thPoints')}>
                      {number(member.points)}
                    </td>
                    <td data-label={t('admin.thSpend')}>
                      {currency(member.totalSpent)}
                    </td>
                    <td data-label={t('admin.thOrdersColumn')}>
                      {number(member.orders.length)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <RedeemOutlined />
            <h3>{t('admin.loyaltyEmptyTitle')}</h3>
            <p>{t('admin.loyaltyEmptyText')}</p>
          </div>
        )}
      </section>
    </>
  )
}

export default LoyaltyAdminPage

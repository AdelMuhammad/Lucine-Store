import { useMemo, useState } from 'react'
import { DownloadOutlined, GroupOutlined, SendOutlined } from '@mui/icons-material'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { deriveCustomerRows } from '../../account/customerRows'
import { useAccountStore } from '../../account/store/useAccountStore'
import { useTranslation } from '../../../hooks/useTranslation'
import { csvFilename, downloadCsv } from '../csv'
import {
  SEGMENT_DEFAULTS,
  SEGMENT_KINDS,
  customerCities,
  describeSegment,
  loyaltyTier,
  matchesSegment,
  segmentRecipients,
  type SegmentKind,
  type SegmentRule,
} from '../segments'
import { useMarketingStore } from '../store/useMarketingStore'

function SegmentsAdminPage() {
  const { t, currency, number } = useTranslation()
  const orders = useAccountStore((state) => state.orders)
  const subscribers = useMarketingStore((state) => state.subscribers)
  const settings = useMarketingStore((state) => state.settings)

  const customers = useMemo(() => deriveCustomerRows(orders), [orders])
  const cities = useMemo(() => customerCities(customers), [customers])

  const [rule, setRule] = useState<SegmentRule>({ kind: 'all' })

  const recipients = segmentRecipients({
    rule,
    customers,
    subscribers: subscribers
      .filter((subscriber) => subscriber.isSubscribed)
      .map((subscriber) => ({ email: subscriber.email, name: subscriber.name })),
  })

  const summaryRows = useMemo(
    () =>
      SEGMENT_KINDS.filter((kind) => kind !== 'city').map((kind) => {
        const candidate: SegmentRule = {
          kind,
          value: SEGMENT_DEFAULTS[kind],
        }
        return {
          kind,
          count: segmentRecipients({
            rule: candidate,
            customers,
            subscribers: subscribers
              .filter((subscriber) => subscriber.isSubscribed)
              .map((subscriber) => ({
                email: subscriber.email,
                name: subscriber.name,
              })),
          }).length,
        }
      }),
    [customers, subscribers],
  )

  function handleExport() {
    const description = describeSegment(rule)
    downloadCsv(csvFilename(`segment-${rule.kind}`), [
      [
        t('admin.thName'),
        t('admin.thEmail'),
        t('admin.thPhone'),
        t('admin.thSegmentReason'),
      ],
      ...recipients.map((recipient) => [
        recipient.name,
        recipient.email,
        recipient.phone,
        t(description.key, { value: description.value }),
      ]),
    ])
  }

  const summary = describeSegment(rule)

  return (
    <>
      <AdminPageHeader
        description={t('admin.segmentsDescription')}
        eyebrow={t('admin.marketingEyebrow')}
        title={t('admin.navSegments')}
      />

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.segmentBuilderTitle')}</h2>
            <p>{t('admin.segmentBuilderText')}</p>
          </div>
        </div>
        <div className="admin-card__body">
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>{t('admin.segmentKindLabel')}</span>
              <select
                onChange={(event) =>
                  setRule({
                    kind: event.target.value as SegmentKind,
                    value: SEGMENT_DEFAULTS[event.target.value as SegmentKind],
                  })
                }
                value={rule.kind}
              >
                {SEGMENT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`segmentDescribe.${kind}`)}
                  </option>
                ))}
              </select>
            </label>

            {(rule.kind === 'new' ||
              rule.kind === 'vip' ||
              rule.kind === 'lapsed') && (
              <label className="admin-field">
                <span>
                  {rule.kind === 'vip'
                    ? t('admin.segmentSpendLabel')
                    : t('admin.segmentDaysLabel')}
                </span>
                <input
                  min="0"
                  onChange={(event) =>
                    setRule((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                  type="number"
                  value={rule.value ?? ''}
                />
              </label>
            )}

            {rule.kind === 'city' && (
              <label className="admin-field">
                <span>{t('admin.segmentCityLabel')}</span>
                <select
                  onChange={(event) =>
                    setRule((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                  value={rule.value ?? ''}
                >
                  <option value="">{t('admin.segmentCityAll')}</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <p className="admin-field-hint">
            {t(summary.key, { value: summary.value })}
          </p>

          <div className="admin-mkt-summary">
            <div>
              <span>{t('admin.segmentRecipients')}</span>
              <strong>{number(recipients.length)}</strong>
            </div>
            <div className="admin-mkt-summary__actions">
              <button className="admin-btn" onClick={handleExport} type="button">
                <DownloadOutlined /> {t('admin.exportCsv')}
              </button>
              <Link className="admin-btn admin-btn--primary" to="/admin/marketing/campaigns">
                <SendOutlined /> {t('admin.segmentCreateCampaign')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.segmentOverviewTitle')}</h2>
            <p>{t('admin.segmentOverviewText')}</p>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.thSegment')}</th>
                <th>{t('admin.thCustomers')}</th>
                <th>{t('admin.thNotes')}</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.kind}>
                  <td data-label={t('admin.thSegment')}>
                    <strong>{t(`segmentDescribe.${row.kind}`)}</strong>
                  </td>
                  <td data-label={t('admin.thCustomers')}>
                    {number(row.count)}
                  </td>
                  <td data-label={t('admin.thNotes')}>
                    <span className="admin-table__muted">
                      {t(`segmentNote.${row.kind}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.segmentMembersTitle')}</h2>
            <p>{t('admin.segmentMembersText')}</p>
          </div>
        </div>
        {recipients.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thName')}</th>
                  <th>{t('admin.thEmail')}</th>
                  <th>{t('admin.thPhone')}</th>
                </tr>
              </thead>
              <tbody>
                {recipients.slice(0, 25).map((recipient) => (
                  <tr key={recipient.key}>
                    <td data-label={t('admin.thName')}>
                      {recipient.name || t('admin.subscriberNoName')}
                    </td>
                    <td data-label={t('admin.thEmail')}>{recipient.email}</td>
                    <td data-label={t('admin.thPhone')}>
                      <span className="admin-table__muted">
                        {recipient.phone || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <GroupOutlined />
            <h3>{t('admin.segmentEmptyTitle')}</h3>
            <p>{t('admin.segmentEmptyText')}</p>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.mktLoyalty')}</h2>
            <p>{t('admin.mktLoyaltyText')}</p>
          </div>
          <Link className="admin-btn admin-btn--sm" to="/admin/marketing/loyalty">
            {t('admin.navLoyalty')}
          </Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.thName')}</th>
                <th>{t('admin.thTier')}</th>
                <th>{t('admin.thSpend')}</th>
              </tr>
            </thead>
            <tbody>
              {customers
                .filter((row) => matchesSegment(row, { kind: 'all' }))
                .slice(0, 10)
                .map((row) => (
                  <tr key={row.key}>
                    <td data-label={t('admin.thName')}>
                      {row.name || t('admin.subscriberNoName')}
                    </td>
                    <td data-label={t('admin.thTier')}>
                      <span className="admin-badge admin-badge--info">
                        {t(`loyaltyTier.${loyaltyTier(row.totalSpent, settings)}`)}
                      </span>
                    </td>
                    <td data-label={t('admin.thSpend')}>
                      {currency(row.totalSpent)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export default SegmentsAdminPage

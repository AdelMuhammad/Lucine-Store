import { useMemo, useState } from 'react'
import {
  AttachMoneyOutlined,
  DownloadOutlined,
  GroupOutlined,
  InsightsOutlined,
  LocalOfferOutlined,
  ReceiptLongOutlined,
  ShareOutlined,
  TrendingUpOutlined,
} from '@mui/icons-material'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import DateRangeToolbar from '../../admin/components/DateRangeToolbar'
import {
  buildDailyRows,
  presetWindow,
  readableDateKey,
  type RangePreset,
} from '../../admin/analytics'
import { deriveCustomerRows } from '../../account/customerRows'
import { useAccountStore } from '../../account/store/useAccountStore'
import {
  normalizeMarketingSettings,
  useMarketingStore,
} from '../store/useMarketingStore'
import { useTranslation } from '../../../hooks/useTranslation'
import { csvFilename, downloadCsv } from '../csv'
import { useCouponStore } from '../store/useCouponStore'

function MarketingAnalyticsPage() {
  const { t, localized, number, currency, date } = useTranslation()
  const orders = useAccountStore((state) => state.orders)
  const coupons = useCouponStore((state) => state.coupons)
  const redemptions = useCouponStore((state) => state.redemptions)

  const [preset, setPreset] = useState<RangePreset>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const window_ = useMemo(
    () => presetWindow(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  )

  const inWindow = useMemo(() => {
    if (!window_) return orders
    return orders.filter((order) => {
      const time = Date.parse(order.createdAt)
      return time >= window_.from && time <= window_.to
    })
  }, [orders, window_])

  const paid = useMemo(
    () => inWindow.filter((order) => order.status !== 'cancelled'),
    [inWindow],
  )
  const revenue = paid.reduce((total, order) => total + order.total, 0)
  const averageOrder = paid.length > 0 ? revenue / paid.length : 0
  const couponDiscount = paid.reduce(
    (total, order) => total + (order.couponDiscount ?? 0),
    0,
  )

  const settings = useMarketingStore((state) => state.settings)
  const profitMargin = normalizeMarketingSettings(settings).profitMargin

  const dailyRows = useMemo(
    () => buildDailyRows(orders, window_, profitMargin),
    [orders, window_, profitMargin],
  )
  const profit = dailyRows.reduce((total, row) => total + row.profit, 0)

  const customers = useMemo(() => deriveCustomerRows(orders), [orders])
  const newCustomers = useMemo(() => {
    if (!window_) return customers.length
    return customers.filter((row) => {
      const first = row.orders[row.orders.length - 1]?.createdAt
      const time = first ? Date.parse(first) : Number.NaN
      return Number.isFinite(time) && time >= window_.from && time <= window_.to
    }).length
  }, [customers, window_])

  const couponRows = useMemo(() => {
    const map = new Map<string, { uses: number; discount: number; orders: Set<string> }>()
    redemptions.forEach((redemption) => {
      const time = Date.parse(redemption.createdAt)
      if (window_ && (time < window_.from || time > window_.to)) return
      const current =
        map.get(redemption.couponCode) ?? { uses: 0, discount: 0, orders: new Set<string>() }
      current.uses += 1
      current.discount += redemption.discount
      current.orders.add(redemption.orderId)
      map.set(redemption.couponCode, current)
    })

    return [...map.entries()]
      .map(([code, stats]) => {
        const coupon = coupons.find((item) => item.code === code)
        const attributed = paid.filter((order) => stats.orders.has(order.id))
        return {
          code,
          label: coupon ? localized(coupon.title, coupon.title_ar) : '',
          uses: stats.uses,
          discount: stats.discount,
          revenue: attributed.reduce((total, order) => total + order.total, 0),
        }
      })
      .sort((first, second) => second.revenue - first.revenue)
  }, [coupons, localized, paid, redemptions, window_])

  const referralRows = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>()
    paid.forEach((order) => {
      const code = order.referredBy?.trim()
      if (!code) return
      const current = map.get(code) ?? { orders: 0, revenue: 0 }
      map.set(code, {
        orders: current.orders + 1,
        revenue: current.revenue + order.total,
      })
    })
    return [...map.entries()]
      .map(([code, stats]) => ({ code, ...stats }))
      .sort((first, second) => second.revenue - first.revenue)
  }, [paid])

  const sourceRows = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>()
    paid.forEach((order) => {
      const source = order.source?.trim() || t('admin.mktSourceNone')
      const key = [source, order.medium, order.campaign].filter(Boolean).join(' / ')
      const current = map.get(key) ?? { orders: 0, revenue: 0 }
      map.set(key, {
        orders: current.orders + 1,
        revenue: current.revenue + order.total,
      })
    })
    return [...map.entries()]
      .map(([source, stats]) => ({ source, ...stats }))
      .sort((first, second) => second.revenue - first.revenue)
  }, [paid, t])

  const topCustomers = useMemo(() => {
    if (!window_) return customers.slice(0, 10)
    return customers
      .map((row) => {
        const within = row.orders.filter((order) => {
          const time = Date.parse(order.createdAt)
          return time >= window_.from && time <= window_.to
        })
        return {
          ...row,
          rangeOrders: within.length,
          rangeSpend: within.reduce((total, order) => total + order.total, 0),
        }
      })
      .filter((row) => row.rangeOrders > 0)
      .sort((first, second) => second.rangeSpend - first.rangeSpend)
      .slice(0, 10)
  }, [customers, window_])

  function exportOrders() {
    downloadCsv(csvFilename('orders-report'), [
      [
        t('admin.thOrdersColumn'),
        t('admin.thEmail'),
        t('admin.thStatus'),
        t('admin.thCoupon'),
        t('admin.thSource'),
        t('admin.thRevenue'),
        t('admin.thCreated'),
      ],
      ...paid.map((order) => [
        order.id,
        order.email,
        order.status,
        order.couponCode ?? '',
        order.source ?? '',
        order.total,
        order.createdAt,
      ]),
    ])
  }

  function exportCoupons() {
    downloadCsv(csvFilename('coupons-report'), [
      [t('admin.thCode'), t('admin.thTitle'), t('admin.thRedemptions'), t('admin.thDiscountGiven'), t('admin.thRevenue')],
      ...couponRows.map((row) => [
        row.code,
        row.label,
        row.uses,
        row.discount,
        row.revenue,
      ]),
    ])
  }

  function exportSources() {
    downloadCsv(csvFilename('sources-report'), [
      [t('admin.thSource'), t('admin.thOrdersColumn'), t('admin.thRevenue')],
      ...sourceRows.map((row) => [row.source, row.orders, row.revenue]),
    ])
  }

  function exportDaily() {
    downloadCsv(csvFilename('daily-report'), [
      [
        t('admin.thDate'),
        t('admin.thOrdersColumn'),
        t('admin.thItems'),
        t('admin.thGrossSales'),
        t('admin.thCouponsUsed'),
        t('admin.thShipping'),
        t('admin.thRevenue'),
        t('admin.thAvgOrder'),
        t('admin.thProfit'),
      ],
      ...dailyRows.map((row) => [
        readableDateKey(row.date),
        row.orders,
        row.items,
        row.grossSales,
        row.couponDiscount,
        row.shipping,
        row.revenue,
        row.averageOrder,
        row.profit,
      ]),
    ])
  }

  const rangeLabel = window_
    ? t('admin.analyticsRange', {
        from: date(new Date(window_.from).toISOString(), 'short'),
        to: date(new Date(window_.to).toISOString(), 'short'),
      })
    : t('admin.analyticsRangeAll')

  return (
    <>
      <AdminPageHeader
        description={t('admin.analyticsDescription')}
        eyebrow={t('admin.marketingEyebrow')}
        title={t('admin.navAnalytics')}
        actions={
          <button className="admin-btn" onClick={exportOrders} type="button">
            <DownloadOutlined /> {t('admin.exportOrders')}
          </button>
        }
      />

      <DateRangeToolbar
        countLabel={rangeLabel}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onPresetChange={setPreset}
        preset={preset}
      />

      <div className="admin-stat-grid">
        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.mktRevenue')}</span>
            <span className="admin-stat__icon">
              <AttachMoneyOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{currency(revenue)}</strong>
          <span className="admin-stat__hint">
            {t('admin.mktOrders', { count: number(paid.length) })}
          </span>
        </article>
        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.mktAverageOrder')}</span>
            <span className="admin-stat__icon">
              <TrendingUpOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{currency(averageOrder)}</strong>
          <span className="admin-stat__hint">{t('admin.mktAverageOrderHint')}</span>
        </article>
        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.mktNewCustomers')}</span>
            <span className="admin-stat__icon">
              <GroupOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{number(newCustomers)}</strong>
          <span className="admin-stat__hint">{t('admin.mktNewCustomersHint')}</span>
        </article>
        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.mktCouponDiscount')}</span>
            <span className="admin-stat__icon">
              <LocalOfferOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{currency(couponDiscount)}</strong>
          <span className="admin-stat__hint">{t('admin.mktCouponDiscountHint')}</span>
        </article>
        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.mktProfit')}</span>
            <span className="admin-stat__icon">
              <InsightsOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{currency(profit)}</strong>
          <span className="admin-stat__hint">
            {t('admin.mktProfitHint', { margin: number(Math.round(profitMargin)) })}
          </span>
        </article>
      </div>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.dailyReportTitle')}</h2>
            <p>{t('admin.dailyReportText')}</p>
          </div>
          <button
            className="admin-btn admin-btn--sm"
            onClick={exportDaily}
            type="button"
          >
            <DownloadOutlined /> {t('admin.exportDaily')}
          </button>
        </div>
        {dailyRows.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thDate')}</th>
                  <th>{t('admin.thOrdersColumn')}</th>
                  <th>{t('admin.thItems')}</th>
                  <th>{t('admin.thGrossSales')}</th>
                  <th>{t('admin.thCouponsUsed')}</th>
                  <th>{t('admin.thShipping')}</th>
                  <th>{t('admin.thRevenue')}</th>
                  <th>{t('admin.thAvgOrder')}</th>
                  <th>{t('admin.thProfit')}</th>
                </tr>
              </thead>
              <tbody>
                {dailyRows.map((row) => (
                  <tr key={row.date}>
                    <td data-label={t('admin.thDate')}>
                      <strong>{readableDateKey(row.date)}</strong>
                    </td>
                    <td data-label={t('admin.thOrdersColumn')}>
                      {number(row.orders)}
                    </td>
                    <td data-label={t('admin.thItems')}>{number(row.items)}</td>
                    <td data-label={t('admin.thGrossSales')}>
                      {currency(row.grossSales)}
                    </td>
                    <td data-label={t('admin.thCouponsUsed')}>
                      {currency(row.couponDiscount)}
                    </td>
                    <td data-label={t('admin.thShipping')}>
                      {currency(row.shipping)}
                    </td>
                    <td data-label={t('admin.thRevenue')}>
                      {currency(row.revenue)}
                    </td>
                    <td data-label={t('admin.thAvgOrder')}>
                      {currency(row.averageOrder)}
                    </td>
                    <td data-label={t('admin.thProfit')}>
                      <strong className="admin-table__profit">
                        {currency(row.profit)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <InsightsOutlined />
            <h3>{t('admin.dailyNoRows')}</h3>
            <p>{t('admin.dailyNoRowsText')}</p>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.mktTopCoupons')}</h2>
            <p>{t('admin.mktCouponsReportText')}</p>
          </div>
          <button className="admin-btn admin-btn--sm" onClick={exportCoupons} type="button">
            <DownloadOutlined /> {t('admin.exportCsv')}
          </button>
        </div>
        {couponRows.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thCode')}</th>
                  <th>{t('admin.thTitle')}</th>
                  <th>{t('admin.thRedemptions')}</th>
                  <th>{t('admin.thDiscountGiven')}</th>
                  <th>{t('admin.thRevenue')}</th>
                </tr>
              </thead>
              <tbody>
                {couponRows.map((row) => (
                  <tr key={row.code}>
                    <td data-label={t('admin.thCode')}>
                      <strong>{row.code}</strong>
                    </td>
                    <td data-label={t('admin.thTitle')}>{row.label}</td>
                    <td data-label={t('admin.thRedemptions')}>{number(row.uses)}</td>
                    <td data-label={t('admin.thDiscountGiven')}>
                      {currency(row.discount)}
                    </td>
                    <td data-label={t('admin.thRevenue')}>{currency(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <LocalOfferOutlined />
            <h3>{t('admin.mktNoCouponUse')}</h3>
            <p>{t('admin.mktNoCouponUseText')}</p>
          </div>
        )}
      </section>

      <div className="admin-grid admin-grid--split">
        <section className="admin-card">
          <div className="admin-card__header">
            <div>
              <h2>{t('admin.mktReferralsReport')}</h2>
              <p>{t('admin.mktReferralsReportText')}</p>
            </div>
          </div>
          {referralRows.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.thCode')}</th>
                    <th>{t('admin.thOrdersColumn')}</th>
                    <th>{t('admin.thRevenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {referralRows.map((row) => (
                    <tr key={row.code}>
                      <td data-label={t('admin.thCode')}>
                        <strong>{row.code}</strong>
                      </td>
                      <td data-label={t('admin.thOrdersColumn')}>
                        {number(row.orders)}
                      </td>
                      <td data-label={t('admin.thRevenue')}>
                        {currency(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">
              <ShareOutlined />
              <h3>{t('admin.mktNoReferrals')}</h3>
              <p>{t('admin.mktNoReferralsText')}</p>
            </div>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card__header">
            <div>
              <h2>{t('admin.mktTopSources')}</h2>
              <p>{t('admin.mktTopSourcesText')}</p>
            </div>
            <button
              className="admin-btn admin-btn--sm"
              onClick={exportSources}
              type="button"
            >
              <DownloadOutlined /> {t('admin.exportCsv')}
            </button>
          </div>
          {sourceRows.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.thSource')}</th>
                    <th>{t('admin.thOrdersColumn')}</th>
                    <th>{t('admin.thRevenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceRows.map((row) => (
                    <tr key={row.source}>
                      <td data-label={t('admin.thSource')}>{row.source}</td>
                      <td data-label={t('admin.thOrdersColumn')}>
                        {number(row.orders)}
                      </td>
                      <td data-label={t('admin.thRevenue')}>
                        {currency(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">
              <ReceiptLongOutlined />
              <h3>{t('admin.mktNoOrders')}</h3>
              <p>{t('admin.mktNoOrdersText')}</p>
            </div>
          )}
        </section>
      </div>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.mktTopCustomers')}</h2>
            <p>{t('admin.mktTopCustomersText')}</p>
          </div>
        </div>
        {topCustomers.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thName')}</th>
                  <th>{t('admin.thEmail')}</th>
                  <th>{t('admin.thOrdersColumn')}</th>
                  <th>{t('admin.thSpend')}</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((row) => {
                  const rangeOrders =
                    'rangeOrders' in row ? Number(row.rangeOrders) : row.orders.length
                  const rangeSpend =
                    'rangeSpend' in row ? Number(row.rangeSpend) : row.totalSpent
                  return (
                    <tr key={row.key}>
                      <td data-label={t('admin.thName')}>
                        {row.name || t('admin.subscriberNoName')}
                      </td>
                      <td data-label={t('admin.thEmail')}>
                        <span className="admin-table__muted">{row.email}</span>
                      </td>
                      <td data-label={t('admin.thOrdersColumn')}>
                        {number(rangeOrders)}
                      </td>
                      <td data-label={t('admin.thSpend')}>
                        {currency(rangeSpend)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <GroupOutlined />
            <h3>{t('admin.mktNoOrders')}</h3>
            <p>{t('admin.mktNoOrdersText')}</p>
          </div>
        )}
      </section>
    </>
  )
}

export default MarketingAnalyticsPage

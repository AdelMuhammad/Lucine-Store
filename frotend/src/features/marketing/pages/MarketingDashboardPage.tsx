import { useMemo, useState } from 'react'
import {
  AttachMoneyOutlined,
  CampaignOutlined,
  GroupOutlined,
  LocalOfferOutlined,
  ReceiptLongOutlined,
  RedeemOutlined,
  ShareOutlined,
  TrendingUpOutlined,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useAccountStore } from '../../account/store/useAccountStore'
import { deriveCustomerRows } from '../../account/customerRows'
import { useTranslation } from '../../../hooks/useTranslation'
import { isSupabaseConfigured } from '../../../lib/supabase'
import { couponStatus } from '../coupons'
import { useCouponStore } from '../store/useCouponStore'
import { useMarketingStore } from '../store/useMarketingStore'
import { loyaltyPoints, loyaltyTier } from '../segments'

const DIRECT_SOURCE = 'direct'

function MarketingDashboardPage() {
  const { t, currency, number } = useTranslation()
  const orders = useAccountStore((state) => state.orders)
  const coupons = useCouponStore((state) => state.coupons)
  const redemptions = useCouponStore((state) => state.redemptions)
  const subscribers = useMarketingStore((state) => state.subscribers)
  const campaigns = useMarketingStore((state) => state.campaigns)
  const settings = useMarketingStore((state) => state.settings)

  const [noticeDismissed, setNoticeDismissed] = useState(false)
  // Derived during render so no effect has to sync it back into state.
  const notice =
    !isSupabaseConfigured && !noticeDismissed
      ? t('admin.marketingLocalOnly')
      : ''

  const paidOrders = useMemo(
    () => orders.filter((order) => order.status !== 'cancelled'),
    [orders],
  )
  const revenue = paidOrders.reduce((total, order) => total + order.total, 0)
  const averageOrder = paidOrders.length > 0 ? revenue / paidOrders.length : 0

  const couponOrders = useMemo(
    () => paidOrders.filter((order) => order.couponCode),
    [paidOrders],
  )
  const couponRevenue = couponOrders.reduce(
    (total, order) => total + (order.couponDiscount ?? 0),
    0,
  )

  const referralOrders = useMemo(
    () => paidOrders.filter((order) => order.referredBy),
    [paidOrders],
  )
  const referralRevenue = referralOrders.reduce(
    (total, order) => total + order.total,
    0,
  )

  const customers = useMemo(() => deriveCustomerRows(orders), [orders])
  const activeCustomers = useMemo(
    () => customers.filter((row) => row.totalSpent > 0 && row.orders.length > 0),
    [customers],
  )

  const tiers = useMemo(() => {
    const counts = { bronze: 0, silver: 0, gold: 0 }
    activeCustomers.forEach((row) => {
      counts[loyaltyTier(row.totalSpent, settings)] += 1
    })
    return counts
  }, [activeCustomers, settings])

  const pointsOutstanding = activeCustomers.reduce(
    (total, row) => total + loyaltyPoints(row.totalSpent, settings),
    0,
  )

  const topCoupons = useMemo(() => {
    const map = new Map<string, { count: number; discount: number }>()
    redemptions.forEach((redemption) => {
      const current = map.get(redemption.couponCode) ?? { count: 0, discount: 0 }
      map.set(redemption.couponCode, {
        count: current.count + 1,
        discount: current.discount + redemption.discount,
      })
    })
    return [...map.entries()]
      .map(([code, stats]) => ({ code, ...stats }))
      .sort((first, second) => second.discount - first.discount)
      .slice(0, 5)
  }, [redemptions])

  const topSources = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>()
    paidOrders.forEach((order) => {
      const source = order.source?.trim() || DIRECT_SOURCE
      const current = map.get(source) ?? { orders: 0, revenue: 0 }
      map.set(source, {
        orders: current.orders + 1,
        revenue: current.revenue + order.total,
      })
    })
    return [...map.entries()]
      .map(([source, stats]) => ({ source, ...stats }))
      .sort((first, second) => second.revenue - first.revenue)
      .slice(0, 5)
  }, [paidOrders])

  const liveCoupons = coupons.filter(
    (coupon) => couponStatus(coupon) === 'active',
  ).length

  return (
    <>
      <AdminPageHeader
        description={t('admin.marketingDescription')}
        eyebrow={t('admin.marketingEyebrow')}
        title={t('admin.navMarketing')}
      />

      {notice && (
        <div className="admin-status-notice">
          {notice}
          <button onClick={() => setNoticeDismissed(true)} type="button">
            ×
          </button>
        </div>
      )}

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
            {t('admin.mktOrders', { count: number(paidOrders.length) })}
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
          <span className="admin-stat__hint">
            {t('admin.mktCustomers', { count: number(activeCustomers.length) })}
          </span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.mktCouponDiscount')}</span>
            <span className="admin-stat__icon">
              <RedeemOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{currency(couponRevenue)}</strong>
          <span className="admin-stat__hint">
            {t('admin.mktCouponUses', {
              count: number(redemptions.length),
              live: number(liveCoupons),
            })}
          </span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.mktReferralRevenue')}</span>
            <span className="admin-stat__icon">
              <ShareOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{currency(referralRevenue)}</strong>
          <span className="admin-stat__hint">
            {t('admin.mktReferralOrders', { count: number(referralOrders.length) })}
          </span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.mktSubscribers')}</span>
            <span className="admin-stat__icon">
              <GroupOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{number(subscribers.length)}</strong>
          <span className="admin-stat__hint">{t('admin.mktSubscribersHint')}</span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.mktCampaigns')}</span>
            <span className="admin-stat__icon">
              <CampaignOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{number(campaigns.length)}</strong>
          <span className="admin-stat__hint">
            {t('admin.mktCampaignsSent', {
              count: number(
                campaigns.filter((campaign) => campaign.status === 'sent').length,
              ),
            })}
          </span>
        </article>
      </div>

      <div className="admin-grid admin-grid--split">
        <section className="admin-card">
          <div className="admin-card__header">
            <div>
              <h2>{t('admin.mktQuickActions')}</h2>
              <p>{t('admin.mktQuickActionsText')}</p>
            </div>
          </div>
          <div className="admin-card__body admin-mkt-links">
            <Link className="admin-btn" to="/admin/marketing/coupons">
              <LocalOfferOutlined /> {t('admin.navCoupons')}
            </Link>
            <Link className="admin-btn" to="/admin/marketing/banners">
              <CampaignOutlined /> {t('admin.navBanners')}
            </Link>
            <Link className="admin-btn" to="/admin/marketing/campaigns">
              <CampaignOutlined /> {t('admin.navCampaigns')}
            </Link>
            <Link className="admin-btn" to="/admin/marketing/segments">
              <GroupOutlined /> {t('admin.navSegments')}
            </Link>
            <Link className="admin-btn" to="/admin/marketing/subscribers">
              <GroupOutlined /> {t('admin.navSubscribers')}
            </Link>
            <Link className="admin-btn" to="/admin/marketing/referrals">
              <ShareOutlined /> {t('admin.navReferrals')}
            </Link>
            <Link className="admin-btn" to="/admin/marketing/analytics">
              <TrendingUpOutlined /> {t('admin.navAnalytics')}
            </Link>
            <Link className="admin-btn" to="/admin/marketing/loyalty">
              <RedeemOutlined /> {t('admin.navLoyalty')}
            </Link>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card__header">
            <div>
              <h2>{t('admin.mktLoyalty')}</h2>
              <p>{t('admin.mktLoyaltyText')}</p>
            </div>
          </div>
          <div className="admin-card__body">
            <div className="admin-mkt-tiers">
              <div>
                <span>{t('loyaltyTier.gold')}</span>
                <strong>{number(tiers.gold)}</strong>
              </div>
              <div>
                <span>{t('loyaltyTier.silver')}</span>
                <strong>{number(tiers.silver)}</strong>
              </div>
              <div>
                <span>{t('loyaltyTier.bronze')}</span>
                <strong>{number(tiers.bronze)}</strong>
              </div>
            </div>
            <p className="admin-table__muted">
              {t('admin.mktPointsOutstanding', {
                points: number(pointsOutstanding),
              })}
            </p>
          </div>
        </section>
      </div>

      <div className="admin-grid admin-grid--split">
        <section className="admin-card">
          <div className="admin-card__header">
            <div>
              <h2>{t('admin.mktTopCoupons')}</h2>
              <p>{t('admin.mktTopCouponsText')}</p>
            </div>
          </div>
          {topCoupons.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.thCode')}</th>
                    <th>{t('admin.thRedemptions')}</th>
                    <th>{t('admin.thDiscountGiven')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topCoupons.map((row) => (
                    <tr key={row.code}>
                      <td data-label={t('admin.thCode')}>
                        <strong>{row.code}</strong>
                      </td>
                      <td data-label={t('admin.thRedemptions')}>
                        {number(row.count)}
                      </td>
                      <td data-label={t('admin.thDiscountGiven')}>
                        {currency(row.discount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">
              <RedeemOutlined />
              <h3>{t('admin.mktNoCouponUse')}</h3>
              <p>{t('admin.mktNoCouponUseText')}</p>
            </div>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card__header">
            <div>
              <h2>{t('admin.mktTopSources')}</h2>
              <p>{t('admin.mktTopSourcesText')}</p>
            </div>
          </div>
          {topSources.length > 0 ? (
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
                  {topSources.map((row) => (
                    <tr key={row.source}>
                      <td data-label={t('admin.thSource')}>
                        {row.source === DIRECT_SOURCE
                          ? t('admin.mktSourceNone')
                          : row.source}
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
              <ReceiptLongOutlined />
              <h3>{t('admin.mktNoOrders')}</h3>
              <p>{t('admin.mktNoOrdersText')}</p>
            </div>
          )}
        </section>
      </div>

      <p className="admin-table__muted">{t('admin.marketingFootnote')}</p>
    </>
  )
}

export default MarketingDashboardPage

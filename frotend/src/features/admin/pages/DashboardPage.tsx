import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowForward,
  AttachMoneyOutlined,
  CategoryOutlined,
  InsightsOutlined,
  Inventory2Outlined,
  LocalOfferOutlined,
  ReceiptLongOutlined,
  SellOutlined,
  TrendingDownOutlined,
  TrendingUpOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material'
import { useProductStore } from '../../products/store/useProductStore'
import { useCategoryStore } from '../../products/store/useCategoryStore'
import { useCouponStore } from '../../marketing/store/useCouponStore'
import { couponStatus } from '../../marketing/coupons'
import {
  normalizeMarketingSettings,
  useMarketingStore,
} from '../../marketing/store/useMarketingStore'
import { useAccountStore } from '../../account/store/useAccountStore'
import AdminPageHeader from '../components/AdminPageHeader'
import DateRangeToolbar from '../components/DateRangeToolbar'
import {
  buildDailyRows,
  presetWindow,
  todayVsYesterday,
  type RangePreset,
} from '../analytics'
import { openOrderStatuses, orderNumber, orderStatusVariant } from '../format'
import { useTranslation } from '../../../hooks/useTranslation'

function DashboardPage() {
  const { t, localized, currency, dateTime, number, date } = useTranslation()
  const products = useProductStore((state) => state.products)
  const categories = useCategoryStore((state) => state.categories)
  const promotions = useCouponStore((state) => state.coupons)
  const ordersRaw = useAccountStore((state) => state.orders)
  const settings = useMarketingStore((state) => state.settings)
  const profitMargin = normalizeMarketingSettings(settings).profitMargin

  const [preset, setPreset] = useState<RangePreset>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const window_ = useMemo(
    () => presetWindow(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  )

  const orders = useMemo(
    () =>
      [...ordersRaw].sort(
        (first, second) =>
          Date.parse(second.createdAt) - Date.parse(first.createdAt),
      ),
    [ordersRaw],
  )

  /** Non-cancelled orders inside the selected range. */
  const rangeOrders = useMemo(() => {
    if (!window_) return orders.filter((order) => order.status !== 'cancelled')
    return orders.filter((order) => {
      if (order.status === 'cancelled') return false
      const time = Date.parse(order.createdAt)
      return time >= window_.from && time <= window_.to
    })
  }, [orders, window_])

  const rangeRevenue = rangeOrders.reduce(
    (total, order) => total + order.total,
    0,
  )
  const dailyRows = useMemo(
    () => buildDailyRows(orders, window_, profitMargin),
    [orders, window_, profitMargin],
  )
  const rangeProfit = dailyRows.reduce((total, row) => total + row.profit, 0)

  const compare = useMemo(
    () => todayVsYesterday(orders, profitMargin),
    [orders, profitMargin],
  )
  const { today, yesterday } = compare
  const revenueDelta =
    yesterday.revenue > 0
      ? ((today.revenue - yesterday.revenue) / yesterday.revenue) * 100
      : null

  const activePromotions = promotions.filter(
    (coupon) => couponStatus(coupon) === 'active',
  ).length

  const openOrders = ordersRaw.filter((order) =>
    openOrderStatuses.includes(order.status),
  ).length
  const outOfStock = products.filter((product) => !product.inStock)
  const recentOrders = orders.slice(0, 5)
  const topCategories = categories
    .map((category) => ({
      ...category,
      count: products.filter((product) => product.category === category.name)
        .length,
    }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 5)

  const rangeLabel = window_
    ? t('admin.analyticsRange', {
        from: date(new Date(window_.from).toISOString(), 'short'),
        to: date(new Date(window_.to).toISOString(), 'short'),
      })
    : t('admin.analyticsRangeAll')

  return (
    <>
      <AdminPageHeader
        description={t('admin.dashboardDescription')}
        eyebrow={t('admin.dashboardEyebrow')}
        title={t('admin.dashboardTitle')}
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
            <span className="admin-stat__label">{t('admin.statTotalProducts')}</span>
            <span className="admin-stat__icon">
              <Inventory2Outlined />
            </span>
          </div>
          <strong className="admin-stat__value">{number(products.length)}</strong>
          <span className="admin-stat__hint">
            {t('admin.statOutOfStock', { count: number(outOfStock.length) })}
          </span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.statOrders')}</span>
            <span className="admin-stat__icon">
              <ReceiptLongOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">
            {number(rangeOrders.length)}
          </strong>
          <span className="admin-stat__hint">
            {t('admin.statOrdersScope', { count: number(openOrders) })}
          </span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.statRevenue')}</span>
            <span className="admin-stat__icon">
              <AttachMoneyOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{currency(rangeRevenue)}</strong>
          <span className="admin-stat__hint">
            {t('admin.statExcludesCancelled')}
          </span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.statProfit')}</span>
            <span className="admin-stat__icon">
              <InsightsOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{currency(rangeProfit)}</strong>
          <span className="admin-stat__hint">
            {t('admin.statProfitHint', { margin: number(Math.round(profitMargin)) })}
          </span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.statActiveOffers')}</span>
            <span className="admin-stat__icon">
              <LocalOfferOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{number(activePromotions)}</strong>
          <span className="admin-stat__hint">
            {t('admin.statAcrossCategories', { count: number(categories.length) })}
          </span>
        </article>
      </div>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.compareTitle')}</h2>
            <p>{t('admin.compareText')}</p>
          </div>
        </div>
        <div className="admin-card__body">
          <div className="admin-compare">
            <div className="admin-compare__col">
              <span className="admin-compare__label">
                {t('analyticsPreset.today')}
              </span>
              <strong className="admin-compare__value">
                {currency(today.revenue)}
              </strong>
              <span className="admin-compare__sub">
                {t('admin.compareOrders', { count: number(today.orders.length) })}
                {' · '}
                {t('admin.thProfit')}: {currency(today.profit)}
              </span>
            </div>
            <div aria-hidden="true" className="admin-compare__divider" />
            <div className="admin-compare__col">
              <span className="admin-compare__label">
                {t('analyticsPreset.yesterday')}
              </span>
              <strong className="admin-compare__value">
                {currency(yesterday.revenue)}
              </strong>
              <span className="admin-compare__sub">
                {t('admin.compareOrders', {
                  count: number(yesterday.orders.length),
                })}
                {' · '}
                {t('admin.thProfit')}: {currency(yesterday.profit)}
              </span>
            </div>
            {revenueDelta !== null && (
              <div
                className={`admin-compare__delta${
                  revenueDelta >= 0 ? ' is-up' : ' is-down'
                }`}
              >
                {revenueDelta >= 0 ? (
                  <TrendingUpOutlined />
                ) : (
                  <TrendingDownOutlined />
                )}
                <strong>
                  {revenueDelta >= 0 ? '+' : '−'}
                  {number(Math.abs(revenueDelta), { maximumFractionDigits: 0 })}%
                </strong>
                <span>{t('admin.compareDeltaLabel')}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="admin-grid admin-grid--split">
        <section className="admin-card">
          <div className="admin-card__header">
            <div>
              <h2>{t('admin.recentOrdersTitle')}</h2>
              <p>{t('admin.recentOrdersText')}</p>
            </div>
            <Link className="admin-btn admin-btn--sm" to="/admin/orders">
              {t('admin.allOrders')} <ArrowForward className="rtl-flip" />
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.thOrder')}</th>
                    <th>{t('admin.thCustomer')}</th>
                    <th>{t('admin.thTotal')}</th>
                    <th>{t('admin.thStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td data-label={t('admin.thOrder')}>
                        <Link to={`/admin/orders/${order.id}`}>
                          #{orderNumber(order.id)}
                        </Link>
                        <div className="admin-table__muted">
                          {dateTime(order.createdAt)}
                        </div>
                      </td>
                      <td data-label={t('admin.thCustomer')}>{order.email}</td>
                      <td data-label={t('admin.thTotal')}>
                        {currency(order.total)}
                      </td>
                      <td data-label={t('admin.thStatus')}>
                        <span
                          className={`admin-badge admin-badge--${orderStatusVariant(order.status)}`}
                        >
                          {t(`orderStatus.${order.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">
              <ReceiptLongOutlined />
              <h3>{t('admin.noOrdersTitle')}</h3>
              <p>{t('admin.noOrdersText')}</p>
            </div>
          )}
        </section>

        <div className="admin-grid">
          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.catalogueTitle')}</h2>
                <p>{t('admin.catalogueText')}</p>
              </div>
            </div>
            <div className="admin-card__body">
              <div className="admin-mini-stat-row">
                <div className="admin-mini-stat">
                  <span>{t('admin.miniCategories')}</span>
                  <strong>{number(categories.length)}</strong>
                </div>
                <div className="admin-mini-stat">
                  <span>{t('admin.miniOutOfStock')}</span>
                  <strong>{number(outOfStock.length)}</strong>
                </div>
                <div className="admin-mini-stat">
                  <span>{t('admin.miniOnOffer')}</span>
                  <strong>
                    {number(
                      products.filter((product) => product.originalPrice)
                        .length,
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.topCategoriesTitle')}</h2>
                <p>{t('admin.topCategoriesText')}</p>
              </div>
              <Link className="admin-btn admin-btn--sm" to="/admin/categories">
                <CategoryOutlined /> {t('admin.manage')}
              </Link>
            </div>
            {topCategories.length > 0 ? (
              <div className="admin-row-list">
                {topCategories.map((category) => (
                  <div className="admin-row" key={category.id}>
                    <div className="admin-row__main">
                      <strong>{localized(category.name, category.name_ar)}</strong>
                      <span>
                        {t('admin.productCount', { count: number(category.count) })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-empty">
                <CategoryOutlined />
                <h3>{t('admin.noCategoriesTitle')}</h3>
                <p>{t('admin.noCategoriesText')}</p>
              </div>
            )}
          </section>

          {outOfStock.length > 0 && (
            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2>{t('admin.needsAttentionTitle')}</h2>
                  <p>{t('admin.needsAttentionText')}</p>
                </div>
                <span className="admin-stat__icon">
                  <WarningAmberOutlined />
                </span>
              </div>
              <div className="admin-row-list">
                {outOfStock.slice(0, 5).map((product) => (
                  <div className="admin-row" key={product.id}>
                    <div className="admin-row__main">
                      <strong>{localized(product.name, product.name_ar)}</strong>
                      <span>{localized(product.brand, product.brand_ar)}</span>
                    </div>
                    <Link
                      className="admin-btn admin-btn--sm"
                      to="/admin/products"
                    >
                      <SellOutlined /> {t('admin.update')}
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  )
}

export default DashboardPage
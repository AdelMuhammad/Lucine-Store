import {
  ArrowBack,
  ArrowForward,
  CallOutlined,
  EventOutlined,
  LocalMallOutlined,
  LocationOnOutlined,
  MailOutlineOutlined,
  NotesOutlined,
  PersonOutlineOutlined,
  PublicOutlined,
  ReceiptLongOutlined,
  StorefrontOutlined,
} from '@mui/icons-material'
import { Link, useParams } from 'react-router-dom'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'
import { coverImage, type Product } from '../../products/data/products'
import { useProductStore } from '../../products/store/useProductStore'
import {
  documentTotals,
  purchaseProgress,
  round2,
  stockState,
  type PurchaseStatus,
  type StockState,
} from '../ops'
import { useOpsSettingsStore } from '../store/useOpsSettingsStore'
import { findSupplier, useSupplierStore } from '../store/useSupplierStore'

const purchaseVariant: Record<PurchaseStatus, string> = {
  draft: 'admin-badge--neutral',
  ordered: 'admin-badge--info',
  partial: 'admin-badge--warning',
  received: 'admin-badge--success',
  cancelled: 'admin-badge--danger',
}

const stateVariant: Record<StockState | 'untracked', string> = {
  ok: 'admin-badge--success',
  low: 'admin-badge--warning',
  out: 'admin-badge--danger',
  untracked: 'admin-badge--neutral',
}

/**
 * Everything the store buys from a single supplier: the products linked to it,
 * their buying and selling prices, margins, stock levels and the purchase
 * orders already placed with them.
 */
function SupplierDetailAdminPage() {
  const { t, localized, number, currency, date } = useTranslation()
  const { supplierId } = useParams()
  const suppliers = useSupplierStore((state) => state.suppliers)
  const purchaseOrders = useSupplierStore((state) => state.purchaseOrders)
  const products = useProductStore((state) => state.products)
  const settings = useOpsSettingsStore((state) => state.settings)

  const supplier = findSupplier(suppliers, supplierId ?? '')

  const backLink = (
    <Link className="admin-btn admin-btn--sm" to="/admin/ops/suppliers">
      <ArrowBack className="rtl-flip" /> {t('admin.backToSuppliers')}
    </Link>
  )

  if (!supplier) {
    return (
      <>
        {backLink}
        <section className="admin-card">
          <div className="admin-empty">
            <StorefrontOutlined />
            <h3>{t('admin.supplierNotFoundTitle')}</h3>
            <p>{t('admin.supplierNotFoundText')}</p>
            <Link
              className="admin-btn admin-btn--primary"
              to="/admin/ops/suppliers"
            >
              {t('admin.backToSuppliers')}
            </Link>
          </div>
        </section>
      </>
    )
  }

  const thresholdFor = (product: Product) =>
    product.lowStockThreshold ?? settings.lowStockThreshold

  const stateOf = (product: Product): StockState | 'untracked' => {
    if (typeof product.stockQuantity !== 'number') return 'untracked'
    return stockState(product.stockQuantity, thresholdFor(product))
  }

  const supplied = products
    .filter((product) => product.supplierId === supplier.id)
    .toSorted((first, second) =>
      localized(first.name, first.name_ar).localeCompare(
        localized(second.name, second.name_ar),
      ),
    )

  const orders = purchaseOrders
    .filter((order) => order.supplierId === supplier.id)
    .toSorted((first, second) =>
      second.orderedAt.localeCompare(first.orderedAt),
    )

  const unitsOnHand = supplied.reduce(
    (total, product) => total + (product.stockQuantity ?? 0),
    0,
  )
  const stockValue = round2(
    supplied.reduce(
      (total, product) =>
        total + (product.costPrice ?? 0) * (product.stockQuantity ?? 0),
      0,
    ),
  )
  const retailValue = round2(
    supplied.reduce(
      (total, product) =>
        total + product.price * (product.stockQuantity ?? 0),
      0,
    ),
  )
  const margins = supplied
    .filter((product) => product.price > 0 && (product.costPrice ?? 0) > 0)
    .map(
      (product) =>
        ((product.price - (product.costPrice ?? 0)) / product.price) * 100,
    )
  const avgMargin =
    margins.length > 0
      ? round2(margins.reduce((total, value) => total + value, 0) / margins.length)
      : null
  const lowStockCount = supplied.filter((product) => {
    const state = stateOf(product)
    return state === 'low' || state === 'out'
  }).length

  const address = [supplier.address, supplier.city, supplier.country]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      {backLink}

      <AdminPageHeader
        actions={
          <>
            <span
              className={`admin-badge admin-badge--${
                supplier.isActive ? 'success' : 'neutral'
              }`}
            >
              {supplier.isActive
                ? t('admin.supplierStatusActive')
                : t('admin.supplierStatusInactive')}
            </span>
            <Link
              className="admin-btn"
              to="/admin/ops/purchase-orders"
            >
              <ReceiptLongOutlined /> {t('admin.navPurchaseOrders')}
            </Link>
          </>
        }
        description={t('admin.supplierDetailDescription')}
        eyebrow={t('admin.supplierDetailEyebrow')}
        title={localized(supplier.name, supplier.name_ar)}
      />

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.supplierProductsTitle')}</h2>
            <p>{t('admin.supplierProductsText')}</p>
          </div>
          <span className="admin-badge admin-badge--neutral">
            {t('admin.supplierProductCount', {
              count: number(supplied.length),
            })}
          </span>
        </div>

        <div className="admin-card__body">
          <div className="admin-mini-stat-row">
            <div className="admin-mini-stat">
              <span>{t('admin.supplierStatProducts')}</span>
              <strong>{number(supplied.length)}</strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.supplierStatUnits')}</span>
              <strong>{number(unitsOnHand)}</strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.supplierStatStockValue')}</span>
              <strong>{currency(stockValue)}</strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.supplierStatRetailValue')}</span>
              <strong>{currency(retailValue)}</strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.supplierStatAvgMargin')}</span>
              <strong>
                {avgMargin !== null
                  ? t('admin.inventoryMarginValue', {
                      value: number(avgMargin),
                    })
                  : t('common.notSet')}
              </strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.supplierStatLowStock')}</span>
              <strong>{number(lowStockCount)}</strong>
            </div>
          </div>
        </div>

        {supplied.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thProduct')}</th>
                  <th>{t('admin.thCategory')}</th>
                  <th>{t('admin.thCost')}</th>
                  <th>{t('admin.thPrice')}</th>
                  <th>{t('admin.thMargin')}</th>
                  <th>{t('admin.thOnHand')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {supplied.map((product) => {
                  const state = stateOf(product)
                  const tracked = typeof product.stockQuantity === 'number'
                  const cost = product.costPrice ?? 0
                  const margin =
                    product.price > 0 && cost > 0
                      ? round2(((product.price - cost) / product.price) * 100)
                      : null
                  const image = coverImage(product)
                  return (
                    <tr key={product.id}>
                      <td
                        className="admin-table__cell--primary"
                        data-label={t('admin.thProduct')}
                      >
                        <div className="admin-table__primary">
                          {image && (
                            <img
                              alt=""
                              className="admin-table__thumb"
                              src={image}
                            />
                          )}
                          <span>
                            <strong>
                              {localized(product.name, product.name_ar)}
                            </strong>
                            <span>
                              {localized(product.brand, product.brand_ar) ||
                                product.id}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td data-label={t('admin.thCategory')}>
                        <span className="admin-table__muted">
                          {localized(product.category, product.category_ar) ||
                            t('common.notSet')}
                        </span>
                      </td>
                      <td data-label={t('admin.thCost')}>
                        {product.costPrice !== undefined
                          ? currency(product.costPrice)
                          : t('common.notSet')}
                      </td>
                      <td data-label={t('admin.thPrice')}>
                        {currency(product.price)}
                      </td>
                      <td data-label={t('admin.thMargin')}>
                        {margin !== null
                          ? t('admin.inventoryMarginValue', {
                              value: number(margin),
                            })
                          : t('common.notSet')}
                      </td>
                      <td data-label={t('admin.thOnHand')}>
                        {tracked
                          ? number(product.stockQuantity ?? 0)
                          : t('common.notSet')}
                      </td>
                      <td data-label={t('admin.thStatus')}>
                        <span className={`admin-badge ${stateVariant[state]}`}>
                          {t(`admin.inventoryState.${state}`)}
                        </span>
                      </td>
                      <td data-label={t('admin.thActions')}>
                        <div className="admin-table__actions">
                          <Link
                            aria-label={t('admin.viewInStore')}
                            className="admin-icon-btn"
                            title={t('admin.viewInStore')}
                            to={`/products/${product.id}`}
                          >
                            <ArrowForward className="rtl-flip" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <LocalMallOutlined />
            <h3>{t('admin.supplierNoProductsTitle')}</h3>
            <p>{t('admin.supplierNoProductsText')}</p>
          </div>
        )}
      </section>

      <div className="admin-grid admin-grid--split">
        <div className="admin-grid">
          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.supplierPurchaseOrdersTitle')}</h2>
                <p>{t('admin.supplierPurchaseOrdersText')}</p>
              </div>
              {orders.length > 0 && (
                <span className="admin-badge admin-badge--neutral">
                  {number(orders.length)}
                </span>
              )}
            </div>
            {orders.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.thReference')}</th>
                      <th>{t('admin.thProgress')}</th>
                      <th>{t('admin.thTotal')}</th>
                      <th>{t('admin.thStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const progress = purchaseProgress(order)
                      const totals = documentTotals({
                        lines: order.items.map((item) => ({
                          quantity: item.quantity,
                          unitPrice: item.unitCost,
                        })),
                        discount: order.discount,
                        shipping: order.shippingCost,
                        taxRate: order.taxRate,
                      })
                      return (
                        <tr key={order.id}>
                          <td
                            className="admin-table__cell--primary"
                            data-label={t('admin.thReference')}
                          >
                            <div className="admin-table__primary">
                              <strong>{order.number || order.id}</strong>
                              <span>
                                {date(order.orderedAt)}
                              </span>
                            </div>
                          </td>
                          <td data-label={t('admin.thProgress')}>
                            {t('admin.inventoryMarginValue', {
                              value: number(progress.percent),
                            })}
                          </td>
                          <td data-label={t('admin.thTotal')}>
                            {currency(totals.total)}
                          </td>
                          <td data-label={t('admin.thStatus')}>
                            <span
                              className={`admin-badge ${purchaseVariant[order.status]}`}
                            >
                              {t(`purchaseStatus.${order.status}`)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty">
                <ReceiptLongOutlined />
                <p>{t('admin.supplierNoPurchaseOrders')}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="admin-grid">
          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.supplierInfoTitle')}</h2>
                <p>{t('admin.supplierInfoText')}</p>
              </div>
            </div>
            <div className="admin-card__body">
              <div className="admin-row-list">
                <div className="admin-row" style={{ padding: 0 }}>
                  <PersonOutlineOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>{supplier.contactName || t('common.notSet')}</strong>
                    <span>{t('admin.supplierContactLabel')}</span>
                  </div>
                </div>

                <div className="admin-row" style={{ padding: 0 }}>
                  <CallOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>{supplier.phone || t('common.notSet')}</strong>
                    <span>{t('admin.supplierPhoneLabel')}</span>
                  </div>
                </div>

                <div className="admin-row" style={{ padding: 0 }}>
                  <MailOutlineOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>{supplier.email || t('common.notSet')}</strong>
                    <span>{t('admin.supplierEmailLabel')}</span>
                  </div>
                </div>

                <div className="admin-row" style={{ padding: 0 }}>
                  <LocationOnOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>{address || t('common.notSet')}</strong>
                    <span>
                      {[supplier.city, supplier.country]
                        .filter(Boolean)
                        .join(', ') || t('common.notSet')}
                    </span>
                  </div>
                </div>

                <div className="admin-row" style={{ padding: 0 }}>
                  <PublicOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>{supplier.taxId || t('common.notSet')}</strong>
                    <span>{t('admin.supplierTaxIdLabel')}</span>
                  </div>
                </div>

                <div className="admin-row" style={{ padding: 0 }}>
                  <EventOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>
                      {supplier.paymentTerms > 0
                        ? t('admin.supplierTermsDays', {
                            days: number(supplier.paymentTerms),
                          })
                        : t('admin.supplierTermsOnReceipt')}
                    </strong>
                    <span>{t('admin.supplierPaymentTermsLabel')}</span>
                  </div>
                </div>

                {supplier.notes && (
                  <div className="admin-row" style={{ padding: 0 }}>
                    <NotesOutlined
                      style={{ color: 'var(--color-gold-dark)' }}
                    />
                    <div className="admin-row__main">
                      <strong>{supplier.notes}</strong>
                      <span>{t('admin.thNotes')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}

export default SupplierDetailAdminPage

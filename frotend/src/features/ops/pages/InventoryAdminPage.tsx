import { useState } from 'react'
import {
  AddCircleOutlined,
  Inventory2Outlined,
  RemoveCircleOutlined,
  Search,
  SyncOutlined,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'
import { coverImage, type Product } from '../../products/data/products'
import { useProductStore } from '../../products/store/useProductStore'
import { round2, stockState, type StockState } from '../ops'
import { useOpsSettingsStore } from '../store/useOpsSettingsStore'
import { useSupplierStore } from '../store/useSupplierStore'

type StockFilter = 'all' | StockState | 'untracked'

const stateVariant: Record<StockState | 'untracked', string> = {
  ok: 'admin-badge--success',
  low: 'admin-badge--warning',
  out: 'admin-badge--danger',
  untracked: 'admin-badge--neutral',
}

function InventoryAdminPage() {
  const { t, localized, number, currency, dateTime } = useTranslation()
  const products = useProductStore((state) => state.products)
  const updateProduct = useProductStore((state) => state.updateProduct)
  const suppliers = useSupplierStore((state) => state.suppliers)
  const movements = useSupplierStore((state) => state.movements)
  const adjustStock = useSupplierStore((state) => state.adjustStock)
  const settings = useOpsSettingsStore((state) => state.settings)

  const [query, setQuery] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [adjusting, setAdjusting] = useState<Product | null>(null)
  const [adjustDraft, setAdjustDraft] = useState({ quantity: '0', note: '' })
  const [formError, setFormError] = useState('')

  const thresholdFor = (product: Product) =>
    product.lowStockThreshold ?? settings.lowStockThreshold

  const stateOf = (product: Product): StockState | 'untracked' => {
    if (typeof product.stockQuantity !== 'number') return 'untracked'
    return stockState(product.stockQuantity, thresholdFor(product))
  }

  const needle = query.trim().toLowerCase()
  const visible = products
    .filter((product) =>
      stockFilter === 'all' ? true : stateOf(product) === stockFilter,
    )
    .filter((product) => {
      if (!needle) return true
      return [product.name, product.name_ar, product.id, product.brand]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })

  const supplierName = (supplierId: string | undefined) => {
    const supplier = suppliers.find((item) => item.id === supplierId)
    return supplier ? localized(supplier.name, supplier.name_ar) : ''
  }

  const productName = (productId: string) => {
    const product = products.find((item) => item.id === productId)
    return product ? localized(product.name, product.name_ar) : productId
  }

  const recentMovements = movements.slice(0, 15)

  function openAdjust(product: Product) {
    setAdjustDraft({
      quantity: String(product.stockQuantity ?? 0),
      note: '',
    })
    setFormError('')
    setAdjusting(product)
  }

  async function confirmAdjust() {
    if (!adjusting) return
    const next = Math.max(0, Math.floor(Number(adjustDraft.quantity) || 0))
    const current = adjusting.stockQuantity ?? 0
    if (next === current) {
      setFormError(t('admin.inventoryAdjustUnchanged'))
      return
    }
    await adjustStock(adjusting.id, next - current, adjustDraft.note.trim())
    setAdjusting(null)
  }

  async function toggleTracking(product: Product) {
    await updateProduct({
      ...product,
      stockQuantity:
        typeof product.stockQuantity === 'number'
          ? undefined
          : (product.stockQuantity ?? 0),
    })
  }

  return (
    <>
      <AdminPageHeader
        description={t('admin.inventoryDescription')}
        eyebrow={t('admin.opsEyebrow')}
        title={t('admin.navInventory')}
      />

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <Search />
          <input
            aria-label={t('admin.searchInventoryAria')}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.searchInventoryPlaceholder')}
            value={query}
          />
        </label>
        <select
          aria-label={t('admin.inventoryFilterStock')}
          className="admin-toolbar__select"
          onChange={(event) =>
            setStockFilter(event.target.value as StockFilter)
          }
          value={stockFilter}
        >
          <option value="all">{t('admin.inventoryStockAll')}</option>
          <option value="ok">{t('admin.inventoryState.ok')}</option>
          <option value="low">{t('admin.inventoryState.low')}</option>
          <option value="out">{t('admin.inventoryState.out')}</option>
          <option value="untracked">
            {t('admin.inventoryState.untracked')}
          </option>
        </select>
        <span className="admin-toolbar__count">
          {t('admin.inventoryCount', { count: number(visible.length) })}
        </span>
      </div>

      <section className="admin-card">
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thProduct')}</th>
                  <th>{t('admin.thSupplier')}</th>
                  <th>{t('admin.thCost')}</th>
                  <th>{t('admin.thMargin')}</th>
                  <th>{t('admin.thOnHand')}</th>
                  <th>{t('admin.thThreshold')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => {
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
                            <img alt="" className="admin-table__thumb" src={image} />
                          )}
                          <span>
                            <strong>
                              {localized(product.name, product.name_ar)}
                            </strong>
                            <span>{product.id}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label={t('admin.thSupplier')}>
                        <span className="admin-table__muted">
                          {supplierName(product.supplierId) || t('common.notSet')}
                        </span>
                      </td>
                      <td data-label={t('admin.thCost')}>
                        {product.costPrice !== undefined
                          ? currency(product.costPrice)
                          : t('common.notSet')}
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
                      <td data-label={t('admin.thThreshold')}>
                        {tracked ? number(thresholdFor(product)) : '—'}
                      </td>
                      <td data-label={t('admin.thStatus')}>
                        <span className={`admin-badge ${stateVariant[state]}`}>
                          {t(`admin.inventoryState.${state}`)}
                        </span>
                      </td>
                      <td data-label={t('admin.thActions')}>
                        <div className="admin-table__actions">
                          {tracked ? (
                            <>
                              <button
                                aria-label={t('admin.inventoryAdjustTitle')}
                                className="admin-icon-btn"
                                onClick={() => openAdjust(product)}
                                title={t('admin.inventoryAdjustTitle')}
                                type="button"
                              >
                                <SyncOutlined />
                              </button>
                              <button
                                aria-label={t('admin.inventoryUntrack')}
                                className="admin-icon-btn"
                                onClick={() => void toggleTracking(product)}
                                title={t('admin.inventoryUntrack')}
                                type="button"
                              >
                                <RemoveCircleOutlined />
                              </button>
                            </>
                          ) : (
                            <button
                              aria-label={t('admin.inventoryTrack')}
                              className="admin-icon-btn"
                              onClick={() => void toggleTracking(product)}
                              title={t('admin.inventoryTrack')}
                              type="button"
                            >
                              <AddCircleOutlined />
                            </button>
                          )}
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
            <Inventory2Outlined />
            <h3>{t('admin.noInventoryTitle')}</h3>
            <p>{t('admin.noInventoryText')}</p>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card__header">
          <h2>{t('admin.inventoryMovementsTitle')}</h2>
          <p>{t('admin.inventoryMovementsText')}</p>
        </div>
        {recentMovements.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thProduct')}</th>
                  <th>{t('admin.thMovementQty')}</th>
                  <th>{t('admin.thMovementReason')}</th>
                  <th>{t('admin.thMovementReference')}</th>
                  <th>{t('admin.thDate')}</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td data-label={t('admin.thProduct')}>
                      {productName(movement.productId)}
                    </td>
                    <td data-label={t('admin.thMovementQty')}>
                      <span
                        className={`admin-badge admin-badge--${
                          movement.quantity >= 0 ? 'success' : 'warning'
                        }`}
                      >
                        {movement.quantity >= 0 ? '+' : '−'}
                        {number(Math.abs(movement.quantity))}
                      </span>
                    </td>
                    <td data-label={t('admin.thMovementReason')}>
                      {t(`movementReason.${movement.reason}`)}
                    </td>
                    <td data-label={t('admin.thMovementReference')}>
                      <span className="admin-table__muted">
                        {movement.reference || '—'}
                      </span>
                    </td>
                    <td data-label={t('admin.thDate')}>
                      {dateTime(movement.createdAt, 'short')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <SyncOutlined />
            <h3>{t('admin.noMovementsTitle')}</h3>
            <p>{t('admin.noMovementsText')}</p>
          </div>
        )}
      </section>

      {adjusting && (
        <AdminModal
          description={t('admin.inventoryAdjustDescription', {
            name: localized(adjusting.name, adjusting.name_ar),
          })}
          onClose={() => setAdjusting(null)}
          title={t('admin.inventoryAdjustTitle')}
        >
          <div className="admin-form">
            <label className="admin-field">
              <span>{t('admin.inventoryAdjustUnitsLabel')}</span>
              <input
                min="0"
                onChange={(event) =>
                  setAdjustDraft((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                type="number"
                value={adjustDraft.quantity}
              />
              <span className="admin-field-hint">
                {t('admin.inventoryAdjustCurrent', {
                  count: number(adjusting.stockQuantity ?? 0),
                })}
              </span>
            </label>
            <label className="admin-field">
              <span>{t('admin.inventoryAdjustNoteLabel')}</span>
              <input
                onChange={(event) =>
                  setAdjustDraft((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                value={adjustDraft.note}
              />
            </label>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button
                className="admin-btn"
                onClick={() => setAdjusting(null)}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button
                className="admin-btn admin-btn--primary"
                onClick={() => void confirmAdjust()}
                type="button"
              >
                {t('admin.inventoryAdjustConfirm')}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </>
  )
}

export default InventoryAdminPage

import { useState, type FormEvent } from 'react'
import {
  Add,
  AddCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ReceiptLongOutlined,
  RemoveCircleOutlined,
  Search,
  TaskAltOutlined,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'
import { useProductStore } from '../../products/store/useProductStore'
import {
  documentTotals,
  newOpsId,
  nowIso,
  outstandingLines,
  purchaseProgress,
  purchaseStatuses,
  toDay,
  todayIso,
  type PurchaseStatus,
} from '../ops'
import { useOpsSettingsStore } from '../store/useOpsSettingsStore'
import {
  useSupplierStore,
  type PurchaseOrder,
} from '../store/useSupplierStore'

const statusVariant: Record<PurchaseStatus, string> = {
  draft: 'admin-badge--neutral',
  ordered: 'admin-badge--info',
  partial: 'admin-badge--warning',
  received: 'admin-badge--success',
  cancelled: 'admin-badge--danger',
}

type LineDraft = {
  id: string
  productId: string
  quantity: string
  unitCost: string
}

type OrderDraft = {
  supplierId: string
  orderedAt: string
  expectedAt: string
  notes: string
  discount: string
  shippingCost: string
  taxRate: string
  amountPaid: string
  items: LineDraft[]
}

function emptyLine(): LineDraft {
  return { id: newOpsId('po-line'), productId: '', quantity: '1', unitCost: '0' }
}

function emptyDraft(): OrderDraft {
  return {
    supplierId: '',
    orderedAt: todayIso(),
    expectedAt: '',
    notes: '',
    discount: '0',
    shippingCost: '0',
    taxRate: '0',
    amountPaid: '0',
    items: [emptyLine()],
  }
}

function draftFrom(order: PurchaseOrder): OrderDraft {
  return {
    supplierId: order.supplierId,
    orderedAt: toDay(order.orderedAt),
    expectedAt: toDay(order.expectedAt),
    notes: order.notes,
    discount: String(order.discount),
    shippingCost: String(order.shippingCost),
    taxRate: String(order.taxRate),
    amountPaid: String(order.amountPaid),
    items:
      order.items.length > 0
        ? order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: String(item.quantity),
            unitCost: String(item.unitCost),
          }))
        : [emptyLine()],
  }
}

function draftTotals(draft: OrderDraft) {
  return documentTotals({
    lines: draft.items
      .filter((line) => line.productId)
      .map((line) => ({
        quantity: Math.max(0, Number(line.quantity) || 0),
        unitPrice: Math.max(0, Number(line.unitCost) || 0),
      })),
    discount: Math.max(0, Number(draft.discount) || 0),
    shipping: Math.max(0, Number(draft.shippingCost) || 0),
    taxRate: Math.max(0, Number(draft.taxRate) || 0),
  })
}

function PurchaseOrdersAdminPage() {
  const { t, localized, number, currency, date } = useTranslation()
  const orders = useSupplierStore((state) => state.purchaseOrders)
  const suppliers = useSupplierStore((state) => state.suppliers)
  const addPurchaseOrder = useSupplierStore((state) => state.addPurchaseOrder)
  const updatePurchaseOrder = useSupplierStore(
    (state) => state.updatePurchaseOrder,
  )
  const removePurchaseOrder = useSupplierStore(
    (state) => state.removePurchaseOrder,
  )
  const receivePurchaseOrder = useSupplierStore(
    (state) => state.receivePurchaseOrder,
  )
  const products = useProductStore((state) => state.products)
  const takeDocumentNumber = useOpsSettingsStore(
    (state) => state.takeDocumentNumber,
  )

  const [editing, setEditing] = useState<PurchaseOrder | 'new' | null>(null)
  const [draft, setDraft] = useState<OrderDraft>(emptyDraft)
  const [formError, setFormError] = useState('')
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null)
  const [receipts, setReceipts] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseStatus>('all')
  const [supplierFilter, setSupplierFilter] = useState('all')

  const needle = query.trim().toLowerCase()
  const supplierName = (supplierId: string) => {
    const supplier = suppliers.find((item) => item.id === supplierId)
    if (!supplier) return t('admin.poNoSupplier')
    return localized(supplier.name, supplier.name_ar)
  }
  const productName = (productId: string) => {
    const product = products.find((item) => item.id === productId)
    if (!product) return t('admin.poUnknownProduct')
    return localized(product.name, product.name_ar)
  }

  const visible = orders
    .filter((order) => statusFilter === 'all' || order.status === statusFilter)
    .filter(
      (order) =>
        supplierFilter === 'all' || order.supplierId === supplierFilter,
    )
    .filter((order) => {
      if (!needle) return true
      return [order.number, order.notes, supplierName(order.supplierId)]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
    .toSorted((first, second) =>
      second.orderedAt.localeCompare(first.orderedAt),
    )

  const totals = draftTotals(draft)

  function update<K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((line) =>
        line.id === id ? { ...line, ...patch } : line,
      ),
    }))
  }

  function addLine() {
    setDraft((current) => ({ ...current, items: [...current.items, emptyLine()] }))
  }

  function removeLine(id: string) {
    setDraft((current) => ({
      ...current,
      items:
        current.items.length > 1
          ? current.items.filter((line) => line.id !== id)
          : current.items,
    }))
  }

  function pickProduct(id: string, productId: string) {
    const product = products.find((item) => item.id === productId)
    updateLine(id, {
      productId,
      unitCost:
        product?.costPrice !== undefined ? String(product.costPrice) : '0',
    })
  }

  function openCreate() {
    setDraft({
      ...emptyDraft(),
      supplierId: supplierFilter === 'all' ? '' : supplierFilter,
    })
    setFormError('')
    setEditing('new')
  }

  function openEdit(order: PurchaseOrder) {
    setDraft(draftFrom(order))
    setFormError('')
    setEditing(order)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const items = draft.items.filter(
      (line) => line.productId && Number(line.quantity) > 0,
    )
    if (!draft.supplierId) {
      setFormError(t('admin.poSupplierRequired'))
      return
    }
    if (items.length === 0) {
      setFormError(t('admin.poItemsRequired'))
      return
    }

    const previous = editing && editing !== 'new' ? editing : null
    const orderedAt = toDay(draft.orderedAt) || todayIso()

    const order: PurchaseOrder = {
      id: previous?.id ?? newOpsId('purchase-order'),
      number: previous?.number ?? takeDocumentNumber('purchase'),
      supplierId: draft.supplierId,
      status:
        previous && previous.status !== 'draft'
          ? previous.status
          : draft.orderedAt
            ? 'ordered'
            : 'draft',
      orderedAt,
      expectedAt: toDay(draft.expectedAt),
      receivedAt: previous?.receivedAt ?? '',
      notes: draft.notes.trim(),
      items: items.map((line) => {
        const previousItem = previous?.items.find((item) => item.id === line.id)
        return {
          id: line.id,
          productId: line.productId,
          name: productName(line.productId),
          quantity: Math.max(1, Math.floor(Number(line.quantity) || 1)),
          receivedQuantity: previousItem?.receivedQuantity ?? 0,
          unitCost: Math.max(0, Number(line.unitCost) || 0),
        }
      }),
      discount: Math.max(0, Number(draft.discount) || 0),
      shippingCost: Math.max(0, Number(draft.shippingCost) || 0),
      taxRate: Math.max(0, Number(draft.taxRate) || 0),
      amountPaid: Math.max(0, Number(draft.amountPaid) || 0),
      createdAt: previous?.createdAt ?? nowIso(),
    }

    if (previous) {
      await updatePurchaseOrder(order)
    } else {
      await addPurchaseOrder(order)
    }
    setEditing(null)
  }

  async function handleDelete(order: PurchaseOrder) {
    if (!window.confirm(t('admin.poDeleteConfirm'))) return
    await removePurchaseOrder(order.id)
  }

  function openReceive(order: PurchaseOrder) {
    const defaults: Record<string, string> = {}
    outstandingLines(order).forEach((item) => {
      defaults[item.id] = String(item.outstanding)
    })
    setReceipts(defaults)
    setReceiving(order)
  }

  async function confirmReceive() {
    if (!receiving) return
    const payload: Record<string, number> = {}
    Object.entries(receipts).forEach(([id, value]) => {
      const units = Math.max(0, Math.floor(Number(value) || 0))
      if (units > 0) payload[id] = units
    })
    await receivePurchaseOrder(receiving.id, payload)
    setReceiving(null)
  }

  return (
    <>
      <AdminPageHeader
        actions={
          <button
            className="admin-btn admin-btn--primary"
            onClick={openCreate}
            type="button"
          >
            <Add /> {t('admin.addPurchaseOrder')}
          </button>
        }
        description={t('admin.purchaseOrdersDescription')}
        eyebrow={t('admin.opsEyebrow')}
        title={t('admin.navPurchaseOrders')}
      />

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <Search />
          <input
            aria-label={t('admin.searchPurchaseOrdersAria')}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.searchPurchaseOrdersPlaceholder')}
            value={query}
          />
        </label>
        <select
          aria-label={t('admin.poFilterSupplier')}
          className="admin-toolbar__select"
          onChange={(event) => setSupplierFilter(event.target.value)}
          value={supplierFilter}
        >
          <option value="all">{t('admin.poAllSuppliers')}</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {localized(supplier.name, supplier.name_ar)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('admin.filterByStatus')}
          className="admin-toolbar__select"
          onChange={(event) =>
            setStatusFilter(event.target.value as 'all' | PurchaseStatus)
          }
          value={statusFilter}
        >
          <option value="all">{t('admin.allStatuses')}</option>
          {purchaseStatuses.map((status) => (
            <option key={status} value={status}>
              {t(`purchaseStatus.${status}`)}
            </option>
          ))}
        </select>
        <span className="admin-toolbar__count">
          {t('admin.poCount', { count: number(visible.length) })}
        </span>
      </div>

      <section className="admin-card">
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thReference')}</th>
                  <th>{t('admin.thOrdered')}</th>
                  <th>{t('admin.thProgress')}</th>
                  <th>{t('admin.thTotal')}</th>
                  <th>{t('admin.thBalance')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => {
                  const progress = purchaseProgress(order)
                  const orderTotals = documentTotals({
                    lines: order.items.map((item) => ({
                      quantity: item.quantity,
                      unitPrice: item.unitCost,
                    })),
                    discount: order.discount,
                    shipping: order.shippingCost,
                    taxRate: order.taxRate,
                  })
                  const balance = Math.max(
                    0,
                    orderTotals.total - order.amountPaid,
                  )
                  return (
                    <tr key={order.id}>
                      <td data-label={t('admin.thReference')}>
                        <div className="admin-table__primary">
                          <strong>{order.number || order.id}</strong>
                          <span>{supplierName(order.supplierId)}</span>
                        </div>
                      </td>
                      <td data-label={t('admin.thOrdered')}>
                        <div className="admin-table__primary">
                          <span>
                            {order.orderedAt
                              ? date(order.orderedAt, 'short')
                              : t('common.notSet')}
                          </span>
                          {order.expectedAt && (
                            <span>
                              {t('admin.poExpectedOn', {
                                date: date(order.expectedAt, 'short'),
                              })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label={t('admin.thProgress')}>
                        <div className="admin-table__primary">
                          <strong>
                            {t('admin.poProgressValue', {
                              percent: number(progress.percent),
                            })}
                          </strong>
                          <span>
                            {t('admin.poUnitsReceived', {
                              received: number(progress.received),
                              ordered: number(progress.ordered),
                            })}
                          </span>
                        </div>
                      </td>
                      <td data-label={t('admin.thTotal')}>
                        {currency(orderTotals.total)}
                      </td>
                      <td data-label={t('admin.thBalance')}>
                        <span
                          className={
                            balance > 0 ? 'admin-table__primary' : 'admin-table__muted'
                          }
                        >
                          {currency(balance)}
                        </span>
                      </td>
                      <td data-label={t('admin.thStatus')}>
                        <span
                          className={`admin-badge ${statusVariant[order.status]}`}
                        >
                          {t(`purchaseStatus.${order.status}`)}
                        </span>
                      </td>
                      <td data-label={t('admin.thActions')}>
                        <div className="admin-table__actions">
                          {order.status !== 'cancelled' &&
                            order.status !== 'received' && (
                              <button
                                aria-label={t('admin.poReceiveTitle')}
                                className="admin-icon-btn"
                                onClick={() => openReceive(order)}
                                title={t('admin.poReceiveTitle')}
                                type="button"
                              >
                                <TaskAltOutlined />
                              </button>
                            )}
                          <button
                            aria-label={t('admin.editPurchaseOrder')}
                            className="admin-icon-btn"
                            onClick={() => openEdit(order)}
                            type="button"
                          >
                            <EditOutlined />
                          </button>
                          <button
                            aria-label={t('common.delete')}
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => void handleDelete(order)}
                            type="button"
                          >
                            <DeleteOutlined />
                          </button>
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
            <ReceiptLongOutlined />
            <h3>{t('admin.noPurchaseOrdersTitle')}</h3>
            <p>{t('admin.noPurchaseOrdersText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openCreate}
              type="button"
            >
              <Add /> {t('admin.addPurchaseOrder')}
            </button>
          </div>
        )}
      </section>

      {editing && (
        <AdminModal
          description={t('admin.purchaseOrderModalDescription')}
          onClose={() => setEditing(null)}
          size="lg"
          title={
            editing === 'new'
              ? t('admin.addPurchaseOrderTitle')
              : t('admin.editPurchaseOrder')
          }
        >
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t('admin.thSupplier')}</span>
                <select
                  onChange={(event) => update('supplierId', event.target.value)}
                  value={draft.supplierId}
                >
                  <option value="">{t('admin.poChooseSupplier')}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {localized(supplier.name, supplier.name_ar)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>{t('admin.poOrderedAtLabel')}</span>
                <input
                  onChange={(event) => update('orderedAt', event.target.value)}
                  type="date"
                  value={draft.orderedAt}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.poExpectedAtLabel')}</span>
                <input
                  onChange={(event) => update('expectedAt', event.target.value)}
                  type="date"
                  value={draft.expectedAt}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.poAmountPaidLabel')}</span>
                <input
                  min="0"
                  onChange={(event) => update('amountPaid', event.target.value)}
                  step="0.01"
                  type="number"
                  value={draft.amountPaid}
                />
              </label>
            </div>

            <div className="admin-lines">
              <table>
                <thead>
                  <tr>
                    <th>{t('admin.thProduct')}</th>
                    <th>{t('admin.thQuantity')}</th>
                    <th>{t('admin.thUnitCost')}</th>
                    <th>{t('admin.thLineTotal')}</th>
                    <th aria-label={t('admin.thActions')} />
                  </tr>
                </thead>
                <tbody>
                  {draft.items.map((line) => (
                    <tr key={line.id}>
                      <td>
                        <select
                          aria-label={t('admin.thProduct')}
                          onChange={(event) =>
                            pickProduct(line.id, event.target.value)
                          }
                          value={line.productId}
                        >
                          <option value="">{t('admin.poChooseProduct')}</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {localized(product.name, product.name_ar)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          aria-label={t('admin.thQuantity')}
                          min="1"
                          onChange={(event) =>
                            updateLine(line.id, { quantity: event.target.value })
                          }
                          type="number"
                          value={line.quantity}
                        />
                      </td>
                      <td>
                        <input
                          aria-label={t('admin.thUnitCost')}
                          min="0"
                          onChange={(event) =>
                            updateLine(line.id, { unitCost: event.target.value })
                          }
                          step="0.01"
                          type="number"
                          value={line.unitCost}
                        />
                      </td>
                      <td className="admin-lines__cell--amount">
                        {currency(
                          (Number(line.quantity) || 0) *
                            (Number(line.unitCost) || 0),
                        )}
                      </td>
                      <td className="admin-lines__actions">
                        <button
                          aria-label={t('common.remove')}
                          className="admin-icon-btn admin-icon-btn--danger"
                          onClick={() => removeLine(line.id)}
                          type="button"
                        >
                          <RemoveCircleOutlined />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                className="admin-btn admin-btn--sm"
                onClick={addLine}
                type="button"
              >
                <AddCircleOutlined /> {t('admin.poAddLine')}
              </button>
            </div>

            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t('admin.thDiscount')}</span>
                <input
                  min="0"
                  onChange={(event) => update('discount', event.target.value)}
                  step="0.01"
                  type="number"
                  value={draft.discount}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.poShippingLabel')}</span>
                <input
                  min="0"
                  onChange={(event) => update('shippingCost', event.target.value)}
                  step="0.01"
                  type="number"
                  value={draft.shippingCost}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.poTaxRateLabel')}</span>
                <input
                  min="0"
                  onChange={(event) => update('taxRate', event.target.value)}
                  step="0.01"
                  type="number"
                  value={draft.taxRate}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>{t('admin.thNotes')}</span>
                <textarea
                  onChange={(event) => update('notes', event.target.value)}
                  value={draft.notes}
                />
              </label>
            </div>

            <dl className="admin-totals">
              <div>
                <dt>{t('admin.subtotal')}</dt>
                <dd>{currency(totals.subtotal)}</dd>
              </div>
              <div>
                <dt>{t('admin.thDiscount')}</dt>
                <dd>{currency(totals.subtotal - totals.net)}</dd>
              </div>
              <div>
                <dt>{t('admin.poTaxLabel')}</dt>
                <dd>{currency(totals.taxAmount)}</dd>
              </div>
              <div className="admin-totals__grand">
                <dt>{t('admin.thTotal')}</dt>
                <dd>{currency(totals.total)}</dd>
              </div>
            </dl>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button
                className="admin-btn"
                onClick={() => setEditing(null)}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="admin-btn admin-btn--primary" type="submit">
                {editing === 'new'
                  ? t('admin.addPurchaseOrder')
                  : t('common.saveChanges')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {receiving && (
        <AdminModal
          description={t('admin.poReceiveDescription')}
          onClose={() => setReceiving(null)}
          title={t('admin.poReceiveTitle')}
        >
          <div className="admin-form">
            <p className="admin-field-hint">
              {t('admin.poReceiveHint', {
                number: receiving.number || receiving.id,
              })}
            </p>
            <table className="admin-lines">
              <thead>
                <tr>
                  <th>{t('admin.thProduct')}</th>
                  <th>{t('admin.thOutstanding')}</th>
                  <th>{t('admin.poReceiveUnitsLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {outstandingLines(receiving).map((line) => (
                  <tr key={line.id}>
                    <td>
                      <div className="admin-table__primary">
                        <strong>{productName(line.productId)}</strong>
                        <span>{currency(line.unitCost)}</span>
                      </div>
                    </td>
                    <td>{number(line.outstanding)}</td>
                    <td>
                      <input
                        aria-label={t('admin.poReceiveUnitsLabel')}
                        min="0"
                        onChange={(event) =>
                          setReceipts((current) => ({
                            ...current,
                            [line.id]: event.target.value,
                          }))
                        }
                        type="number"
                        value={receipts[line.id] ?? '0'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="admin-form-actions">
              <button
                className="admin-btn"
                onClick={() => setReceiving(null)}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button
                className="admin-btn admin-btn--primary"
                onClick={() => void confirmReceive()}
                type="button"
              >
                <TaskAltOutlined /> {t('admin.poReceiveConfirm')}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </>
  )
}

export default PurchaseOrdersAdminPage

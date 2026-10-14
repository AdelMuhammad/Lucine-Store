import { useState } from 'react'
import {
  ArrowBack,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  Inventory2Outlined,
  LocalShippingOutlined,
  LocationOnOutlined,
  PictureAsPdfOutlined,
} from '@mui/icons-material'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useAccountStore,
  type CustomerOrder,
} from '../../account/store/useAccountStore'
import InvoiceModal from '../../invoice/InvoiceModal'
import {
  nextShipmentStatus,
  shipmentStatusTone,
} from '../../ops/ops'
import { useDeliveryStore } from '../../ops/store/useDeliveryStore'
import AdminPageHeader from '../components/AdminPageHeader'
import OrderForm from '../components/OrderForm'
import {
  orderNumber,
  orderStatusVariant,
  orderStatuses,
  openOrderStatuses,
} from '../format'
import { useTranslation } from '../../../hooks/useTranslation'

function OrderDetailAdminPage() {
  const { t, localized, currency, dateTime, number } = useTranslation()
  const { orderId } = useParams()
  const navigate = useNavigate()
  const orders = useAccountStore((state) => state.orders)
  const updateOrder = useAccountStore((state) => state.updateOrder)
  const removeOrder = useAccountStore((state) => state.removeOrder)
  const cancelOrder = useAccountStore((state) => state.cancelOrder)
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const shipments = useDeliveryStore((state) => state.shipments)
  const carriers = useDeliveryStore((state) => state.carriers)
  const ensureShipmentForOrder = useDeliveryStore(
    (state) => state.ensureShipmentForOrder,
  )
  const setShipmentStatus = useDeliveryStore((state) => state.setShipmentStatus)

  const order = orders.find((item) => item.id === orderId)
  const shipment = shipments.find((item) => item.orderId === order?.id)
  const nextShipment = shipment ? nextShipmentStatus(shipment.status) : null

  if (!order) {
    return (
      <>
        <Link className="admin-btn admin-btn--sm" to="/admin/orders">
          <ArrowBack className="rtl-flip" /> {t('admin.backToOrders')}
        </Link>
        <section className="admin-card">
          <div className="admin-empty">
            <Inventory2Outlined />
            <h3>{t('admin.orderNotFoundTitle')}</h3>
            <p>{t('admin.orderNotFoundText')}</p>
            <Link className="admin-btn admin-btn--primary" to="/admin/orders">
              {t('admin.backToOrders')}
            </Link>
          </div>
        </section>
      </>
    )
  }

  const canCancel = openOrderStatuses.includes(order.status)

  function handleStatusChange(status: CustomerOrder['status']) {
    if (!order) return
    updateOrder({ ...order, status })
    setNotice(
      t('admin.statusUpdated', { status: t(`orderStatus.${status}`) }),
    )
  }

  function handleSave(updated: CustomerOrder) {
    updateOrder(updated)
    setEditing(false)
    setNotice(t('admin.orderUpdated'))
  }

  function handleCancel() {
    if (!order) return
    const confirmed = window.confirm(
      t('admin.cancelOrderConfirm', { id: orderNumber(order.id) }),
    )
    if (!confirmed) return

    cancelOrder(order.id)
    setNotice(t('admin.orderCancelledNotice'))
  }

  function handleDelete() {
    if (!order) return
    const confirmed = window.confirm(
      t('admin.deleteOrderConfirm', {
        id: orderNumber(order.id),
        total: currency(order.total),
      }),
    )
    if (!confirmed) return

    removeOrder(order.id)
    navigate('/admin/orders')
  }

  const itemsCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  )

  return (
    <>
      <Link className="admin-btn admin-btn--sm" to="/admin/orders">
        <ArrowBack className="rtl-flip" /> {t('admin.backToOrders')}
      </Link>

      <AdminPageHeader
        actions={
          <>
            <button
              className="admin-btn"
              onClick={() => setInvoiceOpen(true)}
              type="button"
            >
              <PictureAsPdfOutlined /> {t('admin.viewInvoice')}
            </button>
            <button
              className="admin-btn"
              onClick={() => setEditing(true)}
              type="button"
            >
              <EditOutlined /> {t('admin.editOrderTitle')}
            </button>
            {canCancel && (
              <button
                className="admin-btn"
                onClick={handleCancel}
                type="button"
              >
                {t('admin.cancelOrder')}
              </button>
            )}
            <button
              className="admin-btn admin-btn--danger"
              onClick={handleDelete}
              type="button"
            >
              <DeleteOutlined /> {t('admin.deleteOrder')}
            </button>
          </>
        }
        description={t('admin.orderDetailDescription', {
          date: dateTime(order.createdAt),
          count: number(itemsCount),
        })}
        eyebrow={t('admin.orderDetailEyebrow')}
        title={t('admin.orderDetailTitle', { id: orderNumber(order.id) })}
      />

      {notice && (
        <div className="admin-status-notice" role="status">
          <CheckCircleOutlined />
          <span>{notice}</span>
          <button
            aria-label={t('admin.dismissMessage')}
            onClick={() => setNotice('')}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <div className="admin-grid admin-grid--split">
        <div className="admin-grid">
          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.itemsTitle')}</h2>
                <p>{t('admin.itemsText')}</p>
              </div>
              <span className="admin-badge admin-badge--neutral">
                {t('admin.itemCount', { count: number(itemsCount) })}
              </span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.thProduct')}</th>
                    <th>{t('admin.thUnitPrice')}</th>
                    <th>{t('admin.thQty')}</th>
                    <th>{t('admin.thLineTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.productId}>
                      <td
                        className="admin-table__cell--primary"
                        data-label={t('admin.thProduct')}
                      >
                        <div className="admin-table__primary">
                          <img
                            alt=""
                            className="admin-table__thumb"
                            src={item.image}
                          />
                          <span>
                            <strong>{localized(item.name, item.name_ar)}</strong>
                            <span>{localized(item.brand, item.brand_ar)}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label={t('admin.thUnitPrice')}>
                        {currency(item.unitPrice)}
                      </td>
                      <td data-label={t('admin.thQty')}>
                        {number(item.quantity)}
                      </td>
                      <td data-label={t('admin.thLineTotal')}>
                        <strong>
                          {currency(item.unitPrice * item.quantity)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-card__body">
              <div className="admin-mini-stat-row">
                <div className="admin-mini-stat">
                  <span>{t('admin.subtotal')}</span>
                  <strong>{currency(order.subtotal)}</strong>
                </div>
                <div className="admin-mini-stat">
                  <span>
                    {order.shippingMethod === 'express'
                      ? t('admin.expressDelivery')
                      : t('admin.standardDelivery')}
                  </span>
                  <strong>
                    {order.shipping === 0
                      ? t('admin.free')
                      : currency(order.shipping)}
                  </strong>
                </div>
                {order.couponDiscount ? (
                  <div className="admin-mini-stat">
                    <span>
                      {t('admin.coupon', { code: order.couponCode ?? '' })}
                    </span>
                    <strong>−{currency(order.couponDiscount)}</strong>
                  </div>
                ) : null}
                <div className="admin-mini-stat">
                  <span>{t('admin.orderTotal')}</span>
                  <strong>{currency(order.total)}</strong>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="admin-grid">
          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.statusTitle')}</h2>
                <p>{t('admin.statusText')}</p>
              </div>
              <span
                className={`admin-badge admin-badge--${orderStatusVariant(order.status)}`}
              >
                {t(`orderStatus.${order.status}`)}
              </span>
            </div>
            <div className="admin-card__body">
              <label className="admin-field">
                <span>{t('admin.orderStatusLabel')}</span>
                <select
                  onChange={(event) =>
                    handleStatusChange(
                      event.target.value as CustomerOrder['status'],
                    )
                  }
                  value={order.status}
                >
                  {orderStatuses.map((status) => (
                    <option key={status} value={status}>
                      {t(`orderStatus.${status}`)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="admin-form-note" style={{ marginTop: 12 }}>
                <LocalShippingOutlined style={{ verticalAlign: '-4px' }} />{' '}
                {t('admin.statusSupabaseNote')}
              </p>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.deliveryCardTitle')}</h2>
                <p>{t('admin.deliveryCardText')}</p>
              </div>
              {shipment && (
                <span
                  className={`admin-badge admin-badge--${shipmentStatusTone(
                    shipment.status,
                  )}`}
                >
                  {t(`shipmentStatus.${shipment.status}`)}
                </span>
              )}
            </div>
            <div className="admin-card__body">
              {shipment ? (
                <>
                  <div className="admin-row-list">
                    <div className="admin-row" style={{ padding: 0 }}>
                      <LocalShippingOutlined
                        style={{ color: 'var(--color-gold-dark)' }}
                      />
                      <div className="admin-row__main">
                        <strong>
                          {(() => {
                            const carrier = carriers.find(
                              (item) => item.id === shipment.carrierId,
                            )
                            return carrier
                              ? localized(carrier.name, carrier.name_ar)
                              : t('admin.agentUnassigned')
                          })()}
                        </strong>
                        <span>
                          {shipment.trackingNumber ||
                            t('admin.noTrackingYet')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="admin-form-actions" style={{ marginTop: 14 }}>
                    {nextShipment && (
                      <button
                        className="admin-btn admin-btn--primary admin-btn--sm"
                        onClick={async () => {
                          await setShipmentStatus(
                            shipment.id,
                            nextShipment,
                            '',
                            t('admin.deliveryByAdmin'),
                          )
                          setNotice(
                            t('admin.shipmentAdvanced', {
                              status: t(`shipmentStatus.${nextShipment}`),
                            }),
                          )
                        }}
                        type="button"
                      >
                        {t('admin.shipmentAdvanceTo', {
                          status: t(`shipmentStatus.${nextShipment}`),
                        })}
                      </button>
                    )}
                    <Link
                      className="admin-btn admin-btn--sm"
                      to="/admin/ops/deliveries"
                    >
                      {t('admin.openDeliveryBoard')}
                    </Link>
                  </div>
                </>
              ) : (
                <button
                  className="admin-btn admin-btn--primary"
                  onClick={() => void ensureShipmentForOrder(order)}
                  type="button"
                >
                  <LocalShippingOutlined /> {t('admin.startShipment')}
                </button>
              )}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.customerDeliveryTitle')}</h2>
                <p>{t('admin.customerDeliveryText')}</p>
              </div>
            </div>
            <div className="admin-card__body">
              <div className="admin-row-list">
                <div className="admin-row" style={{ padding: 0 }}>
                  <div className="admin-row__main">
                    <strong>
                      {order.address.firstName} {order.address.lastName}
                    </strong>
                    <span>{order.email}</span>
                    <span>{order.phone}</span>
                  </div>
                </div>
              </div>
              <div
                className="admin-row-list"
                style={{ marginTop: 14, borderTop: '1px solid var(--color-border)' }}
              >
                <div className="admin-row" style={{ padding: '14px 0 0' }}>
                  <LocationOnOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>{order.address.street}</strong>
                    <span>
                      {[
                        order.address.buildingNumber
                          ? t('admin.building', {
                              number: order.address.buildingNumber,
                            })
                          : '',
                        order.address.neighborhood,
                        order.address.apartment,
                        order.address.city,
                        order.address.region,
                        order.address.postalCode,
                        order.address.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                    {order.address.deliveryNotes && (
                      <span>
                        {t('admin.note', {
                          note: order.address.deliveryNotes,
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.paymentTitle')}</h2>
                <p>{t('admin.paymentText')}</p>
              </div>
            </div>
            <div className="admin-card__body">
              <span className="admin-badge admin-badge--neutral">
                {order.paymentMethod === 'cash'
                  ? t('admin.payCash')
                  : t('admin.payCard')}
              </span>
              <p className="admin-form-note" style={{ marginTop: 10 }}>
                {t('admin.paymentNote')}
              </p>
              {order.referredBy && (
                <p className="admin-form-note" style={{ marginTop: 6 }}>
                  {t('admin.referredBy', { code: order.referredBy })}
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>

      {editing && (
        <OrderForm
          onClose={() => setEditing(false)}
          onSave={handleSave}
          order={order}
        />
      )}

      {invoiceOpen && (
        <InvoiceModal order={order} onClose={() => setInvoiceOpen(false)} />
      )}
    </>
  )
}

export default OrderDetailAdminPage

import { useEffect, useState } from 'react'
import {
  ArrowBack,
  CheckCircleOutlined,
  Close,
  Inventory2Outlined,
  LocalShippingOutlined,
  LocationOnOutlined,
  ReceiptLongOutlined,
  ScheduleOutlined,
} from '@mui/icons-material'
import { Link, useParams } from 'react-router-dom'
import { useAccountStore, type CustomerOrder } from './store/useAccountStore'
import InvoiceModal from '../invoice/InvoiceModal'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import { useDeliveryStore } from '../ops/store/useDeliveryStore'
import { createDeliveryProofUrl } from '../../services/delivery'
import './OrderTrackingPage.css'

const orderStages: {
  status: Exclude<CustomerOrder['status'], 'cancelled'>
  titleKey: string
  descriptionKey: string
}[] = [
  {
    status: 'placed',
    titleKey: 'orderTracking.stagePlacedTitle',
    descriptionKey: 'orderTracking.stagePlacedText',
  },
  {
    status: 'confirmed',
    titleKey: 'orderTracking.stageConfirmedTitle',
    descriptionKey: 'orderTracking.stageConfirmedText',
  },
  {
    status: 'processing',
    titleKey: 'orderTracking.stageProcessingTitle',
    descriptionKey: 'orderTracking.stageProcessingText',
  },
  {
    status: 'shipped',
    titleKey: 'orderTracking.stageShippedTitle',
    descriptionKey: 'orderTracking.stageShippedText',
  },
  {
    status: 'out-for-delivery',
    titleKey: 'orderTracking.stageOutTitle',
    descriptionKey: 'orderTracking.stageOutText',
  },
  {
    status: 'delivered',
    titleKey: 'orderTracking.stageDeliveredTitle',
    descriptionKey: 'orderTracking.stageDeliveredText',
  },
]

function estimatedDeliveryDate(order: CustomerOrder) {
  const date = new Date(order.createdAt)
  let businessDaysToAdd = order.shippingMethod === 'express' ? 2 : 4

  while (businessDaysToAdd > 0) {
    date.setDate(date.getDate() + 1)
    if (date.getDay() !== 0 && date.getDay() !== 6) businessDaysToAdd -= 1
  }

  return date
}

function OrderTrackingPage() {
  const { t, localized, currency, number, date, dateTime } = useTranslation()
  const { orderId } = useParams()
  const order = useAccountStore((state) =>
    state.orders.find((item) => item.id === orderId),
  )
  const cancelOrder = useAccountStore((state) => state.cancelOrder)
  const shipment = useDeliveryStore((state) =>
    state.shipments.find((item) => item.orderId === orderId),
  )
  const [cancelMessage, setCancelMessage] = useState('')
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [proofImage, setProofImage] = useState({ path: '', url: '' })
  const [proofLoadErrorPath, setProofLoadErrorPath] = useState('')

  useEffect(() => {
    let active = true
    if (!shipment?.proofImagePath) return

    void createDeliveryProofUrl(shipment.proofImagePath)
      .then((url) => {
        if (active) setProofImage({ path: shipment.proofImagePath, url })
      })
      .catch((error: unknown) => {
        console.error('[delivery] failed to load customer proof image', error)
        if (active) {
          setProofLoadErrorPath(shipment.proofImagePath)
        }
      })

    return () => {
      active = false
    }
  }, [shipment?.proofImagePath])
  const proofImageUrl =
    proofImage.path === shipment?.proofImagePath ? proofImage.url : ''

  if (!order) {
    return (
      <section className="order-tracking order-tracking--missing">
        <Seo
          description={t('seo.orderTracking.description')}
          noindex
          path={`/account/orders/${orderId ?? ''}`}
          title={t('seo.orderTracking.title')}
        />
        <Inventory2Outlined />
        <span className="account-eyebrow">{t('orderTracking.missingEyebrow')}</span>
        <h1>{t('orderTracking.missingTitle')}</h1>
        <p>{t('orderTracking.missingText')}</p>
        <Link className="account-button account-button--primary" to="/account?section=orders">
          <ArrowBack className="rtl-flip" /> {t('orderTracking.backToOrders')}
        </Link>
      </section>
    )
  }

  const currentStageIndex = orderStages.findIndex(
    (stage) => stage.status === order.status,
  )
  const canCancel = ['placed', 'confirmed', 'processing'].includes(order.status)
  const estimatedDate = estimatedDeliveryDate(order)

  const handleCancel = () => {
    const confirmed = window.confirm(
      t('orderTracking.cancelConfirm', {
        id: order.id.slice(0, 8).toUpperCase(),
      }),
    )
    if (!confirmed) return

    cancelOrder(order.id)
    setCancelMessage(t('orderTracking.cancelledNotice'))
  }

  return (
    <div className="order-tracking">
      <Seo
        description={t('seo.orderTracking.description')}
        noindex
        path={`/account/orders/${order.id}`}
        title={t('seo.orderTracking.title')}
      />
      <Link className="order-tracking__back" to="/account?section=orders">
        <ArrowBack className="rtl-flip" /> {t('orderTracking.allOrders')}
      </Link>

      <header className="order-tracking__heading">
        <div>
          <span className="account-eyebrow">{t('orderTracking.detailsEyebrow')}</span>
          <h1>
            {t('orderTracking.orderNumber', {
              id: order.id.slice(0, 8).toUpperCase(),
            })}
          </h1>
          <p>{t('orderTracking.placed', { date: date(order.createdAt) })}</p>
        </div>
        <div className="order-tracking__heading-actions">
          <span
            className={`order-tracking__status${order.status === 'cancelled' ? ' is-cancelled' : ''}`}
          >
            {t(`orderStatus.${order.status}`)}
          </span>
          <button
            className="order-tracking__invoice-btn"
            onClick={() => setInvoiceOpen(true)}
            type="button"
          >
            <ReceiptLongOutlined /> {t('orderTracking.viewInvoice')}
          </button>
        </div>
      </header>

      {cancelMessage && (
        <div className="order-tracking__notice" role="status">
          <CheckCircleOutlined />
          <span>{cancelMessage}</span>
          <button
            aria-label={t('common.dismiss')}
            onClick={() => setCancelMessage('')}
            type="button"
          >
            <Close />
          </button>
        </div>
      )}

      <div className="order-tracking__grid">
        <div className="order-tracking__main">
          <section aria-labelledby="tracking-progress-title" className="tracking-panel">
            <div className="tracking-panel__heading">
              <div>
                <span className="account-eyebrow">
                  {t('orderTracking.progressEyebrow')}
                </span>
                <h2 id="tracking-progress-title">
                  {order.status === 'cancelled'
                    ? t('orderTracking.cancelledHeading')
                    : order.status === 'delivered'
                      ? t('orderTracking.deliveredHeading')
                      : t('orderTracking.preparingHeading')}
                </h2>
              </div>
              <LocalShippingOutlined />
            </div>

            {order.status === 'cancelled' ? (
              <div className="tracking-cancelled">
                <span className="tracking-cancelled__icon">
                  <Close />
                </span>
                <div>
                  <strong>{t('orderTracking.cancelledTitle')}</strong>
                  <p>{t('orderTracking.cancelledText')}</p>
                </div>
              </div>
            ) : (
              <>
                {order.status !== 'delivered' && (
                  <div className="tracking-estimate">
                    <ScheduleOutlined />
                    <div>
                      <span>{t('orderTracking.estimatedArrival')}</span>
                      <strong>{date(estimatedDate)}</strong>
                    </div>
                  </div>
                )}
                <ol className="tracking-timeline">
                  {orderStages.map((stage, index) => {
                    const isComplete =
                      currentStageIndex >= 0 && index < currentStageIndex
                    const isCurrent = index === currentStageIndex

                    return (
                      <li
                        className={`tracking-timeline__step${isComplete ? ' is-complete' : ''}${isCurrent ? ' is-current' : ''}`}
                        key={stage.status}
                      >
                        <span className="tracking-timeline__marker">
                          {isComplete ? <CheckCircleOutlined /> : index + 1}
                        </span>
                        <div>
                          <strong>{t(stage.titleKey)}</strong>
                          <p>{t(stage.descriptionKey)}</p>
                          {stage.status === 'placed' && (
                            <time dateTime={order.createdAt}>
                              {date(order.createdAt)}
                            </time>
                          )}
                          {stage.status === 'delivered' && (
                            <small>{t('orderTracking.estimatedNote')}</small>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </>
            )}
          </section>

          {shipment && (
            <section
              aria-labelledby="tracking-shipment-title"
              className="tracking-panel"
            >
              <div className="tracking-panel__heading">
                <div>
                  <span className="account-eyebrow">
                    {t('orderTracking.shipmentEyebrow')}
                  </span>
                  <h2 id="tracking-shipment-title">
                    {t('orderTracking.shipmentTitle')}
                  </h2>
                </div>
                <LocalShippingOutlined />
              </div>
              <dl className="tracking-shipment-details">
                {shipment.carrierName && (
                  <div>
                    <dt>{t('orderTracking.carrier')}</dt>
                    <dd>{localized(shipment.carrierName, shipment.carrierNameAr)}</dd>
                  </div>
                )}
                {shipment.agentName && (
                  <div>
                    <dt>{t('orderTracking.deliveryAgent')}</dt>
                    <dd>{shipment.agentName}</dd>
                  </div>
                )}
                {shipment.trackingNumber && (
                  <div>
                    <dt>{t('orderTracking.trackingNumber')}</dt>
                    <dd>
                      {shipment.carrierTrackingUrl ? (
                        <a
                          href={shipment.carrierTrackingUrl.replace(
                            '{tracking}',
                            encodeURIComponent(shipment.trackingNumber),
                          )}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {shipment.trackingNumber}
                        </a>
                      ) : (
                        shipment.trackingNumber
                      )}
                    </dd>
                  </div>
                )}
              </dl>

              {shipment.events.length > 0 && (
                <ol className="tracking-shipment-events">
                  {shipment.events
                    .toSorted((first, second) =>
                      first.at.localeCompare(second.at),
                    )
                    .map((event) => (
                      <li key={event.id}>
                        <strong>{t(`shipmentStatus.${event.status}`)}</strong>
                        <time dateTime={event.at}>
                          {dateTime(event.at, 'short')}
                        </time>
                      </li>
                    ))}
                </ol>
              )}

              {proofImageUrl && (
                <figure className="tracking-delivery-proof">
                  <figcaption>
                    <strong>{t('orderTracking.deliveryProof')}</strong>
                    {shipment.proofNote && <span>{shipment.proofNote}</span>}
                    {shipment.proofAt && (
                      <time dateTime={shipment.proofAt}>
                        {dateTime(shipment.proofAt, 'short')}
                        {shipment.deliveredBy
                          ? ` · ${shipment.deliveredBy}`
                          : ''}
                      </time>
                    )}
                  </figcaption>
                  <img
                    alt={t('orderTracking.deliveryProof')}
                    loading="lazy"
                    src={proofImageUrl}
                  />
                </figure>
              )}
              {shipment.proofImagePath &&
                proofLoadErrorPath === shipment.proofImagePath &&
                !proofImageUrl && (
                <p className="tracking-proof-error" role="alert">
                  {t('orderTracking.proofUnavailable')}
                </p>
              )}
            </section>
          )}

          <section aria-labelledby="tracking-items-title" className="tracking-panel">
            <div className="tracking-panel__heading">
              <div>
                <span className="account-eyebrow">{t('orderTracking.purchaseEyebrow')}</span>
                <h2 id="tracking-items-title">{t('orderTracking.itemsTitle')}</h2>
              </div>
              <span>
                {t('orderTracking.itemsCount', {
                  count: number(
                    order.items.reduce((sum, item) => sum + item.quantity, 0),
                  ),
                })}
              </span>
            </div>
            <div className="tracking-items">
              {order.items.map((item) => (
                <article className="tracking-item" key={item.productId}>
                  <img alt="" src={item.image} />
                  <div>
                    <strong>{localized(item.name, item.name_ar)}</strong>
                    <span>{localized(item.brand, item.brand_ar)}</span>
                    <small>
                      {t('orderTracking.quantity', {
                        count: number(item.quantity),
                      })}
                    </small>
                  </div>
                  <b>{currency(item.unitPrice * item.quantity)}</b>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="order-tracking__sidebar">
          <section className="tracking-panel">
            <span className="account-eyebrow">{t('orderTracking.addressEyebrow')}</span>
            <div className="tracking-address">
              <LocationOnOutlined />
              <div>
                <strong>
                  {order.address.firstName} {order.address.lastName}
                </strong>
                <span>{order.address.street}</span>
                {order.address.buildingNumber && (
                  <span>
                    {t('orderTracking.building', {
                      number: order.address.buildingNumber,
                    })}
                  </span>
                )}
                {order.address.neighborhood && (
                  <span>{order.address.neighborhood}</span>
                )}
                {order.address.apartment && (
                  <span>{order.address.apartment}</span>
                )}
                <span>
                  {[
                    order.address.city,
                    order.address.region,
                    order.address.postalCode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
                <span>{order.address.country}</span>
                <span>{order.phone}</span>
                {order.address.deliveryNotes && (
                  <small>
                    {t('orderTracking.note', { note: order.address.deliveryNotes })}
                  </small>
                )}
              </div>
            </div>
            <p className="tracking-location-note">
              {t('orderTracking.locationNote')}
            </p>
          </section>

          <section className="tracking-panel">
            <span className="account-eyebrow">{t('orderTracking.paymentEyebrow')}</span>
            <div className="tracking-payment">
              <span>{t('orderTracking.method')}</span>
              <strong>
                {order.paymentMethod === 'cash'
                  ? t('orderTracking.cash')
                  : t('orderTracking.card')}
              </strong>
              <small>{t('orderTracking.paymentNote')}</small>
            </div>
            <div className="tracking-totals">
              <div>
                <span>{t('orderTracking.subtotal')}</span>
                <b>{currency(order.subtotal)}</b>
              </div>
              <div>
                <span>
                  {order.shippingMethod === 'express'
                    ? t('orderTracking.express')
                    : t('orderTracking.standard')}
                </span>
                <b>
                  {order.shipping === 0
                    ? t('orderTracking.free')
                    : currency(order.shipping)}
                </b>
              </div>
              {order.couponDiscount ? (
                <div className="tracking-totals__discount">
                  <span>
                    {t('orderTracking.coupon', { code: order.couponCode ?? '' })}
                  </span>
                  <b>−{currency(order.couponDiscount)}</b>
                </div>
              ) : null}
              <div className="tracking-totals__total">
                <strong>{t('orderTracking.orderTotal')}</strong>
                <strong>{currency(order.total)}</strong>
              </div>
            </div>
          </section>

          {canCancel && (
            <section className="tracking-cancel-panel">
              <strong>{t('orderTracking.cancelTitle')}</strong>
              <p>{t('orderTracking.cancelText')}</p>
              <button
                className="account-button account-button--danger"
                onClick={handleCancel}
                type="button"
              >
                <Close /> {t('orderTracking.cancelOrder')}
              </button>
            </section>
          )}

          <p className="tracking-local-note">{t('orderTracking.localNote')}</p>
        </aside>
      </div>

      {invoiceOpen && (
        <InvoiceModal order={order} onClose={() => setInvoiceOpen(false)} />
      )}
    </div>
  )
}

export default OrderTrackingPage

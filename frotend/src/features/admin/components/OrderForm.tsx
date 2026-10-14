import { useMemo, useState, type FormEvent } from 'react'
import {
  Add,
  DeleteOutlined,
  PersonAddOutlined,
  PersonOutlined,
} from '@mui/icons-material'
import {
  useAccountStore,
  type CustomerOrder,
} from '../../account/store/useAccountStore'
import { customerKeyFor, deriveCustomerRows } from '../../account/customerRows'
import { useProductStore } from '../../products/store/useProductStore'
import { coverImage } from '../../products/data/products'
import AdminModal from './AdminModal'
import { orderStatuses } from '../format'
import { useTranslation } from '../../../hooks/useTranslation'

/** Matches the storefront checkout so admin-created orders total the same. */
const FREE_SHIPPING_THRESHOLD = 100

type OrderFormProps = {
  order?: CustomerOrder
  onClose: () => void
  onSave: (order: CustomerOrder) => void
}

/** Where the order's customer comes from: an existing catalog or a new one. */
type CustomerSource = 'existing' | 'new'

type AddressFieldKey = keyof CustomerOrder['address']

const addressFields: { key: AddressFieldKey; labelKey: string }[] = [
  { key: 'street', labelKey: 'admin.orderFieldStreet' },
  { key: 'buildingNumber', labelKey: 'admin.orderFieldBuilding' },
  { key: 'neighborhood', labelKey: 'admin.orderFieldNeighborhood' },
  { key: 'apartment', labelKey: 'admin.orderFieldApartment' },
  { key: 'city', labelKey: 'admin.orderFieldCity' },
  { key: 'region', labelKey: 'admin.orderFieldRegion' },
  { key: 'postalCode', labelKey: 'admin.orderFieldPostalCode' },
  { key: 'country', labelKey: 'admin.orderFieldCountry' },
]

function emptyOrder(): CustomerOrder {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'placed',
    email: '',
    phone: '',
    address: {
      firstName: '',
      lastName: '',
      street: '',
      buildingNumber: '',
      neighborhood: '',
      apartment: '',
      city: '',
      region: '',
      postalCode: '',
      country: '',
      deliveryNotes: '',
    },
    shippingMethod: 'standard',
    paymentMethod: 'card',
    items: [],
    subtotal: 0,
    shipping: 0,
    total: 0,
  }
}

function toLocalInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function OrderForm({ order, onClose, onSave }: OrderFormProps) {
  const { t, localized, currency } = useTranslation()
  const products = useProductStore((state) => state.products)
  const orders = useAccountStore((state) => state.orders)

  // Customers are reconstructed from previous orders (there is no auth yet).
  const customers = useMemo(() => deriveCustomerRows(orders), [orders])
  const matchedCustomer = order
    ? customers.find((customer) => customer.key === customerKeyFor(order))
    : undefined

  const [draft, setDraft] = useState<CustomerOrder>(() =>
    order ? { ...order } : emptyOrder(),
  )
  const [customerSource, setCustomerSource] = useState<CustomerSource>(
    matchedCustomer ? 'existing' : 'new',
  )
  const [selectedCustomerKey, setSelectedCustomerKey] = useState(
    matchedCustomer?.key ?? '',
  )
  const [pendingProductId, setPendingProductId] = useState('')
  const [error, setError] = useState('')

  // Lock the contact fields only when an existing customer can actually be
  // picked — otherwise the admin would be stuck with read-only empty fields.
  const lockingCustomer = customerSource === 'existing' && customers.length > 0

  const subtotal = useMemo(
    () =>
      draft.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
    [draft.items],
  )
  const shipping =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : draft.shippingMethod === 'express'
        ? 12
        : 6
  const couponDiscount = draft.couponDiscount ?? 0
  const total = subtotal - couponDiscount + shipping

  function patchAddress(key: AddressFieldKey, value: string) {
    setDraft((current) => ({
      ...current,
      address: { ...current.address, [key]: value },
    }))
  }

  function setSource(source: CustomerSource) {
    setCustomerSource(source)
    setError('')
    if (source === 'new') setSelectedCustomerKey('')
  }

  /** Pulls the chosen customer's details from their most recent order. */
  function chooseCustomer(key: string) {
    setSelectedCustomerKey(key)
    const customer = customers.find((item) => item.key === key)
    const latest = customer?.orders[0]
    if (!customer || !latest) return

    setDraft((current) => ({
      ...current,
      email: latest.email || customer.email,
      phone: latest.phone || customer.phone,
      address: {
        ...latest.address,
        deliveryNotes: current.address.deliveryNotes,
      },
    }))
  }

  function addProduct() {
    const product = products.find((item) => item.id === pendingProductId)
    if (!product) return

    setDraft((current) => {
      const existing = current.items.find(
        (item) => item.productId === product.id,
      )
      if (existing) {
        return {
          ...current,
          items: current.items.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        }
      }
      return {
        ...current,
        items: [
          ...current.items,
          {
            productId: product.id,
            name: product.name,
            name_ar: product.name_ar,
            brand: product.brand,
            brand_ar: product.brand_ar,
            image: coverImage(product),
            unitPrice: product.price,
            quantity: 1,
          },
        ],
      }
    })
    setPendingProductId('')
  }

  function setQuantity(productId: string, quantity: number) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      ),
    }))
  }

  function removeItem(productId: string) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((item) => item.productId !== productId),
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (lockingCustomer && !selectedCustomerKey) {
      setError(t('admin.orderErrorCustomer'))
      return
    }

    if (
      !draft.address.firstName.trim() ||
      !draft.address.lastName.trim() ||
      !draft.email.trim() ||
      !draft.phone.trim() ||
      !draft.address.city.trim() ||
      !draft.address.country.trim()
    ) {
      setError(t('admin.orderErrorRequired'))
      return
    }

    if (draft.items.length === 0) {
      setError(t('admin.orderErrorItems'))
      return
    }

    onSave({ ...draft, subtotal, shipping, total })
  }

  return (
    <AdminModal
      description={t('admin.orderFormDescription')}
      onClose={onClose}
      size="lg"
      title={
        order ? t('admin.editOrderTitle') : t('admin.addOrderTitle')
      }
    >
      <form className="admin-form" onSubmit={handleSubmit}>
        <fieldset className="admin-fieldset">
          <legend>{t('admin.orderCustomerSection')}</legend>

          <div className="admin-chip-group" style={{ marginTop: 0 }}>
            <button
              aria-pressed={customerSource === 'existing'}
              className={`admin-chip${customerSource === 'existing' ? ' is-selected' : ''}`}
              onClick={() => setSource('existing')}
              type="button"
            >
              <PersonOutlined /> {t('admin.customerSourceExisting')}
            </button>
            <button
              aria-pressed={customerSource === 'new'}
              className={`admin-chip${customerSource === 'new' ? ' is-selected' : ''}`}
              onClick={() => setSource('new')}
              type="button"
            >
              <PersonAddOutlined /> {t('admin.customerSourceNew')}
            </button>
          </div>

          {customerSource === 'existing' &&
            (customers.length > 0 ? (
              <label className="admin-field admin-field--full">
                <span>{t('admin.orderSelectCustomer')}</span>
                <select
                  onChange={(event) => chooseCustomer(event.target.value)}
                  value={selectedCustomerKey}
                >
                  <option value="">
                    {t('admin.orderSelectCustomerPlaceholder')}
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.key} value={customer.key}>
                      {customer.name || t('admin.guestCustomer')}
                      {customer.email ? ` — ${customer.email}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="admin-form-note">{t('admin.noExistingCustomers')}</p>
            ))}

          {customerSource === 'existing' && selectedCustomerKey && (
            <p className="admin-form-note">{t('admin.customerLinkedHint')}</p>
          )}

          <div className="admin-form-grid" style={{ marginTop: 16 }}>
            <label className="admin-field">
              <span>{t('admin.orderFieldFirstName')}</span>
              <input
                onChange={(event) =>
                  patchAddress('firstName', event.target.value)
                }
                readOnly={lockingCustomer}
                value={draft.address.firstName}
              />
            </label>
            <label className="admin-field">
              <span>{t('admin.orderFieldLastName')}</span>
              <input
                onChange={(event) =>
                  patchAddress('lastName', event.target.value)
                }
                readOnly={lockingCustomer}
                value={draft.address.lastName}
              />
            </label>
            <label className="admin-field">
              <span>{t('admin.orderFieldEmail')}</span>
              <input
                dir="ltr"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                readOnly={lockingCustomer}
                type="email"
                value={draft.email}
              />
            </label>
            <label className="admin-field">
              <span>{t('admin.orderFieldPhone')}</span>
              <input
                dir="ltr"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                readOnly={lockingCustomer}
                value={draft.phone}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend>{t('admin.orderAddressSection')}</legend>
          <div className="admin-form-grid">
            {addressFields.map((field) => (
              <label className="admin-field" key={field.key}>
                <span>{t(field.labelKey)}</span>
                <input
                  onChange={(event) =>
                    patchAddress(field.key, event.target.value)
                  }
                  value={draft.address[field.key] ?? ''}
                />
              </label>
            ))}
            <label className="admin-field admin-field--full">
              <span>{t('admin.orderFieldDeliveryNotes')}</span>
              <textarea
                onChange={(event) =>
                  patchAddress('deliveryNotes', event.target.value)
                }
                value={draft.address.deliveryNotes}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend>{t('admin.orderItemsSection')}</legend>

          <div className="admin-order-add">
            <label className="admin-field">
              <span>{t('admin.orderAddProduct')}</span>
              <select
                onChange={(event) => setPendingProductId(event.target.value)}
                value={pendingProductId}
              >
                <option value="">{t('admin.orderSelectProduct')}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {localized(product.name, product.name_ar)} —{' '}
                    {currency(product.price)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="admin-btn"
              disabled={!pendingProductId}
              onClick={addProduct}
              type="button"
            >
              <Add /> {t('admin.orderAddProduct')}
            </button>
          </div>

          {draft.items.length > 0 ? (
            <div className="admin-order-items">
              {draft.items.map((item) => (
                <div className="admin-order-item" key={item.productId}>
                  <span className="admin-order-item__media">
                    {item.image ? (
                      <img alt="" src={item.image} />
                    ) : (
                      <span aria-hidden="true" />
                    )}
                  </span>
                  <span className="admin-order-item__info">
                    <strong>{localized(item.name, item.name_ar)}</strong>
                    <span className="admin-table__muted">
                      {localized(item.brand, item.brand_ar)}
                    </span>
                  </span>
                  <span className="admin-order-item__price">
                    {currency(item.unitPrice)}
                  </span>
                  <input
                    aria-label={t('admin.thQty')}
                    className="admin-order-item__qty"
                    min={1}
                    onChange={(event) =>
                      setQuantity(item.productId, Number(event.target.value))
                    }
                    type="number"
                    value={item.quantity}
                  />
                  <span className="admin-order-item__total">
                    {currency(item.unitPrice * item.quantity)}
                  </span>
                  <button
                    aria-label={t('admin.orderRemoveItem', {
                      name: item.name,
                    })}
                    className="admin-icon-btn admin-icon-btn--danger"
                    onClick={() => removeItem(item.productId)}
                    type="button"
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-form-note">{t('admin.orderNoItems')}</p>
          )}
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend>{t('admin.orderTotalsSection')}</legend>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>{t('admin.statusTitle')}</span>
              <select
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as CustomerOrder['status'],
                  }))
                }
                value={draft.status}
              >
                {orderStatuses.map((status) => (
                  <option key={status} value={status}>
                    {t(`orderStatus.${status}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>{t('admin.orderFieldDate')}</span>
              <input
                onChange={(event) => {
                  const parsed = new Date(event.target.value)
                  if (Number.isNaN(parsed.getTime())) return
                  setDraft((current) => ({
                    ...current,
                    createdAt: parsed.toISOString(),
                  }))
                }}
                type="datetime-local"
                value={toLocalInput(draft.createdAt)}
              />
            </label>
            <label className="admin-field">
              <span>{t('admin.orderShippingMethod')}</span>
              <select
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    shippingMethod: event.target
                      .value as CustomerOrder['shippingMethod'],
                  }))
                }
                value={draft.shippingMethod}
              >
                <option value="standard">
                  {t('admin.standardDelivery')}
                </option>
                <option value="express">{t('admin.expressDelivery')}</option>
              </select>
            </label>
            <label className="admin-field">
              <span>{t('admin.orderPaymentMethod')}</span>
              <select
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    paymentMethod: event.target
                      .value as CustomerOrder['paymentMethod'],
                  }))
                }
                value={draft.paymentMethod}
              >
                <option value="card">{t('admin.payCard')}</option>
                <option value="cash">{t('admin.payCash')}</option>
              </select>
            </label>
          </div>

          <div className="admin-order-summary">
            <span>
              {t('admin.subtotal')}
              <strong>{currency(subtotal)}</strong>
            </span>
            <span>
              {t('checkout.delivery')}
              <strong>{shipping === 0 ? t('admin.free') : currency(shipping)}</strong>
            </span>
            <span className="admin-order-summary__total">
              {t('admin.orderTotal')}
              <strong>{currency(total)}</strong>
            </span>
          </div>
        </fieldset>

        {error && <p className="admin-form-error">{error}</p>}

        <div className="admin-form-actions">
          <button className="admin-btn" onClick={onClose} type="button">
            {t('common.cancel')}
          </button>
          <button className="admin-btn admin-btn--primary" type="submit">
            {order ? t('common.saveChanges') : t('admin.createOrder')}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}

export default OrderForm

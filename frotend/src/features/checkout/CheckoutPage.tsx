import { useMemo, useState, type FormEvent } from 'react'
import {
  ArrowBack,
  ArrowForward,
  CheckCircleOutlined,
  LockOutlined,
  LocalShippingOutlined,
  LocationOnOutlined,
  ReceiptLongOutlined,
  Remove,
  Add,
  ShoppingBagOutlined,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { useProductStore } from '../products/store/useProductStore'
import { coverImage } from '../products/data/products'
import { useCartStore } from '../products/store/useCartStore'
import {
  useAccountStore,
  type CustomerOrder,
} from '../account/store/useAccountStore'
import { isReferralCode } from '../account/rewards'
import { customerKeyFor } from '../account/customerRows'
import { useCouponStore, type Coupon } from '../marketing/store/useCouponStore'
import {
  evaluateCoupon,
  normalizeCouponCode,
  scopedSubtotalFor,
} from '../marketing/coupons'
import { useMarketingStore } from '../marketing/store/useMarketingStore'
import InvoiceModal from '../invoice/InvoiceModal'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import './CheckoutPage.css'

const freeShippingThreshold = 100
const locationAccuracyLimitMeters = 100
const locationWatchTimeoutMs = 30000
const preferredLocationAccuracyMeters = 50

type AppliedCoupon = {
  code: string
  percent: number
  /** Money taken off this cart (already scoped + validated). */
  discount: number
  /** True when the coupon makes shipping free. */
  freeShipping: boolean
  source: 'coupon' | 'referral' | 'reward'
}

type ReverseGeocodeResult = {
  street: string
  buildingNumber: string
  neighborhood: string
  city: string
  region: string
  postalCode: string
  country: string
}

function getBestCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let bestPosition: GeolocationPosition | null = null
    let watchId: number | null = null

    const timeoutId = window.setTimeout(() => {
      if (bestPosition) {
        finish(bestPosition)
      } else {
        reject(new Error('Could not get a fresh location reading.'))
        stopWatching()
      }
    }, locationWatchTimeoutMs)

    function stopWatching() {
      window.clearTimeout(timeoutId)
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }

    function finish(position: GeolocationPosition) {
      stopWatching()
      resolve(position)
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          position.coords.accuracy < bestPosition.coords.accuracy
        ) {
          bestPosition = position
        }

        if (position.coords.accuracy <= preferredLocationAccuracyMeters) {
          finish(position)
        }
      },
      (error) => {
        if (bestPosition) {
          finish(bestPosition)
        } else {
          stopWatching()
          reject(error)
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: locationWatchTimeoutMs,
      },
    )
  })
}

async function reverseGeocode(
  latitude: number,
  longitude: number,
  acceptLanguage: string,
): Promise<ReverseGeocodeResult> {
  const query = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
  })
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${query.toString()}`,
    { headers: { 'Accept-Language': acceptLanguage } },
  )
  if (!response.ok) {
    throw new Error(`Address lookup failed (${response.status}).`)
  }

  const result = (await response.json()) as {
    address?: {
      house_number?: string
      road?: string
      pedestrian?: string
      residential?: string
      footway?: string
      path?: string
      suburb?: string
      neighbourhood?: string
      city_district?: string
      district?: string
      quarter?: string
      hamlet?: string
      isolated_dwelling?: string
      city?: string
      town?: string
      village?: string
      municipality?: string
      county?: string
      state?: string
      state_district?: string
      province?: string
      region?: string
      postcode?: string
      country?: string
    }
  }
  const address = result.address
  if (!address) {
    throw new Error('No address was found for this location.')
  }

  const city =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.city_district ??
    address.district ??
    address.county ??
    address.state_district ??
    ''
  const road =
    address.road ??
    address.pedestrian ??
    address.residential ??
    address.footway ??
    address.path ??
    ''
  const neighborhoods = [
    address.neighbourhood,
    address.quarter,
    address.suburb,
    address.city_district,
    address.district,
    address.hamlet,
    address.isolated_dwelling,
  ].filter(
    (name, index, names): name is string =>
      Boolean(name) &&
      names.indexOf(name) === index &&
      name !== city &&
      name !== address.state &&
      name !== address.state_district,
  )

  return {
    street: road,
    buildingNumber: address.house_number ?? '',
    neighborhood: neighborhoods.join('، '),
    city,
    region:
      address.state ??
      address.province ??
      address.region ??
      address.state_district ??
      address.county ??
      '',
    postalCode: address.postcode ?? '',
    country: address.country ?? '',
  }
}

function createCustomerOrder(
  orderDetails: Omit<CustomerOrder, 'id' | 'createdAt' | 'status'>,
): CustomerOrder {
  return {
    ...orderDetails,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'placed',
  }
}

function CheckoutPage() {
  const { t, localized, currency, number, language } = useTranslation()
  const items = useCartStore((state) => state.items)
  const products = useProductStore((state) => state.products)
  const coupons = useCouponStore((state) => state.coupons)
  const recordRedemption = useCouponStore((state) => state.recordRedemption)
  const utm = useMarketingStore((state) => state.utm)
  const setQuantity = useCartStore((state) => state.setQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const addOrder = useAccountStore((state) => state.addOrder)
  const profile = useAccountStore((state) => state.profile)
  const saveProfile = useAccountStore((state) => state.saveProfile)
  const addresses = useAccountStore((state) => state.addresses)
  const addAddress = useAccountStore((state) => state.addAddress)
  const referralCode = useAccountStore((state) => state.activeReferralCode)
  const earnedCoupons = useAccountStore((state) => state.earnedCoupons)
  const usedCouponCodes = useAccountStore((state) => state.usedCouponCodes)
  const markCouponUsed = useAccountStore((state) => state.markCouponUsed)
  const orders = useAccountStore((state) => state.orders)
  const setActiveReferralCode = useAccountStore(
    (state) => state.setActiveReferralCode,
  )
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>(
    'standard',
  )
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')
  const [placedOrder, setPlacedOrder] = useState<CustomerOrder | null>(null)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [couponInputEdited, setCouponInputEdited] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [couponMessage, setCouponMessage] = useState('')
  const [locationMessage, setLocationMessage] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null)
  const defaultAddress =
    addresses.find((address) => address.isDefault) ?? addresses[0]
  const [selectedAddressId, setSelectedAddressId] = useState(
    defaultAddress?.id ?? '',
  )
  const [checkoutDetails, setCheckoutDetails] = useState(() => ({
    email: profile.email,
    phone: defaultAddress?.phone || profile.phone,
    firstName: defaultAddress?.firstName || profile.firstName,
    lastName: defaultAddress?.lastName || profile.lastName,
    address: defaultAddress?.address ?? '',
    buildingNumber: defaultAddress?.buildingNumber ?? '',
    neighborhood: defaultAddress?.neighborhood ?? '',
    apartment: defaultAddress?.apartment ?? '',
    city: defaultAddress?.city ?? '',
    region: defaultAddress?.region ?? '',
    postalCode: defaultAddress?.postalCode ?? '',
    country: defaultAddress?.country ?? '',
    deliveryNote: '',
  }))
  const [noApartment, setNoApartment] = useState(false)
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const displayedCouponInput = couponInputEdited
    ? couponInput
    : referralCode || couponInput

  const checkoutItems = useMemo(
    () =>
      items.flatMap((item) => {
        const product = products.find(({ id }) => id === item.productId)
        return product ? [{ ...product, quantity: item.quantity }] : []
      }),
    [items, products],
  )
  const subtotal = checkoutItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  )
  const shipping =
    subtotal === 0 ||
    subtotal >= freeShippingThreshold ||
    appliedCoupon?.freeShipping
      ? 0
      : shippingMethod === 'express'
        ? 12
        : 6
  const couponDiscount = appliedCoupon?.discount ?? 0
  const total = subtotal - couponDiscount + shipping
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal)

  /** How many times this browser already ordered with the code. */
  function timesUsedByCustomer(code: string) {
    return orders.filter((order) => order.couponCode === code).length
  }

  /** Narrows the coupon's discount down to the items it actually covers. */
  function eligibleSubtotal(coupon: Coupon) {
    return scopedSubtotalFor(
      coupon,
      checkoutItems.map((item) => ({
        price: item.price,
        quantity: item.quantity,
        productId: item.id,
        category: item.category,
      })),
    )
  }

  function updateCheckoutDetail(
    field: keyof typeof checkoutDetails,
    value: string,
  ) {
    setCheckoutDetails((current) => ({ ...current, [field]: value }))
    if (
      [
        'firstName',
        'lastName',
        'address',
        'buildingNumber',
        'neighborhood',
        'apartment',
        'city',
        'region',
        'postalCode',
        'country',
      ].includes(field)
    ) {
      setAddressConfirmed(false)
    }
  }

  function selectSavedAddress(addressId: string) {
    const address = addresses.find((item) => item.id === addressId)
    setSelectedAddressId(addressId)
    if (!address) return

    setNoApartment(!address.apartment)
    setAddressConfirmed(false)
    setCheckoutDetails((current) => ({
      ...current,
      phone: address.phone || current.phone,
      firstName: address.firstName || current.firstName,
      lastName: address.lastName || current.lastName,
      address: address.address,
      buildingNumber: address.buildingNumber ?? '',
      neighborhood: address.neighborhood ?? '',
      apartment: address.apartment,
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country,
    }))
  }

  async function useCurrentLocation() {
    setLocationMessage('')
    setLocationAccuracy(null)
    if (!navigator.geolocation) {
      setLocationMessage(t('checkout.locUnsupported'))
      return
    }

    setLocationLoading(true)
    try {
      const position = await getBestCurrentPosition()
      setLocationAccuracy(position.coords.accuracy)
      const accuracy = number(Math.round(position.coords.accuracy))
      if (position.coords.accuracy > locationAccuracyLimitMeters) {
        setLocationMessage(t('checkout.locApproximate', { meters: accuracy }))
        return
      }

      const acceptLanguage =
        language === 'ar' ? 'ar-EG,ar;q=0.9,en;q=0.7' : 'en-US,en;q=0.9,ar;q=0.7'
      const result = await reverseGeocode(
        position.coords.latitude,
        position.coords.longitude,
        acceptLanguage,
      )
      setSelectedAddressId('')
      setNoApartment(false)
      setAddressConfirmed(false)
      setCheckoutDetails((current) => ({
        ...current,
        address: result.street || current.address,
        buildingNumber: result.buildingNumber || current.buildingNumber,
        neighborhood: result.neighborhood || current.neighborhood,
        city: result.city || current.city,
        region: result.region || current.region,
        postalCode: result.postalCode || current.postalCode,
        country: result.country || current.country,
      }))
      if (!result.street || !result.city || !result.region) {
        setLocationMessage(t('checkout.locPartial', { meters: accuracy }))
      } else {
        setLocationMessage(t('checkout.locFilled', { meters: accuracy }))
      }
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'number'
      ) {
        const geolocationError = error as GeolocationPositionError
        setLocationMessage(
          geolocationError.code === geolocationError.PERMISSION_DENIED
            ? t('checkout.locDenied')
            : geolocationError.code === geolocationError.TIMEOUT
              ? t('checkout.locTimeout')
              : t('checkout.locUnavailable'),
        )
      } else {
        setLocationMessage(
          error instanceof Error
            ? t('checkout.locFailed')
            : t('checkout.locLookupFailed'),
        )
      }
    } finally {
      setLocationLoading(false)
    }
  }

  function handleApplyCoupon() {
    const code = normalizeCouponCode(displayedCouponInput)
    setCouponMessage('')

    if (!code) {
      setAppliedCoupon(null)
      setCouponMessage(t('checkout.couponEnter'))
      return
    }

    if (appliedCoupon?.code === code) {
      setAppliedCoupon(null)
      setCouponMessage(t('checkout.couponRemoved'))
      return
    }

    const coupon = coupons.find((item) => item.code === code)

    if (coupon) {
      const evaluation = evaluateCoupon(coupon, {
        subtotal,
        scopedSubtotal: eligibleSubtotal(coupon),
        usedByCustomer: timesUsedByCustomer(code),
        isFirstOrder: orders.length === 0,
      })

      if (!evaluation.ok) {
        setAppliedCoupon(null)
        setCouponMessage(t(`couponReason.${evaluation.reason}`))
        return
      }

      setAppliedCoupon({
        code,
        percent: coupon.kind === 'percent' ? coupon.value : 0,
        discount: evaluation.discount,
        freeShipping: evaluation.freeShipping,
        source: 'coupon',
      })
      setCouponMessage(
        coupon.kind === 'percent'
          ? t('checkout.couponApplied', { percent: number(coupon.value) })
          : coupon.kind === 'fixed'
            ? t('checkout.couponAppliedFixed', {
                amount: currency(evaluation.discount),
              })
            : t('checkout.couponAppliedShipping'),
      )
      return
    }

    const reward = earnedCoupons.find((item) => item.code === code)

    if (reward) {
      if (usedCouponCodes.includes(code)) {
        setAppliedCoupon(null)
        setCouponMessage(t('checkout.couponUsed'))
        return
      }

      setAppliedCoupon({
        code,
        percent: reward.percent,
        discount: Math.round(subtotal * (reward.percent / 100) * 100) / 100,
        freeShipping: false,
        source: 'reward',
      })
      setCouponMessage(
        t('checkout.rewardApplied', { percent: number(reward.percent) }),
      )
      return
    }

    if (isReferralCode(code)) {
      if (code === referralCode) {
        setAppliedCoupon(null)
        setCouponMessage(t('checkout.ownReferral'))
        return
      }

      setAppliedCoupon({
        code,
        percent: 10,
        discount: Math.round(subtotal * 0.1 * 100) / 100,
        freeShipping: false,
        source: 'referral',
      })
      setCouponMessage(t('checkout.referralApplied'))
      return
    }

    setAppliedCoupon(null)
    setCouponMessage(t('checkout.couponUnknown'))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const value = (name: string) => String(formData.get(name) ?? '').trim()
    const order = createCustomerOrder({
      email: value('email'),
      phone: value('phone'),
      address: {
        firstName: value('firstName'),
        lastName: value('lastName'),
        street: value('address'),
        buildingNumber: value('buildingNumber'),
        neighborhood: value('neighborhood'),
        apartment: value('apartment'),
        city: value('city'),
        region: value('region'),
        postalCode: value('postalCode'),
        country: value('country'),
        deliveryNotes: value('deliveryNote'),
      },
      shippingMethod,
      paymentMethod,
      items: checkoutItems.map((item) => ({
        productId: item.id,
        name: item.name,
        name_ar: item.name_ar,
        brand: item.brand,
        brand_ar: item.brand_ar,
        image: coverImage(item),
        unitPrice: item.price,
        quantity: item.quantity,
      })),
      subtotal,
      shipping,
      couponCode: appliedCoupon?.code,
      couponDiscount,
      referredBy:
        appliedCoupon?.source === 'referral' ? appliedCoupon.code : undefined,
      source: utm?.source ?? '',
      medium: utm?.medium ?? '',
      campaign: utm?.campaign ?? '',
      landingPage: utm?.landingPage ?? '',
      total,
    })

    addOrder(order)
    saveProfile({
      ...profile,
      firstName: order.address.firstName,
      lastName: order.address.lastName,
      email: order.email,
      phone: order.phone,
    })
    if (!selectedAddressId) {
      addAddress({
        id: crypto.randomUUID(),
        label: '',
        firstName: order.address.firstName,
        lastName: order.address.lastName,
        phone: order.phone,
        address: order.address.street,
        buildingNumber: order.address.buildingNumber,
        neighborhood: order.address.neighborhood,
        apartment: order.address.apartment ?? '',
        city: order.address.city,
        region: order.address.region ?? '',
        postalCode: order.address.postalCode,
        country: order.address.country,
        isDefault: true,
      })
    }
    if (appliedCoupon?.source === 'referral') {
      markCouponUsed(appliedCoupon.code)
      setActiveReferralCode('')
    } else if (appliedCoupon?.source === 'reward') {
      markCouponUsed(appliedCoupon.code)
    } else if (appliedCoupon?.source === 'coupon') {
      // Coupons are tracked against orders so per-customer limits stay honest.
      void recordRedemption({
        id: crypto.randomUUID(),
        couponCode: appliedCoupon.code,
        orderId: order.id,
        customerKey: customerKeyFor(order),
        discount: couponDiscount,
        createdAt: order.createdAt,
      })
    }
    clearCart()
    setPlacedOrder(order)
  }

  if (placedOrder) {
    return (
      <section aria-labelledby="checkout-success-title" className="checkout-empty checkout-success">
        <Seo
          description={t('seo.checkout.description')}
          noindex
          path="/checkout"
          title={t('seo.checkout.title')}
        />
        <div className="checkout-empty__icon">
          <CheckCircleOutlined />
        </div>
        <span className="checkout-eyebrow">{t('checkout.orderReceived')}</span>
        <h1 id="checkout-success-title">{t('checkout.successTitle')}</h1>
        <p>
          {t('checkout.successText', {
            id: placedOrder.id.slice(0, 8).toUpperCase(),
          })}
        </p>
        <p className="checkout-success__payment-note">
          {placedOrder.couponDiscount
            ? t('checkout.successCoupon', {
                code: placedOrder.couponCode ?? '',
                amount: currency(placedOrder.couponDiscount),
              })
            : ''}
          {placedOrder.referredBy
            ? t('checkout.successReferral', { code: placedOrder.referredBy })
            : ''}
          {t('checkout.successPayment')}
        </p>
        <Link
          className="checkout-primary-button"
          to={`/account/orders/${placedOrder.id}`}
        >
          {t('checkout.trackOrder')}
          <ArrowForward className="rtl-flip" />
        </Link>
        <button
          className="checkout-primary-button checkout-primary-button--ghost"
          onClick={() => setInvoiceOpen(true)}
          type="button"
        >
          <ReceiptLongOutlined /> {t('checkout.viewInvoice')}
        </button>
        {invoiceOpen && (
          <InvoiceModal
            order={placedOrder}
            onClose={() => setInvoiceOpen(false)}
          />
        )}
      </section>
    )
  }

  if (checkoutItems.length === 0) {
    return (
      <section className="checkout-empty">
        <Seo
          description={t('seo.checkout.description')}
          noindex
          path="/checkout"
          title={t('seo.checkout.title')}
        />
        <div className="checkout-empty__icon">
          <ShoppingBagOutlined />
        </div>
        <span className="checkout-eyebrow">{t('checkout.emptyEyebrow')}</span>
        <h1>{t('checkout.emptyTitle')}</h1>
        <p>{t('checkout.emptyText')}</p>
        <Link className="checkout-primary-button" to="/products">
          {t('checkout.explore')}
          <ArrowForward className="rtl-flip" />
        </Link>
      </section>
    )
  }

  return (
    <section className="checkout-page">
      <Seo
        description={t('seo.checkout.description')}
        noindex
        path="/checkout"
        title={t('seo.checkout.title')}
      />
      <div className="checkout-topline">
        <Link className="checkout-back-link" to="/products">
          <ArrowBack className="rtl-flip" />
          {t('checkout.continueShopping')}
        </Link>
        <div className="checkout-secure">
          <LockOutlined />
          {t('checkout.secure')}
        </div>
      </div>

      <div className="checkout-heading">
        <span className="checkout-eyebrow">{t('checkout.eyebrow')}</span>
        <h1>{t('checkout.title')}</h1>
        <div aria-label={t('checkout.progressAria')} className="checkout-progress">
          <div className="checkout-progress__step is-complete">
            <span>1</span>
            <strong>{t('checkout.stepBag')}</strong>
          </div>
          <i />
          <div className="checkout-progress__step is-current">
            <span>2</span>
            <strong>{t('checkout.stepDelivery')}</strong>
          </div>
          <i />
          <div className="checkout-progress__step">
            <span>3</span>
            <strong>{t('checkout.stepConfirmation')}</strong>
          </div>
        </div>
      </div>

      <form className="checkout-layout" onSubmit={handleSubmit}>
        <div className="checkout-form-column">
          <section
            aria-labelledby="checkout-contact-title"
            className="checkout-card"
          >
            <div className="checkout-section-heading">
              <span>01</span>
              <div>
                <h2 id="checkout-contact-title">{t('checkout.contactTitle')}</h2>
                <p>{t('checkout.contactText')}</p>
              </div>
            </div>
            <div className="checkout-fields checkout-fields--two">
              <label className="checkout-field checkout-field--full">
                <span>{t('checkout.email')}</span>
                <input
                  autoComplete="email"
                  onChange={(event) =>
                    updateCheckoutDetail('email', event.target.value)
                  }
                  value={checkoutDetails.email}
                  name="email"
                  placeholder={t('checkout.emailPlaceholder')}
                  required
                  type="email"
                />
              </label>
              <label className="checkout-field checkout-field--full">
                <span>{t('checkout.phone')}</span>
                <input
                  autoComplete="tel"
                  onChange={(event) =>
                    updateCheckoutDetail('phone', event.target.value)
                  }
                  value={checkoutDetails.phone}
                  name="phone"
                  placeholder={t('checkout.phonePlaceholder')}
                  required
                  type="tel"
                />
              </label>
            </div>
          </section>

          <section
            aria-labelledby="checkout-delivery-title"
            className="checkout-card"
          >
            <div className="checkout-section-heading">
              <span>02</span>
              <div>
                <h2 id="checkout-delivery-title">{t('checkout.deliveryTitle')}</h2>
                <p>{t('checkout.deliveryText')}</p>
              </div>
            </div>
            {addresses.length > 0 && (
              <>
                <label className="checkout-field checkout-address-select">
                  <span>{t('checkout.chooseSaved')}</span>
                  <select
                    onChange={(event) => selectSavedAddress(event.target.value)}
                    value={selectedAddressId}
                  >
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.label} — {address.address}
                        {address.buildingNumber
                          ? t('checkout.buildingSuffix', {
                              number: address.buildingNumber,
                            })
                          : ''}
                        , {address.city}
                      </option>
                    ))}
                    <option value="">{t('checkout.keepCurrent')}</option>
                  </select>
                </label>
                <Link
                  className="checkout-address-manage"
                  to="/account?section=addresses"
                >
                  {t('checkout.manageSaved')}
                </Link>
              </>
            )}
            <div className="checkout-location">
              <p>{t('checkout.locationText')}</p>
              <button
                className="checkout-location__button"
                disabled={locationLoading}
                onClick={useCurrentLocation}
                type="button"
              >
                <LocationOnOutlined />
                {locationLoading
                  ? t('checkout.locationFinding')
                  : t('checkout.locationButton')}
              </button>
              <small>
                {t('checkout.locationPermissionBefore')}{' '}
                <a
                  href="https://www.openstreetmap.org/"
                  rel="noreferrer"
                  target="_blank"
                >
                  OpenStreetMap
                </a>{' '}
                {t('checkout.locationPermissionAfter')}
              </small>
              {locationMessage && (
                <p className="checkout-location__message" role="status">
                  {locationMessage}
                </p>
              )}
              {locationAccuracy !== null && (
                <p className="checkout-location__accuracy">
                  {t('checkout.locationAccuracy', {
                    meters: number(Math.round(locationAccuracy)),
                  })}
                </p>
              )}
            </div>
            <div className="checkout-fields checkout-fields--two">
              <label className="checkout-field">
                <span>{t('checkout.firstName')}</span>
                <input
                  autoComplete="given-name"
                  onChange={(event) =>
                    updateCheckoutDetail('firstName', event.target.value)
                  }
                  value={checkoutDetails.firstName}
                  name="firstName"
                  placeholder={t('checkout.firstName')}
                  required
                />
              </label>
              <label className="checkout-field">
                <span>{t('checkout.lastName')}</span>
                <input
                  autoComplete="family-name"
                  onChange={(event) =>
                    updateCheckoutDetail('lastName', event.target.value)
                  }
                  value={checkoutDetails.lastName}
                  name="lastName"
                  placeholder={t('checkout.lastName')}
                  required
                />
              </label>
              <label className="checkout-field checkout-field--full">
                <span>{t('checkout.street')}</span>
                <input
                  autoComplete="street-address"
                  onChange={(event) =>
                    updateCheckoutDetail('address', event.target.value)
                  }
                  value={checkoutDetails.address}
                  name="address"
                  placeholder={t('checkout.streetPlaceholder')}
                  required
                />
              </label>
              <label className="checkout-field">
                <span>{t('checkout.building')}</span>
                <input
                  autoComplete="address-line1"
                  name="buildingNumber"
                  onChange={(event) =>
                    updateCheckoutDetail('buildingNumber', event.target.value)
                  }
                  placeholder={t('checkout.required')}
                  required
                  value={checkoutDetails.buildingNumber}
                />
              </label>
              <label className="checkout-field checkout-field--full">
                <span>
                  {t('checkout.neighborhood')} <em>{t('checkout.ifAvailable')}</em>
                </span>
                <input
                  autoComplete="address-level3"
                  name="neighborhood"
                  onChange={(event) =>
                    updateCheckoutDetail('neighborhood', event.target.value)
                  }
                  value={checkoutDetails.neighborhood}
                />
              </label>
              <label className="checkout-field checkout-field--full">
                <span>{t('checkout.apartment')}</span>
                <input
                  autoComplete="address-line2"
                  disabled={noApartment}
                  name="apartment"
                  onChange={(event) =>
                    updateCheckoutDetail('apartment', event.target.value)
                  }
                  required={!noApartment}
                  value={checkoutDetails.apartment}
                />
              </label>
              <label className="checkout-address-confirm">
                <input
                  checked={noApartment}
                  onChange={(event) => {
                    setNoApartment(event.target.checked)
                    if (event.target.checked) {
                      updateCheckoutDetail('apartment', '')
                    }
                    setAddressConfirmed(false)
                  }}
                  type="checkbox"
                />
                <span>{t('checkout.noApartment')}</span>
              </label>
              <label className="checkout-field">
                <span>{t('checkout.city')}</span>
                <input
                  autoComplete="address-level2"
                  onChange={(event) =>
                    updateCheckoutDetail('city', event.target.value)
                  }
                  value={checkoutDetails.city}
                  name="city"
                  placeholder={t('checkout.cityPlaceholder')}
                  required
                />
              </label>
              <label className="checkout-field">
                <span>
                  {t('checkout.postal')} <em>{t('common.optional')}</em>
                </span>
                <input
                  autoComplete="postal-code"
                  onChange={(event) =>
                    updateCheckoutDetail('postalCode', event.target.value)
                  }
                  value={checkoutDetails.postalCode}
                  name="postalCode"
                  placeholder={t('checkout.postal')}
                />
              </label>
              <label className="checkout-field">
                <span>{t('checkout.governorate')}</span>
                <input
                  autoComplete="address-level1"
                  name="region"
                  onChange={(event) =>
                    updateCheckoutDetail('region', event.target.value)
                  }
                  value={checkoutDetails.region}
                  required
                />
              </label>
              <label className="checkout-field">
                <span>{t('checkout.country')}</span>
                <input
                  autoComplete="country-name"
                  name="country"
                  onChange={(event) =>
                    updateCheckoutDetail('country', event.target.value)
                  }
                  placeholder={t('checkout.countryPlaceholder')}
                  required
                  value={checkoutDetails.country}
                />
              </label>
              <label className="checkout-field checkout-field--full">
                <span>
                  {t('checkout.deliveryNote')} <em>{t('common.optional')}</em>
                </span>
                <textarea
                  name="deliveryNote"
                  onChange={(event) =>
                    updateCheckoutDetail('deliveryNote', event.target.value)
                  }
                  placeholder={t('checkout.deliveryNotePlaceholder')}
                  rows={3}
                  value={checkoutDetails.deliveryNote}
                />
              </label>
              <label className="checkout-address-confirm checkout-address-confirm--review">
                <input
                  checked={addressConfirmed}
                  name="addressConfirmed"
                  onChange={(event) =>
                    setAddressConfirmed(event.target.checked)
                  }
                  required
                  type="checkbox"
                />
                <span>{t('checkout.confirmAddress')}</span>
              </label>
            </div>
          </section>

          <section
            aria-labelledby="checkout-shipping-title"
            className="checkout-card"
          >
            <div className="checkout-section-heading">
              <span>03</span>
              <div>
                <h2 id="checkout-shipping-title">{t('checkout.shippingTitle')}</h2>
                <p>{t('checkout.shippingText')}</p>
              </div>
            </div>
            <div className="checkout-choice-list">
              <label
                className={`checkout-choice${shippingMethod === 'standard' ? ' is-selected' : ''}`}
              >
                <input
                  checked={shippingMethod === 'standard'}
                  name="shipping"
                  onChange={() => setShippingMethod('standard')}
                  type="radio"
                />
                <LocalShippingOutlined />
                <span>
                  <strong>{t('checkout.standard')}</strong>
                  <small>{t('checkout.standardEta')}</small>
                </span>
                <b>
                  {subtotal >= freeShippingThreshold
                    ? t('checkout.free')
                    : currency(6)}
                </b>
              </label>
              <label
                className={`checkout-choice${shippingMethod === 'express' ? ' is-selected' : ''}`}
              >
                <input
                  checked={shippingMethod === 'express'}
                  name="shipping"
                  onChange={() => setShippingMethod('express')}
                  type="radio"
                />
                <LocalShippingOutlined />
                <span>
                  <strong>{t('checkout.express')}</strong>
                  <small>{t('checkout.expressEta')}</small>
                </span>
                <b>{currency(12)}</b>
              </label>
            </div>
            {subtotal >= freeShippingThreshold && (
              <p className="checkout-free-shipping">
                {t('checkout.freeQualify')}
              </p>
            )}
          </section>

          <section
            aria-labelledby="checkout-payment-title"
            className="checkout-card"
          >
            <div className="checkout-section-heading">
              <span>04</span>
              <div>
                <h2 id="checkout-payment-title">{t('checkout.paymentTitle')}</h2>
                <p>{t('checkout.paymentText')}</p>
              </div>
            </div>
            <div className="checkout-choice-list">
              <label
                className={`checkout-choice${paymentMethod === 'card' ? ' is-selected' : ''}`}
              >
                <input
                  checked={paymentMethod === 'card'}
                  name="payment"
                  onChange={() => setPaymentMethod('card')}
                  type="radio"
                />
                <span className="checkout-choice__card-icon">VISA</span>
                <span>
                  <strong>{t('checkout.card')}</strong>
                  <small>{t('checkout.cardText')}</small>
                </span>
              </label>
              <label
                className={`checkout-choice${paymentMethod === 'cash' ? ' is-selected' : ''}`}
              >
                <input
                  checked={paymentMethod === 'cash'}
                  name="payment"
                  onChange={() => setPaymentMethod('cash')}
                  type="radio"
                />
                <span className="checkout-choice__cash-icon">$</span>
                <span>
                  <strong>{t('checkout.cash')}</strong>
                  <small>{t('checkout.cashText')}</small>
                </span>
              </label>
            </div>
            <p className="checkout-payment-note">{t('checkout.paymentNote')}</p>
          </section>
        </div>

        <aside
          aria-label={t('checkout.summaryAria')}
          className="checkout-summary"
        >
          <div className="checkout-summary__heading">
            <h2>{t('checkout.summaryTitle')}</h2>
            <span>
              {t('checkout.pieces', { count: number(checkoutItems.length) })}
            </span>
          </div>

          <div className="checkout-summary__items">
            {checkoutItems.map((item) => {
              const name = localized(item.name, item.name_ar)
              return (
                <article className="checkout-item" key={item.id}>
                  <div className="checkout-item__image">
                    <img alt="" src={coverImage(item)} />
                    <span>{item.quantity}</span>
                  </div>
                  <div className="checkout-item__details">
                    <span>{localized(item.brand, item.brand_ar)}</span>
                    <h3>{name}</h3>
                    <strong>{currency(item.price * item.quantity)}</strong>
                    <div className="checkout-item__quantity">
                      <button
                        aria-label={t('checkout.decreaseAria', { name })}
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                        type="button"
                      >
                        <Remove />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={t('checkout.increaseAria', { name })}
                        onClick={() => setQuantity(item.id, item.quantity + 1)}
                        type="button"
                      >
                        <Add />
                      </button>
                      <button
                        className="checkout-item__remove"
                        onClick={() => removeItem(item.id)}
                        type="button"
                      >
                        {t('checkout.remove')}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {amountToFreeShipping > 0 && (
            <p className="checkout-shipping-progress">
              {t('checkout.progressAdd', {
                amount: currency(amountToFreeShipping),
              })}
            </p>
          )}

          <div className="checkout-coupon">
            <label htmlFor="checkout-coupon-code">{t('checkout.couponLabel')}</label>
            <div className="checkout-coupon__controls">
              <input
                autoComplete="off"
                id="checkout-coupon-code"
                onChange={(event) => {
                  setCouponInput(event.target.value)
                  setCouponInputEdited(true)
                  setCouponMessage('')
                }}
                placeholder={t('checkout.couponPlaceholder')}
                value={displayedCouponInput}
              />
              <button onClick={handleApplyCoupon} type="button">
                {appliedCoupon ? t('checkout.removeCoupon') : t('checkout.apply')}
              </button>
            </div>
            {couponMessage && (
              <p
                className={`checkout-coupon__message${appliedCoupon ? ' is-success' : ''}`}
                role="status"
              >
                {couponMessage}
              </p>
            )}
            {referralCode && (
              <small className="checkout-coupon__referral-hint">
                {t('checkout.couponHint')}
              </small>
            )}
            <Link className="checkout-coupon__wallet-link" to="/rewards">
              {t('checkout.walletLink')}
            </Link>
          </div>

          <div className="checkout-summary__totals">
            <div>
              <span>{t('checkout.subtotal')}</span>
              <strong>{currency(subtotal)}</strong>
            </div>
            <div>
              <span>{t('checkout.delivery')}</span>
              <strong>
                {shipping === 0
                  ? t('checkout.complimentary')
                  : currency(shipping)}
              </strong>
            </div>
            {couponDiscount > 0 && (
              <div className="checkout-summary__discount">
                <span>
                  {t('checkout.couponLine', { code: appliedCoupon?.code ?? '' })}
                </span>
                <strong>−{currency(couponDiscount)}</strong>
              </div>
            )}
            <div className="checkout-summary__total">
              <span>{t('checkout.total')}</span>
              <strong>{currency(total)}</strong>
            </div>
          </div>

          <button className="checkout-submit" type="submit">
            <LockOutlined />
            <span>{t('checkout.submit')}</span>
            <ArrowForward className="rtl-flip" />
          </button>

          <p className="checkout-terms">{t('checkout.terms')}</p>
        </aside>
      </form>
    </section>
  )
}

export default CheckoutPage

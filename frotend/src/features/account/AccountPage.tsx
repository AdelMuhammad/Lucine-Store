import { useState, type FormEvent, type ReactNode } from 'react'
import {
  Add,
  AccountCircleOutlined,
  ArrowForward,
  Check,
  DeleteOutlined,
  EditOutlined,
  FavoriteBorder,
  Inventory2Outlined,
  LocationOnOutlined,
  Logout,
  PersonOutlined,
  ReceiptLongOutlined,
  ShoppingBagOutlined,
  TuneOutlined,
} from '@mui/icons-material'
import { Link, useSearchParams } from 'react-router-dom'
import Seo from '../../components/seo/Seo'
import { useProductStore } from '../products/store/useProductStore'
import { coverImage } from '../products/data/products'
import { useCartStore } from '../products/store/useCartStore'
import { useAuthStore } from './store/useAuthStore'
import {
  useAccountStore,
  type CustomerAddress,
  type CustomerOrder,
  type CustomerProfile,
  type CustomerPreferences,
} from './store/useAccountStore'
import { useWishlistStore } from '../products/store/useWishlistStore'
import InvoiceModal from '../invoice/InvoiceModal'
import { useTranslation } from '../../hooks/useTranslation'
import './AccountPage.css'

type AccountSection =
  | 'overview'
  | 'orders'
  | 'addresses'
  | 'profile'
  | 'preferences'
  | 'saved'

type AccountAddressFormProps = {
  address?: CustomerAddress
  onCancel: () => void
  onSave: (address: CustomerAddress) => void
}

const preferenceCategories = [
  'Accessories',
  'Bags',
  'Clothing',
  'Jewelry',
]

function AccountAddressForm({
  address,
  onCancel,
  onSave,
}: AccountAddressFormProps) {
  const { t } = useTranslation()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const value = (name: string) => String(formData.get(name) ?? '').trim()

    onSave({
      id: address?.id ?? crypto.randomUUID(),
      label: value('label'),
      firstName: value('firstName'),
      lastName: value('lastName'),
      phone: value('phone'),
      address: value('address'),
      buildingNumber: value('buildingNumber'),
      neighborhood: value('neighborhood'),
      apartment: value('apartment'),
      city: value('city'),
      region: value('region'),
      postalCode: value('postalCode'),
      country: value('country'),
      isDefault: formData.get('isDefault') === 'on',
    })
  }

  return (
    <form className="account-address-form" onSubmit={handleSubmit}>
      <div className="account-form-grid">
        <label>
          {t('account.addressLabel')}
          <input
            defaultValue={address?.label ?? ''}
            name="label"
            placeholder={t('account.addressLabelPlaceholder')}
            required
          />
        </label>
        <label>
          {t('account.phone')}
          <input
            autoComplete="tel"
            defaultValue={address?.phone ?? ''}
            name="phone"
            required
            type="tel"
          />
        </label>
        <label>
          {t('account.firstName')}
          <input
            autoComplete="given-name"
            defaultValue={address?.firstName ?? ''}
            name="firstName"
            required
          />
        </label>
        <label>
          {t('account.lastName')}
          <input
            autoComplete="family-name"
            defaultValue={address?.lastName ?? ''}
            name="lastName"
            required
          />
        </label>
        <label>
          {t('account.buildingNumber')}
          <input
            autoComplete="address-line1"
            defaultValue={address?.buildingNumber ?? ''}
            name="buildingNumber"
            required
          />
        </label>
        <label className="account-form-grid__full">
          {t('account.streetAddress')}
          <input
            autoComplete="street-address"
            defaultValue={address?.address ?? ''}
            name="address"
            required
          />
        </label>
        <label className="account-form-grid__full">
          {t('account.neighborhood')}
          <input
            defaultValue={address?.neighborhood ?? ''}
            name="neighborhood"
          />
        </label>
        <label className="account-form-grid__full">
          {t('account.apartment')} <span>{t('common.optional')}</span>
          <input
            defaultValue={address?.apartment ?? ''}
            name="apartment"
          />
        </label>
        <label>
          {t('account.city')}
          <input
            autoComplete="address-level2"
            defaultValue={address?.city ?? ''}
            name="city"
            required
          />
        </label>
        <label>
          {t('account.stateRegion')}
          <input
            autoComplete="address-level1"
            defaultValue={address?.region ?? ''}
            name="region"
            required
          />
        </label>
        <label>
          {t('account.postalCode')}
          <input
            autoComplete="postal-code"
            defaultValue={address?.postalCode ?? ''}
            name="postalCode"
            required
          />
        </label>
        <label>
          {t('account.country')}
          <input
            autoComplete="country-name"
            defaultValue={address?.country ?? ''}
            name="country"
            placeholder={t('account.countryPlaceholder')}
            required
          />
        </label>
      </div>
      <label className="account-checkbox">
        <input
          defaultChecked={address?.isDefault ?? false}
          name="isDefault"
          type="checkbox"
        />
        <span>{t('account.setDefault')}</span>
      </label>
      <div className="account-form-actions">
        <button className="account-button account-button--primary" type="submit">
          {address ? t('account.saveAddress') : t('account.addAddress')}
        </button>
        <button
          className="account-button account-button--quiet"
          onClick={onCancel}
          type="button"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

function AccountPage() {
  const {
    t,
    localized,
    currency,
    number,
    currencyCode,
    currencyMode,
    currencyError,
    setCurrency,
    useAutomaticCurrency,
  } = useTranslation()
  const products = useProductStore((state) => state.products)
  const [searchParams] = useSearchParams()
  const [section, setSection] = useState<AccountSection>(() =>
    searchParams.get('section') === 'orders'
      ? 'orders'
      : searchParams.get('section') === 'addresses'
        ? 'addresses'
        : 'overview',
  )
  const [addressForm, setAddressForm] = useState<
    'closed' | 'new' | CustomerAddress
  >('closed')
  const [statusMessage, setStatusMessage] = useState('')
  const profile = useAccountStore((state) => state.profile)
  const addresses = useAccountStore((state) => state.addresses)
  const preferences = useAccountStore((state) => state.preferences)
  const orders = useAccountStore((state) => state.orders)
  const saveProfile = useAccountStore((state) => state.saveProfile)
  const addAddress = useAccountStore((state) => state.addAddress)
  const updateAddress = useAccountStore((state) => state.updateAddress)
  const removeAddress = useAccountStore((state) => state.removeAddress)
  const setDefaultAddress = useAccountStore((state) => state.setDefaultAddress)
  const savePreferences = useAccountStore((state) => state.savePreferences)
  const clearAccount = useAccountStore((state) => state.clearAccount)
  const cartItems = useCartStore((state) => state.items)
  const savedProductIds = useWishlistStore((state) => state.savedProductIds)
  const defaultAddress = addresses.find((address) => address.isDefault)
  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    t('account.title')
  const initials =
    [profile.firstName[0], profile.lastName[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() || 'L'
  const authStatus = useAuthStore((state) => state.status)
  const authUser = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const updateUser = useAuthStore((state) => state.updateUser)

  async function handleSignOut() {
    await signOut()
    setSection('overview')
    setStatusMessage('')
  }

  const accountNavigation: {
    id: AccountSection
    label: string
    icon: ReactNode
  }[] = [
    { id: 'overview', label: t('account.navOverview'), icon: <AccountCircleOutlined /> },
    { id: 'orders', label: t('account.navOrders'), icon: <Inventory2Outlined /> },
    { id: 'addresses', label: t('account.navAddresses'), icon: <LocationOnOutlined /> },
    { id: 'profile', label: t('account.navProfile'), icon: <PersonOutlined /> },
    { id: 'preferences', label: t('account.navPreferences'), icon: <TuneOutlined /> },
    { id: 'saved', label: t('account.navSaved'), icon: <FavoriteBorder /> },
  ]

  function categoryLabel(name: string) {
    const withArabic = products.find((product) => product.category === name)
    return localized(name, withArabic?.category_ar)
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const nextProfile: CustomerProfile = {
      firstName: String(formData.get('firstName') ?? '').trim(),
      lastName: String(formData.get('lastName') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      birthday: String(formData.get('birthday') ?? ''),
    }

    saveProfile(nextProfile)
    if (authStatus === 'authenticated') {
      void updateUser({
        fullName: `${nextProfile.firstName} ${nextProfile.lastName}`.trim(),
        phone: nextProfile.phone,
        birthday: nextProfile.birthday,
      })
    }
    setStatusMessage(t('account.statusProfile'))
  }

  function handleAddressSave(address: CustomerAddress) {
    if (typeof addressForm === 'object') {
      updateAddress(address)
    } else {
      addAddress({ ...address, isDefault: address.isDefault || addresses.length === 0 })
    }
    setAddressForm('closed')
    setStatusMessage(t('account.statusAddress'))
  }

  function handlePreferencesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextPreferences: CustomerPreferences = {
      categories: formData.getAll('categories').map(String),
      styleNotes: String(formData.get('styleNotes') ?? '').trim(),
      emailUpdates: formData.get('emailUpdates') === 'on',
      productAlerts: formData.get('productAlerts') === 'on',
    }
    savePreferences(nextPreferences)
    setStatusMessage(t('account.statusPreferences'))
  }

  function handleClearAccount() {
    const confirmed = window.confirm(t('account.confirmClear'))
    if (!confirmed) return

    clearAccount()
    setSection('overview')
    setStatusMessage(t('account.statusCleared'))
  }

  const savedProducts = products.filter((product) =>
    savedProductIds.includes(product.id),
  )

  return (
    <div className="account-page">
      <Seo
        description={t('seo.account.description')}
        noindex
        path="/account"
        title={t('seo.account.title')}
      />
      <header className="account-page__heading">
        <div>
          <span className="account-eyebrow">{t('account.eyebrow')}</span>
          <h1>{t('account.title')}</h1>
          <p>{t('account.intro')}</p>
        </div>
        <div className="account-page__heading-actions">
          <Link className="account-link-button account-page__auth-link" to="/rewards">
            {t('account.rewardsLink')} <ArrowForward className="rtl-flip" />
          </Link>
          {authStatus === 'authenticated' ? (
            <button
              className="account-link-button account-page__auth-link"
              onClick={() => void handleSignOut()}
              type="button"
            >
              <Logout />
              {t('auth.signOut')}
            </button>
          ) : (
            <Link className="account-link-button account-page__auth-link" to="/login">
              {t('account.authLink')} <ArrowForward className="rtl-flip" />
            </Link>
          )}
        </div>
      </header>

      {statusMessage && (
        <div className="account-status" role="status">
          <Check />
          <span>{statusMessage}</span>
          <button
            aria-label={t('common.dismiss')}
            onClick={() => setStatusMessage('')}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-customer">
            <div aria-hidden="true" className="account-customer__avatar">
              {initials}
            </div>
            <div>
              <strong>{displayName}</strong>
              <span>
                {profile.email || authUser?.email || t('account.personalAccount')}
              </span>
            </div>
          </div>

          <nav aria-label={t('account.navAria')} className="account-navigation">
            {accountNavigation.map((item) => (
              <button
                aria-current={section === item.id ? 'page' : undefined}
                className={section === item.id ? 'is-active' : ''}
                key={item.id}
                onClick={() => {
                  setSection(item.id)
                  setAddressForm('closed')
                }}
                type="button"
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === 'saved' && savedProductIds.length > 0 && (
                  <small>{savedProductIds.length}</small>
                )}
              </button>
            ))}
          </nav>

          <div className="account-local-note">{t('account.localNote')}</div>
        </aside>

        <div className="account-content">
          {section === 'overview' && (
            <section aria-labelledby="account-overview-title">
              <div className="account-section-heading">
                <div>
                  <span className="account-eyebrow">{t('account.overviewEyebrow')}</span>
                  <h2 id="account-overview-title">{t('account.overviewTitle')}</h2>
                </div>
                <button
                  className="account-link-button"
                  onClick={() => setSection('profile')}
                  type="button"
                >
                  {t('account.editDetails')} <EditOutlined />
                </button>
              </div>

              <div className="account-stats">
                <button onClick={() => setSection('orders')} type="button">
                  <Inventory2Outlined />
                  <strong>{number(orders.length)}</strong>
                  <span>{t('account.statOrders')}</span>
                </button>
                <button onClick={() => setSection('saved')} type="button">
                  <FavoriteBorder />
                  <strong>{number(savedProductIds.length)}</strong>
                  <span>{t('account.statSaved')}</span>
                </button>
                <Link to="/checkout">
                  <ShoppingBagOutlined />
                  <strong>
                    {number(
                      cartItems.reduce((sum, item) => sum + item.quantity, 0),
                    )}
                  </strong>
                  <span>{t('account.statBag')}</span>
                </Link>
              </div>

              <section className="account-panel">
                <div className="account-panel__heading">
                  <div>
                    <h3>{t('account.personalDetails')}</h3>
                    <p>{t('account.personalDetailsText')}</p>
                  </div>
                  <button
                    aria-label={t('account.editPersonalAria')}
                    className="account-icon-button"
                    onClick={() => setSection('profile')}
                    type="button"
                  >
                    <EditOutlined />
                  </button>
                </div>
                <div className="account-detail-grid">
                  <div>
                    <span>{t('account.fullName')}</span>
                    <strong>{displayName}</strong>
                  </div>
                  <div>
                    <span>{t('account.emailAddress')}</span>
                    <strong>{profile.email || t('account.notAdded')}</strong>
                  </div>
                  <div>
                    <span>{t('account.phoneNumber')}</span>
                    <strong>{profile.phone || t('account.notAdded')}</strong>
                  </div>
                  <div>
                    <span>{t('account.birthday')}</span>
                    <strong>{profile.birthday || t('account.notAdded')}</strong>
                  </div>
                </div>
              </section>

              <section className="account-panel">
                <div className="account-panel__heading">
                  <div>
                    <h3>{t('account.defaultAddress')}</h3>
                    <p>{t('account.defaultAddressText')}</p>
                  </div>
                  <button
                    className="account-link-button"
                    onClick={() => setSection('addresses')}
                    type="button"
                  >
                    {t('account.manageAddresses')} <ArrowForward className="rtl-flip" />
                  </button>
                </div>
                {defaultAddress ? (
                  <AddressSummary address={defaultAddress} />
                ) : (
                  <button
                    className="account-add-address"
                    onClick={() => {
                      setSection('addresses')
                      setAddressForm('new')
                    }}
                    type="button"
                  >
                    <Add />
                    {t('account.addDeliveryAddress')}
                  </button>
                )}
              </section>

              <section className="account-panel account-order-note">
                <Inventory2Outlined />
                <div>
                  <h3>{t('account.orderHistory')}</h3>
                  <p>
                    {orders.length === 0
                      ? t('account.ordersEmpty')
                      : t('account.ordersSaved', { count: number(orders.length) })}
                  </p>
                </div>
                <button
                  className="account-link-button"
                  onClick={() => setSection('orders')}
                  type="button"
                >
                  {t('account.viewOrders')} <ArrowForward className="rtl-flip" />
                </button>
              </section>
            </section>
          )}

          {section === 'profile' && (
            <section className="account-panel" aria-labelledby="account-profile-title">
              <div className="account-section-heading">
                <div>
                  <span className="account-eyebrow">{t('account.profileEyebrow')}</span>
                  <h2 id="account-profile-title">{t('account.profileTitle')}</h2>
                  <p>{t('account.profileText')}</p>
                </div>
              </div>
              <form className="account-form" onSubmit={handleProfileSubmit}>
                <div className="account-form-grid">
                  <label>
                    {t('account.firstName')}
                    <input
                      autoComplete="given-name"
                      defaultValue={profile.firstName}
                      name="firstName"
                      required
                    />
                  </label>
                  <label>
                    {t('account.lastName')}
                    <input
                      autoComplete="family-name"
                      defaultValue={profile.lastName}
                      name="lastName"
                      required
                    />
                  </label>
                  <label>
                    {t('account.emailAddress')}
                    <input
                      autoComplete="email"
                      defaultValue={profile.email}
                      name="email"
                      required
                      type="email"
                    />
                  </label>
                  <label>
                    {t('account.phoneNumber')}
                    <input
                      autoComplete="tel"
                      defaultValue={profile.phone}
                      name="phone"
                      type="tel"
                    />
                  </label>
                  <label>
                    {t('account.birthday')} <span>{t('common.optional')}</span>
                    <input
                      defaultValue={profile.birthday}
                      name="birthday"
                      type="date"
                    />
                  </label>
                </div>
                <p className="account-form-note">{t('account.formNote')}</p>
                <button className="account-button account-button--primary" type="submit">
                  {t('account.savePersonal')}
                </button>
              </form>
              <div className="account-danger-zone">
                <div>
                  <h3>{t('account.removeLocalTitle')}</h3>
                  <p>{t('account.removeLocalText')}</p>
                </div>
                <button
                  className="account-button account-button--danger"
                  onClick={handleClearAccount}
                  type="button"
                >
                  <DeleteOutlined />
                  {t('account.deleteMyDetails')}
                </button>
              </div>
            </section>
          )}

          {section === 'addresses' && (
            <section aria-labelledby="account-addresses-title">
              <div className="account-section-heading">
                <div>
                  <span className="account-eyebrow">{t('account.addressesEyebrow')}</span>
                  <h2 id="account-addresses-title">{t('account.addressesTitle')}</h2>
                  <p>{t('account.addressesText')}</p>
                </div>
                {addressForm === 'closed' && (
                  <button
                    className="account-button account-button--primary"
                    onClick={() => setAddressForm('new')}
                    type="button"
                  >
                    <Add /> {t('account.addAddress')}
                  </button>
                )}
              </div>

              {addressForm !== 'closed' && (
                <section className="account-panel">
                  <div className="account-panel__heading">
                    <div>
                      <h3>
                        {typeof addressForm === 'object'
                          ? t('account.editAddress')
                          : t('account.newAddress')}
                      </h3>
                      <p>{t('account.requiredNote')}</p>
                    </div>
                  </div>
                  <AccountAddressForm
                    address={
                      typeof addressForm === 'object' ? addressForm : undefined
                    }
                    onCancel={() => setAddressForm('closed')}
                    onSave={handleAddressSave}
                  />
                </section>
              )}

              {addresses.length > 0 ? (
                <div className="account-address-list">
                  {addresses.map((address) => (
                    <article className="account-panel account-address" key={address.id}>
                      <div className="account-address__top">
                        <div>
                          <span className="account-address__label">
                            <LocationOnOutlined />
                            {address.label}
                          </span>
                          {address.isDefault && (
                            <span className="account-default-badge">
                              {t('account.defaultBadge')}
                            </span>
                          )}
                        </div>
                        <div className="account-address__actions">
                          <button
                            aria-label={t('account.editAddressAria', {
                              label: address.label,
                            })}
                            className="account-icon-button"
                            onClick={() => setAddressForm(address)}
                            type="button"
                          >
                            <EditOutlined />
                          </button>
                          <button
                            aria-label={t('account.deleteAddressAria', {
                              label: address.label,
                            })}
                            className="account-icon-button account-icon-button--danger"
                            onClick={() => {
                              removeAddress(address.id)
                              setStatusMessage(t('account.statusAddressRemoved'))
                            }}
                            type="button"
                          >
                            <DeleteOutlined />
                          </button>
                        </div>
                      </div>
                      <AddressSummary address={address} />
                      {!address.isDefault && (
                        <button
                          className="account-link-button"
                          onClick={() => setDefaultAddress(address.id)}
                          type="button"
                        >
                          {t('account.makeDefault')}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="account-empty">
                  <LocationOnOutlined />
                  <h3>{t('account.noAddresses')}</h3>
                  <p>{t('account.noAddressesText')}</p>
                  {addressForm === 'closed' && (
                    <button
                      className="account-button account-button--primary"
                      onClick={() => setAddressForm('new')}
                      type="button"
                    >
                      <Add /> {t('account.addFirstAddress')}
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {section === 'preferences' && (
            <section className="account-panel" aria-labelledby="account-preferences-title">
              <div className="account-section-heading">
                <div>
                  <span className="account-eyebrow">{t('account.preferencesEyebrow')}</span>
                  <h2 id="account-preferences-title">{t('account.preferencesTitle')}</h2>
                  <p>{t('account.preferencesText')}</p>
                </div>
              </div>
              <fieldset className="account-preference-group account-currency-settings">
                <legend>{t('currency.label')}</legend>
                <p>{t('currency.description')}</p>
                <label className="account-currency-settings__field">
                  <span>{t('currency.label')}</span>
                  <select
                    aria-label={t('currency.label')}
                    onChange={(event) => {
                      if (event.target.value === 'auto') {
                        useAutomaticCurrency()
                      } else if (event.target.value === 'USD') {
                        setCurrency('USD')
                      } else {
                        setCurrency('EGP')
                      }
                    }}
                    value={currencyMode === 'auto' ? 'auto' : currencyCode}
                  >
                    <option value="auto">{t('currency.automatic')}</option>
                    <option value="EGP">{t('currency.egp')}</option>
                    <option value="USD">{t('currency.usd')}</option>
                  </select>
                </label>
                {currencyError && (
                  <p className="account-currency-settings__error" role="status">
                    {t('currency.dataUnavailable')}
                  </p>
                )}
              </fieldset>
              <form
                className="account-preferences-form"
                onSubmit={handlePreferencesSubmit}
              >
                <fieldset className="account-preference-group">
                  <legend>{t('account.browseLegend')}</legend>
                  <p>{t('account.browseText')}</p>
                  <div className="account-preference-categories">
                    {preferenceCategories.map((category) => (
                      <label className="account-category-choice" key={category}>
                        <input
                          defaultChecked={preferences.categories.includes(category)}
                          name="categories"
                          type="checkbox"
                          value={category}
                        />
                        <span>{categoryLabel(category)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="account-notes-field">
                  {t('account.styleNotes')} <span>{t('common.optional')}</span>
                  <textarea
                    defaultValue={preferences.styleNotes}
                    name="styleNotes"
                    placeholder={t('account.styleNotesPlaceholder')}
                    rows={4}
                  />
                </label>
                <fieldset className="account-preference-group">
                  <legend>{t('account.updatesLegend')}</legend>
                  <label className="account-toggle">
                    <span>
                      <strong>{t('account.emailUpdates')}</strong>
                      <small>{t('account.emailUpdatesText')}</small>
                    </span>
                    <input
                      defaultChecked={preferences.emailUpdates}
                      name="emailUpdates"
                      type="checkbox"
                    />
                  </label>
                  <label className="account-toggle">
                    <span>
                      <strong>{t('account.productAlerts')}</strong>
                      <small>{t('account.productAlertsText')}</small>
                    </span>
                    <input
                      defaultChecked={preferences.productAlerts}
                      name="productAlerts"
                      type="checkbox"
                    />
                  </label>
                </fieldset>
                <button className="account-button account-button--primary" type="submit">
                  {t('account.savePreferences')}
                </button>
              </form>
            </section>
          )}

          {section === 'orders' && (
            <section aria-labelledby="account-orders-title">
              <div className="account-section-heading">
                <div>
                  <span className="account-eyebrow">{t('account.ordersEyebrow')}</span>
                  <h2 id="account-orders-title">{t('account.ordersTitle')}</h2>
                  <p>{t('account.ordersText')}</p>
                </div>
              </div>
              {orders.length > 0 ? (
                <div className="account-order-list">
                  {orders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              ) : (
                <div className="account-empty">
                  <Inventory2Outlined />
                  <h3>{t('account.noOrders')}</h3>
                  <p>{t('account.noOrdersText')}</p>
                  <Link
                    className="account-button account-button--primary"
                    to="/products"
                  >
                    {t('account.exploreCollection')} <ArrowForward className="rtl-flip" />
                  </Link>
                </div>
              )}
            </section>
          )}

          {section === 'saved' && (
            <section aria-labelledby="account-saved-title">
              <div className="account-section-heading">
                <div>
                  <span className="account-eyebrow">{t('account.savedEyebrow')}</span>
                  <h2 id="account-saved-title">{t('account.savedTitle')}</h2>
                  <p>{t('account.savedText')}</p>
                </div>
                <Link className="account-link-button" to="/products">
                  {t('account.discoverMore')} <ArrowForward className="rtl-flip" />
                </Link>
              </div>
              {savedProducts.length > 0 ? (
                <div className="account-saved-grid">
                  {savedProducts.map((product) => {
                    const name = localized(product.name, product.name_ar)
                    return (
                      <Link
                        className="account-saved-product"
                        key={product.id}
                        to={`/products/${product.id}`}
                      >
                        <img alt={name} src={coverImage(product)} />
                        <span>{localized(product.brand, product.brand_ar)}</span>
                        <strong>{name}</strong>
                        <b>{currency(product.price)}</b>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="account-empty">
                  <FavoriteBorder />
                  <h3>{t('account.savedEmpty')}</h3>
                  <p>{t('account.savedEmptyText')}</p>
                  <Link
                    className="account-button account-button--primary"
                    to="/products"
                  >
                    {t('account.browsePieces')} <ArrowForward className="rtl-flip" />
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const { t, localized, currency, dateTime, number } = useTranslation()
  const [invoiceOpen, setInvoiceOpen] = useState(false)

  return (
    <article className="account-order">
      <header className="account-order__header">
        <div>
          <span>
            {t('account.orderNumber', { id: order.id.slice(0, 8).toUpperCase() })}
          </span>
          <time dateTime={order.createdAt}>{dateTime(order.createdAt)}</time>
        </div>
        <span
          className={`account-order__status${order.status === 'cancelled' ? ' is-cancelled' : ''}`}
        >
          {t(`orderStatus.${order.status}`)}
        </span>
      </header>

      <div className="account-order__items">
        {order.items.map((item) => (
          <div className="account-order__item" key={item.productId}>
            <img alt="" src={item.image} />
            <div>
              <strong>{localized(item.name, item.name_ar)}</strong>
              <span>{localized(item.brand, item.brand_ar)}</span>
              <small>
                {t('account.qtyEach', {
                  qty: number(item.quantity),
                  price: currency(item.unitPrice),
                })}
              </small>
            </div>
            <b>{currency(item.unitPrice * item.quantity)}</b>
          </div>
        ))}
      </div>

      <div className="account-order__details">
        <div>
          <span>{t('account.deliveringTo')}</span>
          <strong>
            {order.address.firstName} {order.address.lastName}
          </strong>
          <small>
            {[
              order.address.street,
              order.address.buildingNumber
                ? t('account.building', { number: order.address.buildingNumber })
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
          </small>
          {order.address.deliveryNotes && (
            <small>
              {t('account.deliveryNote', { note: order.address.deliveryNotes })}
            </small>
          )}
        </div>
        <div>
          <span>{t('account.deliveryPayment')}</span>
          <strong>
            {order.shippingMethod === 'express'
              ? t('account.express')
              : t('account.standard')}{' '}
            · {order.paymentMethod === 'cash' ? t('account.cash') : t('account.card')}
          </strong>
          <small>{order.email} · {order.phone}</small>
        </div>
      </div>

      <footer className="account-order__total">
        <span>
          {t('account.subtotal')} {currency(order.subtotal)} · {t('account.delivery')}{' '}
          {order.shipping === 0 ? t('account.free') : currency(order.shipping)}
          {order.couponDiscount
            ? ` · ${t('account.coupon', { code: order.couponCode ?? '' })}: −${currency(order.couponDiscount)}`
            : ''}
        </span>
        <strong>{t('account.total')} {currency(order.total)}</strong>
      </footer>
      <div className="account-order__actions">
        <Link
          className="account-button account-button--primary"
          to={`/account/orders/${order.id}`}
        >
          {t('account.trackOrder')} <ArrowForward className="rtl-flip" />
        </Link>
        <button
          className="account-button account-order__invoice"
          onClick={() => setInvoiceOpen(true)}
          type="button"
        >
          <ReceiptLongOutlined /> {t('account.viewInvoice')}
        </button>
      </div>

      {invoiceOpen && (
        <InvoiceModal order={order} onClose={() => setInvoiceOpen(false)} />
      )}
    </article>
  )
}

function AddressSummary({ address }: { address: CustomerAddress }) {
  const { t } = useTranslation()

  return (
    <address className="account-address-summary">
      <strong>
        {address.firstName} {address.lastName}
      </strong>
      <span>{address.address}</span>
      {address.buildingNumber && (
        <span>{t('account.building', { number: address.buildingNumber })}</span>
      )}
      {address.neighborhood && <span>{address.neighborhood}</span>}
      {address.apartment && <span>{address.apartment}</span>}
      <span>
        {[address.city, address.region, address.postalCode]
          .filter(Boolean)
          .join(', ')}
      </span>
      <span>{address.country}</span>
      <span>{address.phone}</span>
    </address>
  )
}

export default AccountPage

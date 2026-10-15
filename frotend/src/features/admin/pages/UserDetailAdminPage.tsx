import { useEffect, useMemo } from 'react'
import {
  ArrowBack,
  ArrowForward,
  BadgeOutlined,
  CakeOutlined,
  CallOutlined,
  CalendarMonthOutlined,
  LocationOnOutlined,
  MailOutlineOutlined,
  PersonOffOutlined,
  ReceiptLongOutlined,
  ShoppingBagOutlined,
  StarOutlineOutlined,
  StorefrontOutlined,
} from '@mui/icons-material'
import { Link, useParams } from 'react-router-dom'
import { useAccountStore, type CustomerOrder } from '../../account/store/useAccountStore'
import AdminPageHeader from '../components/AdminPageHeader'
import { orderNumber, orderStatusVariant } from '../format'
import { useTranslation } from '../../../hooks/useTranslation'
import { useAdminUsersStore } from '../store/useAdminUsersStore'

/** A product aggregated from the customer's order history. */
type FavouriteProduct = {
  productId: string
  name: string
  name_ar?: string
  brand: string
  brand_ar?: string
  image: string
  quantity: number
  spend: number
}

/** Splits a stored order address into display lines. */
function addressLines(address: CustomerOrder['address']): string[] {
  const lines: string[] = []
  const name = [address.firstName, address.lastName].filter(Boolean).join(' ')
  if (name) lines.push(name)

  const street = [
    address.street,
    address.buildingNumber,
    address.neighborhood,
    address.apartment,
  ]
    .filter(Boolean)
    .join(', ')
  if (street) lines.push(street)

  const cityLine = [address.city, address.region, address.postalCode]
    .filter(Boolean)
    .join(', ')
  if (cityLine) lines.push(cityLine)

  if (address.country) lines.push(address.country)
  if (address.deliveryNotes) lines.push(address.deliveryNotes)

  return lines
}

/**
 * Everything the store knows about one registered account: profile details,
 * order history, the products they buy most and the addresses on their orders.
 */
function UserDetailAdminPage() {
  const { t, localized, number, currency, date } = useTranslation()
  const { userId } = useParams()
  const users = useAdminUsersStore((state) => state.users)
  const status = useAdminUsersStore((state) => state.status)
  const hydrate = useAdminUsersStore((state) => state.hydrate)
  const orders = useAccountStore((state) => state.orders)

  // Deep links land here without the list page having run, so load if needed.
  useEffect(() => {
    if (users.length === 0) void hydrate()
  }, [hydrate, users.length])

  const user = users.find((entry) => entry.id === userId)

  const accountOrders = useMemo(() => {
    if (!user) return []
    const email = user.email.trim().toLocaleLowerCase()
    const phone = user.phone.trim()
    return orders
      .filter((order) => {
        const orderEmail = order.email.trim().toLocaleLowerCase()
        if (email && orderEmail === email) return true
        if (!email && phone && order.phone.trim() === phone) return true
        return false
      })
      .toSorted((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      )
  }, [orders, user])

  const favourites = useMemo<FavouriteProduct[]>(() => {
    const map = new Map<string, FavouriteProduct>()
    accountOrders.forEach((order) => {
      order.items.forEach((item) => {
        const existing = map.get(item.productId)
        const spend = item.unitPrice * item.quantity
        if (existing) {
          existing.quantity += item.quantity
          existing.spend += spend
        } else {
          map.set(item.productId, {
            productId: item.productId,
            name: item.name,
            name_ar: item.name_ar,
            brand: item.brand,
            brand_ar: item.brand_ar,
            image: item.image,
            quantity: item.quantity,
            spend,
          })
        }
      })
    })
    return [...map.values()].toSorted(
      (first, second) =>
        second.quantity - first.quantity || second.spend - first.spend,
    )
  }, [accountOrders])

  const addresses = useMemo(() => {
    const seen = new Set<string>()
    const result: { key: string; lines: string[] }[] = []
    accountOrders
      .toSorted((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      )
      .forEach((order) => {
        const lines = addressLines(order.address)
        if (lines.length === 0) return
        const key = lines.join('|')
        if (seen.has(key)) return
        seen.add(key)
        result.push({ key, lines })
      })
    return result
  }, [accountOrders])

  const backLink = (
    <Link className="admin-btn admin-btn--sm" to="/admin/users">
      <ArrowBack className="rtl-flip" /> {t('admin.backToUsers')}
    </Link>
  )

  if (!user) {
    // On a deep link the store starts `idle` with no rows yet — treat both
    // `idle` and `loading` as "still fetching" so we never flash "not found".
    const isLoading =
      users.length === 0 && (status === 'idle' || status === 'loading')
    const loadFailed = users.length === 0 && status === 'error'
    return (
      <>
        {backLink}
        <section className="admin-card">
          {isLoading ? (
            <div className="admin-loading" role="status">
              {t('common.loading')}
            </div>
          ) : (
            <div className="admin-empty">
              <PersonOffOutlined />
              <h3>
                {loadFailed
                  ? t('admin.noUsersTitle')
                  : t('admin.userNotFoundTitle')}
              </h3>
              <p>
                {loadFailed
                  ? t('admin.usersLoadFailed')
                  : t('admin.userNotFoundText')}
              </p>
              {loadFailed ? (
                <button
                  className="admin-btn admin-btn--primary"
                  onClick={() => void hydrate({ force: true })}
                  type="button"
                >
                  {t('admin.refresh')}
                </button>
              ) : (
                <Link className="admin-btn admin-btn--primary" to="/admin/users">
                  {t('admin.backToUsers')}
                </Link>
              )}
            </div>
          )}
        </section>
      </>
    )
  }

  const name = user.fullName || user.email || t('admin.guestCustomer')

  const activeOrders = accountOrders.filter(
    (order) => order.status !== 'cancelled',
  )
  const totalSpent = activeOrders.reduce((sum, order) => sum + order.total, 0)
  const avgOrder =
    activeOrders.length > 0 ? totalSpent / activeOrders.length : null
  const itemsBought = accountOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((inner, item) => inner + item.quantity, 0),
    0,
  )
  const lastOrderAt = accountOrders[0]?.createdAt ?? ''

  return (
    <>
      {backLink}

      <AdminPageHeader
        actions={
          <span
            className={`admin-badge admin-badge--${
              user.role === 'admin' ? 'info' : 'neutral'
            }`}
          >
            {user.role === 'admin'
              ? t('admin.roleAdmin')
              : t('admin.roleCustomer')}
          </span>
        }
        description={t('admin.userDetailDescription')}
        eyebrow={t('admin.userDetailEyebrow')}
        title={name}
      />

      <section className="admin-card">
        <div className="admin-card__body">
          <div className="admin-mini-stat-row">
            <div className="admin-mini-stat">
              <span>{t('admin.userStatOrders')}</span>
              <strong>{number(accountOrders.length)}</strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.userStatSpent')}</span>
              <strong>{currency(totalSpent)}</strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.userStatAvgOrder')}</span>
              <strong>
                {avgOrder !== null ? currency(avgOrder) : t('common.notSet')}
              </strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.userStatItems')}</span>
              <strong>{number(itemsBought)}</strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.userStatLastOrder')}</span>
              <strong>
                {lastOrderAt ? date(lastOrderAt, 'short') : t('common.notSet')}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-grid admin-grid--split">
        <div className="admin-grid">
          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.userFavoritesTitle')}</h2>
                <p>{t('admin.userFavoritesText')}</p>
              </div>
              {favourites.length > 0 && (
                <span className="admin-badge admin-badge--neutral">
                  {number(favourites.length)}
                </span>
              )}
            </div>
            {favourites.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.thProduct')}</th>
                      <th>{t('admin.userThQtyBought')}</th>
                      <th>{t('admin.userThSpent')}</th>
                      <th aria-label={t('admin.thActions')} />
                    </tr>
                  </thead>
                  <tbody>
                    {favourites.map((item) => (
                      <tr key={item.productId}>
                        <td
                          className="admin-table__cell--primary"
                          data-label={t('admin.thProduct')}
                        >
                          <div className="admin-table__primary">
                            {item.image && (
                              <img
                                alt=""
                                className="admin-table__thumb"
                                src={item.image}
                              />
                            )}
                            <span>
                              <strong>
                                {localized(item.name, item.name_ar)}
                              </strong>
                              <span>
                                {localized(item.brand, item.brand_ar) ||
                                  item.productId}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td data-label={t('admin.userThQtyBought')}>
                          {number(item.quantity)}
                        </td>
                        <td data-label={t('admin.userThSpent')}>
                          {currency(item.spend)}
                        </td>
                        <td data-label={t('admin.thActions')}>
                          <div className="admin-table__actions">
                            <Link
                              aria-label={t('admin.viewInStore')}
                              className="admin-icon-btn"
                              title={t('admin.viewInStore')}
                              to={`/products/${item.productId}`}
                            >
                              <ArrowForward className="rtl-flip" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty">
                <StarOutlineOutlined />
                <p>{t('admin.userNoFavorites')}</p>
              </div>
            )}
          </section>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.userOrdersTitle')}</h2>
                <p>{t('admin.userOrdersText')}</p>
              </div>
              {accountOrders.length > 0 && (
                <span className="admin-badge admin-badge--neutral">
                  {number(accountOrders.length)}
                </span>
              )}
            </div>
            {accountOrders.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.thReference')}</th>
                      <th>{t('admin.thDate')}</th>
                      <th>{t('admin.thItems')}</th>
                      <th>{t('admin.thStatus')}</th>
                      <th>{t('admin.thTotal')}</th>
                      <th aria-label={t('admin.thActions')} />
                    </tr>
                  </thead>
                  <tbody>
                    {accountOrders.map((order) => {
                      const count = order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      )
                      return (
                        <tr key={order.id}>
                          <td
                            className="admin-table__cell--primary"
                            data-label={t('admin.thReference')}
                          >
                            <div className="admin-table__primary">
                              <strong>#{orderNumber(order.id)}</strong>
                            </div>
                          </td>
                          <td data-label={t('admin.thDate')}>
                            {date(order.createdAt, 'short')}
                          </td>
                          <td data-label={t('admin.thItems')}>
                            {t('admin.itemCount', { count: number(count) })}
                          </td>
                          <td data-label={t('admin.thStatus')}>
                            <span
                              className={`admin-badge admin-badge--${orderStatusVariant(
                                order.status,
                              )}`}
                            >
                              {t(`orderStatus.${order.status}`)}
                            </span>
                          </td>
                          <td data-label={t('admin.thTotal')}>
                            <strong>{currency(order.total)}</strong>
                          </td>
                          <td data-label={t('admin.thActions')}>
                            <div className="admin-table__actions">
                              <Link
                                aria-label={t('admin.viewAria', {
                                  name: orderNumber(order.id),
                                })}
                                className="admin-icon-btn"
                                title={t('admin.viewAria', {
                                  name: orderNumber(order.id),
                                })}
                                to={`/admin/orders/${order.id}`}
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
                <ReceiptLongOutlined />
                <p>{t('admin.userNoOrdersDetail')}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="admin-grid">
          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.userInfoTitle')}</h2>
                <p>{t('admin.userInfoText')}</p>
              </div>
            </div>
            <div className="admin-card__body">
              <div className="admin-row-list">
                <div className="admin-row" style={{ padding: 0 }}>
                  <PersonOffOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>{name}</strong>
                    <span>{t('admin.miniName')}</span>
                  </div>
                </div>

                <div className="admin-row" style={{ padding: 0 }}>
                  <MailOutlineOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>{user.email || t('admin.noEmail')}</strong>
                    <span>{t('admin.miniEmail')}</span>
                  </div>
                </div>

                <div className="admin-row" style={{ padding: 0 }}>
                  <CallOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>{user.phone || t('admin.noPhone')}</strong>
                    <span>{t('admin.thPhone')}</span>
                  </div>
                </div>

                <div className="admin-row" style={{ padding: 0 }}>
                  <CakeOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>{user.birthday || t('common.notSet')}</strong>
                    <span>{t('admin.userFieldBirthday')}</span>
                  </div>
                </div>

                <div className="admin-row" style={{ padding: 0 }}>
                  <BadgeOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>
                      {user.role === 'admin'
                        ? t('admin.roleAdmin')
                        : t('admin.roleCustomer')}
                    </strong>
                    <span>{t('admin.thRole')}</span>
                  </div>
                </div>

                <div className="admin-row" style={{ padding: 0 }}>
                  <CalendarMonthOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>
                      {user.createdAt
                        ? date(user.createdAt, 'short')
                        : t('common.notSet')}
                    </strong>
                    <span>{t('admin.thJoined')}</span>
                  </div>
                </div>

                <div className="admin-row" style={{ padding: 0 }}>
                  <ShoppingBagOutlined
                    style={{ color: 'var(--color-gold-dark)' }}
                  />
                  <div className="admin-row__main">
                    <strong>{user.id}</strong>
                    <span>{t('admin.userFieldUserId')}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.userAddressTitle')}</h2>
                <p>{t('admin.userAddressText')}</p>
              </div>
            </div>
            <div className="admin-card__body">
              {addresses.length > 0 ? (
                <div className="admin-row-list">
                  {addresses.map((address, index) => (
                    <div
                      className="admin-row"
                      key={address.key}
                      style={{ padding: 0 }}
                    >
                      <LocationOnOutlined
                        style={{ color: 'var(--color-gold-dark)' }}
                      />
                      <div className="admin-row__main">
                        <strong>{address.lines[0]}</strong>
                        {address.lines.slice(1).map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </div>
                      {index === 0 && (
                        <div className="admin-row__aside">
                          <span className="admin-badge admin-badge--success">
                            {t('admin.userAddressLatest')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-empty">
                  <StorefrontOutlined />
                  <p>{t('admin.userNoAddress')}</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}

export default UserDetailAdminPage

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  AccountCircleOutlined,
  AdminPanelSettingsOutlined,
  CampaignOutlined,
  Close,
  FavoriteBorder,
  LocalShippingOutlined,
  Menu,
  NotificationsNoneOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  SupportAgentOutlined,
} from '@mui/icons-material'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useCartStore } from '../../features/products/store/useCartStore'
import { useAccountStore } from '../../features/account/store/useAccountStore'
import { useProductStore } from '../../features/products/store/useProductStore'
import {
  useNotificationStore,
  type AppNotification,
  type NotificationKind,
} from '../../features/notifications/store/useNotificationStore'
import { useSupportStore } from '../../features/support/store/useSupportStore'
import { useAuthStore } from '../../features/account/store/useAuthStore'
import { coverImage } from '../../features/products/data/products'
import { useTranslation } from '../../hooks/useTranslation'
import SupportChatWidget from '../../features/support/components/SupportChatWidget'
import AnnouncementBar from '../../features/marketing/components/AnnouncementBar'
import MarketingPopup from '../../features/marketing/components/MarketingPopup'
import NewsletterSignup from '../../features/marketing/components/NewsletterSignup'
import { useMarketingStore } from '../../features/marketing/store/useMarketingStore'
import { readReferralCode, readUtmTouch } from '../../features/marketing/tracking'
import DrawerCart from './DrawerCart'
import DrawerSaved from './DrawerSaved'
import './StoreLayout.css'

/** Resolved once at module load so the footer renders a stable value. */
const CURRENT_YEAR = new Date().getFullYear()

type StoreLayoutProps = {
  children: ReactNode
}

type CategoryOption = {
  name: string
  label: string
}

const navigationKeys = [
  { labelKey: 'nav.home', to: '/' },
  { labelKey: 'nav.shop', to: '/products' },
  { labelKey: 'nav.offers', to: '/discounts' },
  { labelKey: 'nav.rewards', to: '/rewards' },
  { labelKey: 'nav.collections', to: '/collections' },
  { labelKey: 'nav.story', to: '/about' },
  { labelKey: 'nav.care', to: '/support' },
]

function StoreLayout({ children }: StoreLayoutProps) {
  const {
    t,
    localized,
    currency,
    language,
    toggleLanguage,
  } =
    useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [activeDrawer, setActiveDrawer] = useState<'cart' | 'saved' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const products = useProductStore((state) => state.products)
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  )
  const orders = useAccountStore((state) => state.orders)
  const setActiveReferralCode = useAccountStore(
    (state) => state.setActiveReferralCode,
  )
  const captureUtm = useMarketingStore((state) => state.captureUtm)
  const customerId = useSupportStore((state) => state.customerId)
  const authUser = useAuthStore((state) => state.user)
  const authStatus = useAuthStore((state) => state.status)
  const notifications = useNotificationStore((state) => state.notifications)
  const readNotificationIds = useNotificationStore((state) => state.readIds)
  const markNotificationRead = useNotificationStore((state) => state.markRead)
  const markNotificationsRead = useNotificationStore(
    (state) => state.markManyRead,
  )
  const navigate = useNavigate()
  const location = useLocation()
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase()
  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const map = new Map<string, string>()
    products.forEach((product) => {
      if (!map.has(product.category)) {
        map.set(product.category, product.category_ar ?? product.category)
      }
    })
    return [...map.entries()].map(([name, nameAr]) => ({
      name,
      label: localized(name, nameAr),
    }))
  }, [localized, products])
  const matchingCategories = useMemo(
    () =>
      categoryOptions.filter((category) =>
        `${category.name} ${category.label}`
          .toLocaleLowerCase()
          .includes(normalizedSearch),
      ),
    [categoryOptions, normalizedSearch],
  )
  const matchingProducts = useMemo(
    () =>
      normalizedSearch
        ? products
            .filter((product) =>
              [
                product.name,
                product.name_ar,
                product.description,
                product.description_ar,
                product.category,
                product.category_ar,
                product.brand,
                product.brand_ar,
                ...product.colors.flatMap((color) => [color.name, color.name_ar]),
              ]
                .join(' ')
                .toLocaleLowerCase()
                .includes(normalizedSearch),
            )
            .slice(0, 4)
        : [],
    [normalizedSearch, products],
  )
  const myNotifications = useMemo(() => {
    const orderIds = new Set(orders.map((order) => order.id))
    return notifications
      .filter((notification) => notification.audience === 'customer')
      .filter(
        (notification) =>
          notification.recipientId === customerId ||
          notification.recipientId === 'all',
      )
      .filter(
        (notification) =>
          !(notification.kind === 'order' && notification.meta.orderId) ||
          orderIds.has(notification.meta.orderId as string),
      )
      .toSorted((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      )
  }, [notifications, customerId, orders])
  const unreadNotificationCount = myNotifications.filter(
    (notification) => !readNotificationIds.includes(notification.id),
  ).length

  useEffect(() => {
    const referralCode = readReferralCode(location.search)
    if (referralCode) setActiveReferralCode(referralCode)

    // First-touch campaign attribution; the store keeps the earliest touch.
    const touch = readUtmTouch(location.search, location.pathname)
    if (touch) captureUtm(touch)
  }, [captureUtm, location.pathname, location.search, setActiveReferralCode])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const search = searchQuery.trim()

    if (search) {
      navigate(`/products?search=${encodeURIComponent(search)}`)
    } else {
      navigate('/products')
    }
    setSearchOpen(false)
  }

  function openSearchResults(search: string) {
    navigate(`/products?search=${encodeURIComponent(search)}`)
    setSearchQuery(search)
    setSearchOpen(false)
  }

  function openNotification(notification: AppNotification) {
    markNotificationRead(notification.id)
    setNotificationsOpen(false)
  }

  return (
    <div className="store-layout">
      <AnnouncementBar />

      <header className="store-header">
        <div className="store-header__inner">
          <button
            aria-controls="store-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t('header.closeMenu') : t('header.openMenu')}
            className="store-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <Close /> : <Menu />}
          </button>

          <NavLink
            aria-label={t('header.brandHomeAria')}
            className="store-brand"
            onClick={() => setMenuOpen(false)}
            to="/"
          >
            {t('meta.brand')}
          </NavLink>

          <form
            aria-label={t('header.searchAria')}
            className="store-search"
            onBlur={(event) => {
              const nextFocusedElement = event.relatedTarget
              if (
                !(nextFocusedElement instanceof Node) ||
                !event.currentTarget.contains(nextFocusedElement)
              ) {
                setSearchOpen(false)
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setSearchOpen(false)
                if (event.target instanceof HTMLElement) event.target.blur()
                return
              }

              if (
                (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
                searchOpen
              ) {
                const options =
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    '.store-search__category, .store-search__suggestion, .store-search__all-results',
                  )

                if (options.length === 0) return
                event.preventDefault()
                const currentIndex = Array.from(options).indexOf(
                  event.target as HTMLElement,
                )
                const nextIndex =
                  currentIndex === -1
                    ? event.key === 'ArrowDown'
                      ? 0
                      : options.length - 1
                    : (currentIndex +
                        (event.key === 'ArrowDown' ? 1 : options.length - 1)) %
                      options.length
                options[nextIndex]?.focus()
              }
            }}
            onSubmit={handleSearch}
            role="search"
          >
            <SearchOutlined aria-hidden="true" />
            <input
              aria-label={t('header.searchInputAria')}
              aria-controls="store-search-suggestions"
              aria-autocomplete="list"
              aria-expanded={searchOpen}
              autoComplete="off"
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              name="search"
              placeholder={t('header.searchPlaceholder')}
              type="search"
              value={searchQuery}
            />
            <button type="submit">{t('header.searchButton')}</button>
            {searchOpen && (
              <div
                aria-label={t('header.searchSuggestionsAria')}
                className="store-search__suggestions"
                id="store-search-suggestions"
                role="region"
              >
                {normalizedSearch ? (
                  <>
                    {matchingCategories.length > 0 && (
                      <div className="store-search__section">
                        <span className="store-search__section-title">
                          {t('search.categoriesTitle')}
                        </span>
                        <div className="store-search__categories">
                          {matchingCategories.map((category) => (
                            <NavLink
                              className="store-search__category"
                              key={category.name}
                              onClick={() => openSearchResults(category.name)}
                              to={`/products?search=${encodeURIComponent(category.name)}`}
                            >
                              {category.label}
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    )}

                    {matchingProducts.length > 0 ? (
                      <div className="store-search__section">
                        <span className="store-search__section-title">
                          {t('search.productsTitle')}
                        </span>
                        <div className="store-search__product-list">
                          {matchingProducts.map((product) => {
                            const name = localized(product.name, product.name_ar)
                            return (
                              <NavLink
                                aria-label={t('search.priceAria', {
                                  name,
                                  price: currency(product.price),
                                })}
                                className="store-search__suggestion"
                                key={product.id}
                                onClick={() => setSearchOpen(false)}
                                to={`/products/${product.id}`}
                              >
                                <img alt="" src={coverImage(product)} />
                                <span>
                                  <strong>{name}</strong>
                                  <small>
                                    {localized(product.category, product.category_ar)}
                                  </small>
                                </span>
                                <b>{currency(product.price)}</b>
                              </NavLink>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="store-search__empty">{t('search.noResults')}</p>
                    )}

                    <button
                      className="store-search__all-results"
                      onClick={() => openSearchResults(searchQuery)}
                      type="button"
                    >
                      {t('search.seeAll', { query: searchQuery.trim() })}
                    </button>
                  </>
                ) : (
                  <div className="store-search__section">
                    <span className="store-search__section-title">
                      {t('search.exploreTitle')}
                    </span>
                    <div className="store-search__categories">
                      {categoryOptions.map((category) => (
                        <NavLink
                          className="store-search__category"
                          key={category.name}
                          onClick={() => openSearchResults(category.name)}
                          to={`/products?search=${encodeURIComponent(category.name)}`}
                        >
                          {category.label}
                        </NavLink>
                      ))}
                    </div>
                    <span className="store-search__hint">{t('search.hint')}</span>
                  </div>
                )}
              </div>
            )}
          </form>

          <div
            aria-label={t('header.accountActionsAria')}
            className="store-actions"
          >
            <button
              aria-label={t('header.savedItemsTitle')}
              className="store-action"
              onClick={() => setActiveDrawer('saved')}
              title={t('header.savedItemsTitle')}
              type="button"
            >
              <FavoriteBorder />
            </button>
            <button
              aria-label={t('header.cartTitle')}
              className="store-action store-action--badge"
              onClick={() => setActiveDrawer('cart')}
              title={t('header.cartTitle')}
              type="button"
            >
              <ShoppingCartOutlined />
              <span
                aria-label={t('header.cartItemsCount', { count: cartCount })}
                className="store-action__badge"
              >
                {cartCount}
              </span>
            </button>
            <div
              className="store-notifications"
              onBlur={(event) => {
                const nextFocusedElement = event.relatedTarget
                if (
                  !(nextFocusedElement instanceof Node) ||
                  !event.currentTarget.contains(nextFocusedElement)
                ) {
                  setNotificationsOpen(false)
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setNotificationsOpen(false)
                  if (event.target instanceof HTMLElement) event.target.blur()
                }
              }}
            >
              <button
                aria-controls="store-notification-menu"
                aria-expanded={notificationsOpen}
                aria-label={
                  unreadNotificationCount > 0
                    ? t('notifications.withUnread', {
                        count: unreadNotificationCount,
                      })
                    : t('notifications.title')
                }
                className={`store-action${unreadNotificationCount > 0 ? ' store-action--notification' : ''}`}
                onClick={() => setNotificationsOpen((open) => !open)}
                title={t('notifications.title')}
                type="button"
              >
                <NotificationsNoneOutlined />
                {unreadNotificationCount > 0 && (
                  <span className="store-action__badge">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <section
                  aria-label={t('notifications.title')}
                  className="store-notification-menu"
                  id="store-notification-menu"
                >
                  <header className="store-notification-menu__header">
                    <div>
                      <h2>{t('notifications.title')}</h2>
                      <span>
                        {unreadNotificationCount > 0
                          ? t('notifications.newCount', {
                              count: unreadNotificationCount,
                            })
                          : t('notifications.latest')}
                      </span>
                    </div>
                    {unreadNotificationCount > 0 && (
                      <button
                        className="store-notification-menu__mark-read"
                        onClick={() =>
                          markNotificationsRead(
                            myNotifications.map(
                              (notification) => notification.id,
                            ),
                          )
                        }
                        type="button"
                      >
                        {t('notifications.markAllRead')}
                      </button>
                    )}
                  </header>

                  {myNotifications.length > 0 ? (
                    <div className="store-notification-menu__list">
                      {myNotifications.slice(0, 6).map((notification) => (
                        <NotificationItem
                          isUnread={
                            !readNotificationIds.includes(notification.id)
                          }
                          key={notification.id}
                          notification={notification}
                          onOpen={() => openNotification(notification)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="store-notification-menu__empty">
                      <NotificationsNoneOutlined />
                      <strong>{t('notifications.emptyTitle')}</strong>
                      <span>{t('notifications.emptyText')}</span>
                    </div>
                  )}
                  {orders.length > 0 && (
                    <NavLink
                      className="store-notification-menu__all"
                      onClick={() => setNotificationsOpen(false)}
                      to="/account?section=orders"
                    >
                      {t('notifications.viewAllOrders')}
                    </NavLink>
                  )}
                  <p className="store-notification-menu__note">
                    {t('notifications.note')}
                  </p>
                </section>
              )}
            </div>
            {authStatus === 'authenticated' && authUser?.role === 'admin' && (
              <NavLink
                aria-label={t('header.adminPanelAria')}
                className="store-action store-action--admin"
                title={t('header.adminPanelTitle')}
                to="/admin"
              >
                <AdminPanelSettingsOutlined />
              </NavLink>
            )}
            <NavLink
              aria-label={t('header.userAccountTitle')}
              className="store-action"
              title={
                authStatus === 'authenticated' && authUser
                  ? t('auth.signedInAs', { name: authUser.fullName })
                  : t('header.userAccountTitle')
              }
              to="/account"
            >
              <AccountCircleOutlined />
            </NavLink>
            <button
              aria-label={t('language.label')}
              className="store-action store-language"
              onClick={toggleLanguage}
              title={t('language.label')}
              type="button"
            >
              <span className="store-language__label">
                {language === 'en' ? t('language.shortAr') : t('language.shortEn')}
              </span>
            </button>
          </div>

          {menuOpen && (
            <nav
              aria-label={t('header.mainNavAria')}
              className="store-navigation"
              id="store-navigation"
            >
              {navigationKeys.map(({ labelKey, to }) => (
                <NavLink
                  key={to}
                  className={({ isActive }) =>
                    `store-navigation__link${isActive ? ' is-active' : ''}`
                  }
                  end={to === '/'}
                  onClick={() => setMenuOpen(false)}
                  to={to}
                >
                  {t(labelKey)}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="store-main">{children}</main>

      <DrawerCart
        onClose={() => setActiveDrawer(null)}
        open={activeDrawer === 'cart'}
      />
      <DrawerSaved
        onClose={() => setActiveDrawer(null)}
        open={activeDrawer === 'saved'}
      />

      <SupportChatWidget />

      <footer className="store-footer">
        <NavLink className="store-footer__brand" to="/">
          {t('meta.brand')}
        </NavLink>
        <p>{t('footer.tagline')}</p>
        <NewsletterSignup source="footer" />
        {/* <NavLink className="store-footer__admin" to="/admin">
          {t('footer.admin')}
        </NavLink> */}
        <small>{t('footer.copyright', { year: CURRENT_YEAR })}</small>
      </footer>

      <MarketingPopup />
    </div>
  )
}

function notificationIcon(kind: NotificationKind) {
  if (kind === 'support') return <SupportAgentOutlined />
  if (kind === 'order') return <LocalShippingOutlined />
  if (kind === 'announcement') return <CampaignOutlined />
  return <NotificationsNoneOutlined />
}

function NotificationItem({
  notification,
  isUnread,
  onOpen,
}: {
  notification: AppNotification
  isUnread: boolean
  onOpen: () => void
}) {
  const { t, date, localized } = useTranslation()
  const title = localized(notification.title, notification.titleAr)
  const body = localized(notification.body, notification.bodyAr)
  const className = `store-notification${isUnread ? ' is-unread' : ''}`
  const content = (
    <>
      <span aria-hidden="true" className="store-notification__icon">
        {notificationIcon(notification.kind)}
      </span>
      <span className="store-notification__content">
        <strong>{title}</strong>
        {body && <span>{body}</span>}
        <time dateTime={notification.createdAt}>
          {date(notification.createdAt)}
        </time>
      </span>
      {isUnread && (
        <span
          aria-label={t('notifications.unreadLabel')}
          className="store-notification__dot"
        />
      )}
    </>
  )

  if (notification.link) {
    return (
      <NavLink className={className} onClick={onOpen} to={notification.link}>
        {content}
      </NavLink>
    )
  }

  return (
    <button className={className} onClick={onOpen} type="button">
      {content}
    </button>
  )
}

export default StoreLayout

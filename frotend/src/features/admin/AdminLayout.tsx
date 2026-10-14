import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AccountCircleOutlined,
  AddBusinessOutlined,
  BadgeOutlined,
  CampaignOutlined,
  DashboardOutlined,
  DeliveryDiningOutlined,
  GroupOutlined,
  InsightsOutlined,
  Inventory2Outlined,
  LocalOfferOutlined,
  LocalShippingOutlined,
  Logout,
  MapOutlined,
  MarkEmailReadOutlined,
  Menu,
  Close,
  NotificationsNoneOutlined,
  PaletteOutlined,
  PeopleAltOutlined,
  RateReviewOutlined,
  ReceiptLongOutlined,
  RedeemOutlined,
  SellOutlined,
  SendOutlined,
  ShareOutlined,
  StorefrontOutlined,
  StraightenOutlined,
  SupportAgentOutlined,
  SettingsOutlined,
  TranslateOutlined,
  TrendingUpOutlined,
  WarehouseOutlined,
} from '@mui/icons-material'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import { useAuthStore } from '../account/store/useAuthStore'
import { useSupportStore } from '../support/store/useSupportStore'
import {
  useNotificationStore,
  type AppNotification,
  type NotificationKind,
} from '../notifications/store/useNotificationStore'
import './Admin.css'

type AdminNavItem = {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
  badge?: number
  /** Starts a new labelled block in the sidebar. */
  group?: string
}

function AdminLayout() {
  const { t, language, toggleLanguage, number } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const authUser = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const unreadSupport = useSupportStore((state) =>
    state.conversations.reduce(
      (total, conversation) => total + conversation.unreadForAdmin,
      0,
    ),
  )
  const notifications = useNotificationStore((state) => state.notifications)
  const readNotificationIds = useNotificationStore((state) => state.readIds)
  const markNotificationRead = useNotificationStore((state) => state.markRead)
  const markNotificationsRead = useNotificationStore(
    (state) => state.markManyRead,
  )
  const adminNotifications = useMemo(
    () =>
      notifications
        .filter((notification) => notification.audience === 'admin')
        .toSorted((first, second) =>
          second.createdAt.localeCompare(first.createdAt),
        ),
    [notifications],
  )
  const unreadNotifications = adminNotifications.filter(
    (notification) => !readNotificationIds.includes(notification.id),
  ).length

  const navigation: AdminNavItem[] = [
    { to: '/admin', label: t('admin.navDashboard'), icon: <DashboardOutlined />, end: true },
    { to: '/admin/products', label: t('admin.navProducts'), icon: <Inventory2Outlined /> },
    { to: '/admin/brands', label: t('admin.navBrands'), icon: <SellOutlined /> },
    { to: '/admin/colors', label: t('admin.navColors'), icon: <PaletteOutlined /> },
    { to: '/admin/sizes', label: t('admin.navSizes'), icon: <StraightenOutlined /> },
    { to: '/admin/ages', label: t('admin.navAges'), icon: <GroupOutlined /> },
    { to: '/admin/orders', label: t('admin.navOrders'), icon: <ReceiptLongOutlined /> },
    { to: '/admin/customers', label: t('admin.navCustomers'), icon: <PeopleAltOutlined /> },
    {
      to: '/admin/ops/suppliers',
      label: t('admin.navSuppliers'),
      icon: <AddBusinessOutlined />,
      group: t('admin.navGroupOps'),
    },
    {
      to: '/admin/ops/purchase-orders',
      label: t('admin.navPurchaseOrders'),
      icon: <ReceiptLongOutlined />,
    },
    {
      to: '/admin/ops/inventory',
      label: t('admin.navInventory'),
      icon: <WarehouseOutlined />,
    },
    {
      to: '/admin/ops/carriers',
      label: t('admin.navCarriers'),
      icon: <LocalShippingOutlined />,
    },
    {
      to: '/admin/ops/zones',
      label: t('admin.navZones'),
      icon: <MapOutlined />,
    },
    {
      to: '/admin/ops/agents',
      label: t('admin.navAgents'),
      icon: <BadgeOutlined />,
    },
    {
      to: '/admin/ops/deliveries',
      label: t('admin.navDeliveries'),
      icon: <DeliveryDiningOutlined />,
    },
    {
      to: '/admin/marketing',
      label: t('admin.navMarketing'),
      icon: <TrendingUpOutlined />,
      group: t('admin.navGroupMarketing'),
    },
    { to: '/admin/marketing/coupons', label: t('admin.navCoupons'), icon: <LocalOfferOutlined /> },
    { to: '/admin/marketing/campaigns', label: t('admin.navCampaigns'), icon: <SendOutlined /> },
    { to: '/admin/marketing/banners', label: t('admin.navBanners'), icon: <CampaignOutlined /> },
    { to: '/admin/marketing/segments', label: t('admin.navSegments'), icon: <GroupOutlined /> },
    {
      to: '/admin/marketing/subscribers',
      label: t('admin.navSubscribers'),
      icon: <MarkEmailReadOutlined />,
    },
    { to: '/admin/marketing/referrals', label: t('admin.navReferrals'), icon: <ShareOutlined /> },
    { to: '/admin/marketing/analytics', label: t('admin.navAnalytics'), icon: <InsightsOutlined /> },
    { to: '/admin/marketing/loyalty', label: t('admin.navLoyalty'), icon: <RedeemOutlined /> },
    { to: '/admin/reviews', label: t('admin.navReviews'), icon: <RateReviewOutlined /> },
    {
      to: '/admin/support',
      label: t('admin.navSupport'),
      icon: <SupportAgentOutlined />,
      badge: unreadSupport,
    },
    {
      to: '/admin/notifications',
      label: t('admin.navNotifications'),
      icon: <NotificationsNoneOutlined />,
      badge: unreadNotifications,
    },
    {
      to: '/admin/settings',
      label: t('admin.navSettings'),
      icon: <SettingsOutlined />,
      group: t('admin.navGroupSettings'),
    },
    {
      to: '/admin/accounting',
      label: t('admin.navAccounting'),
      icon: <AccountCircleOutlined />,
      group: t('admin.navGroupAccounting'),
    },
  ]

  const activeItem = navigation.find((item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to),
  )

  useEffect(() => {
    if (!menuOpen) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="admin">
      <Seo
        description={t('admin.topbarSubtitle')}
        fullTitle
        noindex
        path="/admin"
        title={`${t('meta.brand')} — ${t('admin.title')}`}
      />
      <aside
        className={`admin__sidebar${menuOpen ? ' is-open' : ''}`}
        id="admin-navigation"
      >
        <Link className="admin__brand" onClick={() => setMenuOpen(false)} to="/admin">
          <span className="admin__brand-mark">L</span>
          <span className="admin__brand-text">
            <strong>{t('meta.brand')}</strong>
            <span>{t('admin.brandSubtitle')}</span>
          </span>
        </Link>

        <nav aria-label={t('admin.navAria')} className="admin__nav">
          {navigation.map((item) => (
            <Fragment key={item.to}>
              {item.group && (
                <span className="admin__nav-group">{item.group}</span>
              )}
              <NavLink
                className={({ isActive }) =>
                  `admin__nav-link${isActive ? ' is-active' : ''}`
                }
                end={item.end}
                onClick={() => setMenuOpen(false)}
                to={item.to}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="admin__nav-badge">{number(item.badge)}</span>
                ) : null}
              </NavLink>
            </Fragment>
          ))}
        </nav>

        <div className="admin__sidebar-footer">
          <Link className="admin__store-link" to="/">
            <StorefrontOutlined />
            {t('admin.viewStorefront')}
          </Link>
          <p className="admin__sidebar-note">{t('admin.sidebarNote')}</p>
        </div>
      </aside>

      {menuOpen && (
        <button
          aria-label={t('admin.closeNavigation')}
          className="admin__backdrop"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      <div className="admin__body">
        <header className="admin__topbar">
          <button
            aria-controls="admin-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t('admin.closeMenu') : t('admin.openMenu')}
            className="admin__menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <Close /> : <Menu />}
          </button>

          <div className="admin__topbar-title">
            <strong>{activeItem?.label ?? t('admin.title')}</strong>
            <span>{t('admin.topbarSubtitle')}</span>
          </div>

          <div className="admin__topbar-actions">
            <div
              className="admin-notifications"
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
                aria-controls="admin-notification-menu"
                aria-expanded={notificationsOpen}
                aria-label={
                  unreadNotifications > 0
                    ? t('adminNotifications.bellAria', {
                        count: number(unreadNotifications),
                      })
                    : t('adminNotifications.bellTitle')
                }
                className={`admin-btn admin-btn--sm admin-btn--icon${unreadNotifications > 0 ? ' has-unread' : ''}`}
                onClick={() => setNotificationsOpen((open) => !open)}
                title={t('adminNotifications.bellTitle')}
                type="button"
              >
                <NotificationsNoneOutlined />
                {unreadNotifications > 0 && (
                  <span className="admin-notifications__badge">
                    {number(unreadNotifications)}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <section
                  aria-label={t('adminNotifications.bellTitle')}
                  className="admin-notifications__menu"
                  id="admin-notification-menu"
                >
                  <header className="admin-notifications__header">
                    <div>
                      <strong>{t('adminNotifications.bellTitle')}</strong>
                      <span>
                        {unreadNotifications > 0
                          ? t('adminNotifications.unreadCount', {
                              count: number(unreadNotifications),
                            })
                          : t('adminNotifications.noUnread')}
                      </span>
                    </div>
                    {unreadNotifications > 0 && (
                      <button
                        className="admin-notifications__mark-read"
                        onClick={() =>
                          markNotificationsRead(
                            adminNotifications.map(
                              (notification) => notification.id,
                            ),
                          )
                        }
                        type="button"
                      >
                        {t('adminNotifications.markAllRead')}
                      </button>
                    )}
                  </header>

                  {adminNotifications.length > 0 ? (
                    <div className="admin-notifications__list">
                      {adminNotifications.slice(0, 6).map((notification) => (
                        <AdminNotificationItem
                          isUnread={
                            !readNotificationIds.includes(notification.id)
                          }
                          key={notification.id}
                          notification={notification}
                          onOpen={() => {
                            markNotificationRead(notification.id)
                            setNotificationsOpen(false)
                            setMenuOpen(false)
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="admin-notifications__empty">
                      <NotificationsNoneOutlined />
                      <strong>{t('adminNotifications.emptyTitle')}</strong>
                      <span>{t('adminNotifications.emptyText')}</span>
                    </div>
                  )}

                  <Link
                    className="admin-notifications__all"
                    onClick={() => setNotificationsOpen(false)}
                    to="/admin/notifications"
                  >
                    {t('common.viewAll')}
                  </Link>
                </section>
              )}
            </div>

            <button
              aria-label={t('admin.languageToggle')}
              className="admin-btn admin-btn--sm"
              onClick={toggleLanguage}
              type="button"
            >
              <TranslateOutlined />
              {language === 'ar' ? t('language.shortAr') : t('language.shortEn')}
            </button>
            <Link className="admin-btn admin-btn--sm admin-btn--dark" to="/">
              <StorefrontOutlined />
              {t('admin.storefront')}
            </Link>
            <span className="admin__user" title={authUser?.email}>
              <AccountCircleOutlined />
              {authUser?.fullName || t('admin.title')}
            </span>
            <button
              aria-label={t('admin.signOut')}
              className="admin-btn admin-btn--sm admin-btn--dark"
              onClick={() => void handleSignOut()}
              title={t('admin.signOut')}
              type="button"
            >
              <Logout />
              {t('admin.signOut')}
            </button>
          </div>
        </header>

        <main className="admin__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function adminNotificationIcon(kind: NotificationKind) {
  if (kind === 'support') return <SupportAgentOutlined />
  if (kind === 'order') return <LocalShippingOutlined />
  if (kind === 'announcement') return <CampaignOutlined />
  return <NotificationsNoneOutlined />
}

function AdminNotificationItem({
  notification,
  isUnread,
  onOpen,
}: {
  notification: AppNotification
  isUnread: boolean
  onOpen: () => void
}) {
  const { t, localized, dateTime } = useTranslation()
  const title = localized(notification.title, notification.titleAr)
  const body = localized(notification.body, notification.bodyAr)
  const className = `admin-notification${isUnread ? ' is-unread' : ''}`
  const content = (
    <>
      <span aria-hidden="true" className="admin-notification__icon">
        {adminNotificationIcon(notification.kind)}
      </span>
      <span className="admin-notification__content">
        <strong>{title}</strong>
        {body && <span>{body}</span>}
        <time dateTime={notification.createdAt}>
          {dateTime(notification.createdAt)}
        </time>
      </span>
      {isUnread && (
        <span
          aria-label={t('adminNotifications.unreadLabel')}
          className="admin-notification__dot"
        />
      )}
    </>
  )

  if (notification.link) {
    return (
      <Link className={className} onClick={onOpen} to={notification.link}>
        {content}
      </Link>
    )
  }

  return (
    <button className={className} onClick={onOpen} type="button">
      {content}
    </button>
  )
}

export default AdminLayout

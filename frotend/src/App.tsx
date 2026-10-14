import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import StoreLayout from './components/layout/StoreLayout'
import AccountPage from './features/account/AccountPage'
import OrderTrackingPage from './features/account/OrderTrackingPage'
import AboutPage from './features/about/AboutPage'
import AuthPage from './features/account/AuthPage'
import RewardsPage from './features/account/RewardsPage'
import DiscountsPage from './features/products/DiscountsPage'
import HomePage from './features/home/HomePage'
import NotFoundPage from './features/notfound/NotFoundPage'
import ProductDetailsPage from './features/products/ProductDetailsPage'
import ProductsPage from './features/products/ProductsPage'
import SupportPage from './features/support/SupportPage'
import { useLocaleStore } from './store/useLocaleStore'
import { useTranslation } from './hooks/useTranslation'
import { isSupabaseConfigured } from './lib/supabase'
import { useProductStore } from './features/products/store/useProductStore'
import { useCategoryStore } from './features/products/store/useCategoryStore'
import { useCouponStore } from './features/marketing/store/useCouponStore'
import { useMarketingStore } from './features/marketing/store/useMarketingStore'
import { useOpsSettingsStore } from './features/ops/store/useOpsSettingsStore'
import { useSupplierStore } from './features/ops/store/useSupplierStore'
import { useDeliveryStore } from './features/ops/store/useDeliveryStore'
import { useAccountStore } from './features/account/store/useAccountStore'
import { useAttributeStore } from './features/products/store/useAttributeStore'
import { useReviewStore } from './features/products/store/useReviewStore'
import { useSupportStore } from './features/support/store/useSupportStore'
import { useNotificationStore } from './features/notifications/store/useNotificationStore'
import { useAuthStore } from './features/account/store/useAuthStore'
import { RequireAdmin, RequireAuth } from './components/auth/Guards'
import { useCurrencyStore } from './store/useCurrencyStore'

const CheckoutPage = lazy(() => import('./features/checkout/CheckoutPage'))

const AdminLayout = lazy(() => import('./features/admin/AdminLayout'))
const AdminDashboardPage = lazy(
  () => import('./features/admin/pages/DashboardPage'),
)
const AdminProductsPage = lazy(
  () => import('./features/admin/pages/ProductsAdminPage'),
)
const AdminCategoriesPage = lazy(
  () => import('./features/admin/pages/CategoriesAdminPage'),
)
const AdminAttributesPage = lazy(
  () => import('./features/admin/pages/AttributesAdminPage'),
)
const AdminOrdersPage = lazy(
  () => import('./features/admin/pages/OrdersAdminPage'),
)
const AdminOrderDetailPage = lazy(
  () => import('./features/admin/pages/OrderDetailAdminPage'),
)
const AdminCustomersPage = lazy(
  () => import('./features/admin/pages/CustomersAdminPage'),
)
const AdminMarketingPage = lazy(
  () => import('./features/marketing/pages/MarketingDashboardPage'),
)
const AdminCouponsPage = lazy(
  () => import('./features/marketing/pages/CouponsAdminPage'),
)
const AdminBannersPage = lazy(
  () => import('./features/marketing/pages/BannersAdminPage'),
)
const AdminCampaignsPage = lazy(
  () => import('./features/marketing/pages/CampaignsAdminPage'),
)
const AdminSegmentsPage = lazy(
  () => import('./features/marketing/pages/SegmentsAdminPage'),
)
const AdminSubscribersPage = lazy(
  () => import('./features/marketing/pages/SubscribersAdminPage'),
)
const AdminReferralsPage = lazy(
  () => import('./features/marketing/pages/ReferralsAdminPage'),
)
const AdminAnalyticsPage = lazy(
  () => import('./features/marketing/pages/MarketingAnalyticsPage'),
)
const AdminLoyaltyPage = lazy(
  () => import('./features/marketing/pages/LoyaltyAdminPage'),
)
const AdminReviewsPage = lazy(
  () => import('./features/admin/pages/ReviewsAdminPage'),
)
const AdminSupportPage = lazy(
  () => import('./features/admin/pages/SupportAdminPage'),
)
const AdminSupportConversationPage = lazy(
  () => import('./features/admin/pages/SupportConversationAdminPage'),
)
const AdminNotificationsPage = lazy(
  () => import('./features/admin/pages/NotificationsAdminPage'),
)
const AdminAccountingPage = lazy(
  () => import('./features/accounts/pages/AccountingAdminPage'),
)
const AdminSettingsPage = lazy(
  () => import('./features/admin/pages/SettingsAdminPage'),
)
const AdminSuppliersPage = lazy(
  () => import('./features/ops/pages/SuppliersAdminPage'),
)
const AdminPurchaseOrdersPage = lazy(
  () => import('./features/ops/pages/PurchaseOrdersAdminPage'),
)
const AdminInventoryPage = lazy(
  () => import('./features/ops/pages/InventoryAdminPage'),
)
const AdminCarriersPage = lazy(
  () => import('./features/ops/pages/CarriersAdminPage'),
)
const AdminZonesPage = lazy(
  () => import('./features/ops/pages/ShippingZonesAdminPage'),
)
const AdminAgentsPage = lazy(
  () => import('./features/ops/pages/DeliveryAgentsAdminPage'),
)
const AdminDeliveriesPage = lazy(
  () => import('./features/ops/pages/DeliveryAdminPage'),
)

function StoreShell() {
  return (
    <StoreLayout>
      <Outlet />
    </StoreLayout>
  )
}

function StoreLoader({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <Suspense
      fallback={
        <p className="checkout-loading" role="status">
          {t('checkout.loading')}
        </p>
      }
    >
      {children}
    </Suspense>
  )
}

function AdminLoader({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <Suspense
      fallback={
        <div className="admin-loading" role="status">
          {t('common.loading')}
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function App() {
  const language = useLocaleStore((state) => state.language)

  useEffect(() => {
    const legacyDataKeys = [
      'lucine-demo-users',
      'lucine-demo-session',
      'lucine-store-products',
      'lucine-store-categories',
      'lucine-store-reviews',
      'lucine-store-attributes',
      'lucine-customer-account',
      'lucine-accounts',
      'lucine-support',
      'lucine-notifications',
      'lucine-ops-settings',
      'lucine-ops-suppliers',
      'lucine-ops-delivery',
    ]

    try {
      legacyDataKeys.forEach((key) => localStorage.removeItem(key))
    } catch (error) {
      console.error('[storage] failed to remove legacy local data', error)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  useEffect(() => {
    void useCurrencyStore.getState().initialize()
  }, [])

  useEffect(() => {
    // Restore the Supabase auth session before loading account-scoped data.
    async function hydrateApp() {
      await useAuthStore.getState().hydrate()
      if (!isSupabaseConfigured) return

      void useProductStore.getState().hydrate()
      void useCategoryStore.getState().hydrate()
      void useCouponStore.getState().hydrate()
      void useMarketingStore.getState().hydrate()
      void useOpsSettingsStore.getState().hydrate()
      void useSupplierStore.getState().hydrate()
      void useDeliveryStore.getState().hydrate()
      void useAttributeStore.getState().hydrate()
      void useReviewStore.getState().hydrate()
      void useSupportStore.getState().hydrate()
      void useNotificationStore.getState().hydrate()
      const authUser = useAuthStore.getState().user
      void useAccountStore
        .getState()
        .hydrateOrders(authUser?.role === 'admin' ? undefined : authUser?.id)
    }
    void hydrateApp()
  }, [])

  useEffect(() => {
    // Stream new notifications from Supabase Realtime while the app is open.
    if (!isSupabaseConfigured) return
    const unsubscribeNotifications = useNotificationStore.getState().subscribe()
    const unsubscribeSupport = useSupportStore.getState().subscribe()
    return () => {
      unsubscribeNotifications()
      unsubscribeSupport()
    }
  }, [])

  return (
    <Routes>
      <Route element={<StoreShell />}>
        <Route element={<HomePage />} index />
        <Route element={<HomePage />} path="home" />
        <Route
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
          path="account"
        />
        <Route element={<RewardsPage />} path="rewards" />
        <Route element={<OrderTrackingPage />} path="account/orders/:orderId" />
        <Route element={<AuthPage />} path="login" />
        <Route element={<AuthPage />} path="signup" />
        <Route element={<AuthPage />} path="forgot-password" />
        <Route element={<AboutPage />} path="about" />
        <Route
          element={
            <RequireAuth>
              <StoreLoader>
                <CheckoutPage />
              </StoreLoader>
            </RequireAuth>
          }
          path="checkout"
        />
        <Route element={<DiscountsPage />} path="discounts" />
        <Route element={<SupportPage />} path="support" />
        <Route element={<ProductDetailsPage />} path="products/:productId" />
        <Route element={<ProductsPage />} path="products" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>

      <Route
        element={
          <RequireAdmin>
            <AdminLoader>
              <AdminLayout />
            </AdminLoader>
          </RequireAdmin>
        }
        path="admin"
      >
        <Route
          element={
            <AdminLoader>
              <AdminDashboardPage />
            </AdminLoader>
          }
          index
        />
        <Route
          element={
            <AdminLoader>
              <AdminProductsPage />
            </AdminLoader>
          }
          path="products"
        />
        <Route
          element={
            <AdminLoader>
              <AdminCategoriesPage />
            </AdminLoader>
          }
          path="categories"
        />
        <Route
          element={
            <AdminLoader>
              <AdminAttributesPage kind="brands" />
            </AdminLoader>
          }
          path="brands"
        />
        <Route
          element={
            <AdminLoader>
              <AdminAttributesPage kind="colors" />
            </AdminLoader>
          }
          path="colors"
        />
        <Route
          element={
            <AdminLoader>
              <AdminAttributesPage kind="sizes" />
            </AdminLoader>
          }
          path="sizes"
        />
        <Route
          element={
            <AdminLoader>
              <AdminAttributesPage kind="ages" />
            </AdminLoader>
          }
          path="ages"
        />
        <Route
          element={
            <AdminLoader>
              <AdminOrdersPage />
            </AdminLoader>
          }
          path="orders"
        />
        <Route
          element={
            <AdminLoader>
              <AdminOrderDetailPage />
            </AdminLoader>
          }
          path="orders/:orderId"
        />
        <Route
          element={
            <AdminLoader>
              <AdminCustomersPage />
            </AdminLoader>
          }
          path="customers"
        />
        <Route element={<Navigate replace to="/admin/marketing/coupons" />} path="promotions" />
        <Route
          element={
            <AdminLoader>
              <AdminMarketingPage />
            </AdminLoader>
          }
          path="marketing"
        />
        <Route
          element={
            <AdminLoader>
              <AdminCouponsPage />
            </AdminLoader>
          }
          path="marketing/coupons"
        />
        <Route
          element={
            <AdminLoader>
              <AdminBannersPage />
            </AdminLoader>
          }
          path="marketing/banners"
        />
        <Route
          element={
            <AdminLoader>
              <AdminCampaignsPage />
            </AdminLoader>
          }
          path="marketing/campaigns"
        />
        <Route
          element={
            <AdminLoader>
              <AdminSegmentsPage />
            </AdminLoader>
          }
          path="marketing/segments"
        />
        <Route
          element={
            <AdminLoader>
              <AdminSubscribersPage />
            </AdminLoader>
          }
          path="marketing/subscribers"
        />
        <Route
          element={
            <AdminLoader>
              <AdminReferralsPage />
            </AdminLoader>
          }
          path="marketing/referrals"
        />
        <Route
          element={
            <AdminLoader>
              <AdminAnalyticsPage />
            </AdminLoader>
          }
          path="marketing/analytics"
        />
        <Route
          element={
            <AdminLoader>
              <AdminLoyaltyPage />
            </AdminLoader>
          }
          path="marketing/loyalty"
        />
        <Route
          element={
            <AdminLoader>
              <AdminReviewsPage />
            </AdminLoader>
          }
          path="reviews"
        />
        <Route
          element={
            <AdminLoader>
              <AdminSupportPage />
            </AdminLoader>
          }
          path="support"
        />
        <Route
          element={
            <AdminLoader>
              <AdminSupportConversationPage />
            </AdminLoader>
          }
          path="support/:conversationId"
        />
        <Route
          element={
            <AdminLoader>
              <AdminNotificationsPage />
            </AdminLoader>
          }
          path="notifications"
        />
        <Route
          element={
            <AdminLoader>
              <AdminSettingsPage />
            </AdminLoader>
          }
          path="settings"
        />
        <Route
          element={
            <AdminLoader>
              <AdminAccountingPage />
            </AdminLoader>
          }
          path="accounting"
        />
        <Route
          element={<Navigate replace to="/admin/ops/suppliers" />}
          path="ops"
        />
        <Route
          element={
            <AdminLoader>
              <AdminSuppliersPage />
            </AdminLoader>
          }
          path="ops/suppliers"
        />
        <Route
          element={
            <AdminLoader>
              <AdminPurchaseOrdersPage />
            </AdminLoader>
          }
          path="ops/purchase-orders"
        />
        <Route
          element={
            <AdminLoader>
              <AdminInventoryPage />
            </AdminLoader>
          }
          path="ops/inventory"
        />
        <Route
          element={
            <AdminLoader>
              <AdminCarriersPage />
            </AdminLoader>
          }
          path="ops/carriers"
        />
        <Route
          element={
            <AdminLoader>
              <AdminZonesPage />
            </AdminLoader>
          }
          path="ops/zones"
        />
        <Route
          element={
            <AdminLoader>
              <AdminAgentsPage />
            </AdminLoader>
          }
          path="ops/agents"
        />
        <Route
          element={
            <AdminLoader>
              <AdminDeliveriesPage />
            </AdminLoader>
          }
          path="ops/deliveries"
        />
        <Route element={<Navigate replace to="/admin" />} path="*" />
      </Route>
    </Routes>
  )
}

export default App

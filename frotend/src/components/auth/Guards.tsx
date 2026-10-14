import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from '../../hooks/useTranslation'
import { useAuthStore } from '../../features/account/store/useAuthStore'

/**
 * Protects routes that require a signed-in account (for example checkout).
 * Guests are sent to the sign-in page with a `redirect` back to where they
 * were heading.
 */
export function RequireAuth({
  children,
  className = 'checkout-loading',
}: {
  children: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === 'loading') {
    return (
      <p className={className} role="status">
        {t('common.loading')}
      </p>
    )
  }

  if (status === 'authenticated') return <>{children}</>

  const redirect = encodeURIComponent(
    location.pathname + location.search + location.hash,
  )
  return <Navigate replace to={`/login?redirect=${redirect}`} />
}

/**
 * Protects the admin console. The visitor must not only be signed in, but their
 * profile must carry the `admin` role. Anyone else is redirected to the admin
 * sign-in flow or shown an access-denied screen.
 */
export function RequireAdmin({
  children,
  className = 'admin-loading',
}: {
  children: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className={className} role="status">
        {t('common.loading')}
      </div>
    )
  }

  if (status !== 'authenticated') {
    const redirect = encodeURIComponent(
      location.pathname + location.search + location.hash,
    )
    return <Navigate replace to={`/login?redirect=${redirect}`} />
  }

  if (user?.role !== 'admin') {
    return (
      <div className="auth-access-denied" role="alert">
        <h1>{t('auth.adminOnlyTitle')}</h1>
        <p>{t('auth.adminOnlyText')}</p>
        <a className="auth-access-denied__link" href="/">
          {t('auth.backToStore')}
        </a>
      </div>
    )
  }

  return <>{children}</>
}
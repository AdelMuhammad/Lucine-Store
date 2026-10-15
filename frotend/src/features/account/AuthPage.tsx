import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import './AuthPage.css'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import { useAuthStore } from './store/useAuthStore'
import { authErrorMessageKey } from './authMessages'

type Mode = 'login' | 'signup' | 'forgot-password' | 'confirm-email'

const EMPTY_FORM = { email: '', password: '', fullName: '' }

function AuthPage() {
  const { t } = useTranslation()
  const signIn = useAuthStore((state) => state.signIn)
  const signUp = useAuthStore((state) => state.signUp)
  const resetPassword = useAuthStore((state) => state.resetPassword)
  const resendConfirmation = useAuthStore((state) => state.resendConfirmation)
  const error = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)

  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [form, setForm] = useState(EMPTY_FORM)
  const [mode, setMode] = useState<Mode>('login')
  const [submitting, setSubmitting] = useState(false)
  /** Translation key of a success/neutral message shown above the form. */
  const [notice, setNotice] = useState('')
  /** Email the account was created for, shown on the confirm-email screen. */
  const [pendingEmail, setPendingEmail] = useState('')

  /** Switches screens, dropping any stale error or success message. */
  function openMode(next: Mode) {
    clearError()
    setNotice('')
    setMode(next)
  }

  const updateField = useCallback(
    (field: keyof typeof EMPTY_FORM, value: string) => {
      clearError()
      setForm((prev) => ({ ...prev, [field]: value }))
    },
    [clearError],
  )

  function goAfterSignIn() {
    const user = useAuthStore.getState().user
    const redirect = searchParams.get('redirect')
    const isSafeRedirect =
      redirect !== null &&
      redirect.startsWith('/') &&
      !redirect.startsWith('//') &&
      (user?.role === 'admin' || !redirect.startsWith('/admin'))

    const target =
      user?.role === 'admin'
        ? '/admin'
        : isSafeRedirect
          ? (redirect as string)
          : '/account'
    navigate(target, { replace: true })
  }

  async function handleSubmit() {
    if (submitting) return
    clearError()
    setNotice('')

    if (mode === 'login') {
      setSubmitting(true)
      const signedIn = await signIn({
        email: form.email.trim(),
        password: form.password,
      })
      setSubmitting(false)
      if (!signedIn) return
      goAfterSignIn()
      return
    }

    if (mode === 'signup') {
      setSubmitting(true)
      const outcome = await signUp({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
      })
      setSubmitting(false)
      if (outcome === 'error') return
      if (outcome === 'confirm') {
        // The project requires email confirmation — show the "check your
        // inbox" screen while Supabase sends the verification link.
        setPendingEmail(form.email.trim())
        openMode('confirm-email')
        return
      }
      const user = useAuthStore.getState().user
      navigate(user?.role === 'admin' ? '/admin' : '/account', { replace: true })
      return
    }

    if (mode === 'forgot-password') {
      setSubmitting(true)
      const sent = await resetPassword(form.email.trim())
      setSubmitting(false)
      if (sent) setNotice('auth.noticeForgotSent')
    }
  }

  async function handleResend() {
    if (submitting || !pendingEmail) return
    clearError()
    setNotice('')
    setSubmitting(true)
    const sent = await resendConfirmation(pendingEmail)
    setSubmitting(false)
    if (sent) setNotice('auth.resendSent')
  }

  const title =
    mode === 'login'
      ? t('auth.loginTitle')
      : mode === 'signup'
        ? t('auth.signupTitle')
        : mode === 'forgot-password'
          ? t('auth.forgotTitle')
          : t('auth.confirmEmailTitle')

  return (
    <main className="auth-page">
      <Seo
        description={t('seo.auth.description')}
        noindex
        path={location.pathname}
        title={t('seo.auth.title')}
      />
      <div className="auth-card">
        <div className="auth-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 12.5C7 9.46243 9.46243 7 12.5 7C15.5376 7 18 9.46243 18 12.5V18H7V12.5Z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9.6 9.3V8.1C9.6 6.61177 10.8118 5.4 12.3 5.4C13.7882 5.4 15 6.61177 15 8.1V9.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        <h1>{title}</h1>

        {error && (
          <p className="auth-alert auth-alert--error" role="alert">
            {t(authErrorMessageKey(error))}
          </p>
        )}

        {notice && (
          <p className="auth-alert auth-alert--success" role="status">
            {t(notice)}
          </p>
        )}

        {mode === 'confirm-email' ? (
          <div className="auth-confirm">
            <p className="auth-card__description">{t('auth.noticeConfirmEmail')}</p>
            {pendingEmail && (
              <p className="auth-confirm__email">{pendingEmail}</p>
            )}
            <button
              className="auth-submit"
              type="button"
              disabled={submitting}
              onClick={handleResend}
            >
              {submitting ? t('auth.sending') : t('auth.resendEmail')}
            </button>
            <button
              className="auth-btn"
              type="button"
              onClick={() => openMode('login')}
            >
              {t('auth.backToSignIn')}
            </button>
          </div>
        ) : (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSubmit()
            }}
          >
            {mode === 'signup' && (
              <label>
                {t('auth.fullNameLabel')}
                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                />
              </label>
            )}

            <label>
              {t('auth.emailLabel')}
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder={t('auth.emailPlaceholder')}
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </label>

            {mode !== 'forgot-password' && (
              <label>
                {t('auth.passwordLabel')}
                <input
                  type="password"
                  name="password"
                  autoComplete={
                    mode === 'signup' ? 'new-password' : 'current-password'
                  }
                  required
                  minLength={6}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                />
              </label>
            )}

            {mode === 'forgot-password' && (
              <p className="auth-card__description">
                {t('auth.forgotDescription')}
              </p>
            )}

            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting
                ? t('auth.working')
                : mode === 'login'
                  ? t('auth.loginButton')
                  : mode === 'signup'
                    ? t('auth.signupButton')
                    : t('auth.forgotButton')}
            </button>
          </form>
        )}

        {mode !== 'confirm-email' && (
          <div className="auth-card__switch">
            <button className="auth-btn" type="button" onClick={() => openMode('login')}>
              {t('auth.login')}
            </button>
            <button className="auth-btn" type="button" onClick={() => openMode('signup')}>
              {t('auth.signup')}
            </button>
            <button
              className="auth-btn"
              type="button"
              onClick={() => openMode('forgot-password')}
            >
              {t('auth.forgot-password')}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default AuthPage

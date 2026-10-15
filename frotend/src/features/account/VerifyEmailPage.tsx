import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './AuthPage.css'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import { useAuthStore } from './store/useAuthStore'
import { authErrorMessageKey } from './authMessages'

type CallbackParams = {
  type: string
  error: string
  hasToken: boolean
}

/**
 * Reads the Supabase redirect parameters from the URL.
 *
 * The email link arrives as `…/auth/verify#access_token=…&type=signup` (implicit
 * flow) or with an `error`/`error_description` pair when the link is invalid.
 * The Supabase client clears the fragment once it exchanges a valid session, so
 * this has to run synchronously while the page first renders — hence the lazy
 * `useState` initialiser in the component below.
 */
function readCallbackParams(): CallbackParams {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const pick = (key: string) => hash.get(key) ?? query.get(key) ?? ''
  return {
    type: pick('type'),
    error: pick('error') || pick('error_code'),
    hasToken: Boolean(
      pick('access_token') || pick('token_hash') || pick('code'),
    ),
  }
}

type View = 'success' | 'recovery' | 'error'

function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useState(readCallbackParams)

  const resendConfirmation = useAuthStore((state) => state.resendConfirmation)
  const updatePassword = useAuthStore((state) => state.updatePassword)
  const error = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [localError, setLocalError] = useState('')
  const [passwordUpdated, setPasswordUpdated] = useState(false)

  const view: View = params.error
    ? 'error'
    : params.type === 'recovery' && params.hasToken
      ? 'recovery'
      : params.hasToken
        ? 'success'
        : 'error'

  async function handleResend() {
    if (submitting || !email.trim()) return
    clearError()
    setNotice('')
    setSubmitting(true)
    const sent = await resendConfirmation(email)
    setSubmitting(false)
    if (sent) setNotice('auth.resendSent')
  }

  async function handleUpdatePassword() {
    if (submitting) return
    clearError()
    setNotice('')
    setLocalError('')
    if (password.length < 6) {
      setLocalError('auth.errorWeakPassword')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('auth.errorPasswordMismatch')
      return
    }
    setSubmitting(true)
    const updated = await updatePassword(password)
    setSubmitting(false)
    if (updated) setPasswordUpdated(true)
  }

  const message = localError || (error ? authErrorMessageKey(error) : '')

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
            <path d="M4 7.5 12 13l8-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="4" y="5.5" width="16" height="13" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </div>

        {view === 'success' && (
          <>
            <h1>{t('auth.verifySuccessTitle')}</h1>
            <p className="auth-alert auth-alert--success" role="status">
              {t('auth.verifySuccessText')}
            </p>
            <div className="auth-confirm">
              <button
                className="auth-submit"
                type="button"
                onClick={() => navigate('/account', { replace: true })}
              >
                {t('auth.goToAccount')}
              </button>
              <button
                className="auth-btn"
                type="button"
                onClick={() => navigate('/login', { replace: true })}
              >
                {t('auth.backToSignIn')}
              </button>
            </div>
          </>
        )}

        {view === 'recovery' && (
          <>
            <h1>{t('auth.recoveryTitle')}</h1>
            {passwordUpdated ? (
              <>
                <p className="auth-alert auth-alert--success" role="status">
                  {t('auth.recoverySuccess')}
                </p>
                <div className="auth-confirm">
                  <button
                    className="auth-submit"
                    type="button"
                    onClick={() => navigate('/account', { replace: true })}
                  >
                    {t('auth.goToAccount')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="auth-card__description">
                  {t('auth.recoveryDescription')}
                </p>
                {message && (
                  <p className="auth-alert auth-alert--error" role="alert">
                    {t(message)}
                  </p>
                )}
                <div className="auth-form">
                  <label>
                    {t('auth.passwordLabel')}
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={t('auth.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => {
                        clearError()
                        setLocalError('')
                        setPassword(e.target.value)
                      }}
                    />
                  </label>
                  <label>
                    {t('auth.confirmPassword')}
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={t('auth.confirmPlaceholder')}
                      value={confirmPassword}
                      onChange={(e) => {
                        clearError()
                        setLocalError('')
                        setConfirmPassword(e.target.value)
                      }}
                    />
                  </label>
                  <button
                    className="auth-submit"
                    type="button"
                    disabled={submitting}
                    onClick={handleUpdatePassword}
                  >
                    {submitting ? t('auth.working') : t('auth.recoveryButton')}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {view === 'error' && (
          <>
            <h1>{t('auth.verifyErrorTitle')}</h1>
            <p className="auth-alert auth-alert--error" role="alert">
              {t('auth.verifyErrorText')}
            </p>
            {notice ? (
              <p className="auth-alert auth-alert--success" role="status">
                {t(notice)}
              </p>
            ) : (
              <div className="auth-form">
                <label>
                  {t('auth.emailLabel')}
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => {
                      clearError()
                      setNotice('')
                      setEmail(e.target.value)
                    }}
                  />
                </label>
                {error && (
                  <p className="auth-alert auth-alert--error" role="alert">
                    {t(authErrorMessageKey(error))}
                  </p>
                )}
                <button
                  className="auth-submit"
                  type="button"
                  disabled={submitting || !email.trim()}
                  onClick={handleResend}
                >
                  {submitting ? t('auth.sending') : t('auth.resendEmail')}
                </button>
              </div>
            )}
            <div className="auth-confirm">
              <button
                className="auth-btn"
                type="button"
                onClick={() => navigate('/login', { replace: true })}
              >
                {t('auth.backToSignIn')}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default VerifyEmailPage

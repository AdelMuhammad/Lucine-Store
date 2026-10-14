// @ts-nocheck
import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import './AuthPage.css'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import { useAuthStore } from './store/useAuthStore'

function AuthPage() {
  const { t } = useTranslation()
  const { signIn, signUp } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
  })
  const [mode, setMode] = useState('login')

  async function handleSignIn() {
    if (mode === 'login') {
      const signedIn = await signIn({ email: form.email, password: form.password })
      if (!signedIn) return

      const user = useAuthStore.getState().user
      const redirect = searchParams.get('redirect')
      const isSafeRedirect =
        redirect?.startsWith('/') &&
        !redirect.startsWith('//') &&
        (user?.role === 'admin' || !redirect.startsWith('/admin'))

      navigate(
        user?.role === 'admin'
          ? '/admin'
          : isSafeRedirect
            ? redirect
            : '/account',
        { replace: true },
      )
    } else if (mode === 'signup') {
      const outcome = await signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
      })
      if (outcome === 'signed-in') {
        const user = useAuthStore.getState().user
        navigate(user?.role === 'admin' ? '/admin' : '/account', { replace: true })
      }
    }
  }

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

        <h1>{mode === 'login' ? t('auth.loginTitle') : mode === 'signup' ? t('auth.signupTitle') : t('auth.forgotTitle')}</h1>

        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSignIn()
          }}
        >
          {mode === 'login' && (
            <>
              <label>
                {t('auth.emailLabel')}
                <input
                  type="email"
                  name="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                {t('auth.passwordLabel')}
                <input
                  type="password"
                  name="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
              <button className="auth-submit" type="submit">{t('auth.loginButton')}</button>
            </>
          )}

          {mode === 'signup' && (
            <>
              <label>
                {t('auth.emailLabel')}
                <input
                  type="email"
                  name="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                {t('auth.passwordLabel')}
                <input
                  type="password"
                  name="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
              <label>
                {t('auth.fullNameLabel')}
                <input
                  type="text"
                  name="fullName"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </label>
              <button className="auth-submit" type="submit">{t('auth.signupButton')}</button>
            </>
          )}

          {mode === 'forgot-password' && (
            <>
              <p className="auth-card__description">{t('auth.forgotDescription')}</p>
              <label>
                {t('auth.emailLabel')}
                <input
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <button className="auth-submit" type="submit">{t('auth.forgotButton')}</button>
            </>
          )}
        </form>

        <div className="auth-card__switch">
          <button className="auth-btn" type="button" onClick={() => setMode('login')}>{t('auth.login')}</button>
          <button className="auth-btn" type="button" onClick={() => setMode('signup')}>{t('auth.signup')}</button>
          <button className="auth-btn" type="button" onClick={() => setMode('forgot-password')}>{t('auth.forgot-password')}</button>
        </div>
      </div>
    </main>
  )
}

export default AuthPage
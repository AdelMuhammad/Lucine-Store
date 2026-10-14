import { useEffect, useState } from 'react'
import { Close } from '@mui/icons-material'
import { NavLink } from 'react-router-dom'
import { useTranslation } from '../../../hooks/useTranslation'
import { useAuthStore } from '../../account/store/useAuthStore'
import { liveBanners, useMarketingStore } from '../store/useMarketingStore'
import { NEWSLETTER_SUBSCRIBED_EVENT } from '../tracking'
import NewsletterSignup from './NewsletterSignup'
import '../Marketing.css'

const POPUP_STORAGE_KEY = 'lucine-marketing-popup'
const POPUP_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000

type PopupVisitState = {
  lastShownAt: number
  subscribed: boolean
}

function readPopupVisitState(): PopupVisitState {
  try {
    const stored = localStorage.getItem(POPUP_STORAGE_KEY)
    if (!stored) return { lastShownAt: 0, subscribed: false }

    const value: unknown = JSON.parse(stored)
    if (value === null || typeof value !== 'object') {
      throw new Error('Stored popup state is not an object')
    }
    const state = value as Partial<PopupVisitState>
    return {
      lastShownAt:
        typeof state.lastShownAt === 'number' && Number.isFinite(state.lastShownAt)
          ? state.lastShownAt
          : 0,
      subscribed: state.subscribed === true,
    }
  } catch (error) {
    console.error('[marketing] failed to read popup frequency state', error)
    return { lastShownAt: 0, subscribed: false }
  }
}

function writePopupVisitState(state: PopupVisitState): void {
  try {
    localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('[marketing] failed to save popup frequency state', error)
  }
}

/**
 * Show once per three-day window until the visitor subscribes to the newsletter.
 */
function MarketingPopup() {
  const { t, localized } = useTranslation()
  const banners = useMarketingStore((state) => state.banners)
  const subscribers = useMarketingStore((state) => state.subscribers)
  const settings = useMarketingStore((state) => state.settings)
  const authEmail = useAuthStore((state) => state.user?.email.toLocaleLowerCase() ?? '')
  const [open, setOpen] = useState(false)

  const banner = liveBanners(banners, 'popup')[0]
  const bannerId = banner?.id ?? ''
  const delaySeconds = settings.popupDelaySeconds
  const isSubscribed = subscribers.some(
    (subscriber) =>
      subscriber.isSubscribed &&
      subscriber.email.toLocaleLowerCase() === authEmail &&
      authEmail !== '',
  )

  useEffect(() => {
    if (isSubscribed) {
      const visitState = readPopupVisitState()
      writePopupVisitState({ ...visitState, subscribed: true })
      return
    }
    if (!bannerId) return
    const visitState = readPopupVisitState()
    if (
      visitState.subscribed ||
      Date.now() - visitState.lastShownAt < POPUP_COOLDOWN_MS
    ) {
      return
    }

    const delay = Math.max(1, delaySeconds) * 1000
    const timer = setTimeout(() => {
      writePopupVisitState({ ...visitState, lastShownAt: Date.now() })
      setOpen(true)
    }, delay)
    return () => clearTimeout(timer)
  }, [bannerId, delaySeconds, isSubscribed])

  useEffect(() => {
    function handleNewsletterSubscribed() {
      const visitState = readPopupVisitState()
      writePopupVisitState({ ...visitState, subscribed: true })
    }
    window.addEventListener(
      NEWSLETTER_SUBSCRIBED_EVENT,
      handleNewsletterSubscribed,
    )
    return () =>
      window.removeEventListener(
        NEWSLETTER_SUBSCRIBED_EVENT,
        handleNewsletterSubscribed,
      )
  }, [])

  useEffect(() => {
    if (!open || !bannerId) return
    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [bannerId, open])

  if (!banner || !open) return null

  function close() {
    setOpen(false)
  }

  const eyebrow = localized(banner.eyebrow, banner.eyebrow_ar)
  const title = localized(banner.title, banner.title_ar)
  const body = localized(banner.body, banner.body_ar)
  const cta = localized(banner.ctaLabel, banner.ctaLabel_ar)

  return (
    <div aria-label={title} aria-modal="true" className="marketing-popup" role="dialog">
      <button
        aria-label={t('common.close')}
        className="marketing-popup__backdrop"
        onClick={close}
        type="button"
      />
      <div className="marketing-popup__card">
        <button
          aria-label={t('common.close')}
          className="marketing-popup__close"
          onClick={close}
          type="button"
        >
          <Close />
        </button>

        {banner.imageUrl && (
          <img alt="" className="marketing-popup__image" src={banner.imageUrl} />
        )}

        <div className="marketing-popup__content">
          {eyebrow && (
            <span className="marketing-popup__eyebrow">{eyebrow}</span>
          )}
          <h2>{title}</h2>
          {body && <p>{body}</p>}

          <NewsletterSignup compact source="popup" />

          {banner.link && cta && (
            <NavLink className="marketing-popup__link" onClick={close} to={banner.link}>
              {cta}
            </NavLink>
          )}
        </div>
      </div>
    </div>
  )
}

export default MarketingPopup

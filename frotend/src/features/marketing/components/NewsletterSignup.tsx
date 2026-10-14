import { useState, type FormEvent } from 'react'
import { useTranslation } from '../../../hooks/useTranslation'
import {
  subscribeToNewsletter,
  useMarketingStore,
} from '../store/useMarketingStore'
import {
  isValidEmail,
  NEWSLETTER_SUBSCRIBED_EVENT,
} from '../tracking'

type NewsletterSignupProps = {
  /** Where the sign-up came from — stored on the subscriber row. */
  source: string
  /** Skips the heading block when the host already renders the copy. */
  compact?: boolean
}

/**
 * The single newsletter form used by the footer and the marketing popup, so a
 * sign-up always goes through the same validation and the same store action.
 */
function NewsletterSignup({ source, compact = false }: NewsletterSignupProps) {
  const { t, language } = useTranslation()
  const subscribers = useMarketingStore((state) => state.subscribers)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'error' | 'done'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = email.trim().toLocaleLowerCase()

    if (!isValidEmail(clean)) {
      setStatus('error')
      setMessage(t('marketing.emailInvalid'))
      return
    }

    const alreadyOnList = subscribers.some(
      (subscriber) => subscriber.email === clean && subscriber.isSubscribed,
    )
    if (alreadyOnList) {
      setStatus('done')
      setMessage(t('marketing.alreadySubscribed'))
      window.dispatchEvent(new Event(NEWSLETTER_SUBSCRIBED_EVENT))
      return
    }

    try {
      await subscribeToNewsletter({ email: clean, name, language, source })
      setStatus('done')
      setMessage(t('marketing.subscribed'))
      setEmail('')
      setName('')
      window.dispatchEvent(new Event(NEWSLETTER_SUBSCRIBED_EVENT))
    } catch (error) {
      console.error('[marketing] newsletter signup failed', error)
      setStatus('error')
      setMessage(t('auth.errorGeneric'))
    }
  }

  return (
    <form
      className={`newsletter${compact ? ' newsletter--compact' : ''}`}
      onSubmit={handleSubmit}
    >
      {!compact && (
        <div className="newsletter__copy">
          <span className="newsletter__eyebrow">
            {t('marketing.newsletterEyebrow')}
          </span>
          <h2>{t('marketing.newsletterTitle')}</h2>
          <p>{t('marketing.newsletterText')}</p>
        </div>
      )}

      <div className="newsletter__fields">
        <label className="newsletter__field">
          <span>{t('marketing.nameLabel')}</span>
          <input
            autoComplete="given-name"
            onChange={(event) => setName(event.target.value)}
            placeholder={t('marketing.namePlaceholder')}
            type="text"
            value={name}
          />
        </label>
        <label className="newsletter__field">
          <span>{t('marketing.emailLabel')}</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('marketing.emailPlaceholder')}
            required
            type="email"
            value={email}
          />
        </label>
        <button className="newsletter__button" type="submit">
          {t('marketing.subscribe')}
        </button>
      </div>

      {status !== 'idle' && (
        <p
          className={`newsletter__message newsletter__message--${status}`}
          role="status"
        >
          {message}
        </p>
      )}
    </form>
  )
}

export default NewsletterSignup

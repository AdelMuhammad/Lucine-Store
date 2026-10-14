/**
 * Storefront-side marketing helpers: attribution capture and the email rule
 * shared by the newsletter form in the footer and the popup.
 */
import { nowIso } from './coupons'
import type { UtmTouch } from './store/useMarketingStore'

export const NEWSLETTER_SUBSCRIBED_EVENT = 'lucine:newsletter-subscribed'

/** Pragmatic email check — matches what the admin accepts for subscribers. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

/**
 * Reads first-touch attribution out of the current URL. Returns `null` for
 * plain visits so direct traffic never overwrites an earlier campaign touch.
 */
export function readUtmTouch(search: string, pathname: string): UtmTouch | null {
  const params = new URLSearchParams(search)
  const source = params.get('utm_source') ?? ''
  const medium = params.get('utm_medium') ?? ''
  const campaign = params.get('utm_campaign') ?? ''

  if (!source && !medium && !campaign) return null

  return {
    source,
    medium,
    campaign,
    landingPage: `${pathname}${search}`,
    capturedAt: nowIso(),
  }
}

/** The referral code carried by `?ref=` links, or `''`. */
export function readReferralCode(search: string): string {
  return new URLSearchParams(search).get('ref')?.trim() ?? ''
}

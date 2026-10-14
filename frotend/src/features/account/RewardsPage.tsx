import { useEffect, useState } from 'react'
import {
  ArrowForward,
  CheckCircleOutlined,
  ContentCopyOutlined,
  LocalOfferOutlined,
  RedeemOutlined,
  ShareOutlined,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { referralLink } from './rewards'
import { useAccountStore } from './store/useAccountStore'
import { useCouponStore } from '../marketing/store/useCouponStore'
import { couponStatus, couponSummary } from '../marketing/coupons'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import { breadcrumbSchema } from '../../lib/seo'
import './RewardsPage.css'

function RewardsPage() {
  const { t, localized, number, currency } = useTranslation()
  const referralCode = useAccountStore((state) => state.referralCode)
  const createReferralCode = useAccountStore((state) => state.createReferralCode)
  const earnedCoupons = useAccountStore((state) => state.earnedCoupons)
  const usedCouponCodes = useAccountStore((state) => state.usedCouponCodes)
  const orders = useAccountStore((state) => state.orders)
  const coupons = useCouponStore((state) => state.coupons)
  const [notice, setNotice] = useState('')
  const referralURL = referralCode ? referralLink(referralCode) : ''
  // Only the codes that are live right now are worth showing a shopper.
  const availableCoupons = coupons.filter(
    (coupon) => couponStatus(coupon) === 'active',
  )

  useEffect(() => {
    if (!referralCode) createReferralCode()
  }, [createReferralCode, referralCode])

  async function copyValue(value: string, message: string) {
    if (!navigator.clipboard) {
      setNotice(t('rewards.copyUnavailable'))
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setNotice(message)
    } catch {
      setNotice(t('rewards.copyFailed'))
    }
  }

  async function shareReferral() {
    if (!referralCode) return
    const url = referralLink(referralCode)
    const shareData = {
      title: t('rewards.shareTitle'),
      text: t('rewards.shareText', { code: referralCode }),
      url,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setNotice(t('rewards.shareReady'))
      } else {
        await copyValue(url, t('rewards.referralCopied'))
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setNotice(t('rewards.shareFailed'))
    }
  }

  return (
    <section className="rewards-page">
      <Seo
        description={t('seo.rewards.description')}
        jsonLd={[
          breadcrumbSchema([
            { name: t('productDetail.home'), path: '/' },
            { name: t('nav.rewards'), path: '/rewards' },
          ]),
        ]}
        keywords={[t('nav.rewards'), t('rewards.giveGet')]}
        path="/rewards"
        title={t('seo.rewards.title')}
      />
      <header className="rewards-hero">
        <span className="rewards-eyebrow">{t('rewards.eyebrow')}</span>
        <h1>{t('rewards.title')}</h1>
        <p>{t('rewards.text')}</p>
      </header>

      {notice && (
        <div className="rewards-notice" role="status">
          <CheckCircleOutlined />
          <span>{notice}</span>
          <button
            aria-label={t('common.dismiss')}
            onClick={() => setNotice('')}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <div className="rewards-layout">
        <section aria-labelledby="referral-title" className="rewards-panel rewards-referral">
          <div className="rewards-panel__icon">
            <ShareOutlined />
          </div>
          <span className="rewards-eyebrow">{t('rewards.giveGet')}</span>
          <h2 id="referral-title">{t('rewards.referralTitle')}</h2>
          <p>{t('rewards.referralText')}</p>
          <div className="rewards-code-field">
            <span>{referralCode || t('rewards.creatingCode')}</span>
            <button
              aria-label={t('rewards.copyReferralAria')}
              disabled={!referralCode}
              onClick={() =>
                referralCode &&
                copyValue(referralCode, t('rewards.referralCodeCopied'))
              }
              type="button"
            >
              <ContentCopyOutlined />
            </button>
          </div>
          <div className="rewards-link-field">
            <input
              aria-label={t('rewards.referralLinkAria')}
              readOnly
              value={referralURL}
            />
            <button
              disabled={!referralURL}
              onClick={shareReferral}
              type="button"
            >
              <ShareOutlined /> {t('rewards.shareLink')}
            </button>
          </div>
        </section>

        <section aria-labelledby="wallet-title" className="rewards-panel">
          <div className="rewards-panel__heading">
            <div className="rewards-panel__icon">
              <RedeemOutlined />
            </div>
            <div>
              <span className="rewards-eyebrow">{t('rewards.yourRewards')}</span>
              <h2 id="wallet-title">{t('rewards.walletTitle')}</h2>
            </div>
          </div>

          {earnedCoupons.length > 0 ? (
            <div className="rewards-coupon-list">
              {earnedCoupons.map((coupon) => {
                const used = usedCouponCodes.includes(coupon.code)
                return (
                  <article
                    className={`rewards-coupon${used ? ' is-used' : ''}`}
                    key={coupon.id}
                  >
                    <div>
                      <span>
                        {used ? t('rewards.usedReward') : t('rewards.referralReward')}
                      </span>
                      <strong>
                        {t('rewards.percentOff', { percent: number(coupon.percent) })}
                      </strong>
                      <small>
                        {t('rewards.earnedAfter', {
                          id: coupon.orderId.slice(0, 8).toUpperCase(),
                        })}
                      </small>
                    </div>
                    <button
                      disabled={used}
                      onClick={() =>
                        copyValue(
                          coupon.code,
                          t('rewards.couponCopied', { code: coupon.code }),
                        )
                      }
                      type="button"
                    >
                      {coupon.code}
                      <ContentCopyOutlined />
                    </button>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="rewards-empty">
              <LocalOfferOutlined />
              <strong>{t('rewards.noCoupons')}</strong>
              <span>{t('rewards.noCouponsText')}</span>
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="promo-title" className="rewards-panel rewards-promotions">
        <div className="rewards-panel__heading">
          <div className="rewards-panel__icon">
            <LocalOfferOutlined />
          </div>
          <div>
            <span className="rewards-eyebrow">{t('rewards.treatForYou')}</span>
            <h2 id="promo-title">{t('rewards.currentCodes')}</h2>
          </div>
        </div>
        <div className="rewards-coupon-list">
          {availableCoupons.map((coupon) => {
            const timesUsed = orders.filter(
              (order) => order.couponCode === coupon.code,
            ).length
            const used = coupon.perCustomerLimit > 0 && timesUsed >= coupon.perCustomerLimit
            const summary = couponSummary(coupon)
            return (
              <article
                className={`rewards-coupon${used ? ' is-used' : ''}`}
                key={coupon.code}
              >
                <div>
                  <span>
                    {used ? t('rewards.alreadyUsed') : t('rewards.storeOffer')}
                  </span>
                  <strong>{localized(coupon.title, coupon.title_ar)}</strong>
                  <small>
                    {t(summary.key, {
                      value:
                        coupon.kind === 'fixed'
                          ? currency(summary.value)
                          : number(summary.value),
                    })}
                  </small>
                  <small>
                    {t('rewards.applyAtCheckout', {
                      description: localized(
                        coupon.description,
                        coupon.description_ar,
                      ),
                    })}
                  </small>
                </div>
                <button
                  disabled={used}
                  onClick={() =>
                    copyValue(
                      coupon.code,
                      t('rewards.couponCopied', { code: coupon.code }),
                    )
                  }
                  type="button"
                >
                  {coupon.code}
                  <ContentCopyOutlined />
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <footer className="rewards-footer">
        <p>{t('rewards.footerText')}</p>
        <Link to="/products">
          {t('rewards.continueShopping')} <ArrowForward className="rtl-flip" />
        </Link>
      </footer>
    </section>
  )
}

export default RewardsPage

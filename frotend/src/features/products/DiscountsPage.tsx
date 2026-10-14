import { useMemo, useState } from 'react'
import { ArrowForward, LocalOfferOutlined } from '@mui/icons-material'
import { Link } from 'react-router-dom'
import ProductCard from './ProductCard'
import type { Product } from './data/products'
import { useProductStore } from './store/useProductStore'
import { useWishlistStore } from './store/useWishlistStore'
import { referralProductLink } from '../account/rewards'
import { useAccountStore } from '../account/store/useAccountStore'
import { couponSummary, couponStatus } from '../marketing/coupons'
import { useCouponStore } from '../marketing/store/useCouponStore'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import { breadcrumbSchema, itemListSchema, productPath } from '../../lib/seo'
import './DiscountsPage.css'

type DiscountSort = 'largest' | 'price-low' | 'price-high'

function getDiscount(product: Product) {
  if (!product.originalPrice || product.originalPrice <= product.price) return 0
  return Math.round((1 - product.price / product.originalPrice) * 100)
}

function DiscountsPage() {
  const { t, localized, currency, number, date } = useTranslation()
  const [sort, setSort] = useState<DiscountSort>('largest')
  const [shareMessage, setShareMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const products = useProductStore((state) => state.products)
  const coupons = useCouponStore((state) => state.coupons)
  const savedProductIds = useWishlistStore((state) => state.savedProductIds)
  const toggleSaved = useWishlistStore((state) => state.toggleSaved)
  const createReferralCode = useAccountStore((state) => state.createReferralCode)

  // Only codes a shopper can actually redeem right now.
  const liveCoupons = useMemo(
    () => coupons.filter((coupon) => couponStatus(coupon) === 'active'),
    [coupons],
  )

  const discountedProducts = useMemo(() => {
    const discounted = products.filter((product) => getDiscount(product) > 0)

    return discounted.toSorted((first, second) => {
      if (sort === 'price-low') return first.price - second.price
      if (sort === 'price-high') return second.price - first.price
      return getDiscount(second) - getDiscount(first)
    })
  }, [products, sort])

  async function shareProduct(product: Product) {
    const code = createReferralCode()
    const name = localized(product.name, product.name_ar)
    const shareData = {
      title: name,
      text: `${localized(product.description, product.description_ar)} Use my referral link for 10% off.`,
      url: referralProductLink(product.id, code),
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setShareMessage(t('share.shared', { name }))
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url)
        setShareMessage(t('share.linkCopied'))
      } else {
        setShareMessage(t('share.unavailable'))
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setShareMessage(t('share.failed'))
    }
  }

  async function copyCoupon(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopyMessage(t('discounts.codeCopied', { code }))
    } catch {
      setCopyMessage(t('discounts.copyUnavailable'))
    }
  }

  const totalSavings = discountedProducts.reduce(
    (total, product) => total + (product.originalPrice ?? product.price) - product.price,
    0,
  )
  const maxDiscount = discountedProducts.length
    ? Math.max(...discountedProducts.map(getDiscount))
    : 0

  return (
    <section className="discounts-page">
      <Seo
        description={t('seo.discounts.description')}
        jsonLd={[
          itemListSchema(
            discountedProducts.map((product) => ({
              name: localized(product.name, product.name_ar),
              path: productPath(product.id),
            })),
            t('discounts.currentOffers'),
          ),
          breadcrumbSchema([
            { name: t('productDetail.home'), path: '/' },
            { name: t('nav.offers'), path: '/discounts' },
          ]),
        ]}
        keywords={[t('nav.offers'), t('discounts.codesTitle')]}
        path="/discounts"
        title={t('seo.discounts.title')}
      />
      <header className="discounts-hero">
        <div className="discounts-hero__content">
          <span className="discounts-eyebrow">{t('discounts.eyebrow')}</span>
          <h1>{t('discounts.title')}</h1>
          <p>{t('discounts.text')}</p>
          <a className="discounts-hero__link" href="#discounted-products">
            {t('discounts.explore')} <ArrowForward className="rtl-flip" />
          </a>
        </div>
        <div aria-hidden="true" className="discounts-hero__mark">
          <LocalOfferOutlined />
          <span>
            {t('discounts.markLine1')}
            <br />
            {t('discounts.markLine2')}
          </span>
        </div>
      </header>

      <section className="discount-codes" id="coupon-codes">
        <div className="discount-codes__heading">
          <span className="discounts-eyebrow">{t('discounts.codesEyebrow')}</span>
          <h2>{t('discounts.codesTitle')}</h2>
          <p>{t('discounts.codesText')}</p>
        </div>

        {liveCoupons.length > 0 ? (
          <div className="discount-codes__grid">
            {liveCoupons.map((coupon) => {
              const summary = couponSummary(coupon)
              return (
                <article className="discount-code" key={coupon.code}>
                  <div className="discount-code__head">
                    <strong className="discount-code__value">
                      {t(summary.key, {
                        value:
                          coupon.kind === 'fixed'
                            ? currency(summary.value)
                            : number(summary.value),
                      })}
                    </strong>
                    <span className="discount-code__kind">
                      {t(`couponKind.${coupon.kind}`)}
                    </span>
                  </div>
                  <h3>{localized(coupon.title, coupon.title_ar)}</h3>
                  <p>{localized(coupon.description, coupon.description_ar)}</p>
                  <div className="discount-code__meta">
                    {coupon.scope !== 'all' && (
                      <span>
                        {t('discounts.scopeNote', {
                          scope: t(`couponScope.${coupon.scope}`),
                        })}
                      </span>
                    )}
                    {coupon.minSubtotal > 0 && (
                      <span>
                        {t('discounts.minSpend', {
                          amount: currency(coupon.minSubtotal),
                        })}
                      </span>
                    )}
                    {coupon.endsAt && (
                      <span>
                        {t('discounts.endsOn', { date: date(coupon.endsAt) })}
                      </span>
                    )}
                  </div>
                  <div className="discount-code__footer">
                    <code>{coupon.code}</code>
                    <button onClick={() => copyCoupon(coupon.code)} type="button">
                      {t('discounts.copyCode')}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="discount-codes__empty">{t('discounts.noCodes')}</p>
        )}

        {copyMessage && (
          <div className="discounts-notice" role="status">
            <span>{copyMessage}</span>
            <button
              aria-label={t('common.dismiss')}
              onClick={() => setCopyMessage('')}
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {liveCoupons.length > 0 && (
          <p className="discount-codes__footnote">
            {t('discounts.codesFootnote')}
          </p>
        )}
      </section>

      <div className="discounts-content" id="discounted-products">
        <div className="discounts-toolbar">
          <div>
            <span className="discounts-eyebrow">{t('discounts.editEyebrow')}</span>
            <h2>{t('discounts.currentOffers')}</h2>
            <p>
              {t('discounts.summary', {
                count: number(discountedProducts.length),
                percent: `${maxDiscount}%`,
              })}
            </p>
          </div>
          <label className="discounts-sort">
            <span>{t('discounts.sortBy')}</span>
            <select
              onChange={(event) =>
                setSort(event.target.value as DiscountSort)
              }
              value={sort}
            >
              <option value="largest">{t('discounts.sortLargest')}</option>
              <option value="price-low">{t('discounts.sortPriceLow')}</option>
              <option value="price-high">{t('discounts.sortPriceHigh')}</option>
            </select>
          </label>
        </div>

        {shareMessage && (
          <div className="discounts-notice" role="status">
            <span>{shareMessage}</span>
            <button
              aria-label={t('common.dismiss')}
              onClick={() => setShareMessage('')}
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {discountedProducts.length > 0 ? (
          <div className="product-grid discounts-grid">
            {discountedProducts.map((product) => (
              <ProductCard
                isSaved={savedProductIds.includes(product.id)}
                key={product.id}
                onSave={toggleSaved}
                onShare={shareProduct}
                product={product}
                view="grid"
              />
            ))}
          </div>
        ) : (
          <div className="discounts-empty">
            <LocalOfferOutlined />
            <h2>{t('discounts.emptyTitle')}</h2>
            <p>{t('discounts.emptyText')}</p>
            <Link className="discounts-empty__link" to="/products">
              {t('discounts.browse')} <ArrowForward className="rtl-flip" />
            </Link>
          </div>
        )}

        {discountedProducts.length > 0 && (
          <p className="discounts-footnote">
            {t('discounts.footnote', { amount: currency(totalSavings) })}
          </p>
        )}
      </div>
    </section>
  )
}

export default DiscountsPage

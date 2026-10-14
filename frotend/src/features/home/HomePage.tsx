import { useEffect, useRef, useState } from 'react'
import {
  ArrowBack,
  ArrowForward,
  AutoAwesome,
  LocalShippingOutlined,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import ProductCard from '../products/ProductCard'
import { coverImage, type Product } from '../products/data/products'
import { useProductStore } from '../products/store/useProductStore'
import { useWishlistStore } from '../products/store/useWishlistStore'
import { referralProductLink } from '../account/rewards'
import { useAccountStore } from '../account/store/useAccountStore'
import {
  liveBanners,
  useMarketingStore,
} from '../marketing/store/useMarketingStore'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import { itemListSchema, productPath } from '../../lib/seo'
import './HomePage.css'

/** How long a hero slide stays up before the next one slides in. */
const HERO_ROTATE_MS = 8000

function HomePage() {
  const { t, localized, currency, isRTL } = useTranslation()
  const categoryScroller = useRef<HTMLDivElement>(null)
  const products = useProductStore((state) => state.products)
  const categories = (() => {
    const seen = new Map<string, { name: string; label: string; image: string }>()
    products.forEach((product) => {
      if (seen.has(product.category)) return
      seen.set(product.category, {
        name: product.category,
        label: localized(product.category, product.category_ar),
        image: coverImage(product),
      })
    })
    return [...seen.values()]
  })()
  const productCategories = categories.map((category) => category.name)
  const featuredProducts = [...products]
    .sort((first, second) => second.rating - first.rating)
    .slice(0, 4)
  const savedProductIds = useWishlistStore((state) => state.savedProductIds)
  const toggleSaved = useWishlistStore((state) => state.toggleSaved)
  const createReferralCode = useAccountStore((state) => state.createReferralCode)
  const [shareMessage, setShareMessage] = useState('')
  const marketingBanners = useMarketingStore((state) => state.banners)
  const [heroIndex, setHeroIndex] = useState(0)

  /**
   * Hero slides are published from the admin banner manager; until a hero
   * banner exists the original home copy stands in as the only slide. This is
   * recomputed on each render so a banner that goes live or expires is picked
   * up without a reload.
   */
  function buildHeroSlides() {
    const live = liveBanners(marketingBanners, 'hero')
    if (live.length === 0) {
      return [
        {
          id: 'home-hero-default',
          eyebrow: t('home.heroEyebrow'),
          title: t('home.heroTitle'),
          body: t('home.heroText'),
          cta: t('home.discover'),
          link: '/products',
          image: coverImage(products[0]),
        },
      ]
    }

    return live.map((banner) => ({
      id: banner.id,
      eyebrow: localized(banner.eyebrow, banner.eyebrow_ar),
      title: localized(banner.title, banner.title_ar),
      body: localized(banner.body, banner.body_ar),
      cta: localized(banner.ctaLabel, banner.ctaLabel_ar) || t('home.discover'),
      link: banner.link || '/products',
      image: banner.imageUrl || coverImage(products[0]),
    }))
  }

  const heroSlides = buildHeroSlides()
  const slideCount = heroSlides.length

  useEffect(() => {
    if (slideCount <= 1) return
    const timer = setInterval(() => {
      setHeroIndex((current) => (current + 1) % slideCount)
    }, HERO_ROTATE_MS)
    return () => clearInterval(timer)
  }, [slideCount])

  function stepHero(direction: number) {
    setHeroIndex((current) => (current + direction + slideCount) % slideCount)
  }

  function categoryEyebrow(name: string) {
    const key = `home.categoryLabels.${name}`
    const value = t(key)
    return value === key ? t('home.sectionEyebrow') : value
  }

  function scrollCategories(direction: 'left' | 'right') {
    const scroller = categoryScroller.current
    if (!scroller) return

    const amount = scroller.clientWidth * 0.8
    const offset = direction === 'right' ? amount : -amount

    scroller.scrollBy({
      left: isRTL ? -offset : offset,
      behavior: 'smooth',
    })
  }

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

  const slide = heroSlides[heroIndex % slideCount]

  return (
    <div className="home-page">
      <Seo
        description={t('seo.home.description')}
        fullTitle
        image={slide.image}
        imageAlt={t('home.storyImageAlt')}
        jsonLd={[
          itemListSchema(
            featuredProducts.map((product) => ({
              name: localized(product.name, product.name_ar),
              path: productPath(product.id),
            })),
            t('home.featuredTitle'),
          ),
        ]}
        keywords={[
          t('meta.brand'),
          t('nav.shop'),
          t('nav.offers'),
          t('products.sectionCategory'),
        ]}
        path="/"
        title={`${t('meta.brand')} — ${t('seo.home.title')}`}
      />
      <section className="home-hero">
        <img
          alt=""
          className="home-hero__image"
          fetchPriority="high"
          key={slide.id}
          src={slide.image}
        />
        <div className="home-hero__veil" />
        <div className="home-hero__content">
          {slide.eyebrow && (
            <span className="home-eyebrow">{slide.eyebrow}</span>
          )}
          <h1>{slide.title}</h1>
          {slide.body && <p>{slide.body}</p>}
          <Link className="home-button" to={slide.link}>
            {slide.cta}
            <ArrowForward className="rtl-flip" />
          </Link>
          <div className="home-hero__note">
            <span />
            {t('home.heroNote')}
          </div>
        </div>

        {slideCount > 1 && (
          <div className="home-hero__controls">
            <button
              aria-label={t('home.heroPrev')}
              className="home-hero__arrow"
              onClick={() => stepHero(-1)}
              type="button"
            >
              <ArrowBack className="rtl-flip" />
            </button>
            <div className="home-hero__dots">
              {heroSlides.map((item, index) => (
                <button
                  aria-current={index === heroIndex % slideCount}
                  aria-label={t('home.heroSlide', {
                    current: index + 1,
                    total: slideCount,
                  })}
                  className={index === heroIndex % slideCount ? 'is-active' : ''}
                  key={item.id}
                  onClick={() => setHeroIndex(index)}
                  type="button"
                />
              ))}
            </div>
            <button
              aria-label={t('home.heroNext')}
              className="home-hero__arrow"
              onClick={() => stepHero(1)}
              type="button"
            >
              <ArrowForward className="rtl-flip" />
            </button>
          </div>
        )}

        <div aria-hidden="true" className="home-hero__index">
          <span>{String((heroIndex % slideCount) + 1).padStart(2, '0')}</span>
          <i />
          {String(slideCount).padStart(2, '0')}
        </div>
      </section>

      <section aria-label={t('home.benefitsAria')} className="home-benefits">
        <div>
          <LocalShippingOutlined />
          <span>
            <strong>{t('home.benefit1Title')}</strong>
            {t('home.benefit1Text')}
          </span>
        </div>
        <span aria-hidden="true" className="home-benefits__divider" />
        <div>
          <AutoAwesome />
          <span>
            <strong>{t('home.benefit2Title')}</strong>
            {t('home.benefit2Text')}
          </span>
        </div>
      </section>

      <section className="home-categories">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">{t('home.categoriesEyebrow')}</span>
            <h2>{t('home.categoriesTitle')}</h2>
          </div>
          <div className="home-categories__heading-actions">
            <div
              aria-label={t('home.scrollAria')}
              className="home-category-controls"
            >
              <button
                aria-label={t('home.scrollLeft')}
                onClick={() => scrollCategories('left')}
                type="button"
              >
                <ArrowBack className="rtl-flip" />
              </button>
              <button
                aria-label={t('home.scrollRight')}
                onClick={() => scrollCategories('right')}
                type="button"
              >
                <ArrowForward className="rtl-flip" />
              </button>
            </div>
            <Link className="home-text-link" to="/products">
              {t('home.viewEverything')} <ArrowForward className="rtl-flip" />
            </Link>
          </div>
        </div>

        <div
          aria-label={t('home.browseAria')}
          className="home-category-scroller"
          ref={categoryScroller}
          tabIndex={0}
        >
          <div className="home-category-grid">
            {categories.map((category, index) => (
              <Link
                className="home-category-card"
                key={category.name}
                to={`/products?search=${encodeURIComponent(category.name)}`}
              >
                <img alt="" loading="lazy" src={category.image} />
                <span className="home-category-card__number">
                  0{index + 1}
                </span>
                <div>
                  <span>{categoryEyebrow(category.name)}</span>
                  <h3>{category.label}</h3>
                </div>
                <span aria-hidden="true" className="home-category-card__arrow">
                  <ArrowForward className="rtl-flip" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-featured">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">{t('home.featuredEyebrow')}</span>
            <h2>{t('home.featuredTitle')}</h2>
            <p>{t('home.featuredText')}</p>
          </div>
          <Link className="home-text-link" to="/products">
            {t('home.shopAll')} <ArrowForward className="rtl-flip" />
          </Link>
        </div>

        <div className="home-product-grid">
          {featuredProducts.map((product) => {
            const name = localized(product.name, product.name_ar)
            return (
              <Link
                className="home-product-card"
                key={product.id}
                to={`/products/${product.id}`}
              >
                <div className="home-product-card__image">
                  <img alt={name} loading="lazy" src={coverImage(product)} />
                  {product.originalPrice && (
                    <span>
                      -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                    </span>
                  )}
                </div>
                <div className="home-product-card__details">
                  <span>{localized(product.brand, product.brand_ar)}</span>
                  <h3>{name}</h3>
                  <div>
                    <strong>{currency(product.price)}</strong>
                    {product.originalPrice && (
                      <del>{currency(product.originalPrice)}</del>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="home-category-products">
        {shareMessage && (
          <div className="home-category-products__notice" role="status">
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
        {productCategories.map((category) => {
          const categoryProducts = products.filter(
            (product) => product.category === category,
          )
          const categoryName = localized(
            category,
            categoryProducts[0]?.category_ar,
          )

          return (
            <section
              aria-labelledby={`home-category-${category}`}
              className="home-category-products__section"
              key={category}
            >
              <div className="home-section-heading">
                <div>
                  <span className="home-eyebrow">
                    {categoryEyebrow(category)}
                  </span>
                  <h2 id={`home-category-${category}`}>{categoryName}</h2>
                </div>
                <Link
                  className="home-text-link"
                  to={`/products?search=${encodeURIComponent(category)}`}
                >
                  {t('home.shopCategory', { category: categoryName })}{' '}
                  <ArrowForward className="rtl-flip" />
                </Link>
              </div>
              <div className="product-grid home-category-products__grid">
                {categoryProducts.map((product) => (
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
            </section>
          )
        })}
      </div>

      <section className="home-story">
        <div className="home-story__mark" aria-hidden="true">
          L
        </div>
        <div className="home-story__content">
          <span className="home-eyebrow">{t('home.storyEyebrow')}</span>
          <h2>{t('home.storyTitle')}</h2>
          <p>{t('home.storyText')}</p>
          <Link className="home-text-link" to="/products">
            {t('home.storyCta')} <ArrowForward className="rtl-flip" />
          </Link>
        </div>
        <div className="home-story__image">
          <img
            alt={t('home.storyImageAlt')}
            loading="lazy"
            src={coverImage(
              products.find((product) => product.id === 'crossbody-bag'),
            )}
          />
        </div>
      </section>
    </div>
  )
}

export default HomePage

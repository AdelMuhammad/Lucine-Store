import { useState, type CSSProperties, type FormEvent } from 'react'
import {
  Add,
  ArrowBack,
  Check,
  Favorite,
  FavoriteBorder,
  Remove,
  ShareOutlined,
  ShoppingBagOutlined,
  Star,
} from '@mui/icons-material'
import { Link, Navigate, useParams } from 'react-router-dom'
import { isAvailable } from './data/products'
import { useProductStore } from './store/useProductStore'
import { useCartStore } from './store/useCartStore'
import { useWishlistStore } from './store/useWishlistStore'
import { referralProductLink } from '../account/rewards'
import { useAccountStore } from '../account/store/useAccountStore'
import { useReviewStore, summarizeReviews, type ProductReview } from './store/useReviewStore'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import {
  breadcrumbSchema,
  languageUrl,
  productPath,
  productSchema,
} from '../../lib/seo'
import './ProductDetailsPage.css'

function createProductReview(
  details: Omit<ProductReview, 'id' | 'createdAt' | 'status'>,
): ProductReview {
  return {
    ...details,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'published',
  }
}

function ProductDetailsPage() {
  const { t, localized, currency, number, date, language } = useTranslation()
  const { productId } = useParams()
  const products = useProductStore((state) => state.products)
  const product = products.find((item) => item.id === productId)
  // Published and (when stock is tracked) at least one unit on hand.
  const available = isAvailable(product)
  // The most a shopper may add once stock is tracked, or `Infinity`.
  const stockLimit = product?.stockQuantity ?? Number.POSITIVE_INFINITY
  const [selectedColor, setSelectedColor] = useState(product?.colors[0]?.name ?? '')
  const [selectedSize, setSelectedSize] = useState(product?.sizes[0] ?? '')
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [message, setMessage] = useState('')
  const addItem = useCartStore((state) => state.addItem)
  const savedProductIds = useWishlistStore((state) => state.savedProductIds)
  const toggleSaved = useWishlistStore((state) => state.toggleSaved)
  const createReferralCode = useAccountStore((state) => state.createReferralCode)
  const profile = useAccountStore((state) => state.profile)
  const reviews = useReviewStore((state) => state.reviews)
  const addReview = useReviewStore((state) => state.addReview)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewAuthor, setReviewAuthor] = useState(
    `${profile.firstName} ${profile.lastName}`.trim(),
  )
  const [reviewEmail, setReviewEmail] = useState(profile.email)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewThanks, setReviewThanks] = useState(false)

  if (!product) {
    return <Navigate replace to="/products" />
  }

  const name = localized(product.name, product.name_ar)
  const images = product.listImage.length > 0 ? product.listImage : ['']
  const currentImage = images[Math.min(activeImage, images.length - 1)]
  const isSaved = savedProductIds.includes(product.id)
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null
  const selectedColorLabel =
    product.colors.find((color) => color.name === selectedColor)?.name_ar ??
    selectedColor
  const reviewSummary = summarizeReviews(product, reviews)
  const brandLabel = localized(product.brand, product.brand_ar)
  const categoryLabel = localized(product.category, product.category_ar)
  const productDescription = localized(product.description, product.description_ar)
  const canonical = languageUrl(productPath(product.id), language)
  const seoDescription = t('seo.product.description', {
    name,
    brand: brandLabel,
    description: productDescription,
  }).slice(0, 160)

  async function shareProduct() {
    if (!product) {
      return
    }

    const code = createReferralCode()
    const shareData = {
      title: name,
      text: `${localized(product.description, product.description_ar)} Use my referral link for 10% off.`,
      url: referralProductLink(product.id, code),
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url)
        setMessage(t('share.linkCopied'))
      } else {
        setMessage(t('share.unavailable'))
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      setMessage(t('share.failed'))
    }
  }

  function addToBag() {
    if (!product) {
      return
    }

    addItem(product.id, quantity)
    setMessage(t('productDetail.added', { quantity, name }))
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!product) return

    if (
      reviewRating === 0 ||
      !reviewAuthor.trim() ||
      !reviewEmail.trim() ||
      !reviewComment.trim()
    ) {
      setReviewError(t('productDetail.reviewError'))
      setReviewThanks(false)
      return
    }

    addReview(
      createProductReview({
        productId: product.id,
        authorName: reviewAuthor.trim(),
        authorEmail: reviewEmail.trim(),
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
      }),
    )

    setReviewRating(0)
    setReviewTitle('')
    setReviewComment('')
    setReviewError('')
    setReviewThanks(true)
  }

  return (
    <article className="product-detail">
      <Seo
        description={seoDescription}
        image={currentImage}
        imageAlt={name}
        jsonLd={[
          productSchema({
            product,
            name,
            description: productDescription,
            category: categoryLabel,
            brand: brandLabel,
            canonical,
          }),
          breadcrumbSchema([
            { name: t('productDetail.home'), path: '/' },
            { name: t('productDetail.shop'), path: '/products' },
            { name, path: productPath(product.id) },
          ]),
        ]}
        keywords={[name, brandLabel, categoryLabel]}
        path={productPath(product.id)}
        title={t('seo.product.title', { name, brand: brandLabel })}
        type="product"
      />
      <nav
        aria-label={t('productDetail.breadcrumbAria')}
        className="product-detail__breadcrumb"
      >
        <Link to="/">{t('productDetail.home')}</Link>
        <span aria-hidden="true">/</span>
        <Link to="/products">{t('productDetail.shop')}</Link>
        <span aria-hidden="true">/</span>
        <span>{localized(product.category, product.category_ar)}</span>
      </nav>

      <Link className="product-detail__back" to="/products">
        <ArrowBack aria-hidden="true" className="rtl-flip" />
        {t('productDetail.back')}
      </Link>

      <div className="product-detail__layout">
        <div className="product-detail__gallery">
          <div className="product-detail__image">
            <img alt={name} fetchPriority="high" src={currentImage} />
            {discount !== null && (
              <span className="product-detail__discount">-{discount}%</span>
            )}
          </div>
          {images.length > 1 && (
            <div
              aria-label={t('productDetail.galleryAria')}
              className="product-detail__thumbnails"
              role="listbox"
            >
              {images.map((image, index) => (
                <button
                  aria-label={t('productDetail.thumbnailAria', {
                    index: index + 1,
                  })}
                  aria-selected={index === activeImage}
                  className={`product-detail__thumbnail${index === activeImage ? ' is-selected' : ''}`}
                  key={`${image}-${index}`}
                  onClick={() => setActiveImage(index)}
                  role="option"
                  type="button"
                >
                  <img alt="" loading="lazy" src={image} />
                </button>
              ))}
            </div>
          )}
          <div className="product-detail__image-note">
            <span>{t('productDetail.imageNoteEyebrow')}</span>
            <span>{t('productDetail.imageNoteText')}</span>
          </div>
        </div>

        <div className="product-detail__information">
          <span className="product-detail__brand">
            {localized(product.brand, product.brand_ar)}
          </span>
          <div className="product-detail__title-row">
            <h1>{name}</h1>
            <button
              aria-label={
                isSaved ? t('productDetail.removeSaved') : t('productDetail.save')
              }
              aria-pressed={isSaved}
              className={`product-detail__icon-button${isSaved ? ' is-saved' : ''}`}
              onClick={() => toggleSaved(product.id)}
              type="button"
            >
              {isSaved ? <Favorite /> : <FavoriteBorder />}
            </button>
          </div>

          <div className="product-detail__rating">
            <span
              className="product-detail__rating-stars"
              aria-label={t('productDetail.ratingAria', {
                rating: number(reviewSummary.average, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }),
              })}
            >
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  className={
                    index < Math.round(reviewSummary.average) ? 'is-filled' : ''
                  }
                  key={index}
                />
              ))}
            </span>
            <strong>
              {number(reviewSummary.average, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </strong>
            <a href="#product-reviews">
              ({t('productDetail.reviews', { count: number(reviewSummary.count) })})
            </a>
          </div>

          <div className="product-detail__price-row">
            <span className="product-detail__price">
              {currency(product.price)}
            </span>
            {product.originalPrice && (
              <span className="product-detail__original-price">
                {currency(product.originalPrice)}
              </span>
            )}
            {discount !== null && (
              <span className="product-detail__save">
                {t('productDetail.save_amount', { percent: discount })}
              </span>
            )}
          </div>

          <p className="product-detail__description">
            {localized(product.description, product.description_ar)}
          </p>

          <div className="product-detail__availability">
            <span
              className={`product-detail__availability-dot${available ? '' : ' is-unavailable'}`}
            />
            {available
              ? t('productDetail.inStock')
              : t('productDetail.soldOut')}
          </div>

          <section
            aria-labelledby="detail-color-title"
            className="product-detail__option"
          >
            <div className="product-detail__option-heading">
              <h2 id="detail-color-title">{t('productDetail.color')}</h2>
              <span>{localized(selectedColor, selectedColorLabel)}</span>
            </div>
            <div className="product-detail__swatches">
              {product.colors.map((color) => {
                const colorName = localized(color.name, color.name_ar)
                return (
                  <button
                    aria-label={colorName}
                    aria-pressed={selectedColor === color.name}
                    className={`product-detail__swatch${selectedColor === color.name ? ' is-selected' : ''}`}
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    style={{ '--swatch-color': color.hex } as CSSProperties}
                    title={colorName}
                    type="button"
                  />
                )
              })}
            </div>
          </section>

          <section
            aria-labelledby="detail-size-title"
            className="product-detail__option"
          >
            <div className="product-detail__option-heading">
              <h2 id="detail-size-title">{t('productDetail.size')}</h2>
              {product.sizes.length > 1 && (
                <button className="product-detail__size-guide" type="button">
                  {t('productDetail.sizeGuide')}
                </button>
              )}
            </div>
            <div className="product-detail__sizes">
              {product.sizes.map((size) => (
                <button
                  aria-pressed={selectedSize === size}
                  className={`product-detail__size${selectedSize === size ? ' is-selected' : ''}`}
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  type="button"
                >
                  {size === 'One size' ? t('sizes.oneSize') : size}
                </button>
              ))}
            </div>
          </section>

          <div className="product-detail__purchase">
            <div
              aria-label={t('productDetail.quantity')}
              className="product-detail__quantity"
            >
              <button
                aria-label={t('productDetail.decrease')}
                disabled={quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                type="button"
              >
                <Remove />
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                aria-label={t('productDetail.increase')}
                disabled={quantity >= stockLimit}
                onClick={() =>
                  setQuantity((current) => Math.min(stockLimit, current + 1))
                }
                type="button"
              >
                <Add />
              </button>
            </div>
            <button
              className="product-detail__add-button"
              disabled={!available}
              onClick={addToBag}
              type="button"
            >
              <ShoppingBagOutlined />
              {available ? t('productDetail.addToBag') : t('productDetail.notify')}
            </button>
            <button
              aria-label={t('productCard.shareTitle')}
              className="product-detail__icon-button product-detail__share"
              onClick={shareProduct}
              type="button"
            >
              <ShareOutlined />
            </button>
          </div>

          {message && (
            <div className="product-detail__message" role="status">
              <Check />
              <span>{message}</span>
              <button onClick={() => setMessage('')} type="button">
                {t('productDetail.dismiss')}
              </button>
            </div>
          )}

          <div className="product-detail__perks">
            <div>
              <span className="product-detail__perk-icon">01</span>
              <span>{t('productDetail.perk1')}</span>
            </div>
            <div>
              <span className="product-detail__perk-icon">02</span>
              <span>{t('productDetail.perk2')}</span>
            </div>
            <div>
              <span className="product-detail__perk-icon">03</span>
              <span>{t('productDetail.perk3')}</span>
            </div>
          </div>

          <section className="product-detail__description-block">
            <h2>{t('productDetail.detailsTitle')}</h2>
            <p>{localized(product.description, product.description_ar)}</p>
            <p>{t('productDetail.detailsText')}</p>
          </section>

          <section className="product-detail__reviews" id="product-reviews">
            <h2>{t('productDetail.reviewsTitle')}</h2>
            <div className="product-detail__reviews-summary">
              <Star />
              <strong>
                {number(reviewSummary.average, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </strong>
              <span>
                {t('productDetail.basedOn', {
                  count: number(reviewSummary.count),
                })}
              </span>
            </div>

            {reviewSummary.reviews.length > 0 ? (
              <ul className="product-detail__review-list">
                {reviewSummary.reviews.map((review) => (
                  <li className="product-detail__review" key={review.id}>
                    <div className="product-detail__review-head">
                      <span
                        aria-hidden="true"
                        className="product-detail__review-avatar"
                      >
                        {review.authorName.trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="product-detail__review-meta">
                        <strong>{review.authorName}</strong>
                        <span>{date(review.createdAt, 'medium')}</span>
                      </div>
                      <span
                        aria-label={t('productDetail.ratingAria', {
                          rating: number(review.rating),
                        })}
                        className="product-detail__review-stars"
                      >
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            className={index < review.rating ? 'is-filled' : ''}
                            key={index}
                          />
                        ))}
                      </span>
                    </div>
                    {localized(review.title, review.title_ar) && (
                      <h3>{localized(review.title, review.title_ar)}</h3>
                    )}
                    <p>{localized(review.comment, review.comment_ar)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="product-detail__review-empty">
                {t('productDetail.reviewsEmpty')}
              </p>
            )}

            <form className="product-detail__review-form" onSubmit={submitReview}>
              <h3>{t('productDetail.writeReviewTitle')}</h3>
              <p>{t('productDetail.reviewFormHint')}</p>

              <div
                aria-label={t('productDetail.reviewRatingLabel')}
                className="product-detail__review-stars-input"
                role="radiogroup"
              >
                {Array.from({ length: 5 }, (_, index) => {
                  const value = index + 1
                  return (
                    <button
                      aria-checked={reviewRating === value}
                      aria-label={t('productDetail.starAria', {
                        count: number(value),
                      })}
                      className={value <= reviewRating ? 'is-filled' : ''}
                      key={value}
                      onClick={() => setReviewRating(value)}
                      role="radio"
                      type="button"
                    >
                      <Star />
                    </button>
                  )
                })}
              </div>

              <div className="product-detail__review-fields">
                <label>
                  <span>{t('productDetail.reviewNameLabel')}</span>
                  <input
                    onChange={(event) => setReviewAuthor(event.target.value)}
                    value={reviewAuthor}
                  />
                </label>
                <label>
                  <span>{t('productDetail.reviewEmailLabel')}</span>
                  <input
                    dir="ltr"
                    onChange={(event) => setReviewEmail(event.target.value)}
                    type="email"
                    value={reviewEmail}
                  />
                </label>
                <label className="is-full">
                  <span>{t('productDetail.reviewTitleLabel')}</span>
                  <input
                    onChange={(event) => setReviewTitle(event.target.value)}
                    value={reviewTitle}
                  />
                </label>
                <label className="is-full">
                  <span>{t('productDetail.reviewCommentLabel')}</span>
                  <textarea
                    onChange={(event) => setReviewComment(event.target.value)}
                    rows={4}
                    value={reviewComment}
                  />
                </label>
              </div>

              {reviewError && (
                <p className="product-detail__review-error">{reviewError}</p>
              )}
              {reviewThanks && (
                <p className="product-detail__review-thanks">
                  {t('productDetail.reviewThanks')}
                </p>
              )}

              <button className="product-detail__review-submit" type="submit">
                {t('productDetail.reviewSubmit')}
              </button>
            </form>
          </section>
        </div>
      </div>
    </article>
  )
}

export default ProductDetailsPage

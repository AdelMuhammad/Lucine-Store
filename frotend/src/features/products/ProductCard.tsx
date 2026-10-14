import type { CSSProperties } from 'react'
import {
  Check,
  Favorite,
  FavoriteBorder,
  ShareOutlined,
  Star,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { coverImage, isAvailable, type Product } from './data/products'
import { useTranslation } from '../../hooks/useTranslation'
import './ProductsPage.css'

export type ProductCardProps = {
  product: Product
  isSaved: boolean
  view: 'grid' | 'list'
  onSave: (productId: string) => void
  onShare: (product: Product) => void
}

function ProductCard({
  product,
  isSaved,
  view,
  onSave,
  onShare,
}: ProductCardProps) {
  const { t, localized, currency, number } = useTranslation()
  const name = localized(product.name, product.name_ar)
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null
  // Stock-aware: a published product with a tracked quantity of 0 is sold out.
  const available = isAvailable(product)

  return (
    <article className={`product-card product-card--${view}`}>
      <div className="product-card__media">
        <Link
          aria-label={t('productCard.viewAria', { name })}
          className="product-card__image-link"
          to={`/products/${product.id}`}
        >
          <img alt={name} loading="lazy" src={coverImage(product)} />
        </Link>
        <span className="product-card__category">
          {localized(product.category, product.category_ar)}
        </span>
        {discount !== null && (
          <span
            aria-label={t('productCard.discountAria', { percent: discount })}
            className="product-card__discount"
          >
            -{discount}%
          </span>
        )}
        {!available && (
          <span className="product-card__stock">{t('productCard.soldOut')}</span>
        )}
        <div className="product-card__actions">
          <button
            aria-label={
              isSaved ? t('productCard.removeSaved') : t('productCard.save')
            }
            aria-pressed={isSaved}
            className={`product-card__icon-button${isSaved ? ' is-saved' : ''}`}
            onClick={() => onSave(product.id)}
            title={isSaved ? t('productCard.removeSaved') : t('productCard.save')}
            type="button"
          >
            {isSaved ? <Favorite /> : <FavoriteBorder />}
          </button>
          <button
            aria-label={t('productCard.share', { name })}
            className="product-card__icon-button"
            onClick={() => onShare(product)}
            title={t('productCard.shareTitle')}
            type="button"
          >
            <ShareOutlined />
          </button>
        </div>
      </div>

      <div className="product-card__content">
        <div className="product-card__brand">
          {localized(product.brand, product.brand_ar)}
        </div>
        <h2>
          <Link className="product-card__title-link" to={`/products/${product.id}`}>
            {name}
          </Link>
        </h2>
        <p className="product-card__description">
          {localized(product.description, product.description_ar)}
        </p>
        <div className="product-card__rating">
          <Star aria-hidden="true" />
          <span>
            {number(product.rating, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </span>
          <span className="product-card__review-count">
            ({number(product.reviewCount)})
          </span>
        </div>
        <div
          aria-label={t('productCard.availableColors')}
          className="product-card__colors"
        >
          {product.colors.map((color) => {
            const colorName = localized(color.name, color.name_ar)
            return (
              <span
                aria-label={colorName}
                className="product-card__color"
                key={color.name}
                style={{ '--swatch-color': color.hex } as CSSProperties}
                title={colorName}
              />
            )
          })}
        </div>
        <div className="product-card__bottom">
          <div className="product-card__prices">
            <span className="product-card__price">{currency(product.price)}</span>
            {product.originalPrice && (
              <span className="product-card__original-price">
                {currency(product.originalPrice)}
              </span>
            )}
          </div>
          <span
            className={`product-card__availability${available ? '' : ' is-unavailable'}`}
          >
            <Check aria-hidden="true" />
            {available ? t('productCard.inStock') : t('productCard.soldOut')}
          </span>
        </div>
      </div>
    </article>
  )
}

export default ProductCard

import { Drawer } from '@mui/material'
import {
  ArrowForward,
  Close,
  DeleteOutlined,
  FavoriteBorder,
} from '@mui/icons-material'
import { NavLink } from 'react-router-dom'
import { useProductStore } from '../../features/products/store/useProductStore'
import { useWishlistStore } from '../../features/products/store/useWishlistStore'
import { coverImage } from '../../features/products/data/products'
import { useTranslation } from '../../hooks/useTranslation'
import './StoreDrawers.css'

type DrawerSavedProps = {
  open: boolean
  onClose: () => void
}

function DrawerSaved({ open, onClose }: DrawerSavedProps) {
  const { t, localized, currency, isRTL } = useTranslation()
  const savedProductIds = useWishlistStore((state) => state.savedProductIds)
  const products = useProductStore((state) => state.products)
  const removeSaved = useWishlistStore((state) => state.removeSaved)
  const savedProducts = products.filter((product) =>
    savedProductIds.includes(product.id),
  )

  return (
    <Drawer
      anchor={isRTL ? 'left' : 'right'}
      className="store-drawer"
      onClose={onClose}
      open={open}
    >
      <section
        aria-labelledby="saved-drawer-title"
        className="store-drawer__panel"
      >
        <header className="store-drawer__header">
          <div>
            <span className="store-drawer__eyebrow">{t('saved.eyebrow')}</span>
            <h2 id="saved-drawer-title">{t('saved.title')}</h2>
          </div>
          <button
            aria-label={t('saved.closeAria')}
            className="store-drawer__close"
            onClick={onClose}
            type="button"
          >
            <Close />
          </button>
        </header>

        {savedProducts.length > 0 ? (
          <div aria-label={t('saved.productsAria')} className="store-saved-list">
            {savedProducts.map((product) => {
              const name = localized(product.name, product.name_ar)
              return (
                <article className="store-saved-item" key={product.id}>
                  <img alt="" src={coverImage(product)} />
                  <div className="store-saved-item__details">
                    <span>{localized(product.brand, product.brand_ar)}</span>
                    <h3>{name}</h3>
                    <strong>{currency(product.price)}</strong>
                  </div>
                  <button
                    aria-label={t('saved.removeAria', { name })}
                    className="store-saved-item__remove"
                    onClick={() => removeSaved(product.id)}
                    type="button"
                  >
                    <DeleteOutlined />
                  </button>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="store-drawer__empty">
            <div className="store-drawer__illustration store-drawer__illustration--rose">
              <FavoriteBorder />
            </div>
            <span className="store-drawer__eyebrow">{t('saved.emptyEyebrow')}</span>
            <h3>{t('saved.emptyTitle')}</h3>
            <p>{t('saved.emptyText')}</p>
            <NavLink
              className="store-drawer__primary-action"
              onClick={onClose}
              to="/products"
            >
              {t('saved.cta')}
              <ArrowForward className="rtl-flip" />
            </NavLink>
          </div>
        )}

        <footer className="store-drawer__footer">
          <span>{t('saved.deliveryNote')}</span>
        </footer>
      </section>
    </Drawer>
  )
}

export default DrawerSaved

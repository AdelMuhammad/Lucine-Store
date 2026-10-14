import { Drawer } from '@mui/material'
import {
  Add,
  ArrowForward,
  Close,
  DeleteOutlined,
  Remove,
  ShoppingBagOutlined,
} from '@mui/icons-material'
import { NavLink } from 'react-router-dom'
import { useProductStore } from '../../features/products/store/useProductStore'
import { useCartStore } from '../../features/products/store/useCartStore'
import { coverImage } from '../../features/products/data/products'
import { useTranslation } from '../../hooks/useTranslation'
import './StoreDrawers.css'

type DrawerCartProps = {
  open: boolean
  onClose: () => void
}

function DrawerCart({ open, onClose }: DrawerCartProps) {
  const { t, localized, currency, isRTL } = useTranslation()
  const items = useCartStore((state) => state.items)
  const products = useProductStore((state) => state.products)
  const setQuantity = useCartStore((state) => state.setQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const cartProducts = items.flatMap((item) => {
    const product = products.find(({ id }) => id === item.productId)
    return product ? [{ ...product, quantity: item.quantity }] : []
  })
  const subtotal = cartProducts.reduce(
    (total, product) => total + product.price * product.quantity,
    0,
  )

  return (
    <Drawer
      anchor={isRTL ? 'left' : 'right'}
      className="store-drawer"
      onClose={onClose}
      open={open}
    >
      <section aria-labelledby="cart-drawer-title" className="store-drawer__panel">
        <header className="store-drawer__header">
          <div>
            <span className="store-drawer__eyebrow">{t('cart.eyebrow')}</span>
            <h2 id="cart-drawer-title">{t('cart.title')}</h2>
          </div>
          <button
            aria-label={t('cart.closeAria')}
            className="store-drawer__close"
            onClick={onClose}
            type="button"
          >
            <Close />
          </button>
        </header>

        {cartProducts.length > 0 ? (
          <>
            <div aria-label={t('cart.productsAria')} className="store-cart-list">
              {cartProducts.map((product) => {
                const name = localized(product.name, product.name_ar)
                return (
                  <article className="store-cart-item" key={product.id}>
                    <img alt="" src={coverImage(product)} />
                    <div className="store-cart-item__details">
                      <span>{localized(product.brand, product.brand_ar)}</span>
                      <h3>{name}</h3>
                      <strong>{currency(product.price)}</strong>
                      <div
                        aria-label={t('cart.quantityAria', {
                          count: product.quantity,
                        })}
                        className="store-cart-item__quantity"
                      >
                        <button
                          aria-label={t('cart.decreaseAria', { name })}
                          onClick={() =>
                            setQuantity(product.id, product.quantity - 1)
                          }
                          type="button"
                        >
                          <Remove />
                        </button>
                        <span>{product.quantity}</span>
                        <button
                          aria-label={t('cart.increaseAria', { name })}
                          onClick={() =>
                            setQuantity(product.id, product.quantity + 1)
                          }
                          type="button"
                        >
                          <Add />
                        </button>
                      </div>
                    </div>
                    <button
                      aria-label={t('cart.removeAria', { name })}
                      className="store-cart-item__remove"
                      onClick={() => removeItem(product.id)}
                      type="button"
                    >
                      <DeleteOutlined />
                    </button>
                  </article>
                )
              })}
            </div>
            <div className="store-cart-summary">
              <div>
                <span>{t('cart.subtotal')}</span>
                <strong>{currency(subtotal)}</strong>
              </div>
              <p>{t('cart.shippingNote')}</p>
              <NavLink
                className="store-drawer__primary-action"
                onClick={onClose}
                to="/checkout"
              >
                {t('cart.proceed')}
                <ArrowForward className="rtl-flip" />
              </NavLink>
            </div>
          </>
        ) : (
          <div className="store-drawer__empty">
            <div className="store-drawer__illustration">
              <ShoppingBagOutlined />
            </div>
            <span className="store-drawer__eyebrow">{t('cart.emptyEyebrow')}</span>
            <h3>{t('cart.emptyTitle')}</h3>
            <p>{t('cart.emptyText')}</p>
            <NavLink
              className="store-drawer__primary-action"
              onClick={onClose}
              to="/products"
            >
              {t('cart.explore')}
              <ArrowForward className="rtl-flip" />
            </NavLink>
          </div>
        )}

        <footer className="store-drawer__footer">
          <span>{t('cart.deliveryNote')}</span>
        </footer>
      </section>
    </Drawer>
  )
}

export default DrawerCart

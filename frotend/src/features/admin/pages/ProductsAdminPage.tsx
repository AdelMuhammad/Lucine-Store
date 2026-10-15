import { useMemo, useState } from 'react'
import {
  Add,
  DeleteOutlined,
  EditOutlined,
  Inventory2Outlined,
  SearchOutlined,
  VisibilityOutlined,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { useProductStore } from '../../products/store/useProductStore'
import {
  categoryId,
  useCategoryStore,
} from '../../products/store/useCategoryStore'
import {
  coverImage,
  type Product,
  type ProductAgeGroup,
} from '../../products/data/products'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminPagination from '../components/AdminPagination'
import ProductForm from '../components/ProductForm'
import { useTranslation } from '../../../hooks/useTranslation'

type SortOrder = 'newest' | 'oldest' | 'name' | 'price-asc' | 'price-desc'
type StockFilter = 'all' | 'in' | 'out'

const PAGE_SIZE = 8

function ProductsAdminPage() {
  const { t, localized, currency, number } = useTranslation()
  const products = useProductStore((state) => state.products)
  const addProduct = useProductStore((state) => state.addProduct)
  const updateProduct = useProductStore((state) => state.updateProduct)
  const removeProduct = useProductStore((state) => state.removeProduct)
  const categories = useCategoryStore((state) => state.categories)
  const addCategory = useCategoryStore((state) => state.addCategory)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [page, setPage] = useState(1)
  const [formTarget, setFormTarget] = useState<'new' | Product | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  const categoryNames = useMemo(
    () => [
      ...new Set([
        ...categories.map((category) => category.name),
        ...products.map((product) => product.category),
      ]),
    ],
    [categories, products],
  )
  const categoryLabels = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach((category) => {
      map.set(category.name, category.name_ar || category.name)
    })
    products.forEach((product) => {
      if (!map.has(product.category)) {
        map.set(product.category, product.category_ar || product.category)
      }
    })
    return map
  }, [categories, products])
  const brandNames = useMemo(
    () => [...new Set(products.map((product) => product.brand))],
    [products],
  )
  const ageGroups = useMemo<ProductAgeGroup[]>(() => {
    const seen = new Map<string, ProductAgeGroup>()
    products.forEach((product) =>
      product.ageGroups.forEach((group) => {
        if (!seen.has(group.name)) seen.set(group.name, group)
      }),
    )
    return [...seen.values()]
  }, [products])
  const productIds = useMemo(
    () => products.map((product) => product.id),
    [products],
  )

  function categoryLabel(name: string) {
    return localized(name, categoryLabels.get(name))
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const matching = products.filter((product) => {
      const matchesQuery =
        !query ||
        [
          product.name,
          product.name_ar,
          product.brand,
          product.brand_ar,
          product.category,
          product.category_ar,
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query)
      const matchesCategory =
        categoryFilter === 'all' || product.category === categoryFilter
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in' ? product.inStock : !product.inStock)

      return matchesQuery && matchesCategory && matchesStock
    })

    return matching.toSorted((first, second) => {
      switch (sort) {
        case 'oldest':
          return first.createdAt.localeCompare(second.createdAt)
        case 'name':
          return first.name.localeCompare(second.name)
        case 'price-asc':
          return first.price - second.price
        case 'price-desc':
          return second.price - first.price
        default:
          return second.createdAt.localeCompare(first.createdAt)
      }
    })
  }, [categoryFilter, products, search, sort, stockFilter])

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pagedProducts = filteredProducts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  function resetToFirstPage() {
    setPage(1)
  }

  async function handleSave(nextProduct: Product) {
    const isEditing = formTarget !== null && formTarget !== 'new'
    const categoryExists = categories.some(
      (category) =>
        category.name.toLocaleLowerCase() ===
        nextProduct.category.toLocaleLowerCase(),
    )

    if (!categoryExists) {
      addCategory({
        id: categoryId(nextProduct.category),
        name: nextProduct.category,
        name_ar: nextProduct.category_ar || nextProduct.category,
        description: '',
        description_ar: '',
      })
    }

    if (isEditing) {
      const result = await updateProduct(nextProduct)
      setStatusMessage(
        result.ok
          ? t('admin.productUpdated', { name: nextProduct.name })
          : t('admin.productSaveFailed', { name: nextProduct.name }),
      )
    } else {
      const result = await addProduct(nextProduct)
      setStatusMessage(
        result.ok
          ? t('admin.productAdded', { name: nextProduct.name })
          : t('admin.productSaveFailed', { name: nextProduct.name }),
      )
    }
    setFormTarget(null)
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      t('admin.deleteProductConfirm', { name: product.name }),
    )
    if (!confirmed) return

    const result = await removeProduct(product.id)
    setStatusMessage(
      result.ok
        ? t('admin.productDeleted', { name: product.name })
        : t('admin.productDeleteFailed', { name: product.name }),
    )
  }

  return (
    <>
      <AdminPageHeader
        actions={
          <button
            className="admin-btn admin-btn--primary"
            onClick={() => setFormTarget('new')}
            type="button"
          >
            <Add /> {t('admin.addProduct')}
          </button>
        }
        description={t('admin.productsDescription')}
        eyebrow={t('admin.productsEyebrow')}
        title={t('admin.productsTitle')}
      />

      {statusMessage && (
        <div className="admin-status-notice" role="status">
          <span>{statusMessage}</span>
          <button
            aria-label={t('admin.dismissMessage')}
            onClick={() => setStatusMessage('')}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <SearchOutlined aria-hidden="true" />
          <input
            aria-label={t('admin.searchProductsAria')}
            onChange={(event) => {
              setSearch(event.target.value)
              resetToFirstPage()
            }}
            placeholder={t('admin.searchProductsPlaceholder')}
            type="search"
            value={search}
          />
        </label>

        <label>
          <span className="visually-hidden">{t('admin.filterByCategory')}</span>
          <select
            aria-label={t('admin.filterByCategory')}
            className="admin-toolbar__select"
            onChange={(event) => {
              setCategoryFilter(event.target.value)
              resetToFirstPage()
            }}
            value={categoryFilter}
          >
            <option value="all">{t('admin.allCategories')}</option>
            {categoryNames.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="visually-hidden">{t('admin.filterByStock')}</span>
          <select
            aria-label={t('admin.filterByStock')}
            className="admin-toolbar__select"
            onChange={(event) => {
              setStockFilter(event.target.value as StockFilter)
              resetToFirstPage()
            }}
            value={stockFilter}
          >
            <option value="all">{t('admin.allStock')}</option>
            <option value="in">{t('admin.inStock')}</option>
            <option value="out">{t('admin.outOfStock')}</option>
          </select>
        </label>

        <label>
          <span className="visually-hidden">{t('admin.sortProducts')}</span>
          <select
            aria-label={t('admin.sortProducts')}
            className="admin-toolbar__select"
            onChange={(event) => setSort(event.target.value as SortOrder)}
            value={sort}
          >
            <option value="newest">{t('admin.sortNewest')}</option>
            <option value="oldest">{t('admin.sortOldest')}</option>
            <option value="name">{t('admin.sortName')}</option>
            <option value="price-asc">{t('admin.sortPriceAsc')}</option>
            <option value="price-desc">{t('admin.sortPriceDesc')}</option>
          </select>
        </label>

        <span className="admin-toolbar__count">
          {t('admin.productCount', { count: number(filteredProducts.length) })}
        </span>
      </div>

      <section className="admin-card">
        {pagedProducts.length > 0 ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.thProduct')}</th>
                    <th>{t('admin.thCategory')}</th>
                    <th>{t('admin.thPrice')}</th>
                    <th>{t('admin.thStock')}</th>
                    <th>{t('admin.thRating')}</th>
                    <th aria-label={t('admin.thActions')} />
                  </tr>
                </thead>
                <tbody>
                  {pagedProducts.map((product) => (
                    <tr key={product.id}>
                      <td
                        className="admin-table__cell--primary"
                        data-label={t('admin.thProduct')}
                      >
                        <div className="admin-table__primary">
                          <img
                            alt=""
                            className="admin-table__thumb"
                            src={coverImage(product)}
                          />
                          <span>
                            <strong>{localized(product.name, product.name_ar)}</strong>
                            <span>{localized(product.brand, product.brand_ar)}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label={t('admin.thCategory')}>
                        {localized(product.category, product.category_ar)}
                      </td>
                      <td data-label={t('admin.thPrice')}>
                        <strong>{currency(product.price)}</strong>
                        {product.originalPrice && (
                          <div className="admin-table__muted">
                            {t('admin.wasPrice', {
                              price: currency(product.originalPrice),
                            })}
                          </div>
                        )}
                      </td>
                      <td data-label={t('admin.thStock')}>
                        <span
                          className={`admin-badge admin-badge--${product.inStock ? 'success' : 'danger'}`}
                        >
                          {product.inStock
                            ? t('admin.badgeInStock')
                            : t('admin.badgeSoldOut')}
                        </span>
                        {typeof product.stockQuantity === 'number' && (
                          <div className="admin-table__muted">
                            {t('admin.onHandUnits', {
                              count: number(product.stockQuantity),
                            })}
                          </div>
                        )}
                      </td>
                      <td data-label={t('admin.thRating')}>
                        {number(product.rating, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                        <span className="admin-table__muted">
                          {' '}
                          ({number(product.reviewCount)})
                        </span>
                      </td>
                      <td data-label={t('admin.thActions')}>
                        <div className="admin-table__actions">
                          <Link
                            aria-label={t('admin.viewProductAria', {
                              name: product.name,
                            })}
                            className="admin-icon-btn"
                            to={`/products/${product.id}`}
                          >
                            <VisibilityOutlined />
                          </Link>
                          <button
                            aria-label={t('admin.editProductAria', {
                              name: product.name,
                            })}
                            className="admin-icon-btn"
                            onClick={() => setFormTarget(product)}
                            type="button"
                          >
                            <EditOutlined />
                          </button>
                          <button
                            aria-label={t('admin.deleteProductAria', {
                              name: product.name,
                            })}
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => handleDelete(product)}
                            type="button"
                          >
                            <DeleteOutlined />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              onPage={setPage}
              page={safePage}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={filteredProducts.length}
            />
          </>
        ) : (
          <div className="admin-empty">
            <Inventory2Outlined />
            <h3>{t('admin.noProductsTitle')}</h3>
            <p>{t('admin.noProductsText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={() => setFormTarget('new')}
              type="button"
            >
              <Add /> {t('admin.addProduct')}
            </button>
          </div>
        )}
      </section>

      {formTarget && (
        <ProductForm
          ageGroups={ageGroups}
          brands={brandNames}
          categories={categoryNames}
          existingIds={productIds}
          onClose={() => setFormTarget(null)}
          onSave={handleSave}
          product={formTarget === 'new' ? undefined : formTarget}
        />
      )}
    </>
  )
}

export default ProductsAdminPage

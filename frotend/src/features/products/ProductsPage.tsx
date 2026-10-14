import { useMemo, useState, type CSSProperties } from 'react'
import {
  Close,
  FilterList,
  GridViewOutlined,
  Star,
  ViewListOutlined,
} from '@mui/icons-material'
import { useSearchParams } from 'react-router-dom'
import { useWishlistStore } from './store/useWishlistStore'
import ProductCard from './ProductCard'
import { referralProductLink } from '../account/rewards'
import { useAccountStore } from '../account/store/useAccountStore'
import { isAvailable, type Product } from './data/products'
import { useProductStore } from './store/useProductStore'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import { breadcrumbSchema, itemListSchema, productPath } from '../../lib/seo'
import './ProductsPage.css'

type SortOrder =
  | 'newest'
  | 'oldest'
  | 'price-low'
  | 'price-high'
  | 'rating'

type FilterOption = {
  value: string
  label: string
}

type FilterOptionsProps = {
  title: string
  options: FilterOption[]
  selected: string[]
  onToggle: (value: string) => void
}

function FilterOptions({
  title,
  options,
  selected,
  onToggle,
}: FilterOptionsProps) {
  return (
    <details className="product-filter__section" open>
      <summary>{title}</summary>
      <div className="product-filter__options">
        {options.map((option) => (
          <label className="product-filter__option" key={option.value}>
            <input
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
              type="checkbox"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </details>
  )
}

function ProductsPage() {
  const { t, localized, currency, number } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const products = useProductStore((state) => state.products)
  const search = searchParams.get('search') ?? ''
  const [sort, setSort] = useState<SortOrder>('newest')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([])
  const [minimumRating, setMinimumRating] = useState(0)
  const [maximumPrice, setMaximumPrice] = useState(350)
  const [inStockOnly, setInStockOnly] = useState(false)
  const savedProductIds = useWishlistStore((state) => state.savedProductIds)
  const toggleSaved = useWishlistStore((state) => state.toggleSaved)
  const createReferralCode = useAccountStore((state) => state.createReferralCode)
  const [shareMessage, setShareMessage] = useState('')

  function categoryLabel(name: string) {
    const withArabic = products.find((product) => product.category === name)
    return localized(name, withArabic?.category_ar)
  }

  function brandLabel(name: string) {
    const withArabic = products.find((product) => product.brand === name)
    return localized(name, withArabic?.brand_ar)
  }

  function ageGroupLabel(name: string) {
    const arabic = products
      .flatMap((product) => product.ageGroups)
      .find((group) => group.name === name)?.name_ar
    if (arabic) return localized(name, arabic)
    const key = `ageGroups.${name}`
    const value = t(key)
    return value === key ? name : value
  }

  function sizeLabel(size: string) {
    return size === 'One size' ? t('sizes.oneSize') : size
  }

  const productCategories = [...new Set(products.map((product) => product.category))]
  const productBrands = [...new Set(products.map((product) => product.brand))]
  const productColors = [
    ...new Map(
      products.flatMap(({ colors }) => colors).map((color) => [color.name, color]),
    ).values(),
  ]
  const productSizes = [...new Set(products.flatMap((product) => product.sizes))]
  const productAgeGroups = [
    ...new Set(products.flatMap((product) => product.ageGroups.map((group) => group.name))),
  ]

  const categoryOptions: FilterOption[] = productCategories.map((name) => ({
    value: name,
    label: categoryLabel(name),
  }))
  const brandOptions: FilterOption[] = productBrands.map((name) => ({
    value: name,
    label: brandLabel(name),
  }))
  const ageGroupOptions: FilterOption[] = productAgeGroups.map((name) => ({
    value: name,
    label: ageGroupLabel(name),
  }))
  const sizeOptions: FilterOption[] = productSizes.map((size) => ({
    value: size,
    label: sizeLabel(size),
  }))

  function toggleSelection(
    value: string,
    selected: string[],
    setSelected: (next: string[]) => void,
  ) {
    setSelected(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    )
  }

  function setSearchValue(value: string) {
    const nextParams = new URLSearchParams(searchParams)
    if (value.trim()) {
      nextParams.set('search', value.trim())
    } else {
      nextParams.delete('search')
    }
    setSearchParams(nextParams, { replace: true })
  }

  function clearFilters() {
    setSelectedCategories([])
    setSelectedBrands([])
    setSelectedColors([])
    setSelectedSizes([])
    setSelectedAgeGroups([])
    setMinimumRating(0)
    setMaximumPrice(350)
    setInStockOnly(false)
    setSearchValue('')
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      setShareMessage(t('share.failed'))
    }
  }

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    const matchingProducts = products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          product.name,
          product.name_ar,
          product.description,
          product.description_ar,
          product.category,
          product.category_ar,
          product.brand,
          product.brand_ar,
          ...product.ageGroups.map((group) => group.name),
          ...product.ageGroups.map((group) => group.name_ar),
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedSearch)

      return (
        matchesSearch &&
        (selectedCategories.length === 0 ||
          selectedCategories.includes(product.category)) &&
        (selectedBrands.length === 0 ||
          selectedBrands.includes(product.brand)) &&
        (selectedColors.length === 0 ||
          product.colors.some((color) => selectedColors.includes(color.name))) &&
        (selectedSizes.length === 0 ||
          product.sizes.some((size) => selectedSizes.includes(size))) &&
        (selectedAgeGroups.length === 0 ||
          product.ageGroups.some((group) =>
            selectedAgeGroups.includes(group.name),
          )) &&
        product.price <= maximumPrice &&
        product.rating >= minimumRating &&
        (!inStockOnly || isAvailable(product))
      )
    })

    return matchingProducts.toSorted((first, second) => {
      switch (sort) {
        case 'oldest':
          return first.createdAt.localeCompare(second.createdAt)
        case 'price-low':
          return first.price - second.price
        case 'price-high':
          return second.price - first.price
        case 'rating':
          return second.rating - first.rating
        default:
          return second.createdAt.localeCompare(first.createdAt)
      }
    })
  }, [
    inStockOnly,
    maximumPrice,
    minimumRating,
    products,
    search,
    selectedAgeGroups,
    selectedBrands,
    selectedCategories,
    selectedColors,
    selectedSizes,
    sort,
  ])

  const activeFilterCount =
    selectedCategories.length +
    selectedBrands.length +
    selectedColors.length +
    selectedSizes.length +
    selectedAgeGroups.length +
    Number(minimumRating > 0) +
    Number(maximumPrice < 350) +
    Number(inStockOnly)

  return (
    <section className="products-page">
      <Seo
        description={t('seo.products.description')}
        jsonLd={[
          itemListSchema(
            filteredProducts.map((product) => ({
              name: localized(product.name, product.name_ar),
              path: productPath(product.id),
            })),
            t('products.title'),
          ),
          breadcrumbSchema([
            { name: t('productDetail.home'), path: '/' },
            { name: t('products.title'), path: '/products' },
          ]),
        ]}
        keywords={[...productCategories, ...productBrands].slice(0, 12)}
        path="/products"
        title={t('seo.products.title')}
      />
      <div className="products-page__heading">
        <div>
          <span className="products-page__eyebrow">{t('products.eyebrow')}</span>
          <h1>{t('products.title')}</h1>
          <p>{t('products.text')}</p>
        </div>
        <span className="products-page__count">
          {t('products.count', { count: number(filteredProducts.length) })}
        </span>
      </div>

      <div className="products-toolbar">
        <button
          aria-expanded={filtersOpen}
          className="products-toolbar__filter-button"
          onClick={() => setFiltersOpen(true)}
          type="button"
        >
          <FilterList />
          {t('products.filters')}
          {activeFilterCount > 0 && (
            <span className="products-toolbar__filter-count">
              {activeFilterCount}
            </span>
          )}
        </button>

        <label className="products-toolbar__search">
          <span className="visually-hidden">{t('products.searchAria')}</span>
          <input
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t('products.searchPlaceholder')}
            type="search"
            value={search}
          />
        </label>

        <label className="products-toolbar__sort">
          <span>{t('products.sortBy')}</span>
          <select
            onChange={(event) => setSort(event.target.value as SortOrder)}
            value={sort}
          >
            <option value="newest">{t('products.sortNewest')}</option>
            <option value="oldest">{t('products.sortOldest')}</option>
            <option value="price-low">{t('products.sortPriceLow')}</option>
            <option value="price-high">{t('products.sortPriceHigh')}</option>
            <option value="rating">{t('products.sortRating')}</option>
          </select>
        </label>

        <div
          aria-label={t('products.displayAria')}
          className="products-toolbar__views"
        >
          <button
            aria-label={t('products.gridView')}
            aria-pressed={view === 'grid'}
            className={view === 'grid' ? 'is-active' : ''}
            onClick={() => setView('grid')}
            type="button"
          >
            <GridViewOutlined />
          </button>
          <button
            aria-label={t('products.listView')}
            aria-pressed={view === 'list'}
            className={view === 'list' ? 'is-active' : ''}
            onClick={() => setView('list')}
            type="button"
          >
            <ViewListOutlined />
          </button>
        </div>
      </div>

      {shareMessage && (
        <div className="products-page__notice" role="status">
          <span>{shareMessage}</span>
          <button
            aria-label={t('common.dismiss')}
            onClick={() => setShareMessage('')}
            type="button"
          >
            <Close />
          </button>
        </div>
      )}

      <div className="products-content">
        {filtersOpen && (
          <button
            aria-label={t('products.closeFilters')}
            className="product-filter__backdrop"
            onClick={() => setFiltersOpen(false)}
            type="button"
          />
        )}
        <aside
          aria-label={t('products.filterAria')}
          className={`product-filter${filtersOpen ? ' is-open' : ''}`}
        >
          <div className="product-filter__heading">
            <h2>{t('products.filterHeading')}</h2>
            <button
              aria-label={t('products.closeFilters')}
              className="product-filter__close"
              onClick={() => setFiltersOpen(false)}
              type="button"
            >
              <Close />
            </button>
          </div>
          <button
            className="product-filter__clear"
            onClick={clearFilters}
            type="button"
          >
            {t('products.clearAll')}
          </button>

          <FilterOptions
            onToggle={(value) =>
              toggleSelection(value, selectedCategories, setSelectedCategories)
            }
            options={categoryOptions}
            selected={selectedCategories}
            title={t('products.sectionCategory')}
          />

          <details className="product-filter__section" open>
            <summary>{t('products.sectionPrice')}</summary>
            <div className="product-filter__price">
              <div className="product-filter__price-labels">
                <span>{currency(0)}</span>
                <span>{t('products.upTo', { price: currency(maximumPrice) })}</span>
              </div>
              <input
                aria-label={t('products.maxPriceAria')}
                max="350"
                min="0"
                onChange={(event) => setMaximumPrice(Number(event.target.value))}
                type="range"
                value={maximumPrice}
              />
              <div className="product-filter__price-inputs">
                <label>
                  <span>{t('products.maxPrice')}</span>
                  <div>
                    <span>$</span>
                    <input
                      max="350"
                      min="0"
                      onChange={(event) =>
                        setMaximumPrice(Number(event.target.value))
                      }
                      type="number"
                      value={maximumPrice}
                    />
                  </div>
                </label>
              </div>
            </div>
          </details>

          <details className="product-filter__section" open>
            <summary>{t('products.sectionRating')}</summary>
            <div className="product-filter__ratings">
              {[4, 3, 2].map((rating) => (
                <label className="product-filter__option" key={rating}>
                  <input
                    checked={minimumRating === rating}
                    name="minimum-rating"
                    onChange={() =>
                      setMinimumRating(
                        minimumRating === rating ? 0 : rating,
                      )
                    }
                    type="radio"
                    value={rating}
                  />
                  <span className="product-filter__stars">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        className={index < rating ? 'is-filled' : ''}
                        key={index}
                      />
                    ))}
                    <span>{t('products.starsUp')}</span>
                  </span>
                </label>
              ))}
            </div>
          </details>

          <FilterOptions
            onToggle={(value) =>
              toggleSelection(value, selectedAgeGroups, setSelectedAgeGroups)
            }
            options={ageGroupOptions}
            selected={selectedAgeGroups}
            title={t('products.sectionAge')}
          />

          <details className="product-filter__section" open>
            <summary>{t('products.sectionColor')}</summary>
            <div className="product-filter__swatches">
              {productColors.map((color) => {
                const colorName = localized(color.name, color.name_ar)
                return (
                  <button
                    aria-label={colorName}
                    aria-pressed={selectedColors.includes(color.name)}
                    className={`product-filter__swatch${selectedColors.includes(color.name) ? ' is-selected' : ''}`}
                    key={color.name}
                    onClick={() =>
                      toggleSelection(
                        color.name,
                        selectedColors,
                        setSelectedColors,
                      )
                    }
                    style={{ '--swatch-color': color.hex } as CSSProperties}
                    title={colorName}
                    type="button"
                  />
                )
              })}
            </div>
            <div className="product-filter__color-labels">
              {productColors
                .filter((color) => selectedColors.includes(color.name))
                .map((color) => localized(color.name, color.name_ar))
                .join(', ') || t('products.chooseColor')}
            </div>
          </details>

          <FilterOptions
            onToggle={(value) =>
              toggleSelection(value, selectedSizes, setSelectedSizes)
            }
            options={sizeOptions}
            selected={selectedSizes}
            title={t('products.sectionSize')}
          />

          <FilterOptions
            onToggle={(value) =>
              toggleSelection(value, selectedBrands, setSelectedBrands)
            }
            options={brandOptions}
            selected={selectedBrands}
            title={t('products.sectionBrand')}
          />

          <label className="product-filter__option product-filter__stock">
            <input
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
              type="checkbox"
            />
            <span>{t('products.inStockOnly')}</span>
          </label>

          <button
            className="product-filter__apply"
            onClick={() => setFiltersOpen(false)}
            type="button"
          >
            {t('products.showCount', {
              count: number(filteredProducts.length),
            })}
          </button>
        </aside>

        <div className="products-results" aria-live="polite">
          {filteredProducts.length > 0 ? (
            <div className={`product-grid product-grid--${view}`}>
              {filteredProducts.map((product) => (
                <ProductCard
                  isSaved={savedProductIds.includes(product.id)}
                  key={product.id}
                  onSave={toggleSaved}
                  onShare={shareProduct}
                  product={product}
                  view={view}
                />
              ))}
            </div>
          ) : (
            <div className="products-empty">
              <span className="products-page__eyebrow">
                {t('products.emptyEyebrow')}
              </span>
              <h2>{t('products.emptyTitle')}</h2>
              <p>{t('products.emptyText')}</p>
              <button className="product-filter__apply" onClick={clearFilters} type="button">
                {t('products.clearFilters')}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ProductsPage

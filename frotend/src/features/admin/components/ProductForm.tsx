import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Add, DeleteOutlined } from '@mui/icons-material'
import { type Product, type ProductAgeGroup } from '../../products/data/products'
import {
  attributeId,
  useAttributeStore,
  type AttributeRecord,
} from '../../products/store/useAttributeStore'
import { uploadProductImages } from '../../../services/storage'
import { useSupplierStore } from '../../ops/store/useSupplierStore'
import AdminModal from './AdminModal'
import { useTranslation } from '../../../hooks/useTranslation'

type ProductFormProps = {
  product?: Product
  categories: string[]
  brands: string[]
  ageGroups: ProductAgeGroup[]
  existingIds: string[]
  onClose: () => void
  onSave: (product: Product) => void
}

type AgeGroupDraft = { name: string; name_ar: string }

type ProductDraft = {
  name: string
  name_ar: string
  brand: string
  brand_ar: string
  category: string
  category_ar: string
  description: string
  description_ar: string
  /** Committed gallery images. The first one is the cover. */
  listImage: string[]
  /** URL typed in the "add by link" field, not yet committed. */
  imageUrl: string
  price: string
  originalPrice: string
  rating: string
  reviewCount: string
  createdAt: string
  inStock: boolean
  /** Buying price + inventory, managed by the operations console. */
  costPrice: string
  stockQuantity: string
  lowStockThreshold: string
  supplierId: string
  sizes: string[]
  ageGroups: AgeGroupDraft[]
  colors: { name: string; name_ar: string; hex: string }[]
}

function slugify(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function uniqueId(base: string, taken: string[]) {
  const seed = base || `product-${Date.now()}`
  if (!taken.includes(seed)) return seed

  let index = 2
  while (taken.includes(`${seed}-${index}`)) index += 1
  return `${seed}-${index}`
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Master ages plus any audience already on a product, de-duplicated by name. */
function buildAgeOptions(
  masterAges: AttributeRecord[],
  groups: ProductAgeGroup[],
): AttributeRecord[] {
  const seen = new Map<string, AttributeRecord>()
  masterAges.forEach((age) => seen.set(age.name, age))
  groups.forEach((group) => {
    if (!group.name || seen.has(group.name)) return
    seen.set(group.name, {
      id: attributeId(group.name),
      name: group.name,
      name_ar: group.name_ar,
      hex: '',
    })
  })
  return [...seen.values()]
}

function ProductForm({
  product,
  categories,
  brands,
  ageGroups,
  existingIds,
  onClose,
  onSave,
}: ProductFormProps) {
  const { t, localized } = useTranslation()
  const masterBrands = useAttributeStore((state) => state.brands)
  const masterColors = useAttributeStore((state) => state.colors)
  const masterSizes = useAttributeStore((state) => state.sizes)
  const masterAges = useAttributeStore((state) => state.ages)
  const suppliers = useSupplierStore((state) => state.suppliers)
  const [draft, setDraft] = useState<ProductDraft>(() => ({
    name: product?.name ?? '',
    name_ar: product?.name_ar ?? '',
    brand: product?.brand ?? '',
    brand_ar: product?.brand_ar ?? '',
    category: product?.category ?? categories[0] ?? '',
    category_ar: product?.category_ar ?? '',
    description: product?.description ?? '',
    description_ar: product?.description_ar ?? '',
    listImage: product ? [...product.listImage] : [],
    imageUrl: '',
    price: product ? String(product.price) : '',
    originalPrice:
      product?.originalPrice !== undefined ? String(product.originalPrice) : '',
    rating: product ? String(product.rating) : '4.5',
    reviewCount: product ? String(product.reviewCount) : '0',
    createdAt: product?.createdAt ?? new Date().toISOString().slice(0, 10),
    inStock: product?.inStock ?? true,
    costPrice:
      product?.costPrice !== undefined ? String(product.costPrice) : '',
    stockQuantity:
      product?.stockQuantity !== undefined ? String(product.stockQuantity) : '',
    lowStockThreshold:
      product?.lowStockThreshold !== undefined
        ? String(product.lowStockThreshold)
        : '',
    supplierId: product?.supplierId ?? '',
    sizes: product ? [...product.sizes] : [],
    ageGroups:
      product && product.ageGroups.length > 0
        ? product.ageGroups.map((group) => ({ ...group }))
        : ageGroups[0]
          ? [{ name: ageGroups[0].name, name_ar: ageGroups[0].name_ar }]
          : [{ name: 'Women', name_ar: 'نساء' }],
    colors: product ? product.colors.map((color) => ({ ...color })) : [],
  }))
  const [error, setError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)

  function update<K extends keyof ProductDraft>(field: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  // --- Images ---------------------------------------------------------------

  function addImageUrl() {
    const url = draft.imageUrl.trim()
    if (!url) return
    setDraft((current) => ({
      ...current,
      imageUrl: '',
      listImage: current.listImage.includes(url)
        ? current.listImage
        : [...current.listImage, url],
    }))
  }

  function removeImage(index: number) {
    setDraft((current) => ({
      ...current,
      listImage: current.listImage.filter((_, imageIndex) => imageIndex !== index),
    }))
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? [...event.target.files] : []
    event.target.value = ''
    if (files.length === 0) return

    setUploadError('')
    setUploading(true)
    try {
      const urls = await uploadProductImages(files)
      setDraft((current) => ({
        ...current,
        listImage: [...current.listImage, ...urls],
      }))
    } catch {
      setUploadError(t('admin.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  // --- Catalog attribute pickers --------------------------------------------

  const brandOptions = [
    ...new Set([...masterBrands.map((brand) => brand.name), ...brands]),
  ]

  const sizeOptions = [
    ...new Set([...masterSizes.map((size) => size.name), ...draft.sizes]),
  ]

  const colorOptions: AttributeRecord[] = [
    ...masterColors,
    ...draft.colors
      .filter(
        (color) => !masterColors.some((master) => master.name === color.name),
      )
      .map((color) => ({
        id: color.name,
        name: color.name,
        name_ar: color.name_ar,
        hex: color.hex,
      })),
  ]

  const ageOptions = buildAgeOptions(masterAges, [
    ...ageGroups,
    ...draft.ageGroups,
  ])

  function selectBrand(value: string) {
    // Mirror the Arabic name when an admin picks a known brand.
    const preset = masterBrands.find(
      (brand) =>
        brand.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
    )

    setDraft((current) => ({
      ...current,
      brand: value,
      brand_ar: preset?.name_ar || current.brand_ar,
    }))
  }

  function toggleSize(name: string) {
    setDraft((current) => ({
      ...current,
      sizes: current.sizes.includes(name)
        ? current.sizes.filter((size) => size !== name)
        : [...current.sizes, name],
    }))
  }

  function toggleColor(record: AttributeRecord) {
    setDraft((current) => {
      const exists = current.colors.some((color) => color.name === record.name)
      return {
        ...current,
        colors: exists
          ? current.colors.filter((color) => color.name !== record.name)
          : [
              ...current.colors,
              {
                name: record.name,
                name_ar: record.name_ar || record.name,
                hex: record.hex || 'var(--color-black)',
              },
            ],
      }
    })
  }

  // --- Age groups -----------------------------------------------------------

  function toggleAge(record: AttributeRecord) {
    setDraft((current) => {
      const exists = current.ageGroups.some(
        (group) => group.name === record.name,
      )
      return {
        ...current,
        ageGroups: exists
          ? current.ageGroups.filter((group) => group.name !== record.name)
          : [
              ...current.ageGroups,
              { name: record.name, name_ar: record.name_ar || record.name },
            ],
      }
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = draft.name.trim()
    const nameAr = draft.name_ar.trim() || name
    const brand = draft.brand.trim()
    const brandAr = draft.brand_ar.trim() || brand
    const category = draft.category.trim()
    const categoryAr = draft.category_ar.trim() || category
    const description = draft.description.trim()
    const descriptionAr = draft.description_ar.trim() || description
    const pendingUrl = draft.imageUrl.trim()
    const listImage = [...new Set([...draft.listImage, pendingUrl].filter(Boolean))]
    const price = toNumber(draft.price, -1)
    const originalPrice = draft.originalPrice.trim()
      ? toNumber(draft.originalPrice, -1)
      : undefined

    if (!name || !brand || !category) {
      setError(t('admin.errorRequired'))
      return
    }

    if (listImage.length === 0) {
      setError(t('admin.errorImages'))
      return
    }

    if (price <= 0) {
      setError(t('admin.errorPrice'))
      return
    }

    if (originalPrice !== undefined && originalPrice <= price) {
      setError(t('admin.errorOriginalPrice'))
      return
    }

    const sizes = draft.sizes
      .map((size) => size.trim())
      .filter(Boolean)
    const ageGroups = draft.ageGroups
      .map((group) => ({
        name: group.name.trim(),
        name_ar: group.name_ar.trim() || group.name.trim(),
      }))
      .filter((group) => group.name)

    const takenIds = existingIds.filter((id) => id !== product?.id)

    const nextProduct: Product = {
      id: product?.id ?? uniqueId(slugify(name), takenIds),
      name,
      name_ar: nameAr,
      description,
      description_ar: descriptionAr,
      category,
      category_ar: categoryAr,
      brand,
      brand_ar: brandAr,
      ageGroups,
      price,
      originalPrice,
      rating: Math.min(5, Math.max(0, toNumber(draft.rating, 0))),
      reviewCount: Math.max(0, Math.round(toNumber(draft.reviewCount, 0))),
      createdAt: draft.createdAt || new Date().toISOString().slice(0, 10),
      listImage,
      colors: draft.colors
        .map((color) => ({
          name: color.name.trim(),
          name_ar: color.name_ar.trim() || color.name.trim(),
          hex: color.hex.trim() || 'var(--color-black)',
        }))
        .filter((color) => color.name),
      sizes: sizes.length > 0 ? sizes : ['One size'],
      inStock: draft.inStock,
      costPrice:
        draft.costPrice.trim() === ''
          ? undefined
          : Math.max(0, toNumber(draft.costPrice, 0)),
      stockQuantity:
        draft.stockQuantity.trim() === ''
          ? undefined
          : Math.max(0, Math.round(toNumber(draft.stockQuantity, 0))),
      lowStockThreshold:
        draft.lowStockThreshold.trim() === ''
          ? undefined
          : Math.max(0, Math.round(toNumber(draft.lowStockThreshold, 0))),
      supplierId: draft.supplierId.trim() || undefined,
    }

    onSave(nextProduct)
  }

  return (
    <AdminModal
      description={t('admin.productFormDescription')}
      onClose={onClose}
      size="lg"
      title={
        product ? t('admin.productFormEditTitle') : t('admin.productFormAddTitle')
      }
    >
      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>{t('admin.fieldProductName')}</span>
            <input
              onChange={(event) => update('name', event.target.value)}
              placeholder={t('admin.fieldProductNamePlaceholder')}
              value={draft.name}
            />
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldProductNameAr')}</span>
            <input
              dir="rtl"
              onChange={(event) => update('name_ar', event.target.value)}
              value={draft.name_ar}
            />
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldBrand')}</span>
            <input
              list="admin-brand-options"
              onChange={(event) => selectBrand(event.target.value)}
              placeholder={t('admin.fieldBrandPlaceholder')}
              value={draft.brand}
            />
            <datalist id="admin-brand-options">
              {brandOptions.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldBrandAr')}</span>
            <input
              dir="rtl"
              onChange={(event) => update('brand_ar', event.target.value)}
              value={draft.brand_ar}
            />
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldCategory')}</span>
            <input
              list="admin-category-options"
              onChange={(event) => update('category', event.target.value)}
              placeholder={t('admin.fieldCategoryPlaceholder')}
              value={draft.category}
            />
            <datalist id="admin-category-options">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldCategoryAr')}</span>
            <input
              dir="rtl"
              onChange={(event) => update('category_ar', event.target.value)}
              value={draft.category_ar}
            />
          </label>

          <label className="admin-field">
            <span>
              {t('admin.fieldPrice')}
              <em>{t('common.required')}</em>
            </span>
            <input
              min="0"
              onChange={(event) => update('price', event.target.value)}
              placeholder="125"
              step="0.01"
              type="number"
              value={draft.price}
            />
          </label>

          <label className="admin-field">
            <span>
              {t('admin.fieldOriginalPrice')}
              <em>{t('common.optional')}</em>
            </span>
            <input
              min="0"
              onChange={(event) =>
                update('originalPrice', event.target.value)
              }
              placeholder="160"
              step="0.01"
              type="number"
              value={draft.originalPrice}
            />
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldRating')}</span>
            <input
              max="5"
              min="0"
              onChange={(event) => update('rating', event.target.value)}
              step="0.1"
              type="number"
              value={draft.rating}
            />
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldReviewCount')}</span>
            <input
              min="0"
              onChange={(event) => update('reviewCount', event.target.value)}
              type="number"
              value={draft.reviewCount}
            />
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldListedDate')}</span>
            <input
              onChange={(event) => update('createdAt', event.target.value)}
              type="date"
              value={draft.createdAt}
            />
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldCostPrice')}</span>
            <input
              min="0"
              onChange={(event) => update('costPrice', event.target.value)}
              step="0.01"
              type="number"
              value={draft.costPrice}
            />
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldSupplier')}</span>
            <select
              onChange={(event) => update('supplierId', event.target.value)}
              value={draft.supplierId}
            >
              <option value="">{t('admin.poNoSupplier')}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {localized(supplier.name, supplier.name_ar)}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldStockQuantity')}</span>
            <input
              min="0"
              onChange={(event) => update('stockQuantity', event.target.value)}
              type="number"
              value={draft.stockQuantity}
            />
            <span className="admin-field-hint">
              {t('admin.fieldStockQuantityHint')}
            </span>
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldLowStock')}</span>
            <input
              min="0"
              onChange={(event) => update('lowStockThreshold', event.target.value)}
              type="number"
              value={draft.lowStockThreshold}
            />
          </label>

          <label className="admin-field admin-field--full">
            <span>{t('admin.fieldDescription')}</span>
            <textarea
              onChange={(event) => update('description', event.target.value)}
              placeholder={t('admin.fieldDescriptionPlaceholder')}
              value={draft.description}
            />
          </label>

          <label className="admin-field admin-field--full">
            <span>{t('admin.fieldDescriptionAr')}</span>
            <textarea
              dir="rtl"
              onChange={(event) => update('description_ar', event.target.value)}
              value={draft.description_ar}
            />
          </label>

          <label className="admin-check admin-field--full">
            <input
              checked={draft.inStock}
              onChange={(event) => update('inStock', event.target.checked)}
              type="checkbox"
            />
            <span>{t('admin.fieldInStock')}</span>
          </label>
        </div>

        <fieldset className="admin-fieldset">
          <legend>{t('admin.imagesLegend')}</legend>
          <p className="admin-field-hint">{t('admin.imagesHint')}</p>

          {draft.listImage.length > 0 && (
            <div className="admin-image-grid">
              {draft.listImage.map((image, index) => (
                <div className="admin-image-tile" key={`${image}-${index}`}>
                  <img alt="" src={image} />
                  {index === 0 && (
                    <span className="admin-image-tile__badge">
                      {t('admin.imageCoverBadge')}
                    </span>
                  )}
                  <button
                    aria-label={t('admin.removeImageAria', { index: index + 1 })}
                    className="admin-icon-btn admin-icon-btn--danger admin-image-tile__remove"
                    onClick={() => removeImage(index)}
                    type="button"
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="admin-inline-row">
            <label className="admin-field">
              <span>{t('admin.imageUrlLabel')}</span>
              <input
                onChange={(event) => update('imageUrl', event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addImageUrl()
                  }
                }}
                placeholder={t('admin.imageUrlPlaceholder')}
                type="url"
                value={draft.imageUrl}
              />
            </label>
            <div>
              <button
                className="admin-btn admin-btn--sm"
                onClick={addImageUrl}
                type="button"
              >
                <Add /> {t('admin.addImageUrl')}
              </button>
            </div>
          </div>

          <label className="admin-field admin-field--full">
            <span>
              {t('admin.uploadImages')}
              {uploading && <em>{t('admin.uploadingImages')}</em>}
            </span>
            <input
              accept="image/*"
              disabled={uploading}
              multiple
              onChange={handleFileUpload}
              type="file"
            />
            <em className="admin-field-hint">{t('admin.uploadCompressHint')}</em>
          </label>

          {uploadError && <p className="admin-form-error">{uploadError}</p>}
          {draft.listImage.length > 0 && (
            <p className="admin-field-hint">
              {t('admin.imageCount', { count: draft.listImage.length })}
            </p>
          )}
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend>{t('admin.sizesLegend')}</legend>
          <p className="admin-field-hint">{t('admin.attributePickerHint')}</p>
          <div className="admin-chip-group">
            {sizeOptions.map((size) => {
              const selected = draft.sizes.includes(size)
              return (
                <button
                  aria-pressed={selected}
                  className={`admin-chip${selected ? ' is-selected' : ''}`}
                  key={size}
                  onClick={() => toggleSize(size)}
                  type="button"
                >
                  {size}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend>{t('admin.agesLegend')}</legend>
          <p className="admin-field-hint">{t('admin.attributePickerHint')}</p>
          <div className="admin-chip-group">
            {ageOptions.map((age) => {
              const selected = draft.ageGroups.some(
                (group) => group.name === age.name,
              )
              return (
                <button
                  aria-pressed={selected}
                  className={`admin-chip${selected ? ' is-selected' : ''}`}
                  key={age.id}
                  onClick={() => toggleAge(age)}
                  type="button"
                >
                  {localized(age.name, age.name_ar)}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend>{t('admin.colorsLegend')}</legend>
          <p className="admin-field-hint">{t('admin.attributePickerHint')}</p>
          <div className="admin-chip-group">
            {colorOptions.map((color) => {
              const selected = draft.colors.some(
                (item) => item.name === color.name,
              )
              return (
                <button
                  aria-pressed={selected}
                  className={`admin-chip admin-chip--color${selected ? ' is-selected' : ''}`}
                  key={color.id}
                  onClick={() => toggleColor(color)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="admin-chip__swatch"
                    style={{ background: color.hex || 'transparent' }}
                  />
                  {localized(color.name, color.name_ar)}
                </button>
              )
            })}
          </div>
        </fieldset>

        {error && <p className="admin-form-error">{error}</p>}

        <div className="admin-form-actions">
          <button
            className="admin-btn"
            onClick={onClose}
            type="button"
          >
            {t('common.cancel')}
          </button>
          <button className="admin-btn admin-btn--primary" type="submit">
            {product ? t('common.saveChanges') : t('admin.createProduct')}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}

export default ProductForm

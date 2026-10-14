import { useMemo, useState, type FormEvent } from 'react'
import {
  Add,
  CategoryOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@mui/icons-material'
import { useProductStore } from '../../products/store/useProductStore'
import {
  categoryId,
  useCategoryStore,
  type Category,
} from '../../products/store/useCategoryStore'
import AdminModal from '../components/AdminModal'
import AdminPageHeader from '../components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'

function CategoriesAdminPage() {
  const { t, localized, number } = useTranslation()
  const categories = useCategoryStore((state) => state.categories)
  const addCategory = useCategoryStore((state) => state.addCategory)
  const updateCategory = useCategoryStore((state) => state.updateCategory)
  const removeCategory = useCategoryStore((state) => state.removeCategory)
  const products = useProductStore((state) => state.products)
  const updateProduct = useProductStore((state) => state.updateProduct)

  const [formTarget, setFormTarget] = useState<'new' | Category | null>(null)
  const [name, setName] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionAr, setDescriptionAr] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error'
    text: string
  } | null>(null)

  const rows = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          count: products.filter(
            (product) => product.category === category.name,
          ).length,
        }))
        .sort((first, second) => first.name.localeCompare(second.name)),
    [categories, products],
  )

  function openCreate() {
    setName('')
    setNameAr('')
    setDescription('')
    setDescriptionAr('')
    setFormError('')
    setFormTarget('new')
  }

  function openEdit(category: Category) {
    setName(category.name)
    setNameAr(category.name_ar)
    setDescription(category.description)
    setDescriptionAr(category.description_ar)
    setFormError('')
    setFormTarget(category)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedNameAr = nameAr.trim() || trimmedName
    const trimmedDescription = description.trim()
    const trimmedDescriptionAr =
      descriptionAr.trim() || trimmedDescription

    if (!trimmedName) {
      setFormError(t('admin.categoryNameRequired'))
      return
    }

    const duplicate = categories.some(
      (category) =>
        category.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase() &&
        (formTarget === 'new' || formTarget === null
          ? true
          : category.id !== formTarget.id),
    )
    if (duplicate) {
      setFormError(t('admin.categoryDuplicate'))
      return
    }

    if (formTarget === 'new') {
      addCategory({
        id: categoryId(trimmedName),
        name: trimmedName,
        name_ar: trimmedNameAr,
        description: trimmedDescription,
        description_ar: trimmedDescriptionAr,
      })
      setNotice({
        tone: 'success',
        text: t('admin.categoryAdded', { name: trimmedName }),
      })
    } else if (formTarget) {
      const previousName = formTarget.name
      updateCategory({
        ...formTarget,
        name: trimmedName,
        name_ar: trimmedNameAr,
        description: trimmedDescription,
        description_ar: trimmedDescriptionAr,
      })

      if (previousName !== trimmedName || formTarget.name_ar !== trimmedNameAr) {
        products
          .filter((product) => product.category === previousName)
          .forEach((product) =>
            updateProduct({
              ...product,
              category: trimmedName,
              category_ar: trimmedNameAr,
            }),
          )
      }
      setNotice({
        tone: 'success',
        text: t('admin.categoryUpdated', { name: trimmedName }),
      })
    }

    setFormTarget(null)
  }

  function handleDelete(category: Category & { count: number }) {
    if (category.count > 0) {
      setNotice({
        tone: 'error',
        text: t('admin.categoryInUse', {
          name: category.name,
          count: number(category.count),
        }),
      })
      return
    }

    const confirmed = window.confirm(
      t('admin.deleteCategoryConfirm', { name: category.name }),
    )
    if (!confirmed) return

    removeCategory(category.id)
    setNotice({
      tone: 'success',
      text: t('admin.categoryDeleted', { name: category.name }),
    })
  }

  return (
    <>
      <AdminPageHeader
        actions={
          <button
            className="admin-btn admin-btn--primary"
            onClick={openCreate}
            type="button"
          >
            <Add /> {t('admin.addCategory')}
          </button>
        }
        description={t('admin.categoriesDescription')}
        eyebrow={t('admin.categoriesEyebrow')}
        title={t('admin.categoriesTitle')}
      />

      {notice &&
        (notice.tone === 'error' ? (
          <p className="admin-form-error" role="alert">
            {notice.text}
          </p>
        ) : (
          <div className="admin-status-notice" role="status">
            <span>{notice.text}</span>
            <button
              aria-label={t('admin.dismissMessage')}
              onClick={() => setNotice(null)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.allCategoriesTitle')}</h2>
            <p>{t('admin.allCategoriesText')}</p>
          </div>
          <span className="admin-badge admin-badge--neutral">
            {t('admin.totalCount', { count: number(categories.length) })}
          </span>
        </div>

        {rows.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thCategory')}</th>
                  <th>{t('admin.thDescription')}</th>
                  <th>{t('admin.thProducts')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((category) => (
                  <tr key={category.id}>
                    <td
                      className="admin-table__cell--primary"
                      data-label={t('admin.thCategory')}
                    >
                      <div className="admin-table__primary">
                        <span className="admin-stat__icon">
                          <CategoryOutlined />
                        </span>
                        <span>
                          <strong>{localized(category.name, category.name_ar)}</strong>
                          <span>{category.id}</span>
                        </span>
                      </div>
                    </td>
                    <td data-label={t('admin.thDescription')}>
                      {localized(category.description, category.description_ar) || (
                        <span className="admin-table__muted">
                          {t('common.noDescription')}
                        </span>
                      )}
                    </td>
                    <td data-label={t('admin.thProducts')}>
                      <span
                        className={`admin-badge admin-badge--${category.count > 0 ? 'info' : 'neutral'}`}
                      >
                        {t('admin.categoryCountBadge', {
                          count: number(category.count),
                        })}
                      </span>
                    </td>
                    <td data-label={t('admin.thActions')}>
                      <div className="admin-table__actions">
                        <button
                          aria-label={t('admin.editCategoryAria', {
                            name: category.name,
                          })}
                          className="admin-icon-btn"
                          onClick={() => openEdit(category)}
                          type="button"
                        >
                          <EditOutlined />
                        </button>
                        <button
                          aria-label={t('admin.deleteCategoryAria', {
                            name: category.name,
                          })}
                          className="admin-icon-btn admin-icon-btn--danger"
                          onClick={() => handleDelete(category)}
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
        ) : (
          <div className="admin-empty">
            <CategoryOutlined />
            <h3>{t('admin.noCategoriesPageTitle')}</h3>
            <p>{t('admin.noCategoriesPageText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openCreate}
              type="button"
            >
              <Add /> {t('admin.addCategory')}
            </button>
          </div>
        )}
      </section>

      {formTarget && (
        <AdminModal
          description={t('admin.categoryModalDescription')}
          onClose={() => setFormTarget(null)}
          title={
            formTarget === 'new'
              ? t('admin.addCategoryTitle')
              : t('admin.editCategoryTitle')
          }
        >
          <form className="admin-form" onSubmit={handleSubmit}>
            <label className="admin-field">
              <span>{t('admin.categoryNameLabel')}</span>
              <input
                autoFocus
                onChange={(event) => setName(event.target.value)}
                placeholder={t('admin.categoryNamePlaceholder')}
                value={name}
              />
            </label>
            <label className="admin-field">
              <span>{t('admin.fieldCategoryAr')}</span>
              <input
                dir="rtl"
                onChange={(event) => setNameAr(event.target.value)}
                value={nameAr}
              />
            </label>
            <label className="admin-field">
              <span>
                {t('admin.descriptionLabel')}
                <em>{t('common.optional')}</em>
              </span>
              <textarea
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('admin.categoryDescriptionPlaceholder')}
                value={description}
              />
            </label>
            <label className="admin-field">
              <span>
                {t('admin.fieldDescriptionAr')}
                <em>{t('common.optional')}</em>
              </span>
              <textarea
                dir="rtl"
                onChange={(event) => setDescriptionAr(event.target.value)}
                value={descriptionAr}
              />
            </label>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button
                className="admin-btn"
                onClick={() => setFormTarget(null)}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="admin-btn admin-btn--primary" type="submit">
                {formTarget === 'new'
                  ? t('admin.createCategory')
                  : t('common.saveChanges')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default CategoriesAdminPage

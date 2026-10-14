import { useState, type FormEvent, type ReactNode } from 'react'
import {
  Add,
  DeleteOutlined,
  EditOutlined,
  GroupOutlined,
  LocalOfferOutlined,
  PaletteOutlined,
  StraightenOutlined,
} from '@mui/icons-material'
import {
  attributeId,
  useAttributeStore,
  type AttributeKind,
  type AttributeRecord,
} from '../../products/store/useAttributeStore'
import { useProductStore } from '../../products/store/useProductStore'
import AdminModal from '../components/AdminModal'
import AdminPageHeader from '../components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'

type FieldKey = 'name' | 'name_ar' | 'hex'

type FieldDef = {
  key: FieldKey
  labelKey: string
  placeholder?: string
  rtl?: boolean
}

type AttributeConfig = {
  singular: string
  icon: ReactNode
  fields: FieldDef[]
}

const CONFIG: Record<AttributeKind, AttributeConfig> = {
  brands: {
    singular: 'brands',
    icon: <LocalOfferOutlined />,
    fields: [
      { key: 'name', labelKey: 'admin.attributeNameLabel' },
      { key: 'name_ar', labelKey: 'admin.attributeNameArLabel', rtl: true },
    ],
  },
  colors: {
    singular: 'colors',
    icon: <PaletteOutlined />,
    fields: [
      { key: 'name', labelKey: 'admin.attributeNameLabel' },
      { key: 'name_ar', labelKey: 'admin.attributeNameArLabel', rtl: true },
      {
        key: 'hex',
        labelKey: 'admin.attributeHexLabel',
        placeholder: 'admin.attributeHexPlaceholder',
      },
    ],
  },
  sizes: {
    singular: 'sizes',
    icon: <StraightenOutlined />,
    fields: [{ key: 'name', labelKey: 'admin.attributeNameLabel' }],
  },
  ages: {
    singular: 'ages',
    icon: <GroupOutlined />,
    fields: [
      { key: 'name', labelKey: 'admin.attributeNameLabel' },
      { key: 'name_ar', labelKey: 'admin.attributeNameArLabel', rtl: true },
    ],
  },
}

function emptyRecord(): AttributeRecord {
  return { id: '', name: '', name_ar: '', hex: '' }
}

function AttributesAdminPage({ kind }: { kind: AttributeKind }) {
  const { t, localized, number, language } = useTranslation()
  const config = CONFIG[kind]
  const items = useAttributeStore((state) => state[kind])
  const addAttribute = useAttributeStore((state) => state.addAttribute)
  const updateAttribute = useAttributeStore((state) => state.updateAttribute)
  const removeAttribute = useAttributeStore((state) => state.removeAttribute)
  const products = useProductStore((state) => state.products)

  const [formTarget, setFormTarget] = useState<'new' | AttributeRecord | null>(
    null,
  )
  const [draft, setDraft] = useState<AttributeRecord>(emptyRecord)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error'
    text: string
  } | null>(null)

  function usageCount(record: AttributeRecord) {
    switch (kind) {
      case 'brands':
        return products.filter((product) => product.brand === record.name).length
      case 'colors':
        return products.filter((product) =>
          product.colors.some((color) => color.name === record.name),
        ).length
      case 'sizes':
        return products.filter((product) => product.sizes.includes(record.name))
          .length
      case 'ages':
        return products.filter((product) =>
          product.ageGroups.some((group) => group.name === record.name),
        ).length
    }
  }

  const rows = [...items]
    .map((record) => ({ record, count: usageCount(record) }))
    .sort((first, second) =>
      first.record.name.localeCompare(second.record.name),
    )

  function openCreate() {
    setDraft(emptyRecord())
    setFormError('')
    setFormTarget('new')
  }

  function openEdit(record: AttributeRecord) {
    setDraft({ ...record })
    setFormError('')
    setFormTarget(record)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = draft.name.trim()
    const nameAr = draft.name_ar.trim() || name
    const hex = draft.hex.trim()

    if (!name) {
      setFormError(t('admin.attributeNameRequired'))
      return
    }

    const duplicate = items.some(
      (item) =>
        item.name.toLocaleLowerCase() === name.toLocaleLowerCase() &&
        (formTarget === 'new' || formTarget === null
          ? true
          : item.id !== formTarget.id),
    )
    if (duplicate) {
      setFormError(t('admin.attributeDuplicate'))
      return
    }

    if (formTarget === 'new') {
      const record = { id: attributeId(name), name, name_ar: nameAr, hex }
      addAttribute(kind, record)
      setNotice({
        tone: 'success',
        text: t('admin.attributeAdded', { name }),
      })
    } else if (formTarget) {
      updateAttribute(kind, { ...formTarget, name, name_ar: nameAr, hex })
      setNotice({
        tone: 'success',
        text: t('admin.attributeUpdated', { name }),
      })
    }

    setFormTarget(null)
  }

  function handleDelete(record: AttributeRecord & { count: number }) {
    if (record.count > 0) {
      setNotice({
        tone: 'error',
        text: t('admin.attributeInUse', {
          name: record.name,
          count: number(record.count),
        }),
      })
      return
    }

    const confirmed = window.confirm(
      t('admin.deleteAttributeConfirm', { name: record.name }),
    )
    if (!confirmed) return

    removeAttribute(kind, record.id)
    setNotice({
      tone: 'success',
      text: t('admin.attributeDeleted', { name: record.name }),
    })
  }

  const singular = t(`admin.attributeSingular.${config.singular}`)

  return (
    <>
      <AdminPageHeader
        actions={
          <button
            className="admin-btn admin-btn--primary"
            onClick={openCreate}
            type="button"
          >
            <Add /> {t('admin.addAttribute', { item: singular })}
          </button>
        }
        description={t(`admin.${config.singular}Description`)}
        eyebrow={t(`admin.${config.singular}Eyebrow`)}
        title={t(`admin.${config.singular}Title`)}
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
            <h2>
              {t('admin.allAttributesTitle', {
                item: singular,
              })}
            </h2>
            <p>{t(`admin.${config.singular}Description`)}</p>
          </div>
          <span className="admin-badge admin-badge--neutral">
            {t('admin.totalCount', { count: number(items.length) })}
          </span>
        </div>

        {rows.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.attributeNameColumn')}</th>
                  <th>{t('admin.thAttributeValue')}</th>
                  <th>{t('admin.thProducts')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ record, count }) => (
                  <tr key={record.id}>
                    <td
                      className="admin-table__cell--primary"
                      data-label={t('admin.attributeNameColumn')}
                    >
                      <div className="admin-table__primary">
                        <span className="admin-stat__icon">{config.icon}</span>
                        <span>
                          <strong>{localized(record.name, record.name_ar)}</strong>
                          <span>{record.id}</span>
                        </span>
                      </div>
                    </td>
                    <td data-label={t('admin.thAttributeValue')}>
                      {kind === 'colors' ? (
                        <span className="admin-attribute-value">
                          <span
                            aria-hidden="true"
                            className="admin-swatch admin-swatch--sm"
                            style={{ background: record.hex || 'transparent' }}
                          />
                          <span className="admin-table__muted">{record.hex}</span>
                        </span>
                      ) : (
                        (() => {
                          const alternate =
                            language === 'ar' ? record.name : record.name_ar
                          return alternate ? (
                            alternate
                          ) : (
                            <span className="admin-table__muted">
                              {t('common.notSet')}
                            </span>
                          )
                        })()
                      )}
                    </td>
                    <td data-label={t('admin.thProducts')}>
                      <span
                        className={`admin-badge admin-badge--${count > 0 ? 'info' : 'neutral'}`}
                      >
                        {t('admin.attributeUsageBadge', {
                          count: number(count),
                        })}
                      </span>
                    </td>
                    <td data-label={t('admin.thActions')}>
                      <div className="admin-table__actions">
                        <button
                          aria-label={t('admin.editAttributeAria', {
                            name: record.name,
                          })}
                          className="admin-icon-btn"
                          onClick={() => openEdit(record)}
                          type="button"
                        >
                          <EditOutlined />
                        </button>
                        <button
                          aria-label={t('admin.deleteAttributeAria', {
                            name: record.name,
                          })}
                          className="admin-icon-btn admin-icon-btn--danger"
                          onClick={() => handleDelete({ ...record, count })}
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
            {config.icon}
            <h3>{t('admin.noAttributesPageTitle')}</h3>
            <p>{t('admin.noAttributesPageText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openCreate}
              type="button"
            >
              <Add /> {t('admin.addAttribute', { item: singular })}
            </button>
          </div>
        )}
      </section>

      {formTarget && (
        <AdminModal
          description={t('admin.attributeModalDescription')}
          onClose={() => setFormTarget(null)}
          title={
            formTarget === 'new'
              ? t('admin.addAttributeTitle', { item: singular })
              : t('admin.editAttributeTitle', { item: singular })
          }
        >
          <form className="admin-form" onSubmit={handleSubmit}>
            {config.fields.map((field) => (
              <label className="admin-field" key={field.key}>
                <span>{t(field.labelKey)}</span>
                <input
                  autoFocus={field.key === 'name'}
                  dir={field.rtl ? 'rtl' : undefined}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder={
                    field.placeholder ? t(field.placeholder) : undefined
                  }
                  value={draft[field.key]}
                />
              </label>
            ))}

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
                  ? t('admin.addAttribute', { item: singular })
                  : t('common.saveChanges')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default AttributesAdminPage

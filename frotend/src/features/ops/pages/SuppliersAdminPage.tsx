import { useState, type FormEvent } from 'react'
import {
  Add,
  AddBusinessOutlined,
  DeleteOutlined,
  EditOutlined,
  PowerSettingsNewOutlined,
  Search,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'
import { newOpsId, nowIso } from '../ops'
import {
  useSupplierStore,
  type Supplier,
} from '../store/useSupplierStore'

type SupplierDraft = {
  name: string
  name_ar: string
  contactName: string
  phone: string
  email: string
  address: string
  city: string
  country: string
  taxId: string
  paymentTerms: string
  notes: string
  isActive: boolean
}

function emptyDraft(): SupplierDraft {
  return {
    name: '',
    name_ar: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: '',
    taxId: '',
    paymentTerms: '30',
    notes: '',
    isActive: true,
  }
}

function draftFrom(supplier: Supplier): SupplierDraft {
  return {
    name: supplier.name,
    name_ar: supplier.name_ar,
    contactName: supplier.contactName,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    city: supplier.city,
    country: supplier.country,
    taxId: supplier.taxId,
    paymentTerms: String(supplier.paymentTerms),
    notes: supplier.notes,
    isActive: supplier.isActive,
  }
}

function SuppliersAdminPage() {
  const { t, localized, number } = useTranslation()
  const suppliers = useSupplierStore((state) => state.suppliers)
  const addSupplier = useSupplierStore((state) => state.addSupplier)
  const updateSupplier = useSupplierStore((state) => state.updateSupplier)
  const removeSupplier = useSupplierStore((state) => state.removeSupplier)

  const [editing, setEditing] = useState<Supplier | 'new' | null>(null)
  const [draft, setDraft] = useState<SupplierDraft>(emptyDraft)
  const [formError, setFormError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    'all',
  )

  const needle = query.trim().toLowerCase()
  const visible = suppliers
    .filter((supplier) =>
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
          ? supplier.isActive
          : !supplier.isActive,
    )
    .filter((supplier) => {
      if (!needle) return true
      return [
        supplier.name,
        supplier.name_ar,
        supplier.contactName,
        supplier.email,
        supplier.phone,
        supplier.city,
        supplier.country,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
    .toSorted((first, second) => first.name.localeCompare(second.name))

  function update<K extends keyof SupplierDraft>(
    key: K,
    value: SupplierDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setDraft(emptyDraft())
    setFormError('')
    setEditing('new')
  }

  function openEdit(supplier: Supplier) {
    setDraft(draftFrom(supplier))
    setFormError('')
    setEditing(supplier)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!draft.name.trim()) {
      setFormError(t('admin.supplierNameRequired'))
      return
    }

    const previous = editing && editing !== 'new' ? editing : null
    const supplier: Supplier = {
      id: previous?.id ?? newOpsId('supplier'),
      name: draft.name.trim(),
      name_ar: draft.name_ar.trim(),
      contactName: draft.contactName.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      address: draft.address.trim(),
      city: draft.city.trim(),
      country: draft.country.trim(),
      taxId: draft.taxId.trim(),
      paymentTerms: Math.max(0, Math.floor(Number(draft.paymentTerms) || 0)),
      notes: draft.notes.trim(),
      isActive: draft.isActive,
      createdAt: previous?.createdAt ?? nowIso(),
    }

    if (previous) {
      await updateSupplier(supplier)
    } else {
      await addSupplier(supplier)
    }
    setEditing(null)
  }

  async function handleDelete(supplier: Supplier) {
    if (!window.confirm(t('admin.supplierDeleteConfirm'))) return
    await removeSupplier(supplier.id)
  }

  async function handleToggle(supplier: Supplier) {
    await updateSupplier({ ...supplier, isActive: !supplier.isActive })
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
            <Add /> {t('admin.addSupplier')}
          </button>
        }
        description={t('admin.suppliersDescription')}
        eyebrow={t('admin.opsEyebrow')}
        title={t('admin.navSuppliers')}
      />

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <Search />
          <input
            aria-label={t('admin.searchSuppliersAria')}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.searchSuppliersPlaceholder')}
            value={query}
          />
        </label>
        <select
          aria-label={t('admin.filterByStatus')}
          className="admin-toolbar__select"
          onChange={(event) =>
            setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
          }
          value={statusFilter}
        >
          <option value="all">{t('admin.allStatuses')}</option>
          <option value="active">{t('admin.supplierStatusActive')}</option>
          <option value="inactive">{t('admin.supplierStatusInactive')}</option>
        </select>
        <span className="admin-toolbar__count">
          {t('admin.supplierCount', { count: number(visible.length) })}
        </span>
      </div>

      <section className="admin-card">
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thSupplier')}</th>
                  <th>{t('admin.thContact')}</th>
                  <th>{t('admin.thCity')}</th>
                  <th>{t('admin.thPaymentTerms')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map((supplier) => (
                  <tr key={supplier.id}>
                    <td data-label={t('admin.thSupplier')}>
                      <div className="admin-table__primary">
                        <strong>
                          {localized(supplier.name, supplier.name_ar)}
                        </strong>
                        {supplier.taxId && (
                          <span>
                            {t('admin.supplierTaxIdLabel')}: {supplier.taxId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label={t('admin.thContact')}>
                      <div className="admin-table__primary">
                        <strong>{supplier.contactName || t('common.notSet')}</strong>
                        <span>{supplier.phone || supplier.email}</span>
                      </div>
                    </td>
                    <td data-label={t('admin.thCity')}>
                      <span className="admin-table__muted">
                        {[supplier.city, supplier.country]
                          .filter(Boolean)
                          .join(' · ') || t('common.notSet')}
                      </span>
                    </td>
                    <td data-label={t('admin.thPaymentTerms')}>
                      {supplier.paymentTerms > 0
                        ? t('admin.supplierTermsDays', {
                            days: number(supplier.paymentTerms),
                          })
                        : t('admin.supplierTermsOnReceipt')}
                    </td>
                    <td data-label={t('admin.thStatus')}>
                      <span
                        className={`admin-badge admin-badge--${
                          supplier.isActive ? 'success' : 'neutral'
                        }`}
                      >
                        {supplier.isActive
                          ? t('admin.supplierStatusActive')
                          : t('admin.supplierStatusInactive')}
                      </span>
                    </td>
                    <td data-label={t('admin.thActions')}>
                      <div className="admin-table__actions">
                        <button
                          aria-label={t(
                            supplier.isActive
                              ? 'admin.supplierDeactivate'
                              : 'admin.supplierActivate',
                          )}
                          className="admin-icon-btn"
                          onClick={() => void handleToggle(supplier)}
                          type="button"
                        >
                          <PowerSettingsNewOutlined />
                        </button>
                        <button
                          aria-label={t('admin.editSupplier')}
                          className="admin-icon-btn"
                          onClick={() => openEdit(supplier)}
                          type="button"
                        >
                          <EditOutlined />
                        </button>
                        <button
                          aria-label={t('common.delete')}
                          className="admin-icon-btn admin-icon-btn--danger"
                          onClick={() => void handleDelete(supplier)}
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
            <AddBusinessOutlined />
            <h3>{t('admin.noSuppliersTitle')}</h3>
            <p>{t('admin.noSuppliersText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openCreate}
              type="button"
            >
              <Add /> {t('admin.addSupplier')}
            </button>
          </div>
        )}
      </section>

      {editing && (
        <AdminModal
          description={t('admin.supplierModalDescription')}
          onClose={() => setEditing(null)}
          size="lg"
          title={
            editing === 'new' ? t('admin.addSupplierTitle') : t('admin.editSupplier')
          }
        >
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t('admin.supplierNameLabel')}</span>
                <input
                  onChange={(event) => update('name', event.target.value)}
                  value={draft.name}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.supplierNameLabel')} (العربية)</span>
                <input
                  dir="rtl"
                  onChange={(event) => update('name_ar', event.target.value)}
                  value={draft.name_ar}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.supplierContactLabel')}</span>
                <input
                  onChange={(event) => update('contactName', event.target.value)}
                  value={draft.contactName}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.supplierPhoneLabel')}</span>
                <input
                  onChange={(event) => update('phone', event.target.value)}
                  value={draft.phone}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.supplierEmailLabel')}</span>
                <input
                  onChange={(event) => update('email', event.target.value)}
                  type="email"
                  value={draft.email}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.supplierTaxIdLabel')}</span>
                <input
                  onChange={(event) => update('taxId', event.target.value)}
                  value={draft.taxId}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.supplierAddressLabel')}</span>
                <input
                  onChange={(event) => update('address', event.target.value)}
                  value={draft.address}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.supplierCityLabel')}</span>
                <input
                  onChange={(event) => update('city', event.target.value)}
                  value={draft.city}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.supplierCountryLabel')}</span>
                <input
                  onChange={(event) => update('country', event.target.value)}
                  value={draft.country}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.supplierPaymentTermsLabel')}</span>
                <input
                  min="0"
                  onChange={(event) => update('paymentTerms', event.target.value)}
                  type="number"
                  value={draft.paymentTerms}
                />
                <span className="admin-field-hint">
                  {t('admin.supplierPaymentTermsHint')}
                </span>
              </label>

              <label className="admin-field admin-field--full">
                <span>{t('admin.thNotes')}</span>
                <textarea
                  onChange={(event) => update('notes', event.target.value)}
                  value={draft.notes}
                />
              </label>

              <div className="admin-field admin-field--full">
                <span>{t('admin.supplierStatusLabel')}</span>
                <label className="admin-check">
                  <input
                    checked={draft.isActive}
                    onChange={(event) => update('isActive', event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t('admin.supplierStatusActive')}</span>
                </label>
              </div>
            </div>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button
                className="admin-btn"
                onClick={() => setEditing(null)}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="admin-btn admin-btn--primary" type="submit">
                {editing === 'new'
                  ? t('admin.addSupplier')
                  : t('common.saveChanges')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default SuppliersAdminPage

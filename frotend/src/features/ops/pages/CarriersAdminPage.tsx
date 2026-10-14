import { useState, type FormEvent } from 'react'
import {
  Add,
  DeleteOutlined,
  EditOutlined,
  LocalShippingOutlined,
  PowerSettingsNewOutlined,
  Search,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'
import { newOpsId, nowIso } from '../ops'
import { useDeliveryStore, type Carrier } from '../store/useDeliveryStore'

type CarrierDraft = {
  name: string
  name_ar: string
  phone: string
  email: string
  website: string
  trackingUrl: string
  supportsCod: boolean
  baseRate: string
  codFee: string
  codFeeRate: string
  notes: string
  isActive: boolean
}

function emptyDraft(): CarrierDraft {
  return {
    name: '',
    name_ar: '',
    phone: '',
    email: '',
    website: '',
    trackingUrl: '',
    supportsCod: true,
    baseRate: '0',
    codFee: '0',
    codFeeRate: '0',
    notes: '',
    isActive: true,
  }
}

function draftFrom(carrier: Carrier): CarrierDraft {
  return {
    name: carrier.name,
    name_ar: carrier.name_ar,
    phone: carrier.phone,
    email: carrier.email,
    website: carrier.website,
    trackingUrl: carrier.trackingUrl,
    supportsCod: carrier.supportsCod,
    baseRate: String(carrier.baseRate),
    codFee: String(carrier.codFee),
    codFeeRate: String(carrier.codFeeRate),
    notes: carrier.notes,
    isActive: carrier.isActive,
  }
}

function toNumber(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function CarriersAdminPage() {
  const { t, localized, number, currency } = useTranslation()
  const carriers = useDeliveryStore((state) => state.carriers)
  const addCarrier = useDeliveryStore((state) => state.addCarrier)
  const updateCarrier = useDeliveryStore((state) => state.updateCarrier)
  const removeCarrier = useDeliveryStore((state) => state.removeCarrier)

  const [editing, setEditing] = useState<Carrier | 'new' | null>(null)
  const [draft, setDraft] = useState<CarrierDraft>(emptyDraft)
  const [formError, setFormError] = useState('')
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()
  const visible = carriers.filter((carrier) => {
    if (!needle) return true
    return [carrier.name, carrier.name_ar, carrier.phone, carrier.email]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })

  function update<K extends keyof CarrierDraft>(
    key: K,
    value: CarrierDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setDraft(emptyDraft())
    setFormError('')
    setEditing('new')
  }

  function openEdit(carrier: Carrier) {
    setDraft(draftFrom(carrier))
    setFormError('')
    setEditing(carrier)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setFormError(t('admin.carrierNameRequired'))
      return
    }

    const previous = editing && editing !== 'new' ? editing : null
    const carrier: Carrier = {
      id: previous?.id ?? newOpsId('carrier'),
      name: draft.name.trim(),
      name_ar: draft.name_ar.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      website: draft.website.trim(),
      trackingUrl: draft.trackingUrl.trim(),
      supportsCod: draft.supportsCod,
      baseRate: toNumber(draft.baseRate),
      codFee: toNumber(draft.codFee),
      codFeeRate: toNumber(draft.codFeeRate),
      notes: draft.notes.trim(),
      isActive: draft.isActive,
      createdAt: previous?.createdAt ?? nowIso(),
    }

    if (previous) {
      await updateCarrier(carrier)
    } else {
      await addCarrier(carrier)
    }
    setEditing(null)
  }

  async function handleDelete(carrier: Carrier) {
    if (!window.confirm(t('admin.carrierDeleteConfirm'))) return
    await removeCarrier(carrier.id)
  }

  async function handleToggle(carrier: Carrier) {
    await updateCarrier({ ...carrier, isActive: !carrier.isActive })
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
            <Add /> {t('admin.addCarrier')}
          </button>
        }
        description={t('admin.carriersDescription')}
        eyebrow={t('admin.opsEyebrow')}
        title={t('admin.navCarriers')}
      />

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <Search />
          <input
            aria-label={t('admin.searchCarriersAria')}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.searchCarriersPlaceholder')}
            value={query}
          />
        </label>
        <span className="admin-toolbar__count">
          {t('admin.carrierCount', { count: number(visible.length) })}
        </span>
      </div>

      <section className="admin-card">
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thCarrier')}</th>
                  <th>{t('admin.thRates')}</th>
                  <th>{t('admin.thCod')}</th>
                  <th>{t('admin.thTrackingPage')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map((carrier) => (
                  <tr key={carrier.id}>
                    <td data-label={t('admin.thCarrier')}>
                      <div className="admin-table__primary">
                        <strong>{localized(carrier.name, carrier.name_ar)}</strong>
                        <span>
                          {carrier.phone || carrier.email || t('common.notSet')}
                        </span>
                      </div>
                    </td>
                    <td data-label={t('admin.thRates')}>
                      <div className="admin-table__primary">
                        <strong>
                          {t('admin.carrierBaseRate', {
                            amount: currency(carrier.baseRate),
                          })}
                        </strong>
                        <span>
                          {t('admin.carrierCodRate', {
                            fixed: currency(carrier.codFee),
                            percent: number(carrier.codFeeRate),
                          })}
                        </span>
                      </div>
                    </td>
                    <td data-label={t('admin.thCod')}>
                      <span
                        className={`admin-badge admin-badge--${
                          carrier.supportsCod ? 'success' : 'neutral'
                        }`}
                      >
                        {carrier.supportsCod
                          ? t('admin.carrierSupportsCod')
                          : t('admin.carrierNoCod')}
                      </span>
                    </td>
                    <td data-label={t('admin.thTrackingPage')}>
                      {carrier.trackingUrl ? (
                        <a
                          className="admin-table__muted"
                          href={carrier.trackingUrl.replace('{tracking}', '')}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {carrier.trackingUrl}
                        </a>
                      ) : (
                        <span className="admin-table__muted">
                          {t('common.notSet')}
                        </span>
                      )}
                    </td>
                    <td data-label={t('admin.thStatus')}>
                      <span
                        className={`admin-badge admin-badge--${
                          carrier.isActive ? 'success' : 'neutral'
                        }`}
                      >
                        {carrier.isActive
                          ? t('admin.supplierStatusActive')
                          : t('admin.supplierStatusInactive')}
                      </span>
                    </td>
                    <td data-label={t('admin.thActions')}>
                      <div className="admin-table__actions">
                        <button
                          aria-label={t(
                            carrier.isActive
                              ? 'admin.carrierDeactivate'
                              : 'admin.carrierActivate',
                          )}
                          className="admin-icon-btn"
                          onClick={() => void handleToggle(carrier)}
                          type="button"
                        >
                          <PowerSettingsNewOutlined />
                        </button>
                        <button
                          aria-label={t('admin.editCarrier')}
                          className="admin-icon-btn"
                          onClick={() => openEdit(carrier)}
                          type="button"
                        >
                          <EditOutlined />
                        </button>
                        <button
                          aria-label={t('common.delete')}
                          className="admin-icon-btn admin-icon-btn--danger"
                          onClick={() => void handleDelete(carrier)}
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
            <LocalShippingOutlined />
            <h3>{t('admin.noCarriersTitle')}</h3>
            <p>{t('admin.noCarriersText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openCreate}
              type="button"
            >
              <Add /> {t('admin.addCarrier')}
            </button>
          </div>
        )}
      </section>

      {editing && (
        <AdminModal
          description={t('admin.carrierModalDescription')}
          onClose={() => setEditing(null)}
          size="lg"
          title={
            editing === 'new' ? t('admin.addCarrierTitle') : t('admin.editCarrier')
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
                <span>{t('admin.fieldWebsite')}</span>
                <input
                  onChange={(event) => update('website', event.target.value)}
                  placeholder="https://"
                  value={draft.website}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.fieldTrackingUrl')}</span>
                <input
                  onChange={(event) => update('trackingUrl', event.target.value)}
                  placeholder="https://courier.example/track/{tracking}"
                  value={draft.trackingUrl}
                />
                <span className="admin-field-hint">
                  {t('admin.fieldTrackingUrlHint')}
                </span>
              </label>

              <label className="admin-field">
                <span>{t('admin.fieldBaseRate')}</span>
                <input
                  min="0"
                  onChange={(event) => update('baseRate', event.target.value)}
                  step="0.01"
                  type="number"
                  value={draft.baseRate}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.fieldCodFee')}</span>
                <input
                  min="0"
                  onChange={(event) => update('codFee', event.target.value)}
                  step="0.01"
                  type="number"
                  value={draft.codFee}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.fieldCodFeeRate')}</span>
                <input
                  min="0"
                  onChange={(event) => update('codFeeRate', event.target.value)}
                  step="0.01"
                  type="number"
                  value={draft.codFeeRate}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>{t('admin.thNotes')}</span>
                <textarea
                  onChange={(event) => update('notes', event.target.value)}
                  value={draft.notes}
                />
              </label>

              <label className="admin-check">
                <input
                  checked={draft.supportsCod}
                  onChange={(event) => update('supportsCod', event.target.checked)}
                  type="checkbox"
                />
                <span>{t('admin.fieldSupportsCod')}</span>
              </label>
              <label className="admin-check">
                <input
                  checked={draft.isActive}
                  onChange={(event) => update('isActive', event.target.checked)}
                  type="checkbox"
                />
                <span>{t('admin.supplierStatusActive')}</span>
              </label>
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
                  ? t('admin.addCarrier')
                  : t('common.saveChanges')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default CarriersAdminPage

import { useState, type FormEvent } from 'react'
import {
  Add,
  DeleteOutlined,
  EditOutlined,
  MapOutlined,
  PowerSettingsNewOutlined,
  Search,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'
import { newOpsId, nowIso } from '../ops'
import {
  useDeliveryStore,
  type ShippingZone,
} from '../store/useDeliveryStore'

type ZoneDraft = {
  name: string
  name_ar: string
  city: string
  carrierId: string
  fee: string
  codFee: string
  etaDays: string
  isActive: boolean
}

function emptyDraft(carrierId = ''): ZoneDraft {
  return {
    name: '',
    name_ar: '',
    city: '',
    carrierId,
    fee: '0',
    codFee: '0',
    etaDays: '3',
    isActive: true,
  }
}

function draftFrom(zone: ShippingZone): ZoneDraft {
  return {
    name: zone.name,
    name_ar: zone.name_ar,
    city: zone.city,
    carrierId: zone.carrierId,
    fee: String(zone.fee),
    codFee: String(zone.codFee),
    etaDays: String(zone.etaDays),
    isActive: zone.isActive,
  }
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback
}

function ShippingZonesAdminPage() {
  const { t, localized, number, currency } = useTranslation()
  const zones = useDeliveryStore((state) => state.zones)
  const carriers = useDeliveryStore((state) => state.carriers)
  const addZone = useDeliveryStore((state) => state.addZone)
  const updateZone = useDeliveryStore((state) => state.updateZone)
  const removeZone = useDeliveryStore((state) => state.removeZone)

  const [editing, setEditing] = useState<ShippingZone | 'new' | null>(null)
  const [draft, setDraft] = useState<ZoneDraft>(emptyDraft)
  const [formError, setFormError] = useState('')
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()
  const visible = zones.filter((zone) => {
    if (!needle) return true
    return [zone.name, zone.name_ar, zone.city].join(' ').toLowerCase().includes(needle)
  })

  const carrierLabel = (carrierId: string) => {
    const carrier = carriers.find((item) => item.id === carrierId)
    return carrier ? localized(carrier.name, carrier.name_ar) : ''
  }

  function update<K extends keyof ZoneDraft>(key: K, value: ZoneDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setDraft(emptyDraft(carriers.find((carrier) => carrier.isActive)?.id ?? ''))
    setFormError('')
    setEditing('new')
  }

  function openEdit(zone: ShippingZone) {
    setDraft(draftFrom(zone))
    setFormError('')
    setEditing(zone)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setFormError(t('admin.zoneNameRequired'))
      return
    }

    const previous = editing && editing !== 'new' ? editing : null
    const zone: ShippingZone = {
      id: previous?.id ?? newOpsId('zone'),
      name: draft.name.trim(),
      name_ar: draft.name_ar.trim(),
      city: draft.city.trim(),
      carrierId: draft.carrierId,
      fee: toNumber(draft.fee),
      codFee: toNumber(draft.codFee),
      etaDays: Math.max(1, Math.round(toNumber(draft.etaDays, 3))),
      isActive: draft.isActive,
      createdAt: previous?.createdAt ?? nowIso(),
    }

    if (previous) {
      await updateZone(zone)
    } else {
      await addZone(zone)
    }
    setEditing(null)
  }

  async function handleDelete(zone: ShippingZone) {
    if (!window.confirm(t('admin.zoneDeleteConfirm'))) return
    await removeZone(zone.id)
  }

  async function handleToggle(zone: ShippingZone) {
    await updateZone({ ...zone, isActive: !zone.isActive })
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
            <Add /> {t('admin.addZone')}
          </button>
        }
        description={t('admin.zonesDescription')}
        eyebrow={t('admin.opsEyebrow')}
        title={t('admin.navZones')}
      />

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <Search />
          <input
            aria-label={t('admin.searchZonesAria')}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.searchZonesPlaceholder')}
            value={query}
          />
        </label>
        <span className="admin-toolbar__count">
          {t('admin.zoneCount', { count: number(visible.length) })}
        </span>
      </div>

      <section className="admin-card">
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thZone')}</th>
                  <th>{t('admin.thCarrier')}</th>
                  <th>{t('admin.thFee')}</th>
                  <th>{t('admin.thCodFee')}</th>
                  <th>{t('admin.thEta')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map((zone) => (
                  <tr key={zone.id}>
                    <td data-label={t('admin.thZone')}>
                      <div className="admin-table__primary">
                        <strong>{localized(zone.name, zone.name_ar)}</strong>
                        <span>
                          {zone.city
                            ? t('admin.zoneCityValue', { city: zone.city })
                            : t('admin.zoneCatchAll')}
                        </span>
                      </div>
                    </td>
                    <td data-label={t('admin.thCarrier')}>
                      <span className="admin-table__muted">
                        {carrierLabel(zone.carrierId) || t('common.notSet')}
                      </span>
                    </td>
                    <td data-label={t('admin.thFee')}>{currency(zone.fee)}</td>
                    <td data-label={t('admin.thCodFee')}>
                      {zone.codFee > 0 ? currency(zone.codFee) : '—'}
                    </td>
                    <td data-label={t('admin.thEta')}>
                      {t('admin.zoneEtaValue', { days: number(zone.etaDays) })}
                    </td>
                    <td data-label={t('admin.thStatus')}>
                      <span
                        className={`admin-badge admin-badge--${
                          zone.isActive ? 'success' : 'neutral'
                        }`}
                      >
                        {zone.isActive
                          ? t('admin.supplierStatusActive')
                          : t('admin.supplierStatusInactive')}
                      </span>
                    </td>
                    <td data-label={t('admin.thActions')}>
                      <div className="admin-table__actions">
                        <button
                          aria-label={t(
                            zone.isActive
                              ? 'admin.zoneDeactivate'
                              : 'admin.zoneActivate',
                          )}
                          className="admin-icon-btn"
                          onClick={() => void handleToggle(zone)}
                          type="button"
                        >
                          <PowerSettingsNewOutlined />
                        </button>
                        <button
                          aria-label={t('admin.editZone')}
                          className="admin-icon-btn"
                          onClick={() => openEdit(zone)}
                          type="button"
                        >
                          <EditOutlined />
                        </button>
                        <button
                          aria-label={t('common.delete')}
                          className="admin-icon-btn admin-icon-btn--danger"
                          onClick={() => void handleDelete(zone)}
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
            <MapOutlined />
            <h3>{t('admin.noZonesTitle')}</h3>
            <p>{t('admin.noZonesText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openCreate}
              type="button"
            >
              <Add /> {t('admin.addZone')}
            </button>
          </div>
        )}
      </section>

      {editing && (
        <AdminModal
          description={t('admin.zoneModalDescription')}
          onClose={() => setEditing(null)}
          size="lg"
          title={editing === 'new' ? t('admin.addZoneTitle') : t('admin.editZone')}
        >
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t('admin.zoneNameLabel')}</span>
                <input
                  onChange={(event) => update('name', event.target.value)}
                  value={draft.name}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.zoneNameLabel')} (العربية)</span>
                <input
                  dir="rtl"
                  onChange={(event) => update('name_ar', event.target.value)}
                  value={draft.name_ar}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.zoneCityLabel')}</span>
                <input
                  onChange={(event) => update('city', event.target.value)}
                  value={draft.city}
                />
                <span className="admin-field-hint">
                  {t('admin.zoneCityHint')}
                </span>
              </label>
              <label className="admin-field">
                <span>{t('admin.zoneCarrierLabel')}</span>
                <select
                  onChange={(event) => update('carrierId', event.target.value)}
                  value={draft.carrierId}
                >
                  <option value="">{t('admin.zoneNoCarrier')}</option>
                  {carriers.map((carrier) => (
                    <option key={carrier.id} value={carrier.id}>
                      {localized(carrier.name, carrier.name_ar)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>{t('admin.fieldFee')}</span>
                <input
                  min="0"
                  onChange={(event) => update('fee', event.target.value)}
                  step="0.01"
                  type="number"
                  value={draft.fee}
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
                <span>{t('admin.fieldEtaDays')}</span>
                <input
                  min="1"
                  onChange={(event) => update('etaDays', event.target.value)}
                  type="number"
                  value={draft.etaDays}
                />
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
                {editing === 'new' ? t('admin.addZone') : t('common.saveChanges')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default ShippingZonesAdminPage

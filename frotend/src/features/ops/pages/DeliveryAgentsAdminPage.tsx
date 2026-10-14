import { useState, type FormEvent } from 'react'
import {
  Add,
  BadgeOutlined,
  DeleteOutlined,
  EditOutlined,
  PowerSettingsNewOutlined,
  Search,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'
import {
  agentVehicles,
  newOpsId,
  nowIso,
  type AgentVehicle,
} from '../ops'
import {
  useDeliveryStore,
  type DeliveryAgent,
} from '../store/useDeliveryStore'

type AgentDraft = {
  name: string
  phone: string
  email: string
  vehicle: AgentVehicle
  zoneIds: string[]
  notes: string
  isActive: boolean
}

function emptyDraft(): AgentDraft {
  return {
    name: '',
    phone: '',
    email: '',
    vehicle: 'van',
    zoneIds: [],
    notes: '',
    isActive: true,
  }
}

function draftFrom(agent: DeliveryAgent): AgentDraft {
  return {
    name: agent.name,
    phone: agent.phone,
    email: agent.email,
    vehicle: agent.vehicle,
    zoneIds: [...agent.zoneIds],
    notes: agent.notes,
    isActive: agent.isActive,
  }
}

function DeliveryAgentsAdminPage() {
  const { t, localized, number } = useTranslation()
  const agents = useDeliveryStore((state) => state.agents)
  const zones = useDeliveryStore((state) => state.zones)
  const addAgent = useDeliveryStore((state) => state.addAgent)
  const updateAgent = useDeliveryStore((state) => state.updateAgent)
  const removeAgent = useDeliveryStore((state) => state.removeAgent)

  const [editing, setEditing] = useState<DeliveryAgent | 'new' | null>(null)
  const [draft, setDraft] = useState<AgentDraft>(emptyDraft)
  const [formError, setFormError] = useState('')
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()
  const visible = agents.filter((agent) => {
    if (!needle) return true
    return [agent.name, agent.phone, agent.email].join(' ').toLowerCase().includes(needle)
  })

  const zoneNames = (zoneIds: string[]) =>
    zoneIds
      .map((id) => {
        const zone = zones.find((item) => item.id === id)
        return zone ? localized(zone.name, zone.name_ar) : ''
      })
      .filter(Boolean)

  function update<K extends keyof AgentDraft>(key: K, value: AgentDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function toggleZone(zoneId: string) {
    setDraft((current) => ({
      ...current,
      zoneIds: current.zoneIds.includes(zoneId)
        ? current.zoneIds.filter((id) => id !== zoneId)
        : [...current.zoneIds, zoneId],
    }))
  }

  function openCreate() {
    setDraft(emptyDraft())
    setFormError('')
    setEditing('new')
  }

  function openEdit(agent: DeliveryAgent) {
    setDraft(draftFrom(agent))
    setFormError('')
    setEditing(agent)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setFormError(t('admin.agentNameRequired'))
      return
    }

    const previous = editing && editing !== 'new' ? editing : null
    const agent: DeliveryAgent = {
      id: previous?.id ?? newOpsId('agent'),
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      vehicle: draft.vehicle,
      zoneIds: draft.zoneIds,
      notes: draft.notes.trim(),
      isActive: draft.isActive,
      createdAt: previous?.createdAt ?? nowIso(),
    }

    if (previous) {
      await updateAgent(agent)
    } else {
      await addAgent(agent)
    }
    setEditing(null)
  }

  async function handleDelete(agent: DeliveryAgent) {
    if (!window.confirm(t('admin.agentDeleteConfirm'))) return
    await removeAgent(agent.id)
  }

  async function handleToggle(agent: DeliveryAgent) {
    await updateAgent({ ...agent, isActive: !agent.isActive })
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
            <Add /> {t('admin.addAgent')}
          </button>
        }
        description={t('admin.agentsDescription')}
        eyebrow={t('admin.opsEyebrow')}
        title={t('admin.navAgents')}
      />

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <Search />
          <input
            aria-label={t('admin.searchAgentsAria')}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.searchAgentsPlaceholder')}
            value={query}
          />
        </label>
        <span className="admin-toolbar__count">
          {t('admin.agentCount', { count: number(visible.length) })}
        </span>
      </div>

      <section className="admin-card">
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thAgent')}</th>
                  <th>{t('admin.thVehicle')}</th>
                  <th>{t('admin.thZonesCovered')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map((agent) => {
                  const covered = zoneNames(agent.zoneIds)
                  return (
                    <tr key={agent.id}>
                      <td data-label={t('admin.thAgent')}>
                        <div className="admin-table__primary">
                          <strong>{agent.name}</strong>
                          <span>{agent.phone || agent.email || t('common.notSet')}</span>
                        </div>
                      </td>
                      <td data-label={t('admin.thVehicle')}>
                        <span className="admin-badge admin-badge--info">
                          {t(`vehicle.${agent.vehicle}`)}
                        </span>
                      </td>
                      <td data-label={t('admin.thZonesCovered')}>
                        <span className="admin-table__muted">
                          {covered.length > 0
                            ? covered.join(' · ')
                            : t('admin.agentAllZones')}
                        </span>
                      </td>
                      <td data-label={t('admin.thStatus')}>
                        <span
                          className={`admin-badge admin-badge--${
                            agent.isActive ? 'success' : 'neutral'
                          }`}
                        >
                          {agent.isActive
                            ? t('admin.supplierStatusActive')
                            : t('admin.supplierStatusInactive')}
                        </span>
                      </td>
                      <td data-label={t('admin.thActions')}>
                        <div className="admin-table__actions">
                          <button
                            aria-label={t(
                              agent.isActive
                                ? 'admin.agentDeactivate'
                                : 'admin.agentActivate',
                            )}
                            className="admin-icon-btn"
                            onClick={() => void handleToggle(agent)}
                            type="button"
                          >
                            <PowerSettingsNewOutlined />
                          </button>
                          <button
                            aria-label={t('admin.editAgent')}
                            className="admin-icon-btn"
                            onClick={() => openEdit(agent)}
                            type="button"
                          >
                            <EditOutlined />
                          </button>
                          <button
                            aria-label={t('common.delete')}
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => void handleDelete(agent)}
                            type="button"
                          >
                            <DeleteOutlined />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <BadgeOutlined />
            <h3>{t('admin.noAgentsTitle')}</h3>
            <p>{t('admin.noAgentsText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openCreate}
              type="button"
            >
              <Add /> {t('admin.addAgent')}
            </button>
          </div>
        )}
      </section>

      {editing && (
        <AdminModal
          description={t('admin.agentModalDescription')}
          onClose={() => setEditing(null)}
          size="lg"
          title={
            editing === 'new' ? t('admin.addAgentTitle') : t('admin.editAgent')
          }
        >
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t('admin.agentNameLabel')}</span>
                <input
                  onChange={(event) => update('name', event.target.value)}
                  value={draft.name}
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
                <span>{t('admin.fieldVehicle')}</span>
                <select
                  onChange={(event) =>
                    update('vehicle', event.target.value as AgentVehicle)
                  }
                  value={draft.vehicle}
                >
                  {agentVehicles.map((vehicle) => (
                    <option key={vehicle} value={vehicle}>
                      {t(`vehicle.${vehicle}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field admin-field--full">
                <span>{t('admin.thNotes')}</span>
                <textarea
                  onChange={(event) => update('notes', event.target.value)}
                  value={draft.notes}
                />
              </label>

              <div className="admin-field admin-field--full">
                <span>{t('admin.agentZonesLabel')}</span>
                <p className="admin-field-hint">{t('admin.agentZonesHint')}</p>
                {zones.length > 0 ? (
                  <div className="admin-ops-checks">
                    {zones.map((zone) => (
                      <label className="admin-check" key={zone.id}>
                        <input
                          checked={draft.zoneIds.includes(zone.id)}
                          onChange={() => toggleZone(zone.id)}
                          type="checkbox"
                        />
                        <span>{localized(zone.name, zone.name_ar)}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="admin-field-hint">{t('admin.agentNoZones')}</p>
                )}
              </div>

              <label className="admin-check admin-field--full">
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
                {editing === 'new' ? t('admin.addAgent') : t('common.saveChanges')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default DeliveryAgentsAdminPage

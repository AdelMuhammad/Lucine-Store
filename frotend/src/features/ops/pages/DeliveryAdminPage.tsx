import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Add,
  DeleteOutlined,
  DoneAllOutlined,
  EditOutlined,
  LocalShippingOutlined,
  PaymentsOutlined,
  ReportProblemOutlined,
  Search,
  TaskAltOutlined,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'
import { useAccountStore } from '../../account/store/useAccountStore'
import {
  nextShipmentStatus,
  shipmentStatusTone,
  shipmentStatuses,
  todayIso,
  trackingUrlFor,
  type ShipmentStatus,
} from '../ops'
import {
  openShipments,
  useDeliveryStore,
  type Carrier,
  type DeliveryAgent,
  type Shipment,
  type ShippingZone,
} from '../store/useDeliveryStore'
import {
  createDeliveryProofUrl,
  deleteDeliveryProof,
  uploadDeliveryProof,
} from '../../../services/delivery'

type PerfStat = {
  id: string
  total: number
  delivered: number
  failed: number
  avgDays: number
  codCollected: number
}

/**
 * Rolls shipments up under a key (carrier or agent id), newest first and
 * largest first, so the board can rank performance without extra queries.
 */
function performanceBy(
  shipments: readonly Shipment[],
  pick: (shipment: Shipment) => string,
): PerfStat[] {
  const stats = new Map<string, PerfStat & { days: number; daysCount: number }>()

  for (const shipment of shipments) {
    const id = pick(shipment)
    if (!id) continue
    const entry =
      stats.get(id) ??
      ({
        id,
        total: 0,
        delivered: 0,
        failed: 0,
        avgDays: 0,
        codCollected: 0,
        days: 0,
        daysCount: 0,
      } as PerfStat & { days: number; daysCount: number })

    entry.total += 1
    if (shipment.status === 'delivered') {
      entry.delivered += 1
      entry.codCollected += shipment.codCollected
      if (shipment.shippedAt && shipment.deliveredAt) {
        const days =
          (new Date(shipment.deliveredAt).getTime() -
            new Date(shipment.shippedAt).getTime()) /
          86_400_000
        if (Number.isFinite(days) && days >= 0) {
          entry.days += days
          entry.daysCount += 1
        }
      }
    }
    if (shipment.status === 'failed' || shipment.status === 'returned') {
      entry.failed += 1
    }

    stats.set(id, entry)
  }

  return [...stats.values()]
    .map((entry) => ({
      ...entry,
      avgDays: entry.daysCount > 0 ? entry.days / entry.daysCount : 0,
    }))
    .toSorted((first, second) => second.total - first.total)
}

function DeliveryAdminPage() {
  const { t, localized, number, currency } = useTranslation()
  const shipments = useDeliveryStore((state) => state.shipments)
  const carriers = useDeliveryStore((state) => state.carriers)
  const agents = useDeliveryStore((state) => state.agents)
  const zones = useDeliveryStore((state) => state.zones)
  const updateShipment = useDeliveryStore((state) => state.updateShipment)
  const removeShipment = useDeliveryStore((state) => state.removeShipment)
  const setShipmentStatus = useDeliveryStore((state) => state.setShipmentStatus)
  const ensureShipmentForOrder = useDeliveryStore(
    (state) => state.ensureShipmentForOrder,
  )
  const orders = useAccountStore((state) => state.orders)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all')
  const [carrierFilter, setCarrierFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [active, setActive] = useState<Shipment | null>(null)
  const [picking, setPicking] = useState(false)

  const metrics = useMemo(() => {
    const today = todayIso()
    const open = openShipments(shipments)
    return {
      open: open.length,
      outForDelivery: shipments.filter(
        (shipment) => shipment.status === 'out-for-delivery',
      ).length,
      deliveredToday: shipments.filter(
        (shipment) =>
          shipment.status === 'delivered' &&
          shipment.deliveredAt.slice(0, 10) === today,
      ).length,
      problems: shipments.filter(
        (shipment) =>
          shipment.status === 'failed' || shipment.status === 'returned',
      ).length,
      codToCollect: open.reduce(
        (sum, shipment) =>
          sum + Math.max(0, shipment.codAmount - shipment.codCollected),
        0,
      ),
    }
  }, [shipments])

  const carrierPerf = useMemo(
    () => performanceBy(shipments, (shipment) => shipment.carrierId),
    [shipments],
  )
  const agentPerf = useMemo(
    () => performanceBy(shipments, (shipment) => shipment.agentId),
    [shipments],
  )

  const carrierLabel = (carrierId: string) => {
    const carrier = carriers.find((item) => item.id === carrierId)
    return carrier ? localized(carrier.name, carrier.name_ar) : ''
  }

  const agentLabel = (agentId: string) => {
    const agent = agents.find((item) => item.id === agentId)
    return agent ? agent.name : ''
  }

  const pendingOrders = useMemo(() => {
    const shipped = new Set(shipments.map((shipment) => shipment.orderId))
    return orders.filter((order) => !shipped.has(order.id)).slice(0, 40)
  }, [orders, shipments])

  const needle = query.trim().toLowerCase()
  const visible = shipments.filter((shipment) => {
    if (statusFilter !== 'all' && shipment.status !== statusFilter) return false
    if (carrierFilter !== 'all' && shipment.carrierId !== carrierFilter) {
      return false
    }
    if (agentFilter !== 'all' && shipment.agentId !== agentFilter) return false
    if (!needle) return true
    return [
      shipment.orderNumber,
      shipment.customerName,
      shipment.phone,
      shipment.city,
      shipment.trackingNumber,
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })

  async function handleAdvance(shipment: Shipment) {
    const next = nextShipmentStatus(shipment.status)
    if (!next) return
    await setShipmentStatus(shipment.id, next, '', t('admin.deliveryByAdmin'))
    const latest = useDeliveryStore
      .getState()
      .shipments.find((item) => item.id === shipment.id)
    if (latest) setActive(latest)
  }

  async function handleDelete(shipment: Shipment) {
    if (!window.confirm(t('admin.shipmentDeleteConfirm'))) return
    await removeShipment(shipment.id)
    setActive(null)
  }

  async function handlePickOrder(orderId: string) {
    const order = orders.find((item) => item.id === orderId)
    if (!order) return
    const shipment = await ensureShipmentForOrder(order)
    setPicking(false)
    setActive(shipment)
  }

  return (
    <>
      <AdminPageHeader
        actions={
          <button
            className="admin-btn admin-btn--primary"
            onClick={() => setPicking(true)}
            type="button"
          >
            <Add /> {t('admin.newShipment')}
          </button>
        }
        description={t('admin.deliveriesDescription')}
        eyebrow={t('admin.opsEyebrow')}
        title={t('admin.navDeliveries')}
      />

      <div className="admin-stat-grid">
        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">{t('admin.deliveryStatOpen')}</span>
            <span className="admin-stat__icon">
              <LocalShippingOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{number(metrics.open)}</strong>
          <span className="admin-stat__hint">
            {t('admin.deliveryStatOpenHint')}
          </span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">
              {t('admin.deliveryStatOutForDelivery')}
            </span>
            <span className="admin-stat__icon">
              <TaskAltOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">
            {number(metrics.outForDelivery)}
          </strong>
          <span className="admin-stat__hint">
            {t('admin.deliveryStatOutForDeliveryHint')}
          </span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">
              {t('admin.deliveryStatDeliveredToday')}
            </span>
            <span className="admin-stat__icon">
              <DoneAllOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">
            {number(metrics.deliveredToday)}
          </strong>
          <span className="admin-stat__hint">
            {t('admin.deliveryStatDeliveredTodayHint')}
          </span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">
              {t('admin.deliveryStatProblems')}
            </span>
            <span className="admin-stat__icon">
              <ReportProblemOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">{number(metrics.problems)}</strong>
          <span className="admin-stat__hint">
            {t('admin.deliveryStatProblemsHint')}
          </span>
        </article>

        <article className="admin-stat">
          <div className="admin-stat__top">
            <span className="admin-stat__label">
              {t('admin.deliveryStatCodPending')}
            </span>
            <span className="admin-stat__icon">
              <PaymentsOutlined />
            </span>
          </div>
          <strong className="admin-stat__value">
            {currency(metrics.codToCollect)}
          </strong>
          <span className="admin-stat__hint">
            {t('admin.deliveryStatCodPendingHint')}
          </span>
        </article>
      </div>

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <Search />
          <input
            aria-label={t('admin.searchShipmentsAria')}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.searchShipmentsPlaceholder')}
            value={query}
          />
        </label>
        <select
          aria-label={t('admin.filterStatus')}
          className="admin-toolbar__select"
          onChange={(event) =>
            setStatusFilter(event.target.value as ShipmentStatus | 'all')
          }
          value={statusFilter}
        >
          <option value="all">{t('admin.filterAllStatuses')}</option>
          {shipmentStatuses.map((status) => (
            <option key={status} value={status}>
              {t(`shipmentStatus.${status}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('admin.thCarrier')}
          className="admin-toolbar__select"
          onChange={(event) => setCarrierFilter(event.target.value)}
          value={carrierFilter}
        >
          <option value="all">{t('admin.filterAllCarriers')}</option>
          {carriers.map((carrier) => (
            <option key={carrier.id} value={carrier.id}>
              {localized(carrier.name, carrier.name_ar)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('admin.thAgent')}
          className="admin-toolbar__select"
          onChange={(event) => setAgentFilter(event.target.value)}
          value={agentFilter}
        >
          <option value="all">{t('admin.filterAllAgents')}</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
        <span className="admin-toolbar__count">
          {t('admin.shipmentCount', { count: number(visible.length) })}
        </span>
      </div>

      <section className="admin-card">
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thShipment')}</th>
                  <th>{t('admin.thDestination')}</th>
                  <th>{t('admin.thCarrier')}</th>
                  <th>{t('admin.thAgent')}</th>
                  <th>{t('admin.thTracking')}</th>
                  <th>{t('admin.thCod')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map((shipment) => {
                  const carrier = carriers.find(
                    (item) => item.id === shipment.carrierId,
                  )
                  const trackingUrl = trackingUrlFor(
                    carrier,
                    shipment.trackingNumber,
                  )
                  return (
                    <tr key={shipment.id}>
                      <td data-label={t('admin.thShipment')}>
                        <div className="admin-table__primary">
                          <strong>{shipment.customerName}</strong>
                          <span>{shipment.orderNumber}</span>
                        </div>
                      </td>
                      <td data-label={t('admin.thDestination')}>
                        <div className="admin-table__primary">
                          <strong>{shipment.city || t('common.notSet')}</strong>
                          <span>{shipment.phone}</span>
                        </div>
                      </td>
                      <td data-label={t('admin.thCarrier')}>
                        <span className="admin-table__muted">
                          {carrierLabel(shipment.carrierId) || t('common.notSet')}
                        </span>
                      </td>
                      <td data-label={t('admin.thAgent')}>
                        <span className="admin-table__muted">
                          {agentLabel(shipment.agentId) || t('common.notSet')}
                        </span>
                      </td>
                      <td data-label={t('admin.thTracking')}>
                        {shipment.trackingNumber ? (
                          trackingUrl ? (
                            <a
                              className="admin-table__muted"
                              href={trackingUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {shipment.trackingNumber}
                            </a>
                          ) : (
                            <span className="admin-table__muted">
                              {shipment.trackingNumber}
                            </span>
                          )
                        ) : (
                          <span className="admin-table__muted">
                            {t('common.notSet')}
                          </span>
                        )}
                      </td>
                      <td data-label={t('admin.thCod')}>
                        {shipment.codAmount > 0 ? (
                          <div className="admin-table__primary">
                            <strong>{currency(shipment.codAmount)}</strong>
                            <span>
                              {shipment.codCollected > 0
                                ? t('admin.codCollected', {
                                    amount: currency(shipment.codCollected),
                                  })
                                : t('admin.codPending')}
                            </span>
                          </div>
                        ) : (
                          <span className="admin-badge admin-badge--neutral">
                            {t('admin.codPrepaid')}
                          </span>
                        )}
                      </td>
                      <td data-label={t('admin.thStatus')}>
                        <span
                          className={`admin-badge admin-badge--${shipmentStatusTone(
                            shipment.status,
                          )}`}
                        >
                          {t(`shipmentStatus.${shipment.status}`)}
                        </span>
                      </td>
                      <td data-label={t('admin.thActions')}>
                        <div className="admin-table__actions">
                          {nextShipmentStatus(shipment.status) && (
                            <button
                              aria-label={t('admin.shipmentAdvance')}
                              className="admin-icon-btn"
                              onClick={() => void handleAdvance(shipment)}
                              type="button"
                            >
                              <DoneAllOutlined />
                            </button>
                          )}
                          <button
                            aria-label={t('admin.shipmentUpdate')}
                            className="admin-icon-btn"
                            onClick={() => setActive(shipment)}
                            type="button"
                          >
                            <EditOutlined />
                          </button>
                          <button
                            aria-label={t('common.delete')}
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => void handleDelete(shipment)}
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
            <LocalShippingOutlined />
            <h3>{t('admin.noShipmentsTitle')}</h3>
            <p>{t('admin.noShipmentsText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={() => setPicking(true)}
              type="button"
            >
              <Add /> {t('admin.newShipment')}
            </button>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h3 className="admin-card__title">{t('admin.deliveryPerformance')}</h3>
        <p className="admin-card__hint">{t('admin.deliveryPerformanceHint')}</p>

        <div className="admin-cards-2">
          <div>
            <h4 className="admin-ops-subtitle">
              {t('admin.perfByCarrier')}
            </h4>
            {carrierPerf.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.thCarrier')}</th>
                      <th>{t('admin.thParcels')}</th>
                      <th>{t('admin.thSuccessRate')}</th>
                      <th>{t('admin.thAvgDays')}</th>
                      <th>{t('admin.thCodCollected')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrierPerf.map((stat) => (
                      <tr key={`carrier-${stat.id}`}>
                        <td data-label={t('admin.thCarrier')}>
                          {carrierLabel(stat.id) || t('common.notSet')}
                        </td>
                        <td data-label={t('admin.thParcels')}>
                          {number(stat.total)}
                        </td>
                        <td data-label={t('admin.thSuccessRate')}>
                          {stat.total > 0
                            ? t('admin.perfRate', {
                                percent: number(
                                  (stat.delivered / stat.total) * 100,
                                ),
                              })
                            : '—'}
                        </td>
                        <td data-label={t('admin.thAvgDays')}>
                          {stat.avgDays > 0 ? number(stat.avgDays, {
                            maximumFractionDigits: 1,
                          }) : '—'}
                        </td>
                        <td data-label={t('admin.thCodCollected')}>
                          {currency(stat.codCollected)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-field-hint">{t('admin.perfNoData')}</p>
            )}
          </div>

          <div>
            <h4 className="admin-ops-subtitle">{t('admin.perfByAgent')}</h4>
            {agentPerf.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.thAgent')}</th>
                      <th>{t('admin.thParcels')}</th>
                      <th>{t('admin.thSuccessRate')}</th>
                      <th>{t('admin.thAvgDays')}</th>
                      <th>{t('admin.thCodCollected')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentPerf.map((stat) => (
                      <tr key={`agent-${stat.id}`}>
                        <td data-label={t('admin.thAgent')}>
                          {agentLabel(stat.id) || t('common.notSet')}
                        </td>
                        <td data-label={t('admin.thParcels')}>
                          {number(stat.total)}
                        </td>
                        <td data-label={t('admin.thSuccessRate')}>
                          {stat.total > 0
                            ? t('admin.perfRate', {
                                percent: number(
                                  (stat.delivered / stat.total) * 100,
                                ),
                              })
                            : '—'}
                        </td>
                        <td data-label={t('admin.thAvgDays')}>
                          {stat.avgDays > 0
                            ? number(stat.avgDays, {
                                maximumFractionDigits: 1,
                              })
                            : '—'}
                        </td>
                        <td data-label={t('admin.thCodCollected')}>
                          {currency(stat.codCollected)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-field-hint">{t('admin.perfNoData')}</p>
            )}
          </div>
        </div>
      </section>

      {active && (
        <ShipmentModal
          carriers={carriers}
          agents={agents}
          zones={zones}
          onClose={() => setActive(null)}
          onDelete={() => void handleDelete(active)}
          onSave={async (draft) => {
            const carrier = carriers.find(
              (item) => item.id === draft.carrierId,
            )
            const agent = agents.find((item) => item.id === draft.agentId)
            const previousProofPath = active.proofImagePath
            const proofImagePath = draft.proofFile
              ? await uploadDeliveryProof(
                  draft.proofFile,
                  active.orderId,
                  active.id,
                )
              : active.proofImagePath
            const deliveredBy =
              draft.deliveredBy.trim() ||
              agent?.name ||
              t('admin.deliveryByAdmin')
            const patch: Shipment = {
              ...active,
              carrierId: draft.carrierId,
              carrierName: carrier?.name ?? '',
              carrierNameAr: carrier?.name_ar ?? '',
              carrierTrackingUrl: carrier?.trackingUrl ?? '',
              agentId: draft.agentId,
              agentName: agent?.name ?? '',
              zoneId: draft.zoneId,
              trackingNumber: draft.trackingNumber,
              shippingCost: draft.shippingCost,
              codAmount: draft.codAmount,
              notes: draft.notes,
              proofImagePath,
              proofNote: draft.proofNote,
              proofAt: draft.proofFile
                ? new Date().toISOString()
                : active.proofAt,
              deliveredBy: draft.proofFile ? deliveredBy : active.deliveredBy,
            }
            try {
              await updateShipment(patch)
            } catch (error) {
              if (draft.proofFile) {
                try {
                  await deleteDeliveryProof(proofImagePath)
                } catch (cleanupError) {
                  console.error(
                    '[delivery] failed to clean up uncommitted proof image',
                    cleanupError,
                  )
                }
              }
              throw error
            }
            const nextStatus = draft.proofFile ? 'delivered' : draft.status
            if (nextStatus !== active.status) {
              await setShipmentStatus(
                active.id,
                nextStatus,
                draft.proofFile ? draft.proofNote : draft.note,
                draft.proofFile ? deliveredBy : t('admin.deliveryByAdmin'),
              )
            }
            if (
              draft.proofFile &&
              previousProofPath &&
              previousProofPath !== proofImagePath
            ) {
              try {
                await deleteDeliveryProof(previousProofPath)
              } catch (error) {
                console.error('[delivery] failed to remove replaced proof image', error)
              }
            }
            const latest = useDeliveryStore
              .getState()
              .shipments.find((item) => item.id === active.id)
            setActive(latest ?? null)
          }}
          shipment={active}
        />
      )}

      {picking && (
        <AdminModal
          description={t('admin.pickOrderDescription')}
          onClose={() => setPicking(false)}
          size="md"
          title={t('admin.pickOrderTitle')}
        >
          {pendingOrders.length > 0 ? (
            <ul className="admin-pick-list">
              {pendingOrders.map((order) => (
                <li key={order.id}>
                  <button
                    className="admin-pick"
                    onClick={() => void handlePickOrder(order.id)}
                    type="button"
                  >
                    <span className="admin-pick__main">
                      <strong>
                        {order.address.firstName} {order.address.lastName}
                      </strong>
                      <span>
                        {order.address.city} · {order.phone}
                      </span>
                    </span>
                    <span className="admin-pick__meta">
                      <span>{order.id}</span>
                      <span>{currency(order.total)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-field-hint">{t('admin.pickOrderEmpty')}</p>
          )}
        </AdminModal>
      )}
    </>
  )
}

type ShipmentDraft = {
  status: ShipmentStatus
  note: string
  carrierId: string
  agentId: string
  zoneId: string
  trackingNumber: string
  shippingCost: number
  codAmount: number
  notes: string
  proofFile: File | null
  proofNote: string
  deliveredBy: string
}

type ShipmentModalProps = {
  shipment: Shipment
  carriers: Carrier[]
  agents: DeliveryAgent[]
  zones: ShippingZone[]
  onClose: () => void
  onDelete: () => void
  onSave: (draft: ShipmentDraft) => Promise<void>
}

function ShipmentModal({
  shipment,
  carriers,
  agents,
  zones,
  onClose,
  onDelete,
  onSave,
}: ShipmentModalProps) {
  const { t, localized, number, currency, dateTime } = useTranslation()
  const [draft, setDraft] = useState<ShipmentDraft>({
    status: shipment.status,
    note: '',
    carrierId: shipment.carrierId,
    agentId: shipment.agentId,
    zoneId: shipment.zoneId,
    trackingNumber: shipment.trackingNumber,
    shippingCost: shipment.shippingCost,
    codAmount: shipment.codAmount,
    notes: shipment.notes,
    proofFile: null,
    proofNote: shipment.proofNote,
    deliveredBy:
      shipment.deliveredBy ||
      agents.find((agent) => agent.id === shipment.agentId)?.name ||
      '',
  })
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [proofImage, setProofImage] = useState({ path: '', url: '' })
  const [proofPreviewErrorPath, setProofPreviewErrorPath] = useState('')

  useEffect(() => {
    let active = true
    if (!shipment.proofImagePath) return
    void createDeliveryProofUrl(shipment.proofImagePath)
      .then((url) => {
        if (active) setProofImage({ path: shipment.proofImagePath, url })
      })
      .catch((error: unknown) => {
        console.error('[delivery] failed to load proof image preview', error)
        if (active) {
          setProofPreviewErrorPath(shipment.proofImagePath)
        }
      })
    return () => {
      active = false
    }
  }, [shipment.proofImagePath])
  const proofImageUrl =
    proofImage.path === shipment.proofImagePath ? proofImage.url : ''

  function update<K extends keyof ShipmentDraft>(
    key: K,
    value: ShipmentDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setSaveError('')
    try {
      await onSave(draft)
    } catch (error) {
      console.error('[delivery] failed to save shipment changes', error)
      setSaveError(t('admin.shipmentSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const timeline = shipment.events.toSorted((first, second) =>
    second.at.localeCompare(first.at),
  )

  return (
    <AdminModal
      description={t('admin.shipmentModalDescription')}
      onClose={onClose}
      size="lg"
      title={shipment.orderNumber}
    >
      <div className="admin-shipment-summary">
        <div>
          <span className="admin-field-hint">{t('admin.thCustomer')}</span>
          <strong>{shipment.customerName}</strong>
        </div>
        <div>
          <span className="admin-field-hint">{t('admin.supplierPhoneLabel')}</span>
          <strong>{shipment.phone}</strong>
        </div>
        <div>
          <span className="admin-field-hint">{t('admin.thDestination')}</span>
          <strong>{shipment.city}</strong>
        </div>
        <div>
          <span className="admin-field-hint">{t('admin.thOrderTotal')}</span>
          <strong>{currency(shipment.orderTotal)}</strong>
        </div>
      </div>

      {shipment.address && (
        <p className="admin-field-hint">{shipment.address}</p>
      )}

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>{t('admin.thStatus')}</span>
            <select
              onChange={(event) =>
                update('status', event.target.value as ShipmentStatus)
              }
              value={draft.status}
            >
              {shipmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {t(`shipmentStatus.${status}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>{t('admin.thCarrier')}</span>
            <select
              onChange={(event) => update('carrierId', event.target.value)}
              value={draft.carrierId}
            >
              <option value="">{t('common.notSet')}</option>
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {localized(carrier.name, carrier.name_ar)}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>{t('admin.thAgent')}</span>
            <select
              onChange={(event) => update('agentId', event.target.value)}
              value={draft.agentId}
            >
              <option value="">{t('admin.agentUnassigned')}</option>
              {agents
                .filter((agent) => agent.isActive)
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                    {agent.phone ? ` · ${agent.phone}` : ''}
                  </option>
                ))}
            </select>
          </label>
          <label className="admin-field">
            <span>{t('admin.thZone')}</span>
            <select
              onChange={(event) => update('zoneId', event.target.value)}
              value={draft.zoneId}
            >
              <option value="">{t('common.notSet')}</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {localized(zone.name, zone.name_ar)}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldTrackingNumber')}</span>
            <input
              onChange={(event) => update('trackingNumber', event.target.value)}
              value={draft.trackingNumber}
            />
          </label>
          <label className="admin-field">
            <span>{t('admin.fieldShippingCost')}</span>
            <input
              min="0"
              onChange={(event) =>
                update('shippingCost', Number(event.target.value) || 0)
              }
              step="0.01"
              type="number"
              value={draft.shippingCost}
            />
          </label>

          <label className="admin-field">
            <span>{t('admin.fieldCodAmount')}</span>
            <input
              min="0"
              onChange={(event) =>
                update('codAmount', Number(event.target.value) || 0)
              }
              step="0.01"
              type="number"
              value={draft.codAmount}
            />
            <span className="admin-field-hint">{t('admin.fieldCodAmountHint')}</span>
          </label>
          <label className="admin-field">
            <span>{t('admin.fieldStatusNote')}</span>
            <input
              onChange={(event) => update('note', event.target.value)}
              placeholder={t('admin.fieldStatusNotePlaceholder')}
              value={draft.note}
            />
          </label>

          <label className="admin-field">
            <span>{t('admin.deliveryProofBy')}</span>
            <input
              onChange={(event) =>
                update('deliveredBy', event.target.value)
              }
              placeholder={t('admin.deliveryByAdmin')}
              value={draft.deliveredBy}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span>{t('admin.deliveryProofNote')}</span>
            <textarea
              onChange={(event) => update('proofNote', event.target.value)}
              value={draft.proofNote}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span>{t('admin.deliveryProofImage')}</span>
            <input
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                update('proofFile', event.target.files?.[0] ?? null)
              }
              type="file"
            />
            <span className="admin-field-hint">
              {t('admin.deliveryProofImageHint')}
            </span>
          </label>

          <label className="admin-field admin-field--full">
            <span>{t('admin.thNotes')}</span>
            <textarea
              onChange={(event) => update('notes', event.target.value)}
              value={draft.notes}
            />
          </label>
        </div>

        {proofImageUrl && (
          <div className="admin-delivery-proof">
            <h4 className="admin-ops-subtitle">{t('admin.deliveryProofCurrent')}</h4>
            <img
              alt={t('admin.deliveryProofImage')}
              src={proofImageUrl}
            />
            {shipment.proofAt && (
              <span className="admin-field-hint">
                {dateTime(shipment.proofAt, 'short')}
                {shipment.deliveredBy ? ` · ${shipment.deliveredBy}` : ''}
              </span>
            )}
          </div>
        )}

        {shipment.proofImagePath &&
          proofPreviewErrorPath === shipment.proofImagePath &&
          !proofImageUrl && (
          <p className="admin-form-error" role="alert">
            {t('admin.deliveryProofUnavailable')}
          </p>
        )}

        {saveError && (
          <p className="admin-form-error" role="alert">{saveError}</p>
        )}

        <div className="admin-form-actions">
          <button
            className="admin-btn admin-btn--danger"
            onClick={onDelete}
            type="button"
          >
            <DeleteOutlined /> {t('common.delete')}
          </button>
          <button className="admin-btn" onClick={onClose} type="button">
            {t('common.cancel')}
          </button>
          <button
            className="admin-btn admin-btn--primary"
            disabled={busy}
            type="submit"
          >
            {t('common.saveChanges')}
          </button>
        </div>
      </form>

      <div className="admin-ops-timeline">
        <h4 className="admin-ops-subtitle">{t('admin.shipmentTimeline')}</h4>
        {timeline.length > 0 ? (
          <ol className="admin-ops-timeline__list">
            {timeline.map((event) => (
              <li key={event.id}>
                <span
                  className={`admin-badge admin-badge--${shipmentStatusTone(
                    event.status,
                  )}`}
                >
                  {t(`shipmentStatus.${event.status}`)}
                </span>
                <div className="admin-ops-timeline__body">
                  <strong>
                    {event.note || t(`shipmentStatus.${event.status}`)}
                  </strong>
                  <span className="admin-field-hint">
                    {dateTime(event.at, 'short')}
                    {event.by ? ` · ${event.by}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="admin-field-hint">
            {t('admin.shipmentTimelineEmpty', {
              attempts: number(shipment.attempts),
            })}
          </p>
        )}
      </div>
    </AdminModal>
  )
}

export default DeliveryAdminPage

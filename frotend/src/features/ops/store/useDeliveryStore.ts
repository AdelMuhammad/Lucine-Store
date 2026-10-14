import { create } from 'zustand'
import * as deliveryService from '../../../services/delivery'
import type { CustomerOrder } from '../../account/store/useAccountStore'
import { useAccountStore } from '../../account/store/useAccountStore'
import {
  codAmountFor,
  newOpsId,
  nowIso,
  orderStatusForShipment,
  zoneRateFor,
  type AgentVehicle,
  type ShipmentStatus,
} from '../ops'

/** An external shipping company (courier). */
export type Carrier = {
  id: string
  name: string
  name_ar: string
  phone: string
  email: string
  website: string
  /** Tracking page template containing `{tracking}`. */
  trackingUrl: string
  supportsCod: boolean
  /** Flat rate quoted for a standard parcel. */
  baseRate: number
  /** Fixed cash-on-delivery handling fee. */
  codFee: number
  /** Extra COD fee as a percentage of the collected amount. */
  codFeeRate: number
  notes: string
  isActive: boolean
  createdAt: string
}

/** A delivery area with its own price and expected lead time. */
export type ShippingZone = {
  id: string
  name: string
  name_ar: string
  /** City this zone prices; empty means "anywhere else". */
  city: string
  /** Default carrier for the zone, or `''` to leave it to the dispatcher. */
  carrierId: string
  fee: number
  codFee: number
  etaDays: number
  isActive: boolean
  createdAt: string
}

/** An in-house courier who owns deliveries. */
export type DeliveryAgent = {
  id: string
  name: string
  phone: string
  email: string
  vehicle: AgentVehicle
  /** Zones the agent usually covers. */
  zoneIds: string[]
  notes: string
  isActive: boolean
  createdAt: string
}

/** One line of a shipment's timeline. */
export type ShipmentEvent = {
  id: string
  status: ShipmentStatus
  note: string
  /** Who recorded it (agent name, admin, …). */
  by: string
  at: string
}

/** One delivery, created from a customer order. */
export type Shipment = {
  id: string
  orderId: string
  /** Customer-facing order reference, for labels and search. */
  orderNumber: string
  orderTotal: number
  customerName: string
  phone: string
  city: string
  address: string
  carrierId: string
  carrierName: string
  carrierNameAr: string
  carrierTrackingUrl: string
  agentId: string
  agentName: string
  zoneId: string
  trackingNumber: string
  status: ShipmentStatus
  paymentMethod: 'card' | 'cash'
  /** Cash the courier must collect (0 when prepaid). */
  codAmount: number
  /** Cash actually collected. */
  codCollected: number
  shippingCost: number
  attempts: number
  notes: string
  proofImagePath: string
  proofNote: string
  proofAt: string
  deliveredBy: string
  events: ShipmentEvent[]
  shippedAt: string
  deliveredAt: string
  createdAt: string
}

type DeliveryState = {
  carriers: Carrier[]
  zones: ShippingZone[]
  agents: DeliveryAgent[]
  shipments: Shipment[]
  addCarrier: (carrier: Carrier) => Promise<void>
  updateCarrier: (carrier: Carrier) => Promise<void>
  removeCarrier: (carrierId: string) => Promise<void>
  addZone: (zone: ShippingZone) => Promise<void>
  updateZone: (zone: ShippingZone) => Promise<void>
  removeZone: (zoneId: string) => Promise<void>
  addAgent: (agent: DeliveryAgent) => Promise<void>
  updateAgent: (agent: DeliveryAgent) => Promise<void>
  removeAgent: (agentId: string) => Promise<void>
  addShipment: (shipment: Shipment) => Promise<void>
  updateShipment: (shipment: Shipment) => Promise<void>
  removeShipment: (shipmentId: string) => Promise<void>
  /**
   * Moves a shipment to `status`, appending a timeline event and keeping the
   * derived fields in sync (ship/deliver timestamps, failed attempts, the cash
   * collected on delivery).
   */
  setShipmentStatus: (
    shipmentId: string,
    status: ShipmentStatus,
    note?: string,
    by?: string,
  ) => Promise<void>
  /** Creates the delivery row for an order if it does not exist yet. */
  ensureShipmentForOrder: (order: CustomerOrder) => Promise<Shipment>
  /** Loads carriers, zones, agents and shipments from Supabase. */
  hydrate: () => Promise<void>
}

export const useDeliveryStore = create<DeliveryState>()(
  (set, get) => ({
      carriers: [],
      zones: [],
      agents: [],
      shipments: [],

      addCarrier: async (carrier) => {
        set((state) => ({ carriers: [...state.carriers, carrier] }))
        await deliveryService.saveCarrier(carrier)
      },
      updateCarrier: async (carrier) => {
        set((state) => ({
          carriers: state.carriers.map((item) =>
            item.id === carrier.id ? carrier : item,
          ),
        }))
        await deliveryService.saveCarrier(carrier)
      },
      removeCarrier: async (carrierId) => {
        set((state) => ({
          carriers: state.carriers.filter((item) => item.id !== carrierId),
        }))
        await deliveryService.deleteCarrier(carrierId)
      },

      addZone: async (zone) => {
        set((state) => ({ zones: [...state.zones, zone] }))
        await deliveryService.saveZone(zone)
      },
      updateZone: async (zone) => {
        set((state) => ({
          zones: state.zones.map((item) => (item.id === zone.id ? zone : item)),
        }))
        await deliveryService.saveZone(zone)
      },
      removeZone: async (zoneId) => {
        set((state) => ({ zones: state.zones.filter((item) => item.id !== zoneId) }))
        await deliveryService.deleteZone(zoneId)
      },

      addAgent: async (agent) => {
        set((state) => ({ agents: [...state.agents, agent] }))
        await deliveryService.saveAgent(agent)
      },
      updateAgent: async (agent) => {
        set((state) => ({
          agents: state.agents.map((item) => (item.id === agent.id ? agent : item)),
        }))
        await deliveryService.saveAgent(agent)
      },
      removeAgent: async (agentId) => {
        set((state) => ({
          agents: state.agents.filter((item) => item.id !== agentId),
        }))
        await deliveryService.deleteAgent(agentId)
      },

      addShipment: async (shipment) => {
        set((state) => ({ shipments: [shipment, ...state.shipments] }))
        await deliveryService.saveShipment(shipment)
      },
      updateShipment: async (shipment) => {
        const previous = get().shipments.find((item) => item.id === shipment.id)
        set((state) => ({
          shipments: state.shipments.map((item) =>
            item.id === shipment.id ? shipment : item,
          ),
        }))
        try {
          await deliveryService.saveShipment(shipment)
        } catch (error) {
          if (previous) {
            set((state) => ({
              shipments: state.shipments.map((item) =>
                item.id === previous.id ? previous : item,
              ),
            }))
          }
          throw error
        }
      },
      removeShipment: async (shipmentId) => {
        set((state) => ({
          shipments: state.shipments.filter((item) => item.id !== shipmentId),
        }))
        await deliveryService.deleteShipment(shipmentId)
      },

      setShipmentStatus: async (shipmentId, status, note = '', by = '') => {
        const shipment = get().shipments.find((item) => item.id === shipmentId)
        if (!shipment || shipment.status === status) return

        const at = nowIso()
        const event: ShipmentEvent = {
          id: newOpsId('shipment-event'),
          status,
          note,
          by,
          at,
        }

        const updated: Shipment = {
          ...shipment,
          status,
          events: [...shipment.events, event],
          attempts:
            status === 'failed' ? shipment.attempts + 1 : shipment.attempts,
          shippedAt:
            shipment.shippedAt ||
            (status !== 'pending' && status !== 'cancelled' ? at : ''),
          deliveredAt: status === 'delivered' ? at : shipment.deliveredAt,
          codCollected:
            status === 'delivered'
              ? shipment.codAmount
              : status === 'returned'
                ? 0
                : shipment.codCollected,
        }

        set((state) => ({
          shipments: state.shipments.map((item) =>
            item.id === updated.id ? updated : item,
          ),
        }))
        try {
          await deliveryService.saveShipment(updated)
        } catch (error) {
          set((state) => ({
            shipments: state.shipments.map((item) =>
              item.id === shipment.id ? shipment : item,
            ),
          }))
          throw error
        }

        // Keep the customer's order in step with the parcel.
        const orderStatus = orderStatusForShipment(status)
        if (orderStatus) {
          const order = useAccountStore
            .getState()
            .orders.find((item) => item.id === updated.orderId)
          if (order && order.status !== orderStatus) {
            await useAccountStore
              .getState()
              .updateOrder({ ...order, status: orderStatus })
          }
        }
      },

      ensureShipmentForOrder: async (order) => {
        const existing = get().shipments.find(
          (item) => item.orderId === order.id,
        )
        if (existing) return existing

        const zone = zoneRateFor(get().zones, order.address.city)
        const defaultCarrier = get().carriers.find(
          (carrier) => carrier.id === zone?.carrierId,
        )
        const customerName = `${order.address.firstName} ${order.address.lastName}`.trim()
        const shipment: Shipment = {
          id: newOpsId('shipment'),
          orderId: order.id,
          orderNumber: order.id,
          orderTotal: order.total,
          customerName,
          phone: order.phone,
          city: order.address.city,
          address: [
            order.address.street,
            order.address.buildingNumber,
            order.address.neighborhood,
            order.address.apartment,
          ]
            .filter(Boolean)
            .join(', '),
          carrierId: zone?.carrierId ?? '',
          carrierName: defaultCarrier?.name ?? '',
          carrierNameAr: defaultCarrier?.name_ar ?? '',
          carrierTrackingUrl: defaultCarrier?.trackingUrl ?? '',
          agentId: '',
          agentName: '',
          zoneId: zone?.id ?? '',
          trackingNumber: '',
          status: 'pending',
          paymentMethod: order.paymentMethod,
          codAmount: codAmountFor(order),
          codCollected: 0,
          shippingCost: order.shipping || zone?.fee || 0,
          attempts: 0,
          notes: order.address.deliveryNotes,
          proofImagePath: '',
          proofNote: '',
          proofAt: '',
          deliveredBy: '',
          events: [],
          shippedAt: '',
          deliveredAt: '',
          createdAt: nowIso(),
        }

        set((state) => ({ shipments: [shipment, ...state.shipments] }))
        await deliveryService.saveShipment(shipment)
        return shipment
      },

      hydrate: async () => {
        const [carriers, zones, agents, shipments] = await Promise.all([
          deliveryService.fetchCarriers(),
          deliveryService.fetchZones(),
          deliveryService.fetchAgents(),
          deliveryService.fetchShipments(),
        ])

        if (carriers) {
          set({
            carriers: carriers.toSorted((first, second) =>
              first.name.localeCompare(second.name),
            ),
          })
        }

        if (zones) {
          set({
            zones: zones.toSorted((first, second) =>
              first.name.localeCompare(second.name),
            ),
          })
        }

        if (agents) {
          set({
            agents: agents.toSorted((first, second) =>
              first.name.localeCompare(second.name),
            ),
          })
        }

        if (shipments) {
          set({
            shipments: shipments.toSorted((first, second) =>
              second.createdAt.localeCompare(first.createdAt),
            ),
          })
        }
      },
    }),
)

/* -------------------------------------------------------------------------- */
/* Derived helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Carrier labels are bilingual; this picks the one matching the UI language. */
export function carrierName(
  carrier: Carrier | undefined,
  arabic: boolean,
): string {
  if (!carrier) return ''
  return arabic ? carrier.name_ar || carrier.name : carrier.name
}

/** Zone labels are bilingual; this picks the one matching the UI language. */
export function zoneName(zone: ShippingZone | undefined, arabic: boolean): string {
  if (!zone) return ''
  return arabic ? zone.name_ar || zone.name : zone.name
}

/** Shipments that still need action from the dispatch board. */
export function openShipments(shipments: readonly Shipment[]): Shipment[] {
  return shipments.filter(
    (shipment) =>
      shipment.status !== 'delivered' &&
      shipment.status !== 'returned' &&
      shipment.status !== 'cancelled',
  )
}

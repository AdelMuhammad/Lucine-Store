import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompression'
import type {
  Carrier,
  DeliveryAgent,
  Shipment,
  ShipmentEvent,
  ShippingZone,
} from '../features/ops/store/useDeliveryStore'
import {
  asAgentVehicle,
  asShipmentStatus,
  type AgentVehicle,
  type ShipmentStatus,
} from '../features/ops/ops'
import { asArray, asNumber, asString } from './mappers'

/* -------------------------------------------------------------------------- */
/* Carriers                                                                   */
/* -------------------------------------------------------------------------- */

type CarrierRow = {
  id: string
  name: string
  name_ar: string
  phone: string
  email: string
  website: string
  tracking_url: string
  supports_cod: boolean
  base_rate: number
  cod_fee: number
  cod_fee_rate: number
  notes: string
  is_active: boolean
  created_at: string
}

function toCarrier(row: Partial<CarrierRow>): Carrier {
  return {
    id: asString(row.id),
    name: asString(row.name),
    name_ar: asString(row.name_ar),
    phone: asString(row.phone),
    email: asString(row.email),
    website: asString(row.website),
    trackingUrl: asString(row.tracking_url),
    supportsCod: row.supports_cod !== false,
    baseRate: asNumber(row.base_rate),
    codFee: asNumber(row.cod_fee),
    codFeeRate: asNumber(row.cod_fee_rate),
    notes: asString(row.notes),
    isActive: row.is_active !== false,
    createdAt: asString(row.created_at),
  }
}

function carrierRow(carrier: Carrier): CarrierRow {
  return {
    id: carrier.id,
    name: carrier.name,
    name_ar: carrier.name_ar,
    phone: carrier.phone,
    email: carrier.email,
    website: carrier.website,
    tracking_url: carrier.trackingUrl,
    supports_cod: carrier.supportsCod,
    base_rate: carrier.baseRate,
    cod_fee: carrier.codFee,
    cod_fee_rate: carrier.codFeeRate,
    notes: carrier.notes,
    is_active: carrier.isActive,
    created_at: carrier.createdAt || new Date().toISOString(),
  }
}

export async function fetchCarriers(): Promise<Carrier[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('carriers')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('[supabase] failed to load carriers', error.message)
    return null
  }

  return (data ?? []).map((row) => toCarrier(row as CarrierRow))
}

export async function saveCarrier(carrier: Carrier): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('carriers')
    .upsert(carrierRow(carrier), { onConflict: 'id' })
  if (error) console.error('[supabase] failed to save carrier', error.message)
}

export async function upsertCarriers(carriers: Carrier[]): Promise<void> {
  if (!supabase || carriers.length === 0) return
  const { error } = await supabase
    .from('carriers')
    .upsert(carriers.map(carrierRow), { onConflict: 'id' })
  if (error) console.error('[supabase] failed to sync carriers', error.message)
}

export async function deleteCarrier(carrierId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('carriers').delete().eq('id', carrierId)
  if (error) console.error('[supabase] failed to delete carrier', error.message)
}

/* -------------------------------------------------------------------------- */
/* Shipping zones                                                             */
/* -------------------------------------------------------------------------- */

type ZoneRow = {
  id: string
  name: string
  name_ar: string
  city: string
  carrier_id: string
  fee: number
  cod_fee: number
  eta_days: number
  is_active: boolean
  created_at: string
}

function toZone(row: Partial<ZoneRow>): ShippingZone {
  return {
    id: asString(row.id),
    name: asString(row.name),
    name_ar: asString(row.name_ar),
    city: asString(row.city),
    carrierId: asString(row.carrier_id),
    fee: asNumber(row.fee),
    codFee: asNumber(row.cod_fee),
    etaDays: asNumber(row.eta_days, 3),
    isActive: row.is_active !== false,
    createdAt: asString(row.created_at),
  }
}

function zoneRow(zone: ShippingZone): ZoneRow {
  return {
    id: zone.id,
    name: zone.name,
    name_ar: zone.name_ar,
    city: zone.city,
    carrier_id: zone.carrierId,
    fee: zone.fee,
    cod_fee: zone.codFee,
    eta_days: zone.etaDays,
    is_active: zone.isActive,
    created_at: zone.createdAt || new Date().toISOString(),
  }
}

export async function fetchZones(): Promise<ShippingZone[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('shipping_zones')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('[supabase] failed to load shipping zones', error.message)
    return null
  }

  return (data ?? []).map((row) => toZone(row as ZoneRow))
}

export async function saveZone(zone: ShippingZone): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('shipping_zones')
    .upsert(zoneRow(zone), { onConflict: 'id' })
  if (error) console.error('[supabase] failed to save shipping zone', error.message)
}

export async function upsertZones(zones: ShippingZone[]): Promise<void> {
  if (!supabase || zones.length === 0) return
  const { error } = await supabase
    .from('shipping_zones')
    .upsert(zones.map(zoneRow), { onConflict: 'id' })
  if (error) console.error('[supabase] failed to sync shipping zones', error.message)
}

export async function deleteZone(zoneId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('shipping_zones')
    .delete()
    .eq('id', zoneId)
  if (error) console.error('[supabase] failed to delete shipping zone', error.message)
}

/* -------------------------------------------------------------------------- */
/* Delivery agents                                                            */
/* -------------------------------------------------------------------------- */

type AgentRow = {
  id: string
  name: string
  phone: string
  email: string
  vehicle: AgentVehicle
  zone_ids: string[]
  notes: string
  is_active: boolean
  created_at: string
}

function toAgent(row: Partial<AgentRow>): DeliveryAgent {
  return {
    id: asString(row.id),
    name: asString(row.name),
    phone: asString(row.phone),
    email: asString(row.email),
    vehicle: asAgentVehicle(row.vehicle),
    zoneIds: asArray<string>(row.zone_ids),
    notes: asString(row.notes),
    isActive: row.is_active !== false,
    createdAt: asString(row.created_at),
  }
}

function agentRow(agent: DeliveryAgent): AgentRow {
  return {
    id: agent.id,
    name: agent.name,
    phone: agent.phone,
    email: agent.email,
    vehicle: agent.vehicle,
    zone_ids: agent.zoneIds,
    notes: agent.notes,
    is_active: agent.isActive,
    created_at: agent.createdAt || new Date().toISOString(),
  }
}

export async function fetchAgents(): Promise<DeliveryAgent[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('delivery_agents')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('[supabase] failed to load delivery agents', error.message)
    return null
  }

  return (data ?? []).map((row) => toAgent(row as AgentRow))
}

export async function saveAgent(agent: DeliveryAgent): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('delivery_agents')
    .upsert(agentRow(agent), { onConflict: 'id' })
  if (error) console.error('[supabase] failed to save delivery agent', error.message)
}

export async function upsertAgents(agents: DeliveryAgent[]): Promise<void> {
  if (!supabase || agents.length === 0) return
  const { error } = await supabase
    .from('delivery_agents')
    .upsert(agents.map(agentRow), { onConflict: 'id' })
  if (error) console.error('[supabase] failed to sync delivery agents', error.message)
}

export async function deleteAgent(agentId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('delivery_agents')
    .delete()
    .eq('id', agentId)
  if (error) console.error('[supabase] failed to delete delivery agent', error.message)
}

/* -------------------------------------------------------------------------- */
/* Shipments                                                                  */
/* -------------------------------------------------------------------------- */

type ShipmentRow = {
  id: string
  order_id: string
  order_total: number
  customer_name: string
  phone: string
  city: string
  address: string
  carrier_id: string
  carrier_name: string
  carrier_name_ar: string
  carrier_tracking_url: string
  agent_id: string
  agent_name: string
  zone_id: string
  tracking_number: string
  status: ShipmentStatus
  payment_method: string
  cod_amount: number
  cod_collected: number
  shipping_cost: number
  attempts: number
  notes: string
  proof_image_path: string
  proof_note: string
  proof_at: string | null
  delivered_by: string
  events: ShipmentEvent[]
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
}

function toEvent(value: unknown): ShipmentEvent {
  const row = (value ?? {}) as Partial<ShipmentEvent>
  return {
    id: asString(row.id),
    status: asShipmentStatus(row.status),
    note: asString(row.note),
    by: asString(row.by),
    at: asString(row.at),
  }
}

function toShipment(row: Partial<ShipmentRow>): Shipment {
  return {
    id: asString(row.id),
    orderId: asString(row.order_id),
    orderNumber: asString(row.order_id),
    orderTotal: asNumber(row.order_total),
    customerName: asString(row.customer_name),
    phone: asString(row.phone),
    city: asString(row.city),
    address: asString(row.address),
    carrierId: asString(row.carrier_id),
    carrierName: asString(row.carrier_name),
    carrierNameAr: asString(row.carrier_name_ar),
    carrierTrackingUrl: asString(row.carrier_tracking_url),
    agentId: asString(row.agent_id),
    agentName: asString(row.agent_name),
    zoneId: asString(row.zone_id),
    trackingNumber: asString(row.tracking_number),
    status: asShipmentStatus(row.status),
    paymentMethod: row.payment_method === 'cash' ? 'cash' : 'card',
    codAmount: asNumber(row.cod_amount),
    codCollected: asNumber(row.cod_collected),
    shippingCost: asNumber(row.shipping_cost),
    attempts: asNumber(row.attempts),
    notes: asString(row.notes),
    proofImagePath: asString(row.proof_image_path),
    proofNote: asString(row.proof_note),
    proofAt: asString(row.proof_at),
    deliveredBy: asString(row.delivered_by),
    events: asArray<unknown>(row.events).map(toEvent),
    shippedAt: asString(row.shipped_at),
    deliveredAt: asString(row.delivered_at),
    createdAt: asString(row.created_at),
  }
}

function shipmentRow(shipment: Shipment): ShipmentRow {
  return {
    id: shipment.id,
    order_id: shipment.orderId,
    order_total: shipment.orderTotal,
    customer_name: shipment.customerName,
    phone: shipment.phone,
    city: shipment.city,
    address: shipment.address,
    carrier_id: shipment.carrierId,
    carrier_name: shipment.carrierName,
    carrier_name_ar: shipment.carrierNameAr,
    carrier_tracking_url: shipment.carrierTrackingUrl,
    agent_id: shipment.agentId,
    agent_name: shipment.agentName,
    zone_id: shipment.zoneId,
    tracking_number: shipment.trackingNumber,
    status: shipment.status,
    payment_method: shipment.paymentMethod,
    cod_amount: shipment.codAmount,
    cod_collected: shipment.codCollected,
    shipping_cost: shipment.shippingCost,
    attempts: shipment.attempts,
    notes: shipment.notes,
    proof_image_path: shipment.proofImagePath,
    proof_note: shipment.proofNote,
    proof_at: shipment.proofAt || null,
    delivered_by: shipment.deliveredBy,
    events: shipment.events,
    shipped_at: shipment.shippedAt || null,
    delivered_at: shipment.deliveredAt || null,
    created_at: shipment.createdAt || new Date().toISOString(),
  }
}

export async function fetchShipments(): Promise<Shipment[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[supabase] failed to load shipments', error.message)
    return null
  }

  return (data ?? []).map((row) => toShipment(row as ShipmentRow))
}

export async function saveShipment(shipment: Shipment): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('shipments')
    .upsert(shipmentRow(shipment), { onConflict: 'id' })
  if (error) {
    console.error('[supabase] failed to save shipment', error.message)
    throw new Error(error.message)
  }
}

export async function upsertShipments(shipments: Shipment[]): Promise<void> {
  if (!supabase || shipments.length === 0) return
  const { error } = await supabase
    .from('shipments')
    .upsert(shipments.map(shipmentRow), { onConflict: 'id' })
  if (error) console.error('[supabase] failed to sync shipments', error.message)
}

export async function deleteShipment(shipmentId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('shipments')
    .delete()
    .eq('id', shipmentId)
  if (error) console.error('[supabase] failed to delete shipment', error.message)
}

/** Shipments for one customer order — used by the storefront tracking page. */
export async function fetchOrderShipment(
  orderId: string,
): Promise<Shipment | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()

  if (error) {
    console.error('[supabase] failed to load order shipment', error.message)
    return null
  }

  return data ? toShipment(data as ShipmentRow) : null
}

const DELIVERY_PROOFS_BUCKET = 'delivery-proofs'
const MAX_DELIVERY_PROOF_BYTES = 5 * 1024 * 1024
const allowedProofTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

/** Uploads proof privately so only the assigned admin and order customer can access it. */
export async function uploadDeliveryProof(
  file: File,
  orderId: string,
  shipmentId: string,
): Promise<string> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured')
  }

  // Downscale and re-encode large photos in the browser before the size check
  // so a phone-camera shot uploads quickly and passes the bucket limit.
  const optimized = await compressImage(file)

  const extension = allowedProofTypes.get(optimized.type)
  if (!extension) throw new Error('Unsupported delivery proof image type')
  if (optimized.size > MAX_DELIVERY_PROOF_BYTES) {
    throw new Error('Delivery proof image exceeds 5 MB')
  }

  const path = `orders/${orderId}/${shipmentId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`
  const { error } = await supabase.storage
    .from(DELIVERY_PROOFS_BUCKET)
    .upload(path, optimized, {
      cacheControl: '3600',
      contentType: optimized.type,
      upsert: false,
    })

  if (error) throw new Error(error.message)
  return path
}

/** Creates a short-lived private URL after Storage RLS verifies the customer or admin. */
export async function createDeliveryProofUrl(path: string): Promise<string> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured')
  }

  const { data, error } = await supabase.storage
    .from(DELIVERY_PROOFS_BUCKET)
    .createSignedUrl(path, 60 * 60)

  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function deleteDeliveryProof(path: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured || !path) return
  const { error } = await supabase.storage
    .from(DELIVERY_PROOFS_BUCKET)
    .remove([path])
  if (error) throw new Error(error.message)
}

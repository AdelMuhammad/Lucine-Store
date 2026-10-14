import type { CustomerOrder } from '../account/store/useAccountStore'
import { dateKey } from '../admin/analytics'

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type InvoiceSeller = {
  name: string
  address: string
  phone: string
  email: string
  website: string
  taxNumber: string
  footer: string
}

export type InvoiceItem = {
  key: string
  name: string
  nameAr: string
  brand: string
  brandAr: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type InvoiceData = {
  /** Human-friendly invoice number, e.g. `INV-20261013-A1B2C3`. */
  number: string
  /** Raw order id this invoice was issued for. */
  orderId: string
  /** ISO timestamp the invoice was issued (order creation time). */
  issuedAt: string
  status: CustomerOrder['status']
  seller: InvoiceSeller
  customer: {
    name: string
    email: string
    phone: string
    addressLines: string[]
    deliveryNotes: string
  }
  items: InvoiceItem[]
  subtotal: number
  shipping: number
  couponCode: string
  couponDiscount: number
  total: number
  paymentMethod: CustomerOrder['paymentMethod']
  shippingMethod: CustomerOrder['shippingMethod']
}

/* -------------------------------------------------------------------------- */
/* Builders                                                                    */
/* -------------------------------------------------------------------------- */

/** `INV-YYYYMMDD-A1B2C3` — date from the order, tail from its id. */
export function invoiceNumber(order: CustomerOrder): string {
  const stamp = dateKey(order.createdAt).replace(/-/g, '')
  return `INV-${stamp}-${order.id.slice(0, 6).toUpperCase()}`
}

function addressLines(address: CustomerOrder['address']): string[] {
  return [
    [
      address.street,
      address.buildingNumber ? `#${address.buildingNumber}` : '',
      address.neighborhood,
      address.apartment,
    ]
      .filter(Boolean)
      .join(', '),
    [address.city, address.region, address.postalCode]
      .filter(Boolean)
      .join(', '),
    address.country,
  ].filter(Boolean)
}

/** Builds the full invoice document for an order. */
export function buildInvoice(
  order: CustomerOrder,
  seller: Partial<InvoiceSeller>,
): InvoiceData {
  return {
    number: invoiceNumber(order),
    orderId: order.id,
    issuedAt: order.createdAt,
    status: order.status,
    seller: {
      name: seller.name || 'LUCINE',
      address: seller.address ?? '',
      phone: seller.phone ?? '',
      email: seller.email ?? '',
      website: seller.website ?? '',
      taxNumber: seller.taxNumber ?? '',
      footer: seller.footer ?? '',
    },
    customer: {
      name: `${order.address.firstName} ${order.address.lastName}`.trim(),
      email: order.email,
      phone: order.phone,
      addressLines: addressLines(order.address),
      deliveryNotes: order.address.deliveryNotes,
    },
    items: order.items.map((item) => ({
      key: item.productId,
      name: item.name,
      nameAr: item.name_ar ?? '',
      brand: item.brand ?? '',
      brandAr: item.brand_ar ?? '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.unitPrice * item.quantity,
    })),
    subtotal: order.subtotal,
    shipping: order.shipping,
    couponCode: order.couponCode ?? '',
    couponDiscount: order.couponDiscount ?? 0,
    total: order.total,
    paymentMethod: order.paymentMethod,
    shippingMethod: order.shippingMethod,
  }
}

/* -------------------------------------------------------------------------- */
/* Settings defaults                                                           */
/* -------------------------------------------------------------------------- */

export const defaultInvoiceSeller: InvoiceSeller = {
  name: 'LUCINE',
  address: '',
  phone: '',
  email: '',
  website: '',
  taxNumber: '',
  footer: '',
}

/** Merges stored settings with sane defaults so blank forms stay usable. */
export function normalizeSellerSettings(
  value: Partial<InvoiceSeller> | null | undefined,
): InvoiceSeller {
  return {
    name: value?.name?.trim() || defaultInvoiceSeller.name,
    address: value?.address?.trim() ?? defaultInvoiceSeller.address,
    phone: value?.phone?.trim() ?? defaultInvoiceSeller.phone,
    email: value?.email?.trim() ?? defaultInvoiceSeller.email,
    website: value?.website?.trim() ?? defaultInvoiceSeller.website,
    taxNumber: value?.taxNumber?.trim() ?? defaultInvoiceSeller.taxNumber,
    footer: value?.footer?.trim() ?? defaultInvoiceSeller.footer,
  }
}
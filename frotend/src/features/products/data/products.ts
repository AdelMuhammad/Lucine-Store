export type ProductColor = {
  name: string
  name_ar: string
  hex: string
}

/** A bilingual age/audience label attached to a product. */
export type ProductAgeGroup = {
  name: string
  name_ar: string
}

export type Product = {
  id: string
  name: string
  name_ar: string
  description: string
  description_ar: string
  category: string
  category_ar: string
  brand: string
  brand_ar: string
  /** Audience labels (e.g. Women, Men, Teens) — bilingual, add/remove in admin. */
  ageGroups: ProductAgeGroup[]
  price: number
  originalPrice?: number
  rating: number
  reviewCount: number
  createdAt: string
  /** Gallery images. First entry is the cover shown on cards and lists. */
  listImage: string[]
  colors: ProductColor[]
  sizes: string[]
  inStock: boolean
  /**
   * Buying price paid to the supplier. Used for margins, the procurement
   * screens and the default unit cost on purchase orders.
   */
  costPrice?: number
  /**
   * Units on hand, maintained by the operations console: purchase orders raise
   * it, confirmed orders lower it. `undefined` means "not tracked yet".
   */
  stockQuantity?: number
  /** Inventory warns once the quantity drops to this level. */
  lowStockThreshold?: number
  /** Supplier this product is normally bought from. */
  supplierId?: string
}

/** The cover image for a product (used on cards, lists, cart rows, orders). */
export function coverImage(product: Product | undefined): string {
  return product?.listImage[0] ?? ''
}

/**
 * Whether a product can be added to the cart: it must be published (`inStock`)
 * and, when stock is tracked, have at least one unit left.
 */
export function isAvailable(product: Product | undefined): boolean {
  if (!product || !product.inStock) return false
  if (typeof product.stockQuantity === 'number') return product.stockQuantity > 0
  return true
}

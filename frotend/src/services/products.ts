import { supabase } from '../lib/supabase'
import type {
  Product,
  ProductAgeGroup,
  ProductColor,
} from '../features/products/data/products'
import {
  asArray,
  asBoolean,
  asNumber,
  asOptionalNumber,
  asString,
} from './mappers'

/** Shape of a row in the `products` table. */
type ProductRow = {
  id: string
  name: string
  name_ar: string
  description: string
  description_ar: string
  category: string
  category_ar: string
  brand: string
  brand_ar: string
  age_groups: ProductAgeGroup[]
  price: number
  original_price: number | null
  rating: number
  review_count: number
  listed_at: string
  list_image: string[]
  colors: ProductColor[]
  sizes: string[]
  in_stock: boolean
  cost_price: number | null
  stock_quantity: number | null
  low_stock_threshold: number | null
  supplier_id: string | null
}

function toProduct(row: Partial<ProductRow>): Product {
  return {
    id: asString(row.id),
    name: asString(row.name),
    name_ar: asString(row.name_ar),
    description: asString(row.description),
    description_ar: asString(row.description_ar),
    category: asString(row.category),
    category_ar: asString(row.category_ar),
    brand: asString(row.brand),
    brand_ar: asString(row.brand_ar),
    ageGroups: asArray<ProductAgeGroup>(row.age_groups),
    price: asNumber(row.price),
    originalPrice: asOptionalNumber(row.original_price),
    rating: asNumber(row.rating),
    reviewCount: asNumber(row.review_count),
    createdAt: asString(row.listed_at).slice(0, 10),
    listImage: asArray<string>(row.list_image),
    colors: asArray<ProductColor>(row.colors),
    sizes: asArray<string>(row.sizes),
    inStock: asBoolean(row.in_stock, true),
    costPrice: asOptionalNumber(row.cost_price),
    stockQuantity: asOptionalNumber(row.stock_quantity),
    lowStockThreshold: asOptionalNumber(row.low_stock_threshold),
    supplierId: asString(row.supplier_id) || undefined,
  }
}

function toRow(product: Product): ProductRow {
  return {
    id: product.id,
    name: product.name,
    name_ar: product.name_ar,
    description: product.description,
    description_ar: product.description_ar,
    category: product.category,
    category_ar: product.category_ar,
    brand: product.brand,
    brand_ar: product.brand_ar,
    age_groups: product.ageGroups,
    price: product.price,
    original_price: product.originalPrice ?? null,
    rating: product.rating,
    review_count: product.reviewCount,
    listed_at: product.createdAt,
    list_image: product.listImage,
    colors: product.colors,
    sizes: product.sizes,
    in_stock: product.inStock,
    cost_price: product.costPrice ?? null,
    stock_quantity: product.stockQuantity ?? null,
    low_stock_threshold: product.lowStockThreshold ?? null,
    supplier_id: product.supplierId || null,
  }
}

/** Loads all products, or `null` when Supabase is not configured. */
export async function fetchProducts(): Promise<Product[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('listed_at', { ascending: false })

  if (error) {
    console.error('[supabase] failed to load products', error.message)
    return null
  }

  return (data ?? []).map((row) => toProduct(row as ProductRow))
}

/**
 * Outcome of a write. `ok` is false when Supabase rejected the change (for
 * example an RLS policy) or when the write matched no rows — PostgREST reports
 * both as a successful empty response, so the affected rows are inspected
 * explicitly to avoid reporting a delete/update that never happened.
 */
export type WriteResult = { ok: boolean; error: string }

/** Treats a missing backend as success (the store stays the source of truth). */
const NO_BACKEND: WriteResult = { ok: true, error: '' }

function resultOf(error: { message: string } | null, rows: unknown[]): WriteResult {
  if (error) {
    console.error('[supabase] product write failed', error.message)
    return { ok: false, error: error.message }
  }
  if (rows.length === 0) {
    const message =
      'no rows affected — the request was likely blocked by row level security'
    console.error('[supabase] product write matched no rows', message)
    return { ok: false, error: message }
  }
  return { ok: true, error: '' }
}

export async function createProduct(product: Product): Promise<WriteResult> {
  if (!supabase) return NO_BACKEND
  const { error, data } = await supabase
    .from('products')
    .insert(toRow(product))
    .select('id')
  return resultOf(error, data ?? [])
}

export async function updateProduct(product: Product): Promise<WriteResult> {
  if (!supabase) return NO_BACKEND
  const { error, data } = await supabase
    .from('products')
    .update(toRow(product))
    .eq('id', product.id)
    .select('id')
  return resultOf(error, data ?? [])
}

export async function deleteProduct(productId: string): Promise<WriteResult> {
  if (!supabase) return NO_BACKEND
  const { error, data } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .select('id')
  return resultOf(error, data ?? [])
}

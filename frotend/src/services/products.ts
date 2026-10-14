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

export async function createProduct(product: Product): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('products').insert(toRow(product))
  if (error) console.error('[supabase] failed to create product', error.message)
}

export async function updateProduct(product: Product): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('products')
    .update(toRow(product))
    .eq('id', product.id)
  if (error) console.error('[supabase] failed to update product', error.message)
}

export async function deleteProduct(productId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) console.error('[supabase] failed to delete product', error.message)
}

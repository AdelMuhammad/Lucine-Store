import { supabase } from '../lib/supabase'
import type { Category } from '../features/products/store/useCategoryStore'
import { asString } from './mappers'

type CategoryRow = {
  id: string
  name: string
  name_ar: string
  description: string
  description_ar: string
}

function toCategory(row: Partial<CategoryRow>): Category {
  return {
    id: asString(row.id),
    name: asString(row.name),
    name_ar: asString(row.name_ar),
    description: asString(row.description),
    description_ar: asString(row.description_ar),
  }
}

function toRow(category: Category): CategoryRow {
  return {
    id: category.id,
    name: category.name,
    name_ar: category.name_ar,
    description: category.description,
    description_ar: category.description_ar,
  }
}

export async function fetchCategories(): Promise<Category[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('[supabase] failed to load categories', error.message)
    return null
  }

  return (data ?? []).map((row) => toCategory(row as CategoryRow))
}

export async function createCategory(category: Category): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('categories').insert(toRow(category))
  if (error) console.error('[supabase] failed to create category', error.message)
}

export async function updateCategory(category: Category): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('categories')
    .update(toRow(category))
    .eq('id', category.id)
  if (error) console.error('[supabase] failed to update category', error.message)
}

export async function deleteCategory(categoryId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
  if (error) console.error('[supabase] failed to delete category', error.message)
}

import { supabase } from '../lib/supabase'
import type {
  AttributeKind,
  AttributeRecord,
} from '../features/products/store/useAttributeStore'
import { asString } from './mappers'

type AttributeRow = {
  kind: string
  id: string
  name: string
  name_ar: string | null
  hex: string | null
}

const KINDS: AttributeKind[] = ['brands', 'colors', 'sizes', 'ages']

function toRecord(row: Partial<AttributeRow>): AttributeRecord {
  return {
    id: asString(row.id),
    name: asString(row.name),
    name_ar: asString(row.name_ar),
    hex: asString(row.hex),
  }
}

/** Loads every attribute list grouped by kind, or `null` when unconfigured. */
export async function fetchAttributes(): Promise<Record<
  AttributeKind,
  AttributeRecord[]
> | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('attributes')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('[supabase] failed to load attributes', error.message)
    return null
  }

  const grouped: Record<AttributeKind, AttributeRecord[]> = {
    brands: [],
    colors: [],
    sizes: [],
    ages: [],
  }

  ;(data ?? []).forEach((row) => {
    const kind = asString((row as AttributeRow).kind) as AttributeKind
    if (KINDS.includes(kind)) grouped[kind].push(toRecord(row as AttributeRow))
  })

  return grouped
}

export async function createAttribute(
  kind: AttributeKind,
  record: AttributeRecord,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('attributes').insert({
    kind,
    id: record.id,
    name: record.name,
    name_ar: record.name_ar,
    hex: record.hex,
  })
  if (error) console.error('[supabase] failed to create attribute', error.message)
}

export async function updateAttribute(
  kind: AttributeKind,
  record: AttributeRecord,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('attributes')
    .update({ name: record.name, name_ar: record.name_ar, hex: record.hex })
    .eq('kind', kind)
    .eq('id', record.id)
  if (error) console.error('[supabase] failed to update attribute', error.message)
}

export async function deleteAttribute(
  kind: AttributeKind,
  id: string,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('attributes')
    .delete()
    .eq('kind', kind)
    .eq('id', id)
  if (error) console.error('[supabase] failed to delete attribute', error.message)
}

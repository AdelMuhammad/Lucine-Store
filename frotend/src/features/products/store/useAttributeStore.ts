import { create } from 'zustand'
import * as attributeService from '../../../services/attributes'

/** The catalog attribute lists managed from the admin console. */
export type AttributeKind = 'brands' | 'colors' | 'sizes' | 'ages'

/**
 * A bilingual catalog attribute. `name_ar` and `hex` are empty for the lists
 * that do not use them (sizes carry only a `name`, brands only names).
 */
export type AttributeRecord = {
  id: string
  name: string
  name_ar: string
  hex: string
}

/** Turns an attribute name into a stable, URL-friendly identifier. */
export function attributeId(name: string) {
  return name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

type AttributeState = {
  brands: AttributeRecord[]
  colors: AttributeRecord[]
  sizes: AttributeRecord[]
  ages: AttributeRecord[]
  addAttribute: (kind: AttributeKind, record: AttributeRecord) => void
  updateAttribute: (kind: AttributeKind, record: AttributeRecord) => void
  removeAttribute: (kind: AttributeKind, id: string) => void
  /** Loads the attribute lists from Supabase when configured. */
  hydrate: () => Promise<void>
}

function withItems(
  kind: AttributeKind,
  items: AttributeRecord[],
): Partial<AttributeState> {
  return { [kind]: items } as Partial<AttributeState>
}

export const useAttributeStore = create<AttributeState>()(
  (set) => ({
      brands: [],
      colors: [],
      sizes: [],
      ages: [],
      addAttribute: (kind, record) => {
        set((state) => withItems(kind, [...state[kind], record]))
        void attributeService.createAttribute(kind, record)
      },
      updateAttribute: (kind, record) => {
        set((state) =>
          withItems(
            kind,
            state[kind].map((item) =>
              item.id === record.id ? record : item,
            ),
          ),
        )
        void attributeService.updateAttribute(kind, record)
      },
      removeAttribute: (kind, id) => {
        set((state) =>
          withItems(
            kind,
            state[kind].filter((item) => item.id !== id),
          ),
        )
        void attributeService.deleteAttribute(kind, id)
      },
      hydrate: async () => {
        const remote = await attributeService.fetchAttributes()
        if (remote) {
          set({
            brands: remote.brands,
            colors: remote.colors,
            sizes: remote.sizes,
            ages: remote.ages,
          })
        }
      },
    }),
)

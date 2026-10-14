import { create } from 'zustand'
import * as categoryService from '../../../services/categories'

export type Category = {
  id: string
  name: string
  name_ar: string
  description: string
  description_ar: string
}

/** Turns a category name into a stable, URL-friendly identifier. */
export function categoryId(name: string) {
  return name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

type CategoryState = {
  categories: Category[]
  addCategory: (category: Category) => void
  updateCategory: (category: Category) => void
  removeCategory: (categoryId: string) => void
  /** Loads categories from Supabase when configured. */
  hydrate: () => Promise<void>
}

export const useCategoryStore = create<CategoryState>()((set) => ({
      categories: [],
      addCategory: (category) => {
        set((state) => ({ categories: [...state.categories, category] }))
        void categoryService.createCategory(category)
      },
      updateCategory: (category) => {
        set((state) => ({
          categories: state.categories.map((item) =>
            item.id === category.id ? category : item,
          ),
        }))
        void categoryService.updateCategory(category)
      },
      removeCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((item) => item.id !== id),
        }))
        void categoryService.deleteCategory(id)
      },
      hydrate: async () => {
        const remote = await categoryService.fetchCategories()
        if (remote) set({ categories: remote })
      },
    }))

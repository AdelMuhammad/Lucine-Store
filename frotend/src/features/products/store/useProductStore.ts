import { create } from 'zustand'
import type { Product } from '../data/products'
import * as productService from '../../../services/products'
import * as reviewService from '../../../services/reviews'

/** Result of a product mutation, so callers can surface failures to the user. */
export type ProductMutationResult = { ok: boolean; error: string }

type ProductState = {
  products: Product[]
  addProduct: (product: Product) => Promise<ProductMutationResult>
  updateProduct: (product: Product) => Promise<ProductMutationResult>
  removeProduct: (productId: string) => Promise<ProductMutationResult>
  replaceProducts: (products: Product[]) => void
  hydrate: () => Promise<void>
}

export const useProductStore = create<ProductState>()((set, get) => ({
      products: [],

      addProduct: async (product) => {
        const previous = get().products
        set((state) => ({
          products: [...state.products, product],
        }))
        const result = await productService.createProduct(product)
        if (!result.ok) {
          // Roll back so the UI never shows a product that was not saved.
          set({ products: previous })
        }
        return result
      },

      updateProduct: async (product) => {
        const previous = get().products
        set((state) => ({
          products: state.products.map((item) => (item.id === product.id ? product : item)),
        }))
        const result = await productService.updateProduct(product)
        if (!result.ok) set({ products: previous })
        return result
      },

      removeProduct: async (productId) => {
        const previous = get().products
        set((state) => ({
          products: state.products.filter((product) => product.id !== productId),
        }))
        try {
          // Delete related reviews first to avoid orphaned data.
          const reviews = await reviewService.fetchReviews()
          if (reviews) {
            const toDelete = reviews.filter((r) => r.productId === productId)
            await Promise.all(
              toDelete.map(async (review) => {
                const result = await reviewService.deleteReview(review.id)
                if (!result.ok) {
                  console.error('[supabase] review cascade failed', result.error)
                }
              }),
            )
          }
          const result = await productService.deleteProduct(productId)
          if (!result.ok) {
            // Put the product back — the row is still in Supabase.
            set({ products: previous })
          }
          return result
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.error('[supabase] failed to persist product delete', error)
          set({ products: previous })
          return { ok: false, error: message }
        }
      },

      replaceProducts: (products) => set({ products }),

      hydrate: async () => {
        const remote = await productService.fetchProducts()
        if (remote) set({ products: remote })
        // If no remote data, products remains empty (no local fallback)
      },
    }))
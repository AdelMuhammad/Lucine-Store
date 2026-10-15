import { create } from 'zustand'
import type { Product } from '../data/products'
import * as productService from '../../../services/products'
import * as reviewService from '../../../services/reviews'

type ProductState = {
  products: Product[]
  addProduct: (product: Product) => Promise<void> | void
  updateProduct: (product: Product) => Promise<void> | void
  removeProduct: (productId: string) => Promise<void> | void
  replaceProducts: (products: Product[]) => void
  hydrate: () => Promise<void>
}

export const useProductStore = create<ProductState>()((set, get) => ({
      products: [],

      addProduct: async (product) => {
        set((state) => ({
          products: [...state.products, product],
        }))
        try {
          await productService.createProduct(product)
        } catch (error) {
          console.error('[supabase] failed to persist product create', error)
        }
      },

      updateProduct: async (product) => {
        set((state) => ({
          products: state.products.map((item) => (item.id === product.id ? product : item)),
        }))
        try {
          await productService.updateProduct(product)
        } catch (error) {
          console.error('[supabase] failed to persist product update', error)
        }
      },

      removeProduct: async (productId) => {
        set((state) => ({
          products: state.products.filter((product) => product.id !== productId),
        }))
        try {
          // Delete related reviews first to avoid orphaned data
          const reviews = await reviewService.fetchReviews()
          if (reviews) {
            const toDelete = reviews.filter((r) => r.productId === productId)
            await Promise.all(
              toDelete.map((r) => reviewService.deleteReview(r.id).catch(() => undefined)),
            )
          }
          await productService.deleteProduct(productId)
        } catch (error) {
          console.error('[supabase] failed to persist product delete', error)
        }
      },

      replaceProducts: (products) => set({ products }),

      hydrate: async () => {
        const remote = await productService.fetchProducts()
        if (remote) set({ products: remote })
        // If no remote data, products remains empty (no local fallback)
      },
    }))
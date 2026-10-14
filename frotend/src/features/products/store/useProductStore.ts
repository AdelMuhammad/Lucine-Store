import { create } from 'zustand'
import type { Product } from '../data/products'
import * as productService from '../../../services/products'

type ProductState = {
  products: Product[]
  addProduct: (product: Product) => void
  updateProduct: (product: Product) => void
  removeProduct: (productId: string) => void
  replaceProducts: (products: Product[]) => void
  hydrate: () => Promise<void>
}

export const useProductStore = create<ProductState>()((set) => ({
      products: [],

      addProduct: (product) =>
        set((state) => ({
          products: [...state.products, product],
        })),

      updateProduct: (product) =>
        set((state) => ({
          products: state.products.map((item) => (item.id === product.id ? product : item)),
        })),

      removeProduct: (productId) =>
        set((state) => ({
          products: state.products.filter((product) => product.id !== productId),
        })),

      replaceProducts: (products) => set({ products }),

      hydrate: async () => {
        const remote = await productService.fetchProducts()
        if (remote) set({ products: remote })
        // If no remote data, products remains empty (no local fallback)
      },
    }))
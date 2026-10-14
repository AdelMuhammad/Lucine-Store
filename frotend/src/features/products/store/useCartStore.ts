import { create } from 'zustand'

export type CartItem = {
  productId: string
  quantity: number
}

type CartState = {
  items: CartItem[]
  addItem: (productId: string, quantity?: number) => void
  removeItem: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (productId, quantity = 1) =>
    set((state) => {
      const existingItem = state.items.find((item) => item.productId === productId)

      return {
        items: existingItem
          ? state.items.map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            )
          : [...state.items, { productId, quantity }],
      }
    }),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    })),
  setQuantity: (productId, quantity) =>
    set((state) => ({
      items:
        quantity < 1
          ? state.items.filter((item) => item.productId !== productId)
          : state.items.map((item) =>
              item.productId === productId ? { ...item, quantity } : item,
            ),
    })),
  clearCart: () => set({ items: [] }),
}))

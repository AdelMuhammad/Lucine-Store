import { create } from 'zustand'

type WishlistState = {
  savedProductIds: string[]
  toggleSaved: (productId: string) => void
  removeSaved: (productId: string) => void
}

export const useWishlistStore = create<WishlistState>((set) => ({
  savedProductIds: [],
  toggleSaved: (productId) =>
    set((state) => ({
      savedProductIds: state.savedProductIds.includes(productId)
        ? state.savedProductIds.filter((id) => id !== productId)
        : [...state.savedProductIds, productId],
    })),
  removeSaved: (productId) =>
    set((state) => ({
      savedProductIds: state.savedProductIds.filter((id) => id !== productId),
    })),
}))

import { create } from 'zustand'
import type { Product } from '../data/products'
import * as reviewService from '../../../services/reviews'

/** Reviews are moderated from the admin console; only published ones show. */
export type ProductReviewStatus = 'published' | 'hidden'

export type ProductReview = {
  id: string
  productId: string
  authorName: string
  authorEmail: string
  /** Whole stars between 1 and 5. */
  rating: number
  title: string
  title_ar?: string
  comment: string
  comment_ar?: string
  createdAt: string
  status: ProductReviewStatus
}

export type ReviewSummary = {
  average: number
  count: number
  reviews: ProductReview[]
}

/**
 * The product carries a baseline rating/review count (historical reviews). Any
 * live reviews written in the storefront are merged on top so the average and
 * count move as shoppers leave feedback.
 */
export function summarizeReviews(
  product: Product,
  all: ProductReview[],
): ReviewSummary {
  const reviews = all
    .filter(
      (review) =>
        review.productId === product.id && review.status === 'published',
    )
    .toSorted((first, second) =>
      second.createdAt.localeCompare(first.createdAt),
    )

  const baseCount = Math.max(0, product.reviewCount)
  const count = baseCount + reviews.length
  const baseSum = product.rating * baseCount
  const average =
    count > 0
      ? (baseSum + reviews.reduce((sum, review) => sum + review.rating, 0)) /
        count
      : product.rating

  return { average, count, reviews }
}

type ReviewState = {
  reviews: ProductReview[]
  addReview: (review: ProductReview) => void
  updateReview: (review: ProductReview) => void
  removeReview: (reviewId: string) => void
  /** Loads reviews from Supabase when configured. */
  hydrate: () => Promise<void>
}

export const useReviewStore = create<ReviewState>()(
  (set) => ({
      reviews: [],
      addReview: (review) => {
        set((state) => ({ reviews: [review, ...state.reviews] }))
        void reviewService.createReview(review)
      },
      updateReview: (review) => {
        set((state) => ({
          reviews: state.reviews.map((item) =>
            item.id === review.id ? review : item,
          ),
        }))
        void reviewService.updateReview(review)
      },
      removeReview: (reviewId) => {
        set((state) => ({
          reviews: state.reviews.filter((item) => item.id !== reviewId),
        }))
        void reviewService.deleteReview(reviewId)
      },
      hydrate: async () => {
        const remote = await reviewService.fetchReviews()
        if (remote) set({ reviews: remote })
      },
    }),
)

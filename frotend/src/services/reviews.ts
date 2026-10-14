import { supabase } from '../lib/supabase'
import type { ProductReview } from '../features/products/store/useReviewStore'
import { asNumber, asString } from './mappers'

type ReviewRow = {
  id: string
  product_id: string
  author_name: string
  author_email: string
  rating: number
  title: string
  title_ar: string
  comment: string
  comment_ar: string
  status: string
  created_at: string
}

function toReview(row: Partial<ReviewRow>): ProductReview {
  return {
    id: asString(row.id),
    productId: asString(row.product_id),
    authorName: asString(row.author_name),
    authorEmail: asString(row.author_email),
    rating: asNumber(row.rating, 5),
    title: asString(row.title),
    title_ar: asString(row.title_ar),
    comment: asString(row.comment),
    comment_ar: asString(row.comment_ar),
    status: asString(row.status, 'published') as ProductReview['status'],
    createdAt: asString(row.created_at),
  }
}

function toRow(review: ProductReview): ReviewRow {
  return {
    id: review.id,
    product_id: review.productId,
    author_name: review.authorName,
    author_email: review.authorEmail,
    rating: review.rating,
    title: review.title,
    title_ar: review.title_ar ?? '',
    comment: review.comment,
    comment_ar: review.comment_ar ?? '',
    status: review.status,
    created_at: review.createdAt,
  }
}

export async function fetchReviews(): Promise<ProductReview[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[supabase] failed to load reviews', error.message)
    return null
  }

  return (data ?? []).map((row) => toReview(row as ReviewRow))
}

export async function createReview(review: ProductReview): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('reviews').insert(toRow(review))
  if (error) console.error('[supabase] failed to create review', error.message)
}

export async function updateReview(review: ProductReview): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('reviews')
    .update(toRow(review))
    .eq('id', review.id)
  if (error) console.error('[supabase] failed to update review', error.message)
}

export async function deleteReview(reviewId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
  if (error) console.error('[supabase] failed to delete review', error.message)
}

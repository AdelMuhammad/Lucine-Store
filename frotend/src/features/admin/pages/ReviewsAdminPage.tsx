import { useState } from 'react'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  RateReviewOutlined,
  SearchOutlined,
  Star,
  VisibilityOffOutlined,
  VisibilityOutlined,
} from '@mui/icons-material'
import AdminModal from '../components/AdminModal'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminPagination from '../components/AdminPagination'
import {
  useReviewStore,
  type ProductReview,
} from '../../products/store/useReviewStore'
import { useProductStore } from '../../products/store/useProductStore'
import { useTranslation } from '../../../hooks/useTranslation'

type ReviewSort = 'newest' | 'oldest' | 'rating-desc' | 'rating-asc'

const PAGE_SIZE = 8

function Stars({ rating }: { rating: number }) {
  return (
    <span className="admin-stars" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <Star className={index < rating ? 'is-filled' : ''} key={index} />
      ))}
    </span>
  )
}

function ReviewsAdminPage() {
  const { t, localized, number, dateTime } = useTranslation()
  const reviews = useReviewStore((state) => state.reviews)
  const updateReview = useReviewStore((state) => state.updateReview)
  const removeReview = useReviewStore((state) => state.removeReview)
  const products = useProductStore((state) => state.products)

  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState<ReviewSort>('newest')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [activeReview, setActiveReview] = useState<ProductReview | null>(null)

  function productName(productId: string) {
    const product = products.find((item) => item.id === productId)
    return product ? localized(product.name, product.name_ar) : productId
  }

  const productOptions = [
    ...new Set(reviews.map((review) => review.productId)),
  ]

  const query = search.trim().toLocaleLowerCase()
  const filteredReviews = reviews
    .filter((review) => {
      const matchesQuery =
        !query ||
        [
          review.authorName,
          review.authorEmail,
          review.title,
          review.title_ar ?? '',
          review.comment,
          review.comment_ar ?? '',
          productName(review.productId),
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query)
      const matchesProduct =
        productFilter === 'all' || review.productId === productFilter
      const matchesStatus =
        statusFilter === 'all' || review.status === statusFilter

      return matchesQuery && matchesProduct && matchesStatus
    })
    .toSorted((first, second) => {
      switch (sort) {
        case 'oldest':
          return first.createdAt.localeCompare(second.createdAt)
        case 'rating-desc':
          return second.rating - first.rating
        case 'rating-asc':
          return first.rating - second.rating
        default:
          return second.createdAt.localeCompare(first.createdAt)
      }
    })

  const pageCount = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pagedReviews = filteredReviews.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  function toggleStatus(review: ProductReview) {
    const nextStatus = review.status === 'published' ? 'hidden' : 'published'
    updateReview({ ...review, status: nextStatus })
    setNotice(
      nextStatus === 'published'
        ? t('admin.reviewPublishedNotice')
        : t('admin.reviewHiddenNotice'),
    )
  }

  function handleDelete(review: ProductReview) {
    const confirmed = window.confirm(
      t('admin.deleteReviewConfirm', { name: review.authorName }),
    )
    if (!confirmed) return

    removeReview(review.id)
    setNotice(t('admin.reviewDeletedNotice'))
  }

  return (
    <>
      <AdminPageHeader
        description={t('admin.reviewsDescription')}
        eyebrow={t('admin.reviewsEyebrow')}
        title={t('admin.reviewsTitle')}
      />

      {notice && (
        <div className="admin-status-notice" role="status">
          <span>{notice}</span>
          <button
            aria-label={t('admin.dismissMessage')}
            onClick={() => setNotice('')}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <SearchOutlined aria-hidden="true" />
          <input
            aria-label={t('admin.searchReviewsAria')}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder={t('admin.searchReviewsPlaceholder')}
            type="search"
            value={search}
          />
        </label>

        <label>
          <span className="visually-hidden">
            {t('admin.filterReviewProduct')}
          </span>
          <select
            aria-label={t('admin.filterReviewProduct')}
            className="admin-toolbar__select"
            onChange={(event) => {
              setProductFilter(event.target.value)
              setPage(1)
            }}
            value={productFilter}
          >
            <option value="all">{t('admin.allProducts')}</option>
            {productOptions.map((productId) => (
              <option key={productId} value={productId}>
                {productName(productId)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="visually-hidden">{t('admin.filterReviewStatus')}</span>
          <select
            aria-label={t('admin.filterReviewStatus')}
            className="admin-toolbar__select"
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            value={statusFilter}
          >
            <option value="all">{t('admin.allReviews')}</option>
            <option value="published">{t('admin.reviewStatusPublished')}</option>
            <option value="hidden">{t('admin.reviewStatusHidden')}</option>
          </select>
        </label>

        <label>
          <span className="visually-hidden">{t('admin.sortReviews')}</span>
          <select
            aria-label={t('admin.sortReviews')}
            className="admin-toolbar__select"
            onChange={(event) => setSort(event.target.value as ReviewSort)}
            value={sort}
          >
            <option value="newest">{t('admin.sortNewestFirst')}</option>
            <option value="oldest">{t('admin.sortOldestFirst')}</option>
            <option value="rating-desc">{t('admin.sortRatingDesc')}</option>
            <option value="rating-asc">{t('admin.sortRatingAsc')}</option>
          </select>
        </label>

        <span className="admin-toolbar__count">
          {t('admin.reviewCount', { count: number(filteredReviews.length) })}
        </span>
      </div>

      <section className="admin-card">
        {pagedReviews.length > 0 ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.thReviewer')}</th>
                    <th>{t('admin.thReviewedProduct')}</th>
                    <th>{t('admin.thReviewRating')}</th>
                    <th>{t('admin.thReviewedAt')}</th>
                    <th>{t('admin.thReviewComment')}</th>
                    <th>{t('admin.thReviewStatus')}</th>
                    <th aria-label={t('admin.thActions')} />
                  </tr>
                </thead>
                <tbody>
                  {pagedReviews.map((review) => (
                    <tr key={review.id}>
                      <td
                        className="admin-table__cell--primary"
                        data-label={t('admin.thReviewer')}
                      >
                        <strong>{review.authorName}</strong>
                        <div className="admin-table__muted">
                          {review.authorEmail}
                        </div>
                      </td>
                      <td data-label={t('admin.thReviewedProduct')}>
                        {productName(review.productId)}
                      </td>
                      <td data-label={t('admin.thReviewRating')}>
                        <span className="admin-attribute-value">
                          <Stars rating={review.rating} />
                          <span className="admin-table__muted">
                            {number(review.rating)}
                          </span>
                        </span>
                      </td>
                      <td data-label={t('admin.thReviewedAt')}>
                        {dateTime(review.createdAt)}
                      </td>
                      <td
                        className="admin-table__cell--review"
                        data-label={t('admin.thReviewComment')}
                      >
                        {localized(review.title, review.title_ar) && (
                          <strong>
                            {localized(review.title, review.title_ar)}
                          </strong>
                        )}
                        <p className="admin-table__muted admin-table__clamp">
                          {localized(review.comment, review.comment_ar)}
                        </p>
                      </td>
                      <td data-label={t('admin.thReviewStatus')}>
                        <span
                          className={`admin-badge admin-badge--${
                            review.status === 'published' ? 'success' : 'neutral'
                          }`}
                        >
                          {review.status === 'published'
                            ? t('admin.reviewStatusPublished')
                            : t('admin.reviewStatusHidden')}
                        </span>
                      </td>
                      <td data-label={t('admin.thActions')}>
                        <div className="admin-table__actions">
                          <button
                            aria-label={t('admin.viewReviewAria', {
                              name: review.authorName,
                            })}
                            className="admin-icon-btn"
                            onClick={() => setActiveReview(review)}
                            type="button"
                          >
                            <VisibilityOutlined />
                          </button>
                          <button
                            aria-label={
                              review.status === 'published'
                                ? t('admin.hideReviewAria', {
                                    name: review.authorName,
                                  })
                                : t('admin.publishReviewAria', {
                                    name: review.authorName,
                                  })
                            }
                            className="admin-icon-btn"
                            onClick={() => toggleStatus(review)}
                            type="button"
                          >
                            {review.status === 'published' ? (
                              <VisibilityOffOutlined />
                            ) : (
                              <CheckCircleOutlined />
                            )}
                          </button>
                          <button
                            aria-label={t('admin.deleteReviewAria', {
                              name: review.authorName,
                            })}
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => handleDelete(review)}
                            type="button"
                          >
                            <DeleteOutlined />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              onPage={setPage}
              page={safePage}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={filteredReviews.length}
            />
          </>
        ) : (
          <div className="admin-empty">
            <RateReviewOutlined />
            <h3>{t('admin.noReviewsFoundTitle')}</h3>
            <p>
              {reviews.length === 0
                ? t('admin.noReviewsYetText')
                : t('admin.noReviewsFoundText')}
            </p>
          </div>
        )}
      </section>

      {activeReview && (
        <AdminModal
          description={productName(activeReview.productId)}
          onClose={() => setActiveReview(null)}
          title={t('admin.reviewModalTitle', {
            name: activeReview.authorName,
          })}
        >
          <div className="admin-review-detail">
            <div className="admin-review-detail__row">
              <span>{t('admin.reviewModalRating')}</span>
              <span className="admin-attribute-value">
                <Stars rating={activeReview.rating} />
                <strong>{number(activeReview.rating)}</strong>
              </span>
            </div>
            <div className="admin-review-detail__row">
              <span>{t('admin.reviewModalDate')}</span>
              <span>{dateTime(activeReview.createdAt)}</span>
            </div>
            <div className="admin-review-detail__row">
              <span>{t('admin.thReviewer')}</span>
              <span>
                {activeReview.authorName}
                {activeReview.authorEmail && (
                  <span className="admin-table__muted">
                    {' '}
                    · {activeReview.authorEmail}
                  </span>
                )}
              </span>
            </div>
            <div className="admin-review-detail__row">
              <span>{t('admin.reviewModalStatus')}</span>
              <span
                className={`admin-badge admin-badge--${
                  activeReview.status === 'published' ? 'success' : 'neutral'
                }`}
              >
                {activeReview.status === 'published'
                  ? t('admin.reviewStatusPublished')
                  : t('admin.reviewStatusHidden')}
              </span>
            </div>
            {localized(activeReview.title, activeReview.title_ar) && (
              <h3 className="admin-review-detail__title">
                {localized(activeReview.title, activeReview.title_ar)}
              </h3>
            )}
            <p className="admin-review-detail__comment">
              {localized(activeReview.comment, activeReview.comment_ar)}
            </p>
          </div>
        </AdminModal>
      )}
    </>
  )
}

export default ReviewsAdminPage

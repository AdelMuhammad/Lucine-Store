import { ArrowBack, ArrowForward } from '@mui/icons-material'
import { useTranslation } from '../../../hooks/useTranslation'

type AdminPaginationProps = {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPage: (page: number) => void
}

function AdminPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
}: AdminPaginationProps) {
  const { t, number } = useTranslation()

  if (total === 0) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="admin-pagination">
      <span>
        {t('admin.paginationShowing', {
          first: number(first),
          last: number(last),
          total: number(total),
        })}
      </span>
      <div className="admin-pagination__controls">
        <button
          aria-label={t('admin.previousPage')}
          className="admin-icon-btn"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          type="button"
        >
          <ArrowBack className="rtl-flip" />
        </button>
        <span className="admin-pagination__page">
          {number(page)} / {number(pageCount)}
        </span>
        <button
          aria-label={t('admin.nextPage')}
          className="admin-icon-btn"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          type="button"
        >
          <ArrowForward className="rtl-flip" />
        </button>
      </div>
    </div>
  )
}

export default AdminPagination

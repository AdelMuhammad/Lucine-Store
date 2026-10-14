import { useEffect, useState } from 'react'
import {
  Add,
  DeleteOutlined,
  EditOutlined,
  ReceiptLongOutlined,
  SearchOutlined,
  VisibilityOutlined,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import {
  useAccountStore,
  type CustomerOrder,
} from '../../account/store/useAccountStore'
import * as orderService from '../../../services/orders'
import { isSupabaseConfigured } from '../../../lib/supabase'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminPagination from '../components/AdminPagination'
import OrderForm from '../components/OrderForm'
import {
  orderNumber,
  orderStatusVariant,
  orderStatuses,
} from '../format'
import { useTranslation } from '../../../hooks/useTranslation'

type OrderSort = 'newest' | 'oldest' | 'total-desc' | 'total-asc'

type OrderDateFilter =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last-7'
  | 'last-30'
  | 'this-month'
  | 'custom'

const PAGE_SIZE = 8

/** How long to wait after a filter change before querying the server. */
const SERVER_QUERY_DEBOUNCE_MS = 250

function startOfDay(date: Date): number {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.getTime()
}

function endOfDay(date: Date): number {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy.getTime()
}

/** Parses a `yyyy-mm-dd` input value as a local calendar day. */
function parseDateInput(value: string): Date | null {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

/** An inclusive timestamp range; a `null` bound means "open-ended". */
type DateRange = { from: number | null; to: number | null }

/** The timestamp range for a date filter, or `null` when nothing is filtered. */
function dateRange(
  filter: OrderDateFilter,
  fromValue: string,
  toValue: string,
): DateRange | null {
  const now = new Date()

  switch (filter) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'yesterday': {
      const day = new Date(now)
      day.setDate(day.getDate() - 1)
      return { from: startOfDay(day), to: endOfDay(day) }
    }
    case 'last-7': {
      const from = new Date(now)
      from.setDate(from.getDate() - 6)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'last-30': {
      const from = new Date(now)
      from.setDate(from.getDate() - 29)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'this-month':
      return {
        from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      }
    case 'custom': {
      const from = parseDateInput(fromValue)
      const to = parseDateInput(toValue)
      if (!from && !to) return null
      return {
        from: from ? startOfDay(from) : null,
        to: to ? endOfDay(to) : null,
      }
    }
    default:
      return null
  }
}

/** Local fallback used when Supabase is not configured. */
/** Local calendar-day key, e.g. `2026-10-13`. */
function dayKey(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`
}

/** Splits an already-sorted order list into day sections, keeping the order. */
function groupOrdersByDay(orders: CustomerOrder[]) {
  const groups = new Map<string, CustomerOrder[]>()

  orders.forEach((order) => {
    const key = dayKey(order.createdAt)
    const bucket = groups.get(key)
    if (bucket) bucket.push(order)
    else groups.set(key, [order])
  })

  return [...groups.entries()].map(([key, dayOrders]) => ({
    key,
    orders: dayOrders,
    total: dayOrders.reduce((sum, order) => sum + order.total, 0),
  }))
}

function OrdersAdminPage() {
  const { t, currency, date, dateTime, number } = useTranslation()
  const addOrder = useAccountStore((state) => state.addOrder)
  const updateOrder = useAccountStore((state) => state.updateOrder)
  const removeOrder = useAccountStore((state) => state.removeOrder)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<OrderDateFilter>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [sort, setSort] = useState<OrderSort>('newest')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [formTarget, setFormTarget] = useState<'new' | CustomerOrder | null>(
    null,
  )
  const [remotePage, setRemotePage] = useState<orderService.OrderPage | null>(
    null,
  )
  const [refreshToken, setRefreshToken] = useState(0)

  const range = dateRange(dateFilter, customFrom, customTo)
  const fromBound = range?.from ?? null
  const toBound = range?.to ?? null
  const hasFilters =
    search.trim() !== '' || statusFilter !== 'all' || dateFilter !== 'all'

  const totalOrders = remotePage?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageOrders = remotePage?.rows ?? []
  const groupedOrders = groupOrdersByDay(pageOrders)

  // Server-side query: filtering, sorting and pagination all happen in
  // Supabase, so the console only ever loads one page at a time. Typing in the
  // search box is debounced to avoid a request per keystroke.
  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false
    const timer = window.setTimeout(() => {
      void orderService
        .fetchOrderPage({
          page: safePage,
          pageSize: PAGE_SIZE,
          search,
          status: statusFilter,
          createdFrom:
            fromBound === null ? undefined : new Date(fromBound).toISOString(),
          createdTo:
            toBound === null ? undefined : new Date(toBound).toISOString(),
          sort,
        })
        .then((result) => {
          if (!cancelled && result) setRemotePage(result)
        })
    }, SERVER_QUERY_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [safePage, search, statusFilter, sort, fromBound, toBound, refreshToken])

  /** Reloads the current page from Supabase. */
  function refreshFromServer() {
    if (isSupabaseConfigured) setRefreshToken((token) => token + 1)
  }

  /** Patches the page on screen so a change shows before the reload lands. */
  function patchRemotePage(
    update: (current: orderService.OrderPage) => orderService.OrderPage,
  ) {
    setRemotePage((current) => (current ? update(current) : current))
  }

  async function changeStatus(order: CustomerOrder, status: CustomerOrder['status']) {
    patchRemotePage((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        row.id === order.id ? { ...row, status } : row,
      ),
    }))

    // Awaiting the write keeps the reload below from reading a stale row.
    await updateOrder({ ...order, status })
    setNotice(
      t('admin.orderStatusChanged', {
        id: orderNumber(order.id),
        status: t(`orderStatus.${status}`),
      }),
    )
    refreshFromServer()
  }

  async function handleDelete(orderId: string, total: number) {
    const confirmed = window.confirm(
      t('admin.deleteOrderConfirm', {
        id: orderNumber(orderId),
        total: currency(total),
      }),
    )
    if (!confirmed) return

    patchRemotePage((current) => ({
      ...current,
      rows: current.rows.filter((row) => row.id !== orderId),
      total: Math.max(0, current.total - 1),
    }))

    await removeOrder(orderId)
    setNotice(t('admin.orderDeleted', { id: orderNumber(orderId) }))
    refreshFromServer()
  }

  async function handleSave(order: CustomerOrder) {
    const isNew = formTarget === 'new'
    setFormTarget(null)

    if (isNew) {
      await addOrder(order)
      setNotice(t('admin.orderCreated'))
    } else {
      await updateOrder(order)
      setNotice(t('admin.orderUpdated'))
    }
    refreshFromServer()
  }

  return (
    <>
      <AdminPageHeader
        actions={
          <button
            className="admin-btn admin-btn--primary"
            onClick={() => setFormTarget('new')}
            type="button"
          >
            <Add /> {t('admin.addOrder')}
          </button>
        }
        description={t('admin.ordersDescription')}
        eyebrow={t('admin.ordersEyebrow')}
        title={t('admin.ordersTitle')}
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
            aria-label={t('admin.searchOrdersAria')}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder={t('admin.searchOrdersPlaceholder')}
            type="search"
            value={search}
          />
        </label>

        <label>
          <span className="visually-hidden">{t('admin.filterByStatus')}</span>
          <select
            aria-label={t('admin.filterByStatus')}
            className="admin-toolbar__select"
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            value={statusFilter}
          >
            <option value="all">{t('admin.allStatuses')}</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {t(`orderStatus.${status}`)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="visually-hidden">{t('admin.filterByDate')}</span>
          <select
            aria-label={t('admin.filterByDate')}
            className="admin-toolbar__select"
            onChange={(event) => {
              setDateFilter(event.target.value as OrderDateFilter)
              setPage(1)
            }}
            value={dateFilter}
          >
            <option value="all">{t('admin.dateAll')}</option>
            <option value="today">{t('admin.dateToday')}</option>
            <option value="yesterday">{t('admin.dateYesterday')}</option>
            <option value="last-7">{t('admin.dateLast7')}</option>
            <option value="last-30">{t('admin.dateLast30')}</option>
            <option value="this-month">{t('admin.dateThisMonth')}</option>
            <option value="custom">{t('admin.dateCustom')}</option>
          </select>
        </label>

        {dateFilter === 'custom' && (
          <>
            <label>
              <span className="visually-hidden">{t('admin.dateFrom')}</span>
              <input
                aria-label={t('admin.dateFrom')}
                className="admin-toolbar__date"
                onChange={(event) => {
                  setCustomFrom(event.target.value)
                  setPage(1)
                }}
                type="date"
                value={customFrom}
              />
            </label>
            <label>
              <span className="visually-hidden">{t('admin.dateTo')}</span>
              <input
                aria-label={t('admin.dateTo')}
                className="admin-toolbar__date"
                onChange={(event) => {
                  setCustomTo(event.target.value)
                  setPage(1)
                }}
                type="date"
                value={customTo}
              />
            </label>
          </>
        )}

        <label>
          <span className="visually-hidden">{t('admin.sortOrders')}</span>
          <select
            aria-label={t('admin.sortOrders')}
            className="admin-toolbar__select"
            onChange={(event) => setSort(event.target.value as OrderSort)}
            value={sort}
          >
            <option value="newest">{t('admin.sortNewestFirst')}</option>
            <option value="oldest">{t('admin.sortOldestFirst')}</option>
            <option value="total-desc">{t('admin.sortTotalDesc')}</option>
            <option value="total-asc">{t('admin.sortTotalAsc')}</option>
          </select>
        </label>

        <span className="admin-toolbar__count">
          {t('admin.orderCount', { count: number(totalOrders) })}
        </span>
      </div>

      <section className="admin-card">
        {groupedOrders.length > 0 ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.thOrder')}</th>
                    <th>{t('admin.thCustomer')}</th>
                    <th>{t('admin.thPlaced')}</th>
                    <th>{t('admin.thItems')}</th>
                    <th>{t('admin.thTotal')}</th>
                    <th>{t('admin.thStatus')}</th>
                    <th aria-label={t('admin.thActions')} />
                  </tr>
                </thead>
                {groupedOrders.map((group) => (
                  <tbody key={group.key}>
                    <tr className="admin-table__group">
                      <td colSpan={7}>
                        <span className="admin-table__group-title">
                          {date(group.orders[0].createdAt, 'long')}
                        </span>
                        <span className="admin-table__muted">
                          {t('admin.dateGroupSummary', {
                            count: number(group.orders.length),
                            total: currency(group.total),
                          })}
                        </span>
                      </td>
                    </tr>
                    {group.orders.map((order) => (
                      <tr key={order.id}>
                        <td
                          className="admin-table__cell--primary"
                          data-label={t('admin.thOrder')}
                        >
                          <strong>#{orderNumber(order.id)}</strong>
                          <div className="admin-table__muted">
                            {t('admin.lineItemCount', {
                              count: number(order.items.length),
                            })}
                          </div>
                        </td>
                        <td data-label={t('admin.thCustomer')}>
                          <strong>
                            {order.address.firstName} {order.address.lastName}
                          </strong>
                          <div className="admin-table__muted">{order.email}</div>
                        </td>
                        <td data-label={t('admin.thPlaced')}>
                          {dateTime(order.createdAt)}
                        </td>
                        <td data-label={t('admin.thItems')}>
                          {number(
                            order.items.reduce(
                              (sum, item) => sum + item.quantity,
                              0,
                            ),
                          )}
                        </td>
                        <td data-label={t('admin.thTotal')}>
                          <strong>{currency(order.total)}</strong>
                        </td>
                        <td data-label={t('admin.thStatus')}>
                          <div
                            className="admin-table__primary"
                            style={{ minWidth: 200 }}
                          >
                            <span
                              className={`admin-badge admin-badge--${orderStatusVariant(order.status)}`}
                            >
                              {t(`orderStatus.${order.status}`)}
                            </span>
                            <select
                              aria-label={t('admin.updateStatusAria', {
                                id: orderNumber(order.id),
                              })}
                              className="admin-select admin-btn--sm"
                              onChange={(event) =>
                                changeStatus(
                                  order,
                                  event.target.value as CustomerOrder['status'],
                                )
                              }
                              value={order.status}
                            >
                              {orderStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {t(`orderStatus.${status}`)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td data-label={t('admin.thActions')}>
                          <div className="admin-table__actions">
                            <Link
                              aria-label={t('admin.viewOrderAria', {
                                id: orderNumber(order.id),
                              })}
                              className="admin-icon-btn"
                              to={`/admin/orders/${order.id}`}
                            >
                              <VisibilityOutlined />
                            </Link>
                            <button
                              aria-label={t('admin.editOrderAria', {
                                id: orderNumber(order.id),
                              })}
                              className="admin-icon-btn"
                              onClick={() => setFormTarget(order)}
                              type="button"
                            >
                              <EditOutlined />
                            </button>
                            <button
                              aria-label={t('admin.deleteOrderAria', {
                                id: orderNumber(order.id),
                              })}
                              className="admin-icon-btn admin-icon-btn--danger"
                              onClick={() => handleDelete(order.id, order.total)}
                              type="button"
                            >
                              <DeleteOutlined />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
            <AdminPagination
              onPage={setPage}
              page={safePage}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={totalOrders}
            />
          </>
        ) : (
          <div className="admin-empty">
            <ReceiptLongOutlined />
            <h3>{t('admin.noOrdersFoundTitle')}</h3>
            <p>
              {hasFilters
                ? t('admin.noOrdersFoundText')
                : t('admin.noOrdersYetText')}
            </p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={() => setFormTarget('new')}
              type="button"
            >
              <Add /> {t('admin.addOrder')}
            </button>
          </div>
        )}
      </section>

      {formTarget && (
        <OrderForm
          onClose={() => setFormTarget(null)}
          onSave={handleSave}
          order={formTarget === 'new' ? undefined : formTarget}
        />
      )}
    </>
  )
}

export default OrdersAdminPage

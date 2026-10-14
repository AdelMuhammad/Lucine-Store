import { useState } from 'react'
import {
  DeleteOutlined,
  ForumOutlined,
  SearchOutlined,
  VisibilityOutlined,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminPagination from '../components/AdminPagination'
import {
  lastMessageFor,
  supportStatuses,
  useSupportStore,
  type SupportConversation,
  type SupportStatus,
} from '../../support/store/useSupportStore'
import { useTranslation } from '../../../hooks/useTranslation'

type SupportSort = 'recent' | 'oldest' | 'unread'

const PAGE_SIZE = 8

function statusVariant(status: SupportStatus) {
  if (status === 'resolved') return 'success'
  if (status === 'pending') return 'warning'
  return 'info'
}

function SupportAdminPage() {
  const { t, number, dateTime } = useTranslation()
  const conversations = useSupportStore((state) => state.conversations)
  const messages = useSupportStore((state) => state.messages)
  const setSupportStatus = useSupportStore((state) => state.setStatus)
  const removeConversation = useSupportStore((state) => state.removeConversation)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState<SupportSort>('recent')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')

  const query = search.trim().toLocaleLowerCase()
  const filteredConversations = conversations
    .filter((conversation) => {
      const last = lastMessageFor(messages, conversation.id)
      const matchesQuery =
        !query ||
        [
          conversation.customerName,
          conversation.customerEmail,
          conversation.subject,
          last?.body ?? '',
          t(`support.topic.${conversation.topic}`),
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query)
      const matchesStatus =
        statusFilter === 'all' || conversation.status === statusFilter
      return matchesQuery && matchesStatus
    })
    .toSorted((first, second) => {
      if (sort === 'unread') return second.unreadForAdmin - first.unreadForAdmin
      if (sort === 'oldest') return first.updatedAt.localeCompare(second.updatedAt)
      return second.updatedAt.localeCompare(first.updatedAt)
    })

  const pageCount = Math.max(
    1,
    Math.ceil(filteredConversations.length / PAGE_SIZE),
  )
  const safePage = Math.min(page, pageCount)
  const pagedConversations = filteredConversations.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )
  const unreadTotal = conversations.reduce(
    (total, conversation) => total + conversation.unreadForAdmin,
    0,
  )

  function displayName(conversation: SupportConversation) {
    return conversation.customerName || t('admin.guestCustomer')
  }

  function handleStatus(conversation: SupportConversation, status: SupportStatus) {
    setSupportStatus(conversation.id, status)
    setNotice(
      t('admin.supportStatusUpdated', {
        status: t(`admin.supportStatus.${status}`),
      }),
    )
  }

  function handleDelete(conversation: SupportConversation) {
    const confirmed = window.confirm(
      t('admin.deleteConversationConfirm', { name: displayName(conversation) }),
    )
    if (!confirmed) return

    removeConversation(conversation.id)
    setNotice(t('admin.conversationDeleted'))
  }

  return (
    <>
      <AdminPageHeader
        description={t('admin.supportDescription')}
        eyebrow={t('admin.supportEyebrow')}
        title={t('admin.supportTitle')}
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
            aria-label={t('admin.searchSupportAria')}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder={t('admin.searchSupportPlaceholder')}
            type="search"
            value={search}
          />
        </label>

        <label>
          <span className="visually-hidden">{t('admin.supportStatusFilter')}</span>
          <select
            aria-label={t('admin.supportStatusFilter')}
            className="admin-toolbar__select"
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            value={statusFilter}
          >
            <option value="all">{t('admin.allSupportStatuses')}</option>
            {supportStatuses.map((status) => (
              <option key={status} value={status}>
                {t(`admin.supportStatus.${status}`)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="visually-hidden">{t('admin.sortSupport')}</span>
          <select
            aria-label={t('admin.sortSupport')}
            className="admin-toolbar__select"
            onChange={(event) => setSort(event.target.value as SupportSort)}
            value={sort}
          >
            <option value="recent">{t('admin.sortUpdatedDesc')}</option>
            <option value="oldest">{t('admin.sortUpdatedAsc')}</option>
            <option value="unread">{t('admin.sortUnreadDesc')}</option>
          </select>
        </label>

        <span className="admin-toolbar__count">
          {t('admin.conversationCount', {
            count: number(filteredConversations.length),
          })}
          {unreadTotal > 0 &&
            ` · ${t('admin.supportUnreadTotal', {
              count: number(unreadTotal),
            })}`}
        </span>
      </div>

      <section className="admin-card">
        {pagedConversations.length > 0 ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.thConversationCustomer')}</th>
                    <th>{t('admin.thConversation')}</th>
                    <th>{t('admin.thLastMessage')}</th>
                    <th>{t('admin.thConversationStatus')}</th>
                    <th aria-label={t('admin.thActions')} />
                  </tr>
                </thead>
                <tbody>
                  {pagedConversations.map((conversation) => {
                    const last = lastMessageFor(messages, conversation.id)
                    const messageCount = messages.filter(
                      (message) => message.conversationId === conversation.id,
                    ).length

                    return (
                      <tr key={conversation.id}>
                        <td
                          className="admin-table__cell--primary"
                          data-label={t('admin.thConversationCustomer')}
                        >
                          <strong>{displayName(conversation)}</strong>
                          <div className="admin-table__muted">
                            {conversation.customerEmail || t('admin.noEmail')}
                          </div>
                        </td>
                        <td data-label={t('admin.thConversation')}>
                          <strong>
                            {conversation.subject ||
                              t(`support.topic.${conversation.topic}`)}
                          </strong>
                          <div className="admin-table__muted admin-support-topic">
                            {t(`support.topic.${conversation.topic}`)}
                            {conversation.unreadForAdmin > 0 && (
                              <span className="admin-badge admin-badge--info">
                                {t('admin.unreadBadge', {
                                  count: number(conversation.unreadForAdmin),
                                })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className="admin-table__cell--review"
                          data-label={t('admin.thLastMessage')}
                        >
                          <p className="admin-table__muted admin-table__clamp">
                            {last?.body ?? t('support.emptyThread')}
                          </p>
                          <div className="admin-table__muted">
                            {dateTime(conversation.updatedAt)} ·{' '}
                            {t('admin.messageCount', {
                              count: number(messageCount),
                            })}
                          </div>
                        </td>
                        <td data-label={t('admin.thConversationStatus')}>
                          <div
                            className="admin-table__primary"
                            style={{ minWidth: 170 }}
                          >
                            <span
                              className={`admin-badge admin-badge--${statusVariant(conversation.status)}`}
                            >
                              {t(`admin.supportStatus.${conversation.status}`)}
                            </span>
                            <select
                              aria-label={t('admin.updateStatusAria', {
                                id: displayName(conversation),
                              })}
                              className="admin-select admin-btn--sm"
                              onChange={(event) =>
                                handleStatus(
                                  conversation,
                                  event.target.value as SupportStatus,
                                )
                              }
                              value={conversation.status}
                            >
                              {supportStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {t(`admin.supportStatus.${status}`)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td data-label={t('admin.thActions')}>
                          <div className="admin-table__actions">
                            <Link
                              aria-label={t('admin.openConversationAria', {
                                name: displayName(conversation),
                              })}
                              className="admin-icon-btn"
                              to={`/admin/support/${conversation.id}`}
                            >
                              <VisibilityOutlined />
                            </Link>
                            <button
                              aria-label={t('admin.deleteConversationAria', {
                                name: displayName(conversation),
                              })}
                              className="admin-icon-btn admin-icon-btn--danger"
                              onClick={() => handleDelete(conversation)}
                              type="button"
                            >
                              <DeleteOutlined />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination
              onPage={setPage}
              page={safePage}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={filteredConversations.length}
            />
          </>
        ) : (
          <div className="admin-empty">
            <ForumOutlined />
            <h3>{t('admin.noConversationsFoundTitle')}</h3>
            <p>
              {conversations.length === 0
                ? t('admin.noConversationsYetText')
                : t('admin.noConversationsFoundText')}
            </p>
          </div>
        )}
      </section>
    </>
  )
}

export default SupportAdminPage

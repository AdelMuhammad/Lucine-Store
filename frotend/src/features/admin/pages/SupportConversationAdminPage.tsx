import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowBack, DeleteOutlined, Send } from '@mui/icons-material'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminPageHeader from '../components/AdminPageHeader'
import {
  supportStatuses,
  useSupportStore,
  type SupportStatus,
} from '../../support/store/useSupportStore'
import { useTranslation } from '../../../hooks/useTranslation'

const quickReplyKeys = ['thanks', 'checkOrder', 'shipped', 'return'] as const

function SupportConversationAdminPage() {
  const { t, number, dateTime } = useTranslation()
  const { conversationId } = useParams()
  const navigate = useNavigate()

  const conversations = useSupportStore((state) => state.conversations)
  const messages = useSupportStore((state) => state.messages)
  const sendMessage = useSupportStore((state) => state.sendMessage)
  const setSupportStatus = useSupportStore((state) => state.setStatus)
  const markRead = useSupportStore((state) => state.markRead)
  const removeConversation = useSupportStore((state) => state.removeConversation)

  const [reply, setReply] = useState('')
  const [notice, setNotice] = useState('')

  const threadRef = useRef<HTMLDivElement>(null)

  const conversation = conversations.find((item) => item.id === conversationId)
  const thread = conversation
    ? messages
        .filter((message) => message.conversationId === conversation.id)
        .toSorted((first, second) =>
          first.createdAt.localeCompare(second.createdAt),
        )
    : []

  const displayName = conversation?.customerName || t('admin.guestCustomer')

  // Opening the conversation clears its admin-side unread badge.
  useEffect(() => {
    if (conversation && conversation.unreadForAdmin > 0) {
      markRead(conversation.id, 'admin')
    }
  }, [conversation, markRead])

  useEffect(() => {
    const node = threadRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [thread.length])

  function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!conversation || !reply.trim()) return

    sendMessage({
      conversationId: conversation.id,
      author: 'support',
      authorName: t('support.team'),
      body: reply,
    })
    setReply('')
    setNotice(t('admin.replySent'))
  }

  function handleStatus(status: SupportStatus) {
    if (!conversation) return
    setSupportStatus(conversation.id, status)
    setNotice(
      t('admin.supportStatusUpdated', {
        status: t(`admin.supportStatus.${status}`),
      }),
    )
  }

  function handleDelete() {
    if (!conversation) return
    const confirmed = window.confirm(
      t('admin.deleteConversationConfirm', { name: displayName }),
    )
    if (!confirmed) return

    removeConversation(conversation.id)
    navigate('/admin/support')
  }

  if (!conversation) {
    return (
      <>
        <AdminPageHeader
          description={t('admin.conversationNotFoundText')}
          eyebrow={t('admin.conversationDetailEyebrow')}
          title={t('admin.conversationNotFoundTitle')}
        />
        <Link className="admin-btn admin-btn--dark" to="/admin/support">
          <ArrowBack className="rtl-flip" />
          {t('admin.backToSupport')}
        </Link>
      </>
    )
  }

  return (
    <>
      <AdminPageHeader
        description={t('admin.conversationDetailDescription', {
          date: dateTime(conversation.createdAt),
          count: number(thread.length),
        })}
        eyebrow={t('admin.conversationDetailEyebrow')}
        title={t('admin.conversationDetailTitle', { name: displayName })}
        actions={
          <Link className="admin-btn admin-btn--sm" to="/admin/support">
            <ArrowBack className="rtl-flip" />
            {t('admin.backToSupport')}
          </Link>
        }
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

      <div className="admin-support-detail">
        <section className="admin-card admin-support-detail__thread">
          <div className="admin-card__header">
            <div>
              <h2>{t('admin.threadTitle')}</h2>
              <p>{t('admin.threadText')}</p>
            </div>
            <span
              className={`admin-badge admin-badge--${statusVariant(conversation.status)}`}
            >
              {t(`admin.supportStatus.${conversation.status}`)}
            </span>
          </div>

          <div className="admin-thread" ref={threadRef}>
            {thread.map((message) => (
              <div
                className={`admin-thread__message admin-thread__message--${message.author}`}
                key={message.id}
              >
                <div className="admin-thread__bubble">
                  <span className="admin-thread__author">
                    {message.author === 'support'
                      ? t('support.team')
                      : conversation.customerName || t('support.you')}
                  </span>
                  <p>{message.body}</p>
                  <time dateTime={message.createdAt}>
                    {dateTime(message.createdAt)}
                  </time>
                </div>
              </div>
            ))}
          </div>

          <form className="admin-reply" onSubmit={handleReply}>
            <div className="admin-reply__quick">
              <span>{t('admin.quickRepliesLabel')}</span>
              <div className="admin-reply__quick-list">
                {quickReplyKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => setReply(t(`admin.quickReplies.${key}`))}
                    type="button"
                  >
                    {t(`admin.quickReplies.${key}`)}
                  </button>
                ))}
              </div>
            </div>

            <label className="admin-reply__field">
              <span className="visually-hidden">{t('admin.replyLabel')}</span>
              <textarea
                aria-label={t('admin.replyLabel')}
                onChange={(event) => setReply(event.target.value)}
                placeholder={t('admin.replyPlaceholder')}
                rows={3}
                value={reply}
              />
            </label>

            <div className="admin-reply__actions">
              <button
                className="admin-btn admin-btn--primary"
                disabled={!reply.trim()}
                type="submit"
              >
                <Send className="rtl-flip" />
                {t('admin.sendReply')}
              </button>
            </div>
          </form>
        </section>

        <aside className="admin-support-detail__side">
          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.customerSectionTitle')}</h2>
                <p>{t('admin.customerSectionText')}</p>
              </div>
            </div>
            <div className="admin-card__body">
              <dl className="admin-detail-list">
                <div>
                  <dt>{t('admin.miniName')}</dt>
                  <dd>{displayName}</dd>
                </div>
                <div>
                  <dt>{t('admin.miniEmail')}</dt>
                  <dd dir="ltr">
                    {conversation.customerEmail || t('admin.noEmail')}
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.conversationTopicLabel')}</dt>
                  <dd>{t(`support.topic.${conversation.topic}`)}</dd>
                </div>
                <div>
                  <dt>{t('admin.conversationOpenedLabel')}</dt>
                  <dd>{dateTime(conversation.createdAt)}</dd>
                </div>
                <div>
                  <dt>{t('admin.conversationOrderLabel')}</dt>
                  <dd>
                    {conversation.orderId ? (
                      <Link to={`/admin/orders/${conversation.orderId}`}>
                        {conversation.orderId.slice(0, 8).toUpperCase()}
                      </Link>
                    ) : (
                      t('admin.noRelatedOrder')
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.statusTitle')}</h2>
                <p>{t('admin.statusText')}</p>
              </div>
            </div>
            <div className="admin-card__body">
              <label className="admin-field">
                <span>{t('admin.conversationStatusLabel')}</span>
                <select
                  onChange={(event) =>
                    handleStatus(event.target.value as SupportStatus)
                  }
                  value={conversation.status}
                >
                  {supportStatuses.map((status) => (
                    <option key={status} value={status}>
                      {t(`admin.supportStatus.${status}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="admin-btn admin-btn--danger admin-support-detail__delete"
                onClick={handleDelete}
                type="button"
              >
                <DeleteOutlined />
                {t('admin.deleteConversation')}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}

function statusVariant(status: SupportStatus) {
  if (status === 'resolved') return 'success'
  if (status === 'pending') return 'warning'
  return 'info'
}

export default SupportConversationAdminPage

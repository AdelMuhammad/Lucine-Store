import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Add, Close, Send, SupportAgentOutlined } from '@mui/icons-material'
import { useAccountStore } from '../../account/store/useAccountStore'
import { useTranslation } from '../../../hooks/useTranslation'
import {
  lastMessageFor,
  supportTopics,
  useSupportStore,
  type SupportConversation,
  type SupportTopic,
} from '../store/useSupportStore'
import { useSupportPanelStore } from '../store/useSupportPanelStore'
import './SupportChatWidget.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function SupportChatWidget() {
  const { t, number, dateTime } = useTranslation()
  const isOpen = useSupportPanelStore((state) => state.isOpen)
  const openPanel = useSupportPanelStore((state) => state.open)
  const closePanel = useSupportPanelStore((state) => state.close)
  const activeConversationId = useSupportPanelStore(
    (state) => state.activeConversationId,
  )
  const setActiveConversation = useSupportPanelStore(
    (state) => state.setActiveConversation,
  )
  const draftTopic = useSupportPanelStore((state) => state.draftTopic)
  const setDraftTopic = useSupportPanelStore((state) => state.setDraftTopic)
  const composing = useSupportPanelStore((state) => state.composing)
  const startComposing = useSupportPanelStore((state) => state.startComposing)

  const customerId = useSupportStore((state) => state.customerId)
  const conversations = useSupportStore((state) => state.conversations)
  const messages = useSupportStore((state) => state.messages)
  const startConversation = useSupportStore((state) => state.startConversation)
  const sendMessage = useSupportStore((state) => state.sendMessage)
  const markRead = useSupportStore((state) => state.markRead)

  const profile = useAccountStore((state) => state.profile)

  const [name, setName] = useState(
    `${profile.firstName} ${profile.lastName}`.trim(),
  )
  const [email, setEmail] = useState(profile.email)
  const [localTopic, setLocalTopic] = useState<SupportTopic>('order')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')

  // A topic chosen on the support page takes precedence until the shopper edits it.
  const topic = draftTopic ?? localTopic

  const threadRef = useRef<HTMLDivElement>(null)

  const myConversations = conversations
    .filter((conversation) => conversation.customerId === customerId)
    .toSorted((first, second) => second.updatedAt.localeCompare(first.updatedAt))

  // Derived during render so opening the panel never flashes the start form.
  const activeConversation = composing
    ? null
    : (myConversations.find(
        (conversation) => conversation.id === activeConversationId,
      ) ??
      myConversations[0] ??
      null)

  const thread = activeConversation
    ? messages
        .filter((item) => item.conversationId === activeConversation.id)
        .toSorted((first, second) =>
          first.createdAt.localeCompare(second.createdAt),
        )
    : []

  const unreadCount = myConversations.reduce(
    (total, conversation) => total + conversation.unreadForCustomer,
    0,
  )

  // Clear the customer-side unread badge for the open conversation.
  useEffect(() => {
    if (isOpen && activeConversation && activeConversation.unreadForCustomer > 0) {
      markRead(activeConversation.id, 'customer')
    }
  }, [isOpen, activeConversation, markRead])

  // Keep the newest message in view.
  useEffect(() => {
    const node = threadRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [thread.length, isOpen])

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closePanel])

  function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !name.trim() ||
      !EMAIL_PATTERN.test(email.trim()) ||
      !message.trim()
    ) {
      setError(t('support.error'))
      return
    }

    const id = startConversation({
      name,
      email,
      topic,
      subject,
      message,
    })
    setActiveConversation(id)
    setMessage('')
    setSubject('')
    setError('')
    setDraftTopic(null)
  }

  function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeConversation || !reply.trim()) return

    sendMessage({
      conversationId: activeConversation.id,
      author: 'customer',
      authorName: activeConversation.customerName || name,
      body: reply,
    })
    setReply('')
  }

  function conversationTitle(conversation: SupportConversation) {
    return conversation.subject || t(`support.topic.${conversation.topic}`)
  }

  return (
    <div className="support-chat">
      {isOpen && (
        <section
          aria-label={t('support.title')}
          className="support-chat__panel"
          role="dialog"
        >
          <header className="support-chat__header">
            <span aria-hidden="true" className="support-chat__avatar">
              <SupportAgentOutlined />
            </span>
            <div className="support-chat__heading">
              <strong>{t('support.title')}</strong>
              <span className="support-chat__online">
                <i aria-hidden="true" />
                {t('support.online')}
              </span>
            </div>
            <button
              aria-label={t('support.close')}
              className="support-chat__icon-btn"
              onClick={closePanel}
              type="button"
            >
              <Close />
            </button>
          </header>

          {activeConversation ? (
            <>
              <div className="support-chat__toolbar">
                <div className="support-chat__toolbar-info">
                  <strong>{conversationTitle(activeConversation)}</strong>
                  <span>
                    {t(`support.status.${activeConversation.status}`)}
                  </span>
                </div>
                <div className="support-chat__toolbar-actions">
                  {myConversations.length > 1 && (
                    <select
                      aria-label={t('support.switchConversation')}
                      className="support-chat__select"
                      onChange={(event) =>
                        setActiveConversation(event.target.value)
                      }
                      value={activeConversation.id}
                    >
                      {myConversations.map((conversation) => (
                        <option key={conversation.id} value={conversation.id}>
                          {conversationTitle(conversation)}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    className="support-chat__new"
                    onClick={() => startComposing()}
                    type="button"
                  >
                    <Add />
                    {t('support.newConversation')}
                  </button>
                </div>
              </div>

              <div className="support-chat__thread" ref={threadRef}>
                <span className="support-chat__thread-start">
                  {t('support.startedOn', {
                    date: dateTime(activeConversation.createdAt),
                  })}
                </span>
                {thread.map((item) => (
                  <div
                    className={`support-chat__message support-chat__message--${item.author}`}
                    key={item.id}
                  >
                    <div className="support-chat__bubble">
                      <span className="support-chat__author">
                        {item.author === 'customer'
                          ? activeConversation.customerName || t('support.you')
                          : t('support.team')}
                      </span>
                      <p>{item.body}</p>
                      <time dateTime={item.createdAt}>
                        {dateTime(item.createdAt)}
                      </time>
                    </div>
                  </div>
                ))}
              </div>

              {activeConversation.status === 'resolved' && (
                <p className="support-chat__resolved">
                  {t('support.resolvedNotice')}
                </p>
              )}

              <form className="support-chat__composer" onSubmit={handleReply}>
                <textarea
                  aria-label={t('support.replyPlaceholder')}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder={t('support.replyPlaceholder')}
                  rows={2}
                  value={reply}
                />
                <button
                  aria-label={t('support.send')}
                  className="support-chat__send"
                  disabled={!reply.trim()}
                  type="submit"
                >
                  <Send className="rtl-flip" />
                </button>
              </form>
            </>
          ) : (
            <form className="support-chat__start" onSubmit={handleStart}>
              <div className="support-chat__intro">
                <h2>{t('support.startTitle')}</h2>
                <p>{t('support.startText')}</p>
              </div>

              {myConversations.length > 0 && (
                <div className="support-chat__existing">
                  <span>{t('support.conversations')}</span>
                  <div className="support-chat__existing-list">
                    {myConversations.map((conversation) => {
                      const last = lastMessageFor(messages, conversation.id)
                      return (
                        <button
                          key={conversation.id}
                          onClick={() =>
                            setActiveConversation(conversation.id)
                          }
                          type="button"
                        >
                          <strong>{conversationTitle(conversation)}</strong>
                          <span>
                            {last?.body ?? t('support.emptyThread')}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <label className="support-chat__field">
                <span>{t('support.nameLabel')}</span>
                <input
                  onChange={(event) => setName(event.target.value)}
                  value={name}
                />
              </label>

              <label className="support-chat__field">
                <span>{t('support.emailLabel')}</span>
                <input
                  dir="ltr"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </label>

              <label className="support-chat__field">
                <span>{t('support.topicLabel')}</span>
                <select
                  onChange={(event) => {
                    setLocalTopic(event.target.value as SupportTopic)
                    setDraftTopic(null)
                  }}
                  value={topic}
                >
                  {supportTopics.map((item) => (
                    <option key={item} value={item}>
                      {t(`support.topic.${item}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="support-chat__field">
                <span>{t('support.subjectLabel')}</span>
                <input
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder={t('support.subjectPlaceholder')}
                  value={subject}
                />
              </label>

              <label className="support-chat__field">
                <span>{t('support.messageLabel')}</span>
                <textarea
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t('support.messagePlaceholder')}
                  rows={3}
                  value={message}
                />
              </label>

              {error && <p className="support-chat__error">{error}</p>}

              <button className="support-chat__submit" type="submit">
                {t('support.start')}
              </button>
            </form>
          )}
        </section>
      )}

      <button
        aria-label={t('support.launcherAria')}
        className={`support-chat__launcher${isOpen ? ' is-open' : ''}`}
        onClick={() => (isOpen ? closePanel() : openPanel())}
        type="button"
      >
        {isOpen ? <Close /> : <SupportAgentOutlined />}
        <span>{isOpen ? t('support.close') : t('support.launcher')}</span>
        {!isOpen && unreadCount > 0 && (
          <span
            aria-label={t('support.unreadAria', {
              count: number(unreadCount),
            })}
            className="support-chat__launcher-badge"
          >
            {number(unreadCount)}
          </span>
        )}
      </button>
    </div>
  )
}

export default SupportChatWidget

import {
  AssignmentReturnOutlined,
  CreditCardOutlined,
  HelpOutlineOutlined,
  Inventory2Outlined,
  ReceiptLongOutlined,
} from '@mui/icons-material'
import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import { breadcrumbSchema, faqSchema } from '../../lib/seo'
import {
  lastMessageFor,
  supportTopics,
  useSupportStore,
  type SupportTopic,
} from './store/useSupportStore'
import { useSupportPanelStore } from './store/useSupportPanelStore'
import './SupportPage.css'

const topicIcons: Record<SupportTopic, ReactNode> = {
  order: <ReceiptLongOutlined />,
  product: <Inventory2Outlined />,
  return: <AssignmentReturnOutlined />,
  payment: <CreditCardOutlined />,
  other: <HelpOutlineOutlined />,
}

const faqKeys = [1, 2, 3, 4]

function SupportPage() {
  const { t, number, dateTime } = useTranslation()
  const location = useLocation()
  const open = useSupportPanelStore((state) => state.open)
  const openNewConversation = useSupportPanelStore(
    (state) => state.openNewConversation,
  )
  const customerId = useSupportStore((state) => state.customerId)
  const conversations = useSupportStore((state) => state.conversations)
  const messages = useSupportStore((state) => state.messages)

  const myConversations = conversations
    .filter((conversation) => conversation.customerId === customerId)
    .toSorted((first, second) => second.updatedAt.localeCompare(first.updatedAt))

  // A notification can deep-link straight into a conversation (?conversation=id).
  useEffect(() => {
    const conversationId = new URLSearchParams(location.search).get(
      'conversation',
    )
    if (conversationId) open(conversationId)
  }, [location.search, open])

  return (
    <div className="support-page">
      <Seo
        description={t('seo.support.description')}
        jsonLd={[
          faqSchema(
            faqKeys.map((index) => ({
              question: t(`support.page.faq.q${index}`),
              answer: t(`support.page.faq.a${index}`),
            })),
          ),
          breadcrumbSchema([
            { name: t('productDetail.home'), path: '/' },
            { name: t('nav.care'), path: '/support' },
          ]),
        ]}
        keywords={[t('nav.care'), t('support.page.faqTitle')]}
        path="/support"
        title={t('seo.support.title')}
      />
      <section className="support-page__hero">
        <span className="support-page__eyebrow">
          {t('support.page.eyebrow')}
        </span>
        <h1>{t('support.page.title')}</h1>
        <p>{t('support.page.text')}</p>
        <div className="support-page__hero-actions">
          <button
            className="support-page__primary"
            onClick={() => openNewConversation()}
            type="button"
          >
            {t('support.page.startChat')}
          </button>
          <a className="support-page__secondary" href="#support-faq">
            {t('support.page.browseFaq')}
          </a>
        </div>
      </section>

      <section className="support-page__section">
        <h2>{t('support.page.topicsTitle')}</h2>
        <p>{t('support.page.topicsText')}</p>
        <div className="support-page__topics">
          {supportTopics.map((topic) => (
            <button
              className="support-page__topic"
              key={topic}
              onClick={() => openNewConversation(topic)}
              type="button"
            >
              <span aria-hidden="true" className="support-page__topic-icon">
                {topicIcons[topic]}
              </span>
              <strong>{t(`support.topic.${topic}`)}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="support-page__split">
        <div className="support-page__panel">
          <h2>{t('support.page.conversationsTitle')}</h2>
          <p>{t('support.page.conversationsText')}</p>
          {myConversations.length > 0 ? (
            <ul className="support-page__conversations">
              {myConversations.map((conversation) => {
                const last = lastMessageFor(messages, conversation.id)
                const count = messages.filter(
                  (message) => message.conversationId === conversation.id,
                ).length
                return (
                  <li key={conversation.id}>
                    <button onClick={() => open(conversation.id)} type="button">
                      <span className="support-page__conversation-icon">
                        {topicIcons[conversation.topic]}
                      </span>
                      <span className="support-page__conversation-body">
                        <strong>
                          {conversation.subject ||
                            t(`support.topic.${conversation.topic}`)}
                        </strong>
                        <small>
                          {last?.body ?? t('support.emptyThread')}
                        </small>
                      </span>
                      <span className="support-page__conversation-meta">
                        <span
                          className={`support-page__status support-page__status--${conversation.status}`}
                        >
                          {t(`support.status.${conversation.status}`)}
                        </span>
                        <small>
                          {t('support.messageCount', {
                            count: number(count),
                          })}
                        </small>
                        <time dateTime={conversation.updatedAt}>
                          {dateTime(conversation.updatedAt, 'short')}
                        </time>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="support-page__empty">
              {t('support.page.noConversations')}
            </p>
          )}
        </div>

        <div className="support-page__info">
          <article>
            <h3>{t('support.page.hoursTitle')}</h3>
            <p>{t('support.page.hoursText')}</p>
          </article>
          <article>
            <h3>{t('support.page.replyTimeTitle')}</h3>
            <p>{t('support.page.replyTimeText')}</p>
          </article>
          <article>
            <h3>{t('support.page.emailTitle')}</h3>
            <p dir="ltr">{t('support.page.emailText')}</p>
          </article>
        </div>
      </section>

      <section className="support-page__section" id="support-faq">
        <h2>{t('support.page.faqTitle')}</h2>
        <div className="support-page__faq">
          {faqKeys.map((index) => (
            <details key={index}>
              <summary>{t(`support.page.faq.q${index}`)}</summary>
              <p>{t(`support.page.faq.a${index}`)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

export default SupportPage

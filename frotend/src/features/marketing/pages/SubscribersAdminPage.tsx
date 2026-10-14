import { useState, type FormEvent } from 'react'
import {
  Add,
  DeleteOutlined,
  DownloadOutlined,
  GroupOutlined,
  MarkEmailUnreadOutlined,
  MarkEmailReadOutlined,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'
import { csvFilename, downloadCsv } from '../csv'
import {
  subscribeToNewsletter,
  useMarketingStore,
  type Subscriber,
} from '../store/useMarketingStore'

function SubscribersAdminPage() {
  const { t, number, date, language } = useTranslation()
  const subscribers = useMarketingStore((state) => state.subscribers)
  const updateSubscriber = useMarketingStore((state) => state.updateSubscriber)
  const removeSubscriber = useMarketingStore((state) => state.removeSubscriber)

  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')

  const visible = subscribers.filter((subscriber) => {
    const term = search.trim().toLocaleLowerCase()
    if (!term) return true
    return (
      subscriber.email.toLocaleLowerCase().includes(term) ||
      subscriber.name.toLocaleLowerCase().includes(term)
    )
  })

  const subscribedCount = subscribers.filter(
    (subscriber) => subscriber.isSubscribed,
  ).length

  function openAdd() {
    setEmail('')
    setName('')
    setFormError('')
    setAdding(true)
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = email.trim().toLocaleLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setFormError(t('admin.subscriberEmailInvalid'))
      return
    }

    subscribeToNewsletter({
      email: clean,
      name,
      language,
      source: 'admin',
    })
    setAdding(false)
  }

  async function handleToggle(subscriber: Subscriber) {
    await updateSubscriber({
      ...subscriber,
      isSubscribed: !subscriber.isSubscribed,
    })
  }

  async function handleDelete(subscriber: Subscriber) {
    if (!window.confirm(t('admin.subscriberDeleteConfirm'))) return
    await removeSubscriber(subscriber.email)
  }

  function handleExport() {
    downloadCsv(csvFilename('subscribers'), [
      [
        t('admin.thEmail'),
        t('admin.thName'),
        t('admin.thLanguage'),
        t('admin.thSource'),
        t('admin.thStatus'),
        t('admin.thJoined'),
      ],
      ...visible.map((subscriber) => [
        subscriber.email,
        subscriber.name,
        subscriber.language,
        subscriber.source,
        subscriber.isSubscribed ? t('admin.subscriberOn') : t('admin.subscriberOff'),
        subscriber.createdAt,
      ]),
    ])
  }

  return (
    <>
      <AdminPageHeader
        description={t('admin.subscribersDescription')}
        eyebrow={t('admin.marketingEyebrow')}
        title={t('admin.navSubscribers')}
        actions={
          <>
            <button className="admin-btn" onClick={handleExport} type="button">
              <DownloadOutlined /> {t('admin.exportCsv')}
            </button>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openAdd}
              type="button"
            >
              <Add /> {t('admin.addSubscriber')}
            </button>
          </>
        }
      />

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <GroupOutlined />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.subscriberSearchPlaceholder')}
            value={search}
          />
        </label>
        <span className="admin-toolbar__count">
          {t('admin.subscriberCount', {
            total: number(subscribers.length),
            subscribed: number(subscribedCount),
          })}
        </span>
      </div>

      <section className="admin-card">
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thEmail')}</th>
                  <th>{t('admin.thName')}</th>
                  <th>{t('admin.thLanguage')}</th>
                  <th>{t('admin.thSource')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th>{t('admin.thJoined')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map((subscriber) => (
                  <tr key={subscriber.email}>
                    <td data-label={t('admin.thEmail')}>
                      <strong>{subscriber.email}</strong>
                    </td>
                    <td data-label={t('admin.thName')}>
                      {subscriber.name || t('admin.subscriberNoName')}
                    </td>
                    <td data-label={t('admin.thLanguage')}>
                      {subscriber.language === 'ar'
                        ? t('common.arabic')
                        : t('common.english')}
                    </td>
                    <td data-label={t('admin.thSource')}>
                      <span className="admin-table__muted">
                        {t(`subscriberSource.${subscriber.source}`)}
                      </span>
                    </td>
                    <td data-label={t('admin.thStatus')}>
                      <span
                        className={`admin-badge ${
                          subscriber.isSubscribed
                            ? 'admin-badge--success'
                            : 'admin-badge--neutral'
                        }`}
                      >
                        {subscriber.isSubscribed
                          ? t('admin.subscriberOn')
                          : t('admin.subscriberOff')}
                      </span>
                    </td>
                    <td data-label={t('admin.thJoined')}>
                      <span className="admin-table__muted">
                        {date(subscriber.createdAt, 'short')}
                      </span>
                    </td>
                    <td data-label={t('admin.thActions')}>
                      <div className="admin-table__actions">
                        <button
                          aria-label={t(
                            subscriber.isSubscribed
                              ? 'admin.subscriberUnsubscribe'
                              : 'admin.subscriberResubscribe',
                          )}
                          className="admin-icon-btn"
                          onClick={() => void handleToggle(subscriber)}
                          type="button"
                        >
                          {subscriber.isSubscribed ? (
                            <MarkEmailReadOutlined />
                          ) : (
                            <MarkEmailUnreadOutlined />
                          )}
                        </button>
                        <button
                          aria-label={t('admin.subscriberDeleteConfirm')}
                          className="admin-icon-btn admin-icon-btn--danger"
                          onClick={() => void handleDelete(subscriber)}
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
        ) : (
          <div className="admin-empty">
            <GroupOutlined />
            <h3>{t('admin.noSubscribersTitle')}</h3>
            <p>{t('admin.noSubscribersText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openAdd}
              type="button"
            >
              <Add /> {t('admin.addSubscriber')}
            </button>
          </div>
        )}
      </section>

      {adding && (
        <AdminModal
          description={t('admin.subscriberModalDescription')}
          onClose={() => setAdding(false)}
          title={t('admin.addSubscriber')}
        >
          <form className="admin-form" onSubmit={handleAdd}>
            <div className="admin-form-grid">
              <label className="admin-field admin-field--full">
                <span>{t('admin.thEmail')}</span>
                <input
                  autoFocus
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>{t('admin.thName')}</span>
                <input
                  onChange={(event) => setName(event.target.value)}
                  value={name}
                />
              </label>
            </div>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button
                className="admin-btn"
                onClick={() => setAdding(false)}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="admin-btn admin-btn--primary" type="submit">
                {t('admin.addSubscriber')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default SubscribersAdminPage

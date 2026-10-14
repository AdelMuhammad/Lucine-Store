import { useMemo, useState, type FormEvent } from 'react'
import {
  CampaignOutlined,
  DeleteOutlined,
  NotificationsNoneOutlined,
} from '@mui/icons-material'
import AdminPageHeader from '../components/AdminPageHeader'
import {
  notifyAnnouncement,
  useNotificationStore,
  type NotificationAudience,
  type NotificationKind,
} from '../../notifications/store/useNotificationStore'
import { useTranslation } from '../../../hooks/useTranslation'

const notificationKinds: NotificationKind[] = [
  'support',
  'order',
  'announcement',
  'system',
]

const audiences: NotificationAudience[] = ['customer', 'admin']

type KindFilter = 'all' | NotificationKind
type AudienceFilter = 'all' | NotificationAudience

function NotificationsAdminPage() {
  const { t, localized, dateTime, number } = useTranslation()
  const notifications = useNotificationStore((state) => state.notifications)
  const removeNotification = useNotificationStore((state) => state.remove)

  const [title, setTitle] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [body, setBody] = useState('')
  const [bodyAr, setBodyAr] = useState('')
  const [link, setLink] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [audienceFilter, setAudienceFilter] =
    useState<AudienceFilter>('all')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const filtered = useMemo(
    () =>
      notifications
        .toSorted((first, second) =>
          second.createdAt.localeCompare(first.createdAt),
        )
        .filter(
          (notification) =>
            (kindFilter === 'all' || notification.kind === kindFilter) &&
            (audienceFilter === 'all' ||
              notification.audience === audienceFilter),
        ),
    [notifications, kindFilter, audienceFilter],
  )

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !title.trim() ||
      !titleAr.trim() ||
      !body.trim() ||
      !bodyAr.trim()
    ) {
      setError(t('adminNotifications.errorRequired'))
      return
    }

    notifyAnnouncement({ title, titleAr, body, bodyAr, link })
    setTitle('')
    setTitleAr('')
    setBody('')
    setBodyAr('')
    setLink('')
    setError('')
    setNotice(t('adminNotifications.sent'))
  }

  function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(
      t('adminNotifications.deleteConfirm', { title: name }),
    )
    if (!confirmed) return

    removeNotification(id)
    setNotice(t('adminNotifications.deleted'))
  }

  return (
    <>
      <AdminPageHeader
        description={t('adminNotifications.description')}
        eyebrow={t('adminNotifications.eyebrow')}
        title={t('adminNotifications.title')}
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

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('adminNotifications.composeTitle')}</h2>
            <p>{t('adminNotifications.composeText')}</p>
          </div>
          <CampaignOutlined />
        </div>

        <form className="admin-card__body admin-announce-form" onSubmit={handleSend}>
          <div className="admin-announce-grid">
            <label className="admin-field">
              <span>{t('adminNotifications.fieldTitleEn')}</span>
              <input
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('adminNotifications.fieldTitlePlaceholder')}
                value={title}
              />
            </label>

            <label className="admin-field">
              <span>{t('adminNotifications.fieldTitleAr')}</span>
              <input
                dir="rtl"
                onChange={(event) => setTitleAr(event.target.value)}
                placeholder={t('adminNotifications.fieldTitlePlaceholder')}
                value={titleAr}
              />
            </label>

            <label className="admin-field">
              <span>{t('adminNotifications.fieldBodyEn')}</span>
              <textarea
                onChange={(event) => setBody(event.target.value)}
                placeholder={t('adminNotifications.fieldBodyPlaceholder')}
                rows={3}
                value={body}
              />
            </label>

            <label className="admin-field">
              <span>{t('adminNotifications.fieldBodyAr')}</span>
              <textarea
                dir="rtl"
                onChange={(event) => setBodyAr(event.target.value)}
                placeholder={t('adminNotifications.fieldBodyPlaceholder')}
                rows={3}
                value={bodyAr}
              />
            </label>
          </div>

          <label className="admin-field">
            <span>{t('adminNotifications.fieldLink')}</span>
            <input
              dir="ltr"
              onChange={(event) => setLink(event.target.value)}
              placeholder={t('adminNotifications.fieldLinkPlaceholder')}
              value={link}
            />
          </label>

          {error && <p className="admin-form-error">{error}</p>}

          <div className="admin-page-header__actions">
            <button className="admin-btn admin-btn--primary" type="submit">
              <CampaignOutlined />
              {t('adminNotifications.send')}
            </button>
          </div>
        </form>
      </section>

      <div className="admin-toolbar">
        <label>
          <span className="visually-hidden">
            {t('adminNotifications.filterKind')}
          </span>
          <select
            aria-label={t('adminNotifications.filterKind')}
            className="admin-toolbar__select"
            onChange={(event) => setKindFilter(event.target.value as KindFilter)}
            value={kindFilter}
          >
            <option value="all">{t('adminNotifications.allKinds')}</option>
            {notificationKinds.map((kind) => (
              <option key={kind} value={kind}>
                {t(`adminNotifications.kind.${kind}`)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="visually-hidden">
            {t('adminNotifications.filterAudience')}
          </span>
          <select
            aria-label={t('adminNotifications.filterAudience')}
            className="admin-toolbar__select"
            onChange={(event) =>
              setAudienceFilter(event.target.value as AudienceFilter)
            }
            value={audienceFilter}
          >
            <option value="all">{t('adminNotifications.allAudiences')}</option>
            {audiences.map((audience) => (
              <option key={audience} value={audience}>
                {t(`adminNotifications.audience.${audience}`)}
              </option>
            ))}
          </select>
        </label>

        <span className="admin-toolbar__count">
          {t('adminNotifications.notificationCount', {
            count: number(filtered.length),
          })}
        </span>
      </div>

      <section className="admin-card">
        {filtered.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('adminNotifications.thNotificationTitle')}</th>
                  <th>{t('adminNotifications.thNotificationKind')}</th>
                  <th>{t('adminNotifications.thNotificationAudience')}</th>
                  <th>{t('adminNotifications.thNotificationDate')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((notification) => {
                  const name = localized(
                    notification.title,
                    notification.titleAr,
                  )
                  const preview = localized(
                    notification.body,
                    notification.bodyAr,
                  )

                  return (
                    <tr key={notification.id}>
                      <td
                        className="admin-table__cell--primary"
                        data-label={t('adminNotifications.thNotificationTitle')}
                      >
                        <strong>{name}</strong>
                        <div className="admin-table__muted admin-table__clamp">
                          {preview || t('adminNotifications.previewEmpty')}
                        </div>
                      </td>
                      <td data-label={t('adminNotifications.thNotificationKind')}>
                        <span className="admin-badge admin-badge--neutral">
                          {t(`adminNotifications.kind.${notification.kind}`)}
                        </span>
                      </td>
                      <td data-label={t('adminNotifications.thNotificationAudience')}>
                        {t(
                          `adminNotifications.audience.${notification.audience}`,
                        )}
                      </td>
                      <td data-label={t('adminNotifications.thNotificationDate')}>
                        {dateTime(notification.createdAt)}
                      </td>
                      <td data-label={t('admin.thActions')}>
                        <div className="admin-table__actions">
                          <button
                            aria-label={t('adminNotifications.deleteAria', {
                              title: name,
                            })}
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => handleDelete(notification.id, name)}
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
        ) : (
          <div className="admin-empty">
            <NotificationsNoneOutlined />
            <h3>{t('adminNotifications.emptyTitle')}</h3>
            <p>{t('adminNotifications.logEmptyText')}</p>
          </div>
        )}
      </section>
    </>
  )
}

export default NotificationsAdminPage

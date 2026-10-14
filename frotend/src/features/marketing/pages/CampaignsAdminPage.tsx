import { useMemo, useState } from 'react'
import {
  Add,
  CampaignOutlined,
  DeleteOutlined,
  EditOutlined,
  SendOutlined,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { deriveCustomerRows } from '../../account/customerRows'
import { useAccountStore } from '../../account/store/useAccountStore'
import { useTranslation } from '../../../hooks/useTranslation'
import { isFutureIso, newMarketingId, nowIso } from '../coupons'
import {
  SEGMENT_DEFAULTS,
  SEGMENT_KINDS,
  segmentRecipients,
  type SegmentKind,
} from '../segments'
import {
  useMarketingStore,
  type Campaign,
  type CampaignChannel,
  type CampaignStatus,
} from '../store/useMarketingStore'

const CHANNELS: CampaignChannel[] = ['in-app', 'email', 'sms']

const statusVariant: Record<CampaignStatus, string> = {
  draft: 'admin-badge--neutral',
  scheduled: 'admin-badge--info',
  sent: 'admin-badge--success',
}

type CampaignDraft = {
  name: string
  channel: CampaignChannel
  segmentKind: SegmentKind
  segmentValue: string
  subject: string
  subject_ar: string
  body: string
  body_ar: string
  link: string
  scheduledAt: string
}

function toLocalInput(iso: string): string {
  if (!iso) return ''
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return ''
  const offset = new Date(time).getTimezoneOffset() * 60000
  return new Date(time - offset).toISOString().slice(0, 16)
}

function fromLocalInput(value: string): string {
  if (!value) return ''
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : ''
}

function emptyDraft(): CampaignDraft {
  return {
    name: '',
    channel: 'in-app',
    segmentKind: 'all',
    segmentValue: SEGMENT_DEFAULTS.all,
    subject: '',
    subject_ar: '',
    body: '',
    body_ar: '',
    link: '',
    scheduledAt: '',
  }
}

function draftFrom(campaign: Campaign): CampaignDraft {
  return {
    name: campaign.name,
    channel: campaign.channel,
    segmentKind: campaign.segment.kind,
    segmentValue: campaign.segment.value ?? SEGMENT_DEFAULTS[campaign.segment.kind],
    subject: campaign.subject,
    subject_ar: campaign.subject_ar,
    body: campaign.body,
    body_ar: campaign.body_ar,
    link: campaign.link,
    scheduledAt: toLocalInput(campaign.scheduledAt),
  }
}

function CampaignsAdminPage() {
  const { t, number, dateTime } = useTranslation()
  const campaigns = useMarketingStore((state) => state.campaigns)
  const messages = useMarketingStore((state) => state.messages)
  const addCampaign = useMarketingStore((state) => state.addCampaign)
  const updateCampaign = useMarketingStore((state) => state.updateCampaign)
  const removeCampaign = useMarketingStore((state) => state.removeCampaign)
  const sendCampaign = useMarketingStore((state) => state.sendCampaign)
  const subscribers = useMarketingStore((state) => state.subscribers)
  const orders = useAccountStore((state) => state.orders)

  const [editing, setEditing] = useState<Campaign | 'new' | null>(null)
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | CampaignStatus>('all')
  const [channelFilter, setChannelFilter] = useState<'all' | CampaignChannel>('all')

  const customers = useMemo(() => deriveCustomerRows(orders), [orders])
  const subscribedList = useMemo(
    () =>
      subscribers
        .filter((subscriber) => subscriber.isSubscribed)
        .map((subscriber) => ({
          email: subscriber.email,
          name: subscriber.name,
        })),
    [subscribers],
  )

  const draftRule = {
    kind: draft.segmentKind,
    value: draft.segmentValue,
  }
  const draftRecipients = segmentRecipients({
    rule: draftRule,
    customers,
    subscribers: subscribedList,
  })

  const visible = campaigns
    .filter((campaign) => {
      if (statusFilter !== 'all' && campaign.status !== statusFilter) return false
      if (channelFilter !== 'all' && campaign.channel !== channelFilter) return false
      return true
    })
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))

  function update<K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setDraft(emptyDraft())
    setFormError('')
    setEditing('new')
  }

  function openEdit(campaign: Campaign) {
    setDraft(draftFrom(campaign))
    setFormError('')
    setEditing(campaign)
  }

  function buildCampaign(previous: Campaign | null): Campaign {
    const scheduledAt = fromLocalInput(draft.scheduledAt)
    const isFuture = isFutureIso(scheduledAt)
    return {
      id: previous?.id ?? newMarketingId('campaign'),
      name: draft.name.trim() || t('admin.campaignUntitled'),
      channel: draft.channel,
      segment: draftRule,
      subject: draft.subject.trim(),
      subject_ar: draft.subject_ar.trim(),
      body: draft.body.trim(),
      body_ar: draft.body_ar.trim(),
      link: draft.link.trim(),
      status: previous?.status === 'sent' ? 'sent' : isFuture ? 'scheduled' : 'draft',
      scheduledAt,
      sentAt: previous?.sentAt ?? '',
      recipients: previous?.recipients ?? 0,
      createdAt: previous?.createdAt ?? nowIso(),
    }
  }

  async function handleSave(send: boolean) {
    if (!draft.subject.trim() && !draft.subject_ar.trim()) {
      setFormError(t('admin.campaignSubjectRequired'))
      return
    }

    const previous = editing && editing !== 'new' ? editing : null
    const campaign = buildCampaign(previous)

    if (previous) {
      await updateCampaign(campaign)
    } else {
      await addCampaign(campaign)
    }

    if (send) {
      const recipients = segmentRecipients({
        rule: campaign.segment,
        customers,
        subscribers: subscribedList,
      })
      await sendCampaign(campaign, recipients)
      setNotice(
        t('admin.campaignSent', {
          count: number(recipients.length),
          name: campaign.name,
        }),
      )
    }

    setEditing(null)
  }

  async function handleSend(campaign: Campaign) {
    const recipients = segmentRecipients({
      rule: campaign.segment,
      customers,
      subscribers: subscribedList,
    })
    await sendCampaign(campaign, recipients)
    setNotice(
      t('admin.campaignSent', {
        count: number(recipients.length),
        name: campaign.name,
      }),
    )
  }

  async function handleDelete(campaign: Campaign) {
    if (!window.confirm(t('admin.campaignDeleteConfirm'))) return
    await removeCampaign(campaign.id)
  }

  async function handleToggleSchedule(campaign: Campaign) {
    if (campaign.status !== 'scheduled') return
    await updateCampaign({ ...campaign, status: 'draft', scheduledAt: '' })
  }

  return (
    <>
      <AdminPageHeader
        description={t('admin.campaignsDescription')}
        eyebrow={t('admin.marketingEyebrow')}
        title={t('admin.navCampaigns')}
        actions={
          <button
            className="admin-btn admin-btn--primary"
            onClick={openCreate}
            type="button"
          >
            <Add /> {t('admin.addCampaign')}
          </button>
        }
      />

      {notice && (
        <div className="admin-status-notice">
          {notice}
          <button onClick={() => setNotice('')} type="button">
            ×
          </button>
        </div>
      )}

      <div className="admin-toolbar">
        <select
          aria-label={t('admin.thStatus')}
          className="admin-toolbar__select"
          onChange={(event) =>
            setStatusFilter(event.target.value as 'all' | CampaignStatus)
          }
          value={statusFilter}
        >
          <option value="all">{t('admin.campaignStatusAll')}</option>
          {(['draft', 'scheduled', 'sent'] as CampaignStatus[]).map((status) => (
            <option key={status} value={status}>
              {t(`campaignStatus.${status}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('admin.campaignChannelLabel')}
          className="admin-toolbar__select"
          onChange={(event) =>
            setChannelFilter(event.target.value as 'all' | CampaignChannel)
          }
          value={channelFilter}
        >
          <option value="all">{t('admin.campaignChannelAll')}</option>
          {CHANNELS.map((channel) => (
            <option key={channel} value={channel}>
              {t(`campaignChannel.${channel}`)}
            </option>
          ))}
        </select>
        <span className="admin-toolbar__count">
          {t('admin.campaignCount', { count: number(visible.length) })}
        </span>
      </div>

      <section className="admin-card">
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thCampaign')}</th>
                  <th>{t('admin.thChannel')}</th>
                  <th>{t('admin.thSegment')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th>{t('admin.thRecipients')}</th>
                  <th>{t('admin.thSendDate')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map((campaign) => (
                  <tr key={campaign.id}>
                    <td data-label={t('admin.thCampaign')}>
                      <div className="admin-table__primary">
                        <strong>{campaign.name}</strong>
                        <span>{campaign.subject}</span>
                      </div>
                    </td>
                    <td data-label={t('admin.thChannel')}>
                      <span className="admin-badge admin-badge--neutral">
                        {t(`campaignChannel.${campaign.channel}`)}
                      </span>
                    </td>
                    <td data-label={t('admin.thSegment')}>
                      <span className="admin-table__muted">
                        {t(`segmentDescribe.${campaign.segment.kind}`, {
                          value:
                            campaign.segment.value ??
                            SEGMENT_DEFAULTS[campaign.segment.kind],
                        })}
                      </span>
                    </td>
                    <td data-label={t('admin.thStatus')}>
                      <span
                        className={`admin-badge ${statusVariant[campaign.status]}`}
                      >
                        {t(`campaignStatus.${campaign.status}`)}
                      </span>
                    </td>
                    <td data-label={t('admin.thRecipients')}>
                      {number(campaign.recipients)}
                    </td>
                    <td data-label={t('admin.thSendDate')}>
                      <span className="admin-table__muted">
                        {campaign.status === 'sent'
                          ? dateTime(campaign.sentAt, 'short')
                          : campaign.status === 'scheduled'
                            ? t('admin.campaignDue', {
                                when: dateTime(campaign.scheduledAt, 'short'),
                              })
                            : t('admin.campaignNotSent')}
                      </span>
                    </td>
                    <td data-label={t('admin.thActions')}>
                      <div className="admin-table__actions">
                        {campaign.status !== 'sent' && (
                          <button
                            aria-label={t('admin.campaignSendNow')}
                            className="admin-icon-btn"
                            onClick={() => void handleSend(campaign)}
                            type="button"
                          >
                            <SendOutlined />
                          </button>
                        )}
                        {campaign.status === 'scheduled' && (
                          <button
                            aria-label={t('admin.campaignCancelSchedule')}
                            className="admin-icon-btn"
                            onClick={() => void handleToggleSchedule(campaign)}
                            type="button"
                          >
                            <CampaignOutlined />
                          </button>
                        )}
                        <button
                          aria-label={t('admin.editCampaign')}
                          className="admin-icon-btn"
                          onClick={() => openEdit(campaign)}
                          type="button"
                        >
                          <EditOutlined />
                        </button>
                        <button
                          aria-label={t('admin.campaignDeleteConfirm')}
                          className="admin-icon-btn admin-icon-btn--danger"
                          onClick={() => void handleDelete(campaign)}
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
            <CampaignOutlined />
            <h3>{t('admin.noCampaignsTitle')}</h3>
            <p>{t('admin.noCampaignsText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openCreate}
              type="button"
            >
              <Add /> {t('admin.addCampaign')}
            </button>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.outboxTitle')}</h2>
            <p>{t('admin.outboxText')}</p>
          </div>
        </div>
        {messages.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thRecipient')}</th>
                  <th>{t('admin.thChannel')}</th>
                  <th>{t('admin.thCampaign')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th>{t('admin.thSendDate')}</th>
                </tr>
              </thead>
              <tbody>
                {messages.slice(0, 25).map((message) => (
                  <tr key={message.id}>
                    <td data-label={t('admin.thRecipient')}>
                      <div className="admin-table__primary">
                        <strong>{message.recipient}</strong>
                        <span>{message.recipientName}</span>
                      </div>
                    </td>
                    <td data-label={t('admin.thChannel')}>
                      {t(`campaignChannel.${message.channel}`)}
                    </td>
                    <td data-label={t('admin.thCampaign')}>
                      <span className="admin-table__muted">
                        {campaigns.find(
                          (campaign) => campaign.id === message.campaignId,
                        )?.name ?? message.campaignId}
                      </span>
                    </td>
                    <td data-label={t('admin.thStatus')}>
                      <span
                        className={`admin-badge ${
                          message.status === 'sent'
                            ? 'admin-badge--success'
                            : message.status === 'failed'
                              ? 'admin-badge--danger'
                              : 'admin-badge--warning'
                        }`}
                      >
                        {t(`messageStatus.${message.status}`)}
                      </span>
                    </td>
                    <td data-label={t('admin.thSendDate')}>
                      <span className="admin-table__muted">
                        {dateTime(message.sentAt || message.createdAt, 'short')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <SendOutlined />
            <h3>{t('admin.outboxEmptyTitle')}</h3>
            <p>{t('admin.outboxEmptyText')}</p>
          </div>
        )}
      </section>

      {editing && (
        <AdminModal
          description={t('admin.campaignModalDescription')}
          onClose={() => setEditing(null)}
          size="lg"
          title={
            editing === 'new'
              ? t('admin.addCampaign')
              : t('admin.editCampaign')
          }
        >
          <form
            className="admin-form"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSave(false)
            }}
          >
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t('admin.campaignNameLabel')}</span>
                <input
                  autoFocus
                  onChange={(event) => update('name', event.target.value)}
                  value={draft.name}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.campaignChannelLabel')}</span>
                <select
                  onChange={(event) =>
                    update('channel', event.target.value as CampaignChannel)
                  }
                  value={draft.channel}
                >
                  {CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {t(`campaignChannel.${channel}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>{t('admin.segmentKindLabel')}</span>
                <select
                  onChange={(event) =>
                    update('segmentKind', event.target.value as SegmentKind)
                  }
                  value={draft.segmentKind}
                >
                  {SEGMENT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`segmentDescribe.${kind}`)}
                    </option>
                  ))}
                </select>
              </label>
              {(draft.segmentKind === 'new' ||
                draft.segmentKind === 'vip' ||
                draft.segmentKind === 'lapsed' ||
                draft.segmentKind === 'city') && (
                <label className="admin-field">
                  <span>
                    {draft.segmentKind === 'vip'
                      ? t('admin.segmentSpendLabel')
                      : draft.segmentKind === 'city'
                        ? t('admin.segmentCityLabel')
                        : t('admin.segmentDaysLabel')}
                  </span>
                  <input
                    onChange={(event) => update('segmentValue', event.target.value)}
                    value={draft.segmentValue}
                  />
                </label>
              )}

              <label className="admin-field">
                <span>
                  {draft.channel === 'in-app'
                    ? t('admin.campaignTitleLabel')
                    : t('admin.campaignSubjectLabel')}
                </span>
                <input
                  onChange={(event) => update('subject', event.target.value)}
                  value={draft.subject}
                />
              </label>
              <label className="admin-field">
                <span>
                  {draft.channel === 'in-app'
                    ? `${t('admin.campaignTitleLabel')} (العربية)`
                    : `${t('admin.campaignSubjectLabel')} (العربية)`}
                </span>
                <input
                  dir="rtl"
                  onChange={(event) => update('subject_ar', event.target.value)}
                  value={draft.subject_ar}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.campaignBodyLabel')}</span>
                <textarea
                  onChange={(event) => update('body', event.target.value)}
                  value={draft.body}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.campaignBodyLabel')} (العربية)</span>
                <textarea
                  dir="rtl"
                  onChange={(event) => update('body_ar', event.target.value)}
                  value={draft.body_ar}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.bannerLinkLabel')}</span>
                <input
                  onChange={(event) => update('link', event.target.value)}
                  placeholder="/products"
                  value={draft.link}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.campaignScheduleLabel')}</span>
                <input
                  onChange={(event) => update('scheduledAt', event.target.value)}
                  type="datetime-local"
                  value={draft.scheduledAt}
                />
              </label>
            </div>

            <p className="admin-field-hint">
              {t('admin.campaignRecipientsHint', {
                count: number(draftRecipients.length),
              })}
            </p>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button
                className="admin-btn"
                onClick={() => setEditing(null)}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="admin-btn" type="submit">
                {t('admin.campaignSaveDraft')}
              </button>
              <button
                className="admin-btn admin-btn--primary"
                onClick={() => void handleSave(true)}
                type="button"
              >
                <SendOutlined /> {t('admin.campaignSendNow')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default CampaignsAdminPage

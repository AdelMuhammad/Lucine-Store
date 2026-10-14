import { useState, type FormEvent } from 'react'
import {
  Add,
  CampaignOutlined,
  DeleteOutlined,
  EditOutlined,
  PowerSettingsNewOutlined,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'
import { newMarketingId, nowIso } from '../coupons'
import {
  bannerState,
  useMarketingStore,
  type Banner,
  type BannerPlacement,
  type BannerState,
} from '../store/useMarketingStore'

const PLACEMENTS: BannerPlacement[] = ['announcement', 'hero', 'popup']

const stateVariant: Record<BannerState, string> = {
  live: 'admin-badge--success',
  scheduled: 'admin-badge--info',
  expired: 'admin-badge--neutral',
  off: 'admin-badge--warning',
}

type BannerDraft = {
  placement: BannerPlacement
  eyebrow: string
  eyebrow_ar: string
  title: string
  title_ar: string
  body: string
  body_ar: string
  ctaLabel: string
  ctaLabel_ar: string
  link: string
  imageUrl: string
  priority: string
  startsAt: string
  endsAt: string
  isActive: boolean
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

function emptyDraft(placement: BannerPlacement): BannerDraft {
  return {
    placement,
    eyebrow: '',
    eyebrow_ar: '',
    title: '',
    title_ar: '',
    body: '',
    body_ar: '',
    ctaLabel: '',
    ctaLabel_ar: '',
    link: '',
    imageUrl: '',
    priority: '0',
    startsAt: '',
    endsAt: '',
    isActive: true,
  }
}

function draftFrom(banner: Banner): BannerDraft {
  return {
    placement: banner.placement,
    eyebrow: banner.eyebrow,
    eyebrow_ar: banner.eyebrow_ar,
    title: banner.title,
    title_ar: banner.title_ar,
    body: banner.body,
    body_ar: banner.body_ar,
    ctaLabel: banner.ctaLabel,
    ctaLabel_ar: banner.ctaLabel_ar,
    link: banner.link,
    imageUrl: banner.imageUrl,
    priority: String(banner.priority),
    startsAt: toLocalInput(banner.startsAt),
    endsAt: toLocalInput(banner.endsAt),
    isActive: banner.isActive,
  }
}

function BannersAdminPage() {
  const { t, localized, number, date } = useTranslation()
  const banners = useMarketingStore((state) => state.banners)
  const addBanner = useMarketingStore((state) => state.addBanner)
  const updateBanner = useMarketingStore((state) => state.updateBanner)
  const removeBanner = useMarketingStore((state) => state.removeBanner)

  const [editing, setEditing] = useState<Banner | 'new' | null>(null)
  const [draft, setDraft] = useState<BannerDraft>(() => emptyDraft('hero'))
  const [formError, setFormError] = useState('')
  const [placementFilter, setPlacementFilter] = useState<'all' | BannerPlacement>(
    'all',
  )

  const visible = banners
    .filter(
      (banner) =>
        placementFilter === 'all' || banner.placement === placementFilter,
    )
    .sort((first, second) => second.priority - first.priority)

  function update<K extends keyof BannerDraft>(key: K, value: BannerDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setDraft(emptyDraft(placementFilter === 'all' ? 'hero' : placementFilter))
    setFormError('')
    setEditing('new')
  }

  function openEdit(banner: Banner) {
    setDraft(draftFrom(banner))
    setFormError('')
    setEditing(banner)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!draft.title.trim() && !draft.title_ar.trim()) {
      setFormError(t('admin.bannerTitleRequired'))
      return
    }

    const previous = editing && editing !== 'new' ? editing : null
    const banner: Banner = {
      id: previous?.id ?? newMarketingId('banner'),
      placement: draft.placement,
      eyebrow: draft.eyebrow.trim(),
      eyebrow_ar: draft.eyebrow_ar.trim(),
      title: draft.title.trim(),
      title_ar: draft.title_ar.trim(),
      body: draft.body.trim(),
      body_ar: draft.body_ar.trim(),
      ctaLabel: draft.ctaLabel.trim(),
      ctaLabel_ar: draft.ctaLabel_ar.trim(),
      link: draft.link.trim(),
      imageUrl: draft.imageUrl.trim(),
      priority: Math.floor(Number(draft.priority) || 0),
      startsAt: fromLocalInput(draft.startsAt),
      endsAt: fromLocalInput(draft.endsAt),
      isActive: draft.isActive,
      createdAt: previous?.createdAt ?? nowIso(),
    }

    if (previous) {
      await updateBanner(banner)
    } else {
      await addBanner(banner)
    }
    setEditing(null)
  }

  async function handleDelete(banner: Banner) {
    if (!window.confirm(t('admin.bannerDeleteConfirm'))) return
    await removeBanner(banner.id)
  }

  async function handleToggle(banner: Banner) {
    await updateBanner({ ...banner, isActive: !banner.isActive })
  }

  return (
    <>
      <AdminPageHeader
        description={t('admin.bannersDescription')}
        eyebrow={t('admin.marketingEyebrow')}
        title={t('admin.navBanners')}
        actions={
          <button
            className="admin-btn admin-btn--primary"
            onClick={openCreate}
            type="button"
          >
            <Add /> {t('admin.addBanner')}
          </button>
        }
      />

      <div className="admin-toolbar">
        <select
          aria-label={t('admin.bannerPlacementLabel')}
          className="admin-toolbar__select"
          onChange={(event) =>
            setPlacementFilter(event.target.value as 'all' | BannerPlacement)
          }
          value={placementFilter}
        >
          <option value="all">{t('admin.bannerPlacementAll')}</option>
          {PLACEMENTS.map((placement) => (
            <option key={placement} value={placement}>
              {t(`bannerPlacement.${placement}`)}
            </option>
          ))}
        </select>
        <span className="admin-toolbar__count">
          {t('admin.bannerCount', { count: number(visible.length) })}
        </span>
      </div>

      <section className="admin-card">
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thTitle')}</th>
                  <th>{t('admin.thPlacement')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th>{t('admin.thWindow')}</th>
                  <th>{t('admin.thPriority')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map((banner) => {
                  const state = bannerState(banner)
                  return (
                    <tr key={banner.id}>
                      <td data-label={t('admin.thTitle')}>
                        <div className="admin-table__primary">
                          <strong>{localized(banner.title, banner.title_ar)}</strong>
                          <span>{localized(banner.body, banner.body_ar)}</span>
                        </div>
                      </td>
                      <td data-label={t('admin.thPlacement')}>
                        <span className="admin-badge admin-badge--neutral">
                          {t(`bannerPlacement.${banner.placement}`)}
                        </span>
                      </td>
                      <td data-label={t('admin.thStatus')}>
                        <span className={`admin-badge ${stateVariant[state]}`}>
                          {t(`bannerState.${state}`)}
                        </span>
                      </td>
                      <td data-label={t('admin.thWindow')}>
                        <span className="admin-table__muted">
                          {banner.startsAt || banner.endsAt
                            ? t('admin.couponWindowRange', {
                                from: banner.startsAt
                                  ? date(banner.startsAt, 'short')
                                  : t('admin.couponNoStart'),
                                to: banner.endsAt
                                  ? date(banner.endsAt, 'short')
                                  : t('admin.couponNoEnd'),
                              })
                            : t('admin.couponAlwaysOn')}
                        </span>
                      </td>
                      <td data-label={t('admin.thPriority')}>
                        {number(banner.priority)}
                      </td>
                      <td data-label={t('admin.thActions')}>
                        <div className="admin-table__actions">
                          <button
                            aria-label={t(
                              banner.isActive
                                ? 'admin.couponPause'
                                : 'admin.couponActivate',
                            )}
                            className="admin-icon-btn"
                            onClick={() => void handleToggle(banner)}
                            type="button"
                          >
                            <PowerSettingsNewOutlined />
                          </button>
                          <button
                            aria-label={t('admin.editBanner')}
                            className="admin-icon-btn"
                            onClick={() => openEdit(banner)}
                            type="button"
                          >
                            <EditOutlined />
                          </button>
                          <button
                            aria-label={t('admin.bannerDeleteConfirm')}
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => void handleDelete(banner)}
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
            <CampaignOutlined />
            <h3>{t('admin.noBannersTitle')}</h3>
            <p>{t('admin.noBannersText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openCreate}
              type="button"
            >
              <Add /> {t('admin.addBanner')}
            </button>
          </div>
        )}
      </section>

      {editing && (
        <AdminModal
          description={t('admin.bannerModalDescription')}
          onClose={() => setEditing(null)}
          size="lg"
          title={
            editing === 'new' ? t('admin.addBannerTitle') : t('admin.editBanner')
          }
        >
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t('admin.bannerPlacementLabel')}</span>
                <select
                  onChange={(event) =>
                    update('placement', event.target.value as BannerPlacement)
                  }
                  value={draft.placement}
                >
                  {PLACEMENTS.map((placement) => (
                    <option key={placement} value={placement}>
                      {t(`bannerPlacement.${placement}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>{t('admin.thPriority')}</span>
                <input
                  onChange={(event) => update('priority', event.target.value)}
                  type="number"
                  value={draft.priority}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.bannerEyebrowLabel')}</span>
                <input
                  onChange={(event) => update('eyebrow', event.target.value)}
                  value={draft.eyebrow}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.bannerEyebrowLabel')} (العربية)</span>
                <input
                  dir="rtl"
                  onChange={(event) => update('eyebrow_ar', event.target.value)}
                  value={draft.eyebrow_ar}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.titleLabel')}</span>
                <input
                  onChange={(event) => update('title', event.target.value)}
                  value={draft.title}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.titleLabel')} (العربية)</span>
                <input
                  dir="rtl"
                  onChange={(event) => update('title_ar', event.target.value)}
                  value={draft.title_ar}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.bannerBodyLabel')}</span>
                <textarea
                  onChange={(event) => update('body', event.target.value)}
                  value={draft.body}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.bannerBodyLabel')} (العربية)</span>
                <textarea
                  dir="rtl"
                  onChange={(event) => update('body_ar', event.target.value)}
                  value={draft.body_ar}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.bannerCtaLabel')}</span>
                <input
                  onChange={(event) => update('ctaLabel', event.target.value)}
                  value={draft.ctaLabel}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.bannerCtaLabel')} (العربية)</span>
                <input
                  dir="rtl"
                  onChange={(event) => update('ctaLabel_ar', event.target.value)}
                  value={draft.ctaLabel_ar}
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
                <span>{t('admin.bannerImageLabel')}</span>
                <input
                  onChange={(event) => update('imageUrl', event.target.value)}
                  placeholder="https://…"
                  value={draft.imageUrl}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.couponStartsLabel')}</span>
                <input
                  onChange={(event) => update('startsAt', event.target.value)}
                  type="datetime-local"
                  value={draft.startsAt}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.couponEndsLabel')}</span>
                <input
                  onChange={(event) => update('endsAt', event.target.value)}
                  type="datetime-local"
                  value={draft.endsAt}
                />
              </label>

              <div className="admin-field admin-field--full">
                <span>{t('admin.couponOptionsLabel')}</span>
                <label className="admin-check">
                  <input
                    checked={draft.isActive}
                    onChange={(event) => update('isActive', event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t('admin.couponActiveLabel')}</span>
                </label>
              </div>
            </div>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button
                className="admin-btn"
                onClick={() => setEditing(null)}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="admin-btn admin-btn--primary" type="submit">
                {editing === 'new'
                  ? t('admin.addBanner')
                  : t('common.saveChanges')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default BannersAdminPage

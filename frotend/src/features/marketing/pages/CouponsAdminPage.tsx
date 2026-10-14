import { useMemo, useState, type FormEvent } from 'react'
import {
  Add,
  DeleteOutlined,
  EditOutlined,
  LocalOfferOutlined,
  PowerSettingsNewOutlined,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useCategoryStore } from '../../products/store/useCategoryStore'
import { useProductStore } from '../../products/store/useProductStore'
import { useTranslation } from '../../../hooks/useTranslation'
import {
  COUPON_KINDS,
  COUPON_SCOPES,
  couponStatus,
  couponSummary,
  normalizeCouponCode,
  nowIso,
  type CouponStatus,
} from '../coupons'
import {
  useCouponStore,
  type Coupon,
  type CouponKind,
  type CouponScope,
} from '../store/useCouponStore'

/** Everything the modal edits, kept as strings so inputs stay controlled. */
type CouponDraft = {
  code: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  kind: CouponKind
  value: string
  minSubtotal: string
  startsAt: string
  endsAt: string
  usageLimit: string
  perCustomerLimit: string
  firstOrderOnly: boolean
  scope: CouponScope
  scopeIds: string[]
  isActive: boolean
}

const statusVariant: Record<CouponStatus, string> = {
  active: 'admin-badge--success',
  scheduled: 'admin-badge--info',
  expired: 'admin-badge--neutral',
  off: 'admin-badge--warning',
  exhausted: 'admin-badge--danger',
}

/** ISO timestamp → value for a `datetime-local` input, in local time. */
function toLocalInput(iso: string): string {
  if (!iso) return ''
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return ''
  const offset = new Date(time).getTimezoneOffset() * 60000
  return new Date(time - offset).toISOString().slice(0, 16)
}

/** `datetime-local` value → ISO timestamp. */
function fromLocalInput(value: string): string {
  if (!value) return ''
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : ''
}

function emptyDraft(): CouponDraft {
  return {
    code: '',
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    kind: 'percent',
    value: '10',
    minSubtotal: '0',
    startsAt: '',
    endsAt: '',
    usageLimit: '',
    perCustomerLimit: '1',
    firstOrderOnly: false,
    scope: 'all',
    scopeIds: [],
    isActive: true,
  }
}

function draftFrom(coupon: Coupon): CouponDraft {
  return {
    code: coupon.code,
    title: coupon.title,
    title_ar: coupon.title_ar,
    description: coupon.description,
    description_ar: coupon.description_ar,
    kind: coupon.kind,
    value: String(coupon.value),
    minSubtotal: String(coupon.minSubtotal),
    startsAt: toLocalInput(coupon.startsAt),
    endsAt: toLocalInput(coupon.endsAt),
    usageLimit: coupon.usageLimit === null ? '' : String(coupon.usageLimit),
    perCustomerLimit: String(coupon.perCustomerLimit),
    firstOrderOnly: coupon.firstOrderOnly,
    scope: coupon.scope,
    scopeIds: [...coupon.scopeIds],
    isActive: coupon.isActive,
  }
}

function CouponsAdminPage() {
  const { t, localized, number, currency, date } = useTranslation()
  const coupons = useCouponStore((state) => state.coupons)
  const redemptions = useCouponStore((state) => state.redemptions)
  const addCoupon = useCouponStore((state) => state.addCoupon)
  const updateCoupon = useCouponStore((state) => state.updateCoupon)
  const removeCoupon = useCouponStore((state) => state.removeCoupon)
  const categories = useCategoryStore((state) => state.categories)
  const products = useProductStore((state) => state.products)

  const [editing, setEditing] = useState<Coupon | 'new' | null>(null)
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | CouponStatus>('all')
  const [kindFilter, setKindFilter] = useState<'all' | CouponKind>('all')

  const redemptionStats = useMemo(() => {
    const map = new Map<string, { count: number; discount: number }>()
    redemptions.forEach((redemption) => {
      const current = map.get(redemption.couponCode) ?? { count: 0, discount: 0 }
      map.set(redemption.couponCode, {
        count: current.count + 1,
        discount: current.discount + redemption.discount,
      })
    })
    return map
  }, [redemptions])

  const visible = coupons.filter((coupon) => {
    if (kindFilter !== 'all' && coupon.kind !== kindFilter) return false
    if (statusFilter !== 'all' && couponStatus(coupon) !== statusFilter) {
      return false
    }
    const term = search.trim().toLocaleLowerCase()
    if (!term) return true
    return (
      coupon.code.toLocaleLowerCase().includes(term) ||
      coupon.title.toLocaleLowerCase().includes(term) ||
      coupon.title_ar.includes(term)
    )
  })

  function update<K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setDraft(emptyDraft())
    setFormError('')
    setEditing('new')
  }

  function openEdit(coupon: Coupon) {
    setDraft(draftFrom(coupon))
    setFormError('')
    setEditing(coupon)
  }

  function toggleScopeId(id: string) {
    setDraft((current) => ({
      ...current,
      scopeIds: current.scopeIds.includes(id)
        ? current.scopeIds.filter((item) => item !== id)
        : [...current.scopeIds, id],
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = normalizeCouponCode(draft.code)

    if (!code) {
      setFormError(t('admin.couponCodeRequired'))
      return
    }
    if (draft.kind !== 'free-shipping' && Number(draft.value) <= 0) {
      setFormError(t('admin.couponValueRequired'))
      return
    }

    const duplicate = coupons.some(
      (coupon) =>
        coupon.code === code &&
        (editing === 'new' || editing?.code !== code),
    )
    if (duplicate) {
      setFormError(t('admin.couponCodeTaken'))
      return
    }

    const previous = editing && editing !== 'new' ? editing : null
    const coupon: Coupon = {
      code,
      title: draft.title.trim(),
      title_ar: draft.title_ar.trim(),
      description: draft.description.trim(),
      description_ar: draft.description_ar.trim(),
      kind: draft.kind,
      value: draft.kind === 'free-shipping' ? 0 : Number(draft.value) || 0,
      minSubtotal: Math.max(0, Number(draft.minSubtotal) || 0),
      startsAt: fromLocalInput(draft.startsAt),
      endsAt: fromLocalInput(draft.endsAt),
      usageLimit:
        draft.usageLimit.trim() === ''
          ? null
          : Math.max(0, Math.floor(Number(draft.usageLimit) || 0)),
      perCustomerLimit: Math.max(0, Math.floor(Number(draft.perCustomerLimit) || 0)),
      firstOrderOnly: draft.firstOrderOnly,
      scope: draft.scope,
      scopeIds: draft.scope === 'all' ? [] : draft.scopeIds,
      isActive: draft.isActive,
      usedCount: previous?.usedCount ?? 0,
      createdAt: previous?.createdAt ?? nowIso(),
    }

    if (previous) {
      await updateCoupon(coupon, previous.code)
    } else {
      await addCoupon(coupon)
    }
    setEditing(null)
  }

  async function handleDelete(coupon: Coupon) {
    if (!window.confirm(t('admin.deleteCouponConfirm', { code: coupon.code }))) {
      return
    }
    await removeCoupon(coupon.code)
  }

  async function handleToggleActive(coupon: Coupon) {
    await updateCoupon({ ...coupon, isActive: !coupon.isActive })
  }

  const scopePool =
    draft.scope === 'categories'
      ? categories.map((category) => ({
          id: category.name,
          label: localized(category.name, category.name_ar),
        }))
      : products.map((product) => ({
          id: product.id,
          label: localized(product.name, product.name_ar),
        }))

  return (
    <>
      <AdminPageHeader
        description={t('admin.couponsDescription')}
        eyebrow={t('admin.marketingEyebrow')}
        title={t('admin.navCoupons')}
        actions={
          <button
            className="admin-btn admin-btn--primary"
            onClick={openCreate}
            type="button"
          >
            <Add /> {t('admin.addCoupon')}
          </button>
        }
      />

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <LocalOfferOutlined />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.couponSearchPlaceholder')}
            value={search}
          />
        </label>
        <select
          aria-label={t('admin.couponFilterStatus')}
          className="admin-toolbar__select"
          onChange={(event) =>
            setStatusFilter(event.target.value as 'all' | CouponStatus)
          }
          value={statusFilter}
        >
          <option value="all">{t('admin.couponStatusAll')}</option>
          {(['active', 'scheduled', 'expired', 'exhausted', 'off'] as CouponStatus[]).map(
            (status) => (
              <option key={status} value={status}>
                {t(`couponStatus.${status}`)}
              </option>
            ),
          )}
        </select>
        <select
          aria-label={t('admin.couponFilterKind')}
          className="admin-toolbar__select"
          onChange={(event) =>
            setKindFilter(event.target.value as 'all' | CouponKind)
          }
          value={kindFilter}
        >
          <option value="all">{t('admin.couponKindAll')}</option>
          {COUPON_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`couponKind.${kind}`)}
            </option>
          ))}
        </select>
        <span className="admin-toolbar__count">
          {t('admin.couponCount', { count: number(visible.length) })}
        </span>
      </div>

      <section className="admin-card">
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.thCode')}</th>
                  <th>{t('admin.thOffer')}</th>
                  <th>{t('admin.thStatus')}</th>
                  <th>{t('admin.thWindow')}</th>
                  <th>{t('admin.thUsage')}</th>
                  <th>{t('admin.thScope')}</th>
                  <th aria-label={t('admin.thActions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map((coupon) => {
                  const status = couponStatus(coupon)
                  const stats = redemptionStats.get(coupon.code)
                  const summary = couponSummary(coupon)
                  return (
                    <tr key={coupon.code}>
                      <td data-label={t('admin.thCode')}>
                        <div className="admin-table__primary">
                          <strong>{coupon.code}</strong>
                          <span>{localized(coupon.title, coupon.title_ar)}</span>
                        </div>
                      </td>
                      <td data-label={t('admin.thOffer')}>
                        <span className="admin-badge admin-badge--warning">
                          {t(summary.key, {
                            value:
                              coupon.kind === 'fixed'
                                ? currency(summary.value)
                                : number(summary.value),
                          })}
                        </span>
                      </td>
                      <td data-label={t('admin.thStatus')}>
                        <span className={`admin-badge ${statusVariant[status]}`}>
                          {t(`couponStatus.${status}`)}
                        </span>
                      </td>
                      <td data-label={t('admin.thWindow')}>
                        <span className="admin-table__muted">
                          {coupon.startsAt || coupon.endsAt
                            ? t('admin.couponWindowRange', {
                                from: coupon.startsAt
                                  ? date(coupon.startsAt, 'short')
                                  : t('admin.couponNoStart'),
                                to: coupon.endsAt
                                  ? date(coupon.endsAt, 'short')
                                  : t('admin.couponNoEnd'),
                              })
                            : t('admin.couponAlwaysOn')}
                        </span>
                      </td>
                      <td data-label={t('admin.thUsage')}>
                        <span className="admin-table__muted">
                          {t('admin.couponUsageValue', {
                            used: number(coupon.usedCount),
                            limit:
                              coupon.usageLimit === null
                                ? '∞'
                                : number(coupon.usageLimit),
                          })}
                          {stats
                            ? ` · ${t('admin.couponDiscountGiven', {
                                amount: currency(stats.discount),
                              })}`
                            : ''}
                        </span>
                      </td>
                      <td data-label={t('admin.thScope')}>
                        <span className="admin-table__muted">
                          {coupon.scope === 'all'
                            ? t('couponScope.all')
                            : `${t(`couponScope.${coupon.scope}`)} (${number(
                                coupon.scopeIds.length,
                              )})`}
                        </span>
                      </td>
                      <td data-label={t('admin.thActions')}>
                        <div className="admin-table__actions">
                          <button
                            aria-label={t(
                              coupon.isActive
                                ? 'admin.couponPause'
                                : 'admin.couponActivate',
                            )}
                            className="admin-icon-btn"
                            onClick={() => void handleToggleActive(coupon)}
                            type="button"
                          >
                            <PowerSettingsNewOutlined />
                          </button>
                          <button
                            aria-label={t('admin.editCouponTitle')}
                            className="admin-icon-btn"
                            onClick={() => openEdit(coupon)}
                            type="button"
                          >
                            <EditOutlined />
                          </button>
                          <button
                            aria-label={t('admin.deleteCouponConfirm', {
                              code: coupon.code,
                            })}
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => void handleDelete(coupon)}
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
            <LocalOfferOutlined />
            <h3>{t('admin.noCouponsTitle')}</h3>
            <p>{t('admin.noCouponsText')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={openCreate}
              type="button"
            >
              <Add /> {t('admin.addCoupon')}
            </button>
          </div>
        )}
      </section>

      {editing && (
        <AdminModal
          description={t('admin.couponModalDescription')}
          onClose={() => setEditing(null)}
          size="lg"
          title={
            editing === 'new'
              ? t('admin.addCouponTitle')
              : t('admin.editCouponTitle')
          }
        >
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t('admin.couponCodeLabel')}</span>
                <input
                  autoFocus
                  onChange={(event) => update('code', event.target.value)}
                  placeholder="LUCINE10"
                  value={draft.code}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.couponKindLabel')}</span>
                <select
                  onChange={(event) =>
                    update('kind', event.target.value as CouponKind)
                  }
                  value={draft.kind}
                >
                  {COUPON_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`couponKind.${kind}`)}
                    </option>
                  ))}
                </select>
              </label>
              {draft.kind !== 'free-shipping' && (
                <label className="admin-field">
                  <span>
                    {draft.kind === 'percent'
                      ? t('admin.discountPercentLabel')
                      : t('admin.couponAmountLabel')}
                  </span>
                  <input
                    max={draft.kind === 'percent' ? '100' : undefined}
                    min="0"
                    onChange={(event) => update('value', event.target.value)}
                    type="number"
                    value={draft.value}
                  />
                </label>
              )}
              <label className="admin-field">
                <span>{t('admin.couponMinSubtotalLabel')}</span>
                <input
                  min="0"
                  onChange={(event) => update('minSubtotal', event.target.value)}
                  type="number"
                  value={draft.minSubtotal}
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

              <label className="admin-field">
                <span>{t('admin.couponUsageLimitLabel')}</span>
                <input
                  min="0"
                  onChange={(event) => update('usageLimit', event.target.value)}
                  placeholder={t('admin.couponUnlimited')}
                  type="number"
                  value={draft.usageLimit}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.couponPerCustomerLabel')}</span>
                <input
                  min="0"
                  onChange={(event) =>
                    update('perCustomerLimit', event.target.value)
                  }
                  type="number"
                  value={draft.perCustomerLimit}
                />
              </label>

              <label className="admin-field">
                <span>{t('admin.couponScopeLabel')}</span>
                <select
                  onChange={(event) =>
                    update('scope', event.target.value as CouponScope)
                  }
                  value={draft.scope}
                >
                  {COUPON_SCOPES.map((scope) => (
                    <option key={scope} value={scope}>
                      {t(`couponScope.${scope}`)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-field">
                <span>{t('admin.couponOptionsLabel')}</span>
                <label className="admin-check">
                  <input
                    checked={draft.firstOrderOnly}
                    onChange={(event) =>
                      update('firstOrderOnly', event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{t('admin.couponFirstOrderOnly')}</span>
                </label>
                <label className="admin-check">
                  <input
                    checked={draft.isActive}
                    onChange={(event) => update('isActive', event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t('admin.couponActiveLabel')}</span>
                </label>
              </div>

              {draft.scope !== 'all' && (
                <div className="admin-field admin-field--full">
                  <span>
                    {draft.scope === 'categories'
                      ? t('admin.couponPickCategories')
                      : t('admin.couponPickProducts')}
                  </span>
                  <div className="admin-chip-group">
                    {scopePool.map((option) => (
                      <button
                        className={`admin-chip${
                          draft.scopeIds.includes(option.id) ? ' is-selected' : ''
                        }`}
                        key={option.id}
                        onClick={() => toggleScopeId(option.id)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="admin-field admin-field--full">
                <span>{t('admin.titleLabel')}</span>
                <input
                  onChange={(event) => update('title', event.target.value)}
                  placeholder={t('admin.titlePlaceholder')}
                  value={draft.title}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>{t('admin.titleLabel')} (العربية)</span>
                <input
                  dir="rtl"
                  onChange={(event) => update('title_ar', event.target.value)}
                  value={draft.title_ar}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>{t('admin.descriptionLabel')}</span>
                <textarea
                  onChange={(event) => update('description', event.target.value)}
                  placeholder={t('admin.descriptionPlaceholder')}
                  value={draft.description}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>{t('admin.descriptionLabel')} (العربية)</span>
                <textarea
                  dir="rtl"
                  onChange={(event) => update('description_ar', event.target.value)}
                  value={draft.description_ar}
                />
              </label>
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
                  ? t('admin.createCoupon')
                  : t('common.saveChanges')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default CouponsAdminPage

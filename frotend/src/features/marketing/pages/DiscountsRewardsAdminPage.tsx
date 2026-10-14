// @ts-nocheck
import { useMemo, useState } from 'react'
import {
  AddOutlined,
  DeleteOutlined,
  EditOutlined,
  LocalOfferOutlined,
  SearchOutlined,
} from '@mui/icons-material'
import AdminModal from '../../admin/components/AdminModal'
import AdminPageHeader from '../../admin/components/AdminPageHeader'
import { useTranslation } from '../../../hooks/useTranslation'
import { useCouponStore } from '../store/useCouponStore'

type DiscountsRewardsSection = 'coupons' | 'rewards' | 'reports'

function DiscountsRewardsAdminPage() {
  const { t } = useTranslation()
  const coupons = useCouponStore((state) => state.coupons)
  const [section, setSection] = useState<DiscountsRewardsSection>('coupons')
  const [query, setQuery] = useState('')
  const [formTarget, setFormTarget] = useState<'new' | string | null>(null)
  const [draft, setDraft] = useState({
    code: '',
    title: '',
    title_ar: '',
    kind: 'percent',
    value: '',
    minSubtotal: '',
    startsAt: '',
    endsAt: '',
    usageLimit: '',
    perCustomerLimit: '',
    scope: 'all',
    scopeIds: [] as string[],
    isActive: true,
  })

  // KPIs
  const kpis = useMemo(() => ({
    activeCoupons: coupons.filter((c) => c.isActive).length,
    totalCoupons: coupons.length,
  }), [coupons])

  // --- Section renderers ---

  // Coupons
  const visibleCoupons = coupons.filter(
    (c) =>
      !query ||
      c.code.toLowerCase().includes(query.toLowerCase()) ||
      c.title.toLowerCase().includes(query.toLowerCase())
  )

  function renderCoupons() {
    function addCoupon() {
      setFormTarget('new')
      setDraft({
        code: '',
        title: '',
        title_ar: '',
        kind: 'percent',
        value: '',
        minSubtotal: '',
        startsAt: '',
        endsAt: '',
        usageLimit: '',
        perCustomerLimit: '',
        scope: 'all',
        scopeIds: [],
        isActive: true,
      })
    }

    function handleSubmit() {
      if (!draft.code?.trim()) return
      if (formTarget === 'new') {
        useCouponStore.getState().addCoupon({
          code: draft.code,
          title: draft.title,
          title_ar: draft.title_ar,
          description: '',
          description_ar: '',
          kind: draft.kind as 'percent' | 'fixed',
          value: draft.value ? Number(draft.value) : 0,
          minSubtotal: draft.minSubtotal ? Number(draft.minSubtotal) : 0,
          startsAt: draft.startsAt,
          endsAt: draft.endsAt,
          usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null,
          perCustomerLimit: draft.perCustomerLimit ? Number(draft.perCustomerLimit) : 0,
          firstOrderOnly: false,
          scope: draft.scope === 'all' ? 'all' as const : 'categories' as const,
          scopeIds: draft.scopeIds,
          isActive: draft.isActive,
          createdAt: new Date().toISOString(),
          usedCount: 0,
        })
      } else {
        useCouponStore.getState().updateCoupon({
          ...draft,
          code: formTarget,
        })
      }
      setFormTarget(null)
    }

    function deleteCoupon(code: string) {
      if (window.confirm('Delete this coupon?')) {
        useCouponStore.getState().removeCoupon(code)
      }
    }

    return (
      <div>
        <h3>{t('admin.coupons')}</h3>
        <div>
          <input
            onChange={(e) => setQuery(e.target.value)}
            value={query}
            placeholder={t('admin.search')}
            style={{ marginBottom: 8, padding: 4, width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <button onClick={addCoupon} style={{ marginRight: 8 }}>
            {t('admin.add')}
          </button>
          <button onClick={handleSubmit} type="button" style={{ marginRight: 8 }}>
            {formTarget ? t('admin.save') : t('admin.add')}
          </button>
        </div>

        <div>
          {visibleCoupons.map((c) => (
            <div
              key={c.code}
              style={{
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                <strong>{c.code}</strong> {c.title}
              </span>
              <span>
                {c.isActive ? t('admin.active') : t('admin.inactive')}
                <button
                  className="admin-icon-btn--danger admin-icon-btn--sm"
                  onClick={() => deleteCoupon(c.code)}
                  type="button"
                >
                  {t('admin.delete')}
                </button>
              </span>
            </div>
          ))}
          {visibleCoupons.length === 0 && (
            <p>{t('admin.noData')}</p>
          )}
        </div>
      </div>
    )
  }

  // Rewards - shows loyalty/referral concepts
  function renderRewards() {
    return (
      <div>
        <h3>{t('admin.rewards')}</h3>
        <p>{t('admin.rewardsDescription')}</p>
        <div>
          <span>{t('admin.activeCoupons', { count: kpis.activeCoupons })}</span>
          <span>{t('admin.outOf', { count: kpis.totalCoupons })}</span>
        </div>
      </div>
    )
  }

  // Reports
  function renderReports() {
    return (
      <div>
        <h3>{t('admin.reports')}</h3>
        <p>{t('admin.discountsRewardsReport')}</p>
      </div>
    )
  }

  return (
    <>
      <AdminPageHeader
        eyebrow={t('admin.discountsRewards')}
        title={t('admin.discountsRewardsTitle')}
        description={t('admin.discountsRewardsDescription')}
        actions={
          < >
            <button
              className="admin-btn admin-btn--primary"
              onClick={() => setSection('coupons')}
              type="button"
            >
              {t('admin.coupons')}
            </button>
            <button
              className="admin-btn admin-btn--primary"
              onClick={() => setSection('rewards')}
              type="button"
            >
              {t('admin.rewards')}
            </button>
            <button
              className="admin-btn admin-btn--primary"
              onClick={() => setSection('reports')}
              type="button"
            >
              {t('admin.reports')}
            </button>
          </>
        }
      />

      <div className="admin-toolbar">
        <span>
          {t('admin.totalCoupons', { count: kpis.totalCoupons })} |
          {t('admin.active', { count: kpis.activeCoupons })}
        </span>
      </div>

      <section className="admin-card">
        {section === 'coupons' && renderCoupons()}
        {section === 'rewards' && renderRewards()}
        {section === 'reports' && renderReports()}
      </section>

      {formTarget && (
        <AdminModal
          description={t('admin.discountRewardDetails')}
          onClose={() => {
            setFormTarget(null)
            closeForm()
          }}
          size="lg"
          title={formTarget === 'new' ? t('admin.add') : t('admin.edit')}
        >
          <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit() }}>
            <label>
              <span>{t('admin.code')}</span>
              <input
                onChange={(e) => setDraft({ ...draft, code: e.target.value }) }
                value={draft.code}
              />
            </label>
            <label>
              <span>{t('admin.title')}</span>
              <input
                onChange={(e) => setDraft({ ...draft, title: e.target.value }) }
                value={draft.title}
              />
            </label>
            <label>
              <span>{t('admin.titleArabic')}</span>
              <input
                dir="rtl"
                onChange={(e) => setDraft({ ...draft, title_ar: e.target.value }) }
                value={draft.title_ar}
              />
            </label>
            <label>
              <span>{t('admin.kind')}</span>
              <select
                onChange={(e) => setDraft({ ...draft, kind: e.target.value }) }
                value={draft.kind}
              >
                <option value="percent">{t('admin.percentage')}</option>
                <option value="fixed">{t('admin.fixedAmount')}</option>
              </select>
            </label>
            <label>
              <span>{t('admin.value')}</span>
              <input
                onChange={(e) => setDraft({ ...draft, value: e.target.value }) }
                value={draft.value}
              />
            </label>
            <label>
              <span>{t('admin.minSubtotal')}</span>
              <input
                onChange={(e) => setDraft({ ...draft, minSubtotal: e.target.value }) }
                value={draft.minSubtotal}
              />
            </label>
            <label>
              <span>{t('admin.startsAt')}</span>
              <input
                type="datetime-local"
                onChange={(e) => setDraft({ ...draft, startsAt: e.target.value }) }
                value={draft.startsAt}
              />
            </label>
            <label>
              <span>{t('admin.endsAt')}</span>
              <input
                type="datetime-local"
                onChange={(e) => setDraft({ ...draft, endsAt: e.target.value }) }
                value={draft.endsAt}
              />
            </label>
            <label>
              <span>{t('admin.usageLimit')}</span>
              <input
                onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value }) }
                value={draft.usageLimit}
              />
            </label>
            <label>
              <span>{t('admin.perCustomerLimit')}</span>
              <input
                onChange={(e) => setDraft({ ...draft, perCustomerLimit: e.target.value }) }
                value={draft.perCustomerLimit}
              />
            </label>
            <label>
              <span>{t('admin.scope')}</span>
              <select
                onChange={(e) => setDraft({ ...draft, scope: e.target.value }) }
                value={draft.scope}
              >
                <option value="all">{t('admin.all')}</option>
                <option value="specific">{t('admin.specific')}</option>
              </select>
            </label>
            <label>
              <span>{t('admin.isActive')}</span>
              <input
                checked={draft.isActive}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked }) }
                type="checkbox"
              />
            </label>

            <div>
              <button type="button" onClick={() => setFormTarget(null)}>
                {t('admin.cancel')}
              </button>
              <button className="admin-btn admin-btn--primary" type="submit">
                {t('admin.save')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default DiscountsRewardsAdminPage
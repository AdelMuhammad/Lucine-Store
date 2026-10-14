import { useState, type FormEvent } from 'react'
import {
  CheckCircleOutlined,
  DescriptionOutlined,
  PercentOutlined,
  ReceiptLongOutlined,
  StorefrontOutlined,
} from '@mui/icons-material'
import AdminPageHeader from '../components/AdminPageHeader'
import {
  normalizeMarketingSettings,
  useMarketingStore,
} from '../../marketing/store/useMarketingStore'
import { useTranslation } from '../../../hooks/useTranslation'

type Draft = {
  profitMargin: number
  sellerName: string
  sellerAddress: string
  sellerPhone: string
  sellerEmail: string
  sellerWebsite: string
  taxNumber: string
  footer: string
}

function SettingsAdminPage() {
  const { t, number } = useTranslation()
  const settings = useMarketingStore((state) => state.settings)
  const saveSettings = useMarketingStore((state) => state.saveSettings)
  const normalized = normalizeMarketingSettings(settings)

  const [draft, setDraft] = useState<Draft>({
    profitMargin: normalized.profitMargin,
    sellerName: normalized.invoice.sellerName,
    sellerAddress: normalized.invoice.sellerAddress,
    sellerPhone: normalized.invoice.sellerPhone,
    sellerEmail: normalized.invoice.sellerEmail,
    sellerWebsite: normalized.invoice.sellerWebsite,
    taxNumber: normalized.invoice.taxNumber,
    footer: normalized.invoice.footer,
  })
  const [notice, setNotice] = useState('')

  function update(field: keyof Draft, value: string | number) {
    setDraft((current) => ({ ...current, [field]: value }))
    setNotice('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const baseline = normalizeMarketingSettings(settings)
    await saveSettings({
      ...baseline,
      profitMargin: Number(draft.profitMargin),
      invoice: {
        sellerName: draft.sellerName.trim(),
        sellerAddress: draft.sellerAddress.trim(),
        sellerPhone: draft.sellerPhone.trim(),
        sellerEmail: draft.sellerEmail.trim(),
        sellerWebsite: draft.sellerWebsite.trim(),
        taxNumber: draft.taxNumber.trim(),
        footer: draft.footer.trim(),
      },
    })
    setNotice(t('admin.settingsSaved'))
  }

  return (
    <>
      <AdminPageHeader
        description={t('admin.settingsDescription')}
        eyebrow={t('admin.settingsEyebrow')}
        title={t('admin.navSettings')}
      />

      {notice && (
        <div className="admin-status-notice" role="status">
          <CheckCircleOutlined />
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

      <form onSubmit={(event) => void handleSubmit(event)}>
        <section className="admin-card">
          <div className="admin-card__header">
            <div>
              <h2>{t('admin.settingsStoreTitle')}</h2>
              <p>{t('admin.settingsStoreText')}</p>
            </div>
            <span className="admin-stat__icon">
              <StorefrontOutlined />
            </span>
          </div>
          <div className="admin-card__body">
            <div className="admin-grid admin-grid--split">
              <label className="admin-field">
                <span>{t('admin.sellerName')}</span>
                <input
                  onChange={(event) => update('sellerName', event.target.value)}
                  placeholder="Lucine — Maison d'élégance"
                  value={draft.sellerName}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.sellerPhone')}</span>
                <input
                  dir="ltr"
                  onChange={(event) => update('sellerPhone', event.target.value)}
                  placeholder="+20 100 000 0000"
                  value={draft.sellerPhone}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>{t('admin.sellerAddress')}</span>
                <input
                  onChange={(event) => update('sellerAddress', event.target.value)}
                  placeholder={t('admin.sellerAddressPlaceholder')}
                  value={draft.sellerAddress}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.sellerEmail')}</span>
                <input
                  dir="ltr"
                  onChange={(event) => update('sellerEmail', event.target.value)}
                  placeholder="care@lucine.store"
                  type="email"
                  value={draft.sellerEmail}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.sellerWebsite')}</span>
                <input
                  dir="ltr"
                  onChange={(event) => update('sellerWebsite', event.target.value)}
                  placeholder="https://lucine.store"
                  value={draft.sellerWebsite}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>{t('admin.taxNumber')}</span>
                <input
                  dir="ltr"
                  onChange={(event) => update('taxNumber', event.target.value)}
                  placeholder={t('admin.taxNumberPlaceholder')}
                  value={draft.taxNumber}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>
                  {t('admin.invoiceFooter')} <em>{t('common.optional')}</em>
                </span>
                <textarea
                  onChange={(event) => update('footer', event.target.value)}
                  placeholder={t('admin.invoiceFooterPlaceholder')}
                  rows={3}
                  value={draft.footer}
                />
              </label>
            </div>
          </div>
        </section>

        <div className="admin-grid admin-grid--split">
          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.settingsProfitTitle')}</h2>
                <p>{t('admin.settingsProfitText')}</p>
              </div>
              <span className="admin-stat__icon">
                <PercentOutlined />
              </span>
            </div>
            <div className="admin-card__body">
              <label className="admin-field">
                <span>{t('admin.profitMarginLabel')}</span>
                <div className="admin-input-suffix">
                  <input
                    inputMode="decimal"
                    max={100}
                    min={0}
                    onChange={(event) =>
                      update('profitMargin', event.target.value)
                    }
                    style={{ textAlign: 'left' }}
                    type="number"
                    value={draft.profitMargin}
                  />
                  <b>%</b>
                </div>
              </label>
              <p className="admin-form-note" style={{ marginTop: 12 }}>
                {t('admin.profitMarginHint')} — {t('admin.settingsProfitExample')}
              </p>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2>{t('admin.settingsInvoicesTitle')}</h2>
                <p>{t('admin.settingsInvoicesText')}</p>
              </div>
              <span className="admin-stat__icon">
                <ReceiptLongOutlined />
              </span>
            </div>
            <div className="admin-card__body">
              <div className="admin-mini-stat-row">
                <div className="admin-mini-stat">
                  <span>{t('admin.settingsInvoiceDefault')}</span>
                  <strong>{normalized.invoice.sellerName || 'LUCINE'}</strong>
                </div>
                <div className="admin-mini-stat">
                  <span>{t('admin.settingsInvoiceExample')}</span>
                  <strong>
                    {number(draft.profitMargin || 0)}%
                  </strong>
                </div>
              </div>
              <p className="admin-form-note" style={{ marginTop: 12 }}>
                <DescriptionOutlined
                  style={{ verticalAlign: '-4px' }}
                />{' '}
                {t('admin.settingsInvoicesNote')}
              </p>
            </div>
          </section>
        </div>

        <div className="admin-settings-save" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="admin-btn admin-btn--primary" type="submit">
            {t('admin.saveSettings')}
          </button>
        </div>
      </form>
    </>
  )
}

export default SettingsAdminPage
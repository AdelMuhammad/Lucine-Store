import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  Close,
  PictureAsPdfOutlined,
  PrintOutlined,
  ReceiptLongOutlined,
} from '@mui/icons-material'
import type { CustomerOrder } from '../account/store/useAccountStore'
import { useMarketingStore } from '../marketing/store/useMarketingStore'
import { useTranslation } from '../../hooks/useTranslation'
import {
  buildInvoice,
  normalizeSellerSettings,
  type InvoiceData,
} from './invoice'
import InvoiceView from './InvoiceView'
import { downloadElementAsPdf, invoiceFilename, printInvoice } from './pdf'
import './Invoice.css'

/**
 * Shows a full invoice for an order. Used on the storefront (customer) and in
 * the admin console; both sides can print and download a real PDF.
 */
function InvoiceModal({
  order,
  onClose,
}: {
  order: CustomerOrder
  onClose: () => void
}) {
  const { t } = useTranslation()
  const invoiceSettings = useMarketingStore(
    (state) => state.settings.invoice,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const invoice = useMemo<InvoiceData>(
    () => buildInvoice(order, normalizeSellerSettings(invoiceSettings)),
    [invoiceSettings, order],
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  async function handleDownload() {
    setError('')
    setBusy(true)
    try {
      const sheet = document.getElementById('invoice-export-sheet')
      if (!sheet) throw new Error('Invoice sheet is not mounted.')
      await downloadElementAsPdf(sheet, `${invoiceFilename(invoice.number)}.pdf`)
    } catch {
      setError(t('invoice.pdfFailed'))
    } finally {
      setBusy(false)
    }
  }

  function handleOverlayMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div
      className="invoice-modal"
      onMouseDown={handleOverlayMouseDown}
      role="presentation"
    >
      <section
        aria-label={t('invoice.title')}
        aria-modal="true"
        className="invoice-modal__panel"
        role="dialog"
      >
        <header className="invoice-modal__header">
          <div className="invoice-modal__heading">
            <ReceiptLongOutlined />
            <span>
              <strong>{t('invoice.title')}</strong>
              <small>{invoice.number}</small>
            </span>
          </div>
          <div className="invoice-modal__actions">
            <button
              className="invoice-btn"
              onClick={printInvoice}
              type="button"
            >
              <PrintOutlined /> {t('invoice.print')}
            </button>
            <button
              className="invoice-btn invoice-btn--primary"
              disabled={busy}
              onClick={() => void handleDownload()}
              type="button"
            >
              <PictureAsPdfOutlined />
              {busy ? t('invoice.preparing') : t('invoice.downloadPdf')}
            </button>
            <button
              aria-label={t('invoice.close')}
              className="invoice-icon-btn"
              onClick={onClose}
              type="button"
            >
              <Close />
            </button>
          </div>
        </header>

        {error && (
          <p className="invoice-modal__error" role="alert">
            {error}
          </p>
        )}

        <div className="invoice-modal__scroll">
          <p className="invoice-modal__hint">{t('invoice.hint')}</p>
          <InvoiceView invoice={invoice} sheetId="invoice-export-sheet" />
        </div>
      </section>
    </div>
  )
}

export default InvoiceModal
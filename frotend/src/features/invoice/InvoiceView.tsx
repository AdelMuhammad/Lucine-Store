import { useTranslation } from '../../hooks/useTranslation'
import type { InvoiceData } from './invoice'

/**
 * The invoice document itself. Rendered inside modal dialogs (storefront and
 * admin) and used as the capture target for the PDF download and print.
 */
function InvoiceView({
  invoice,
  sheetId,
}: {
  invoice: InvoiceData
  /** Optional DOM id used by the PDF/print export. */
  sheetId?: string
}) {
  const { t, localized, currency, number, date, isRTL } = useTranslation()
  const statusLabel = t(`orderStatus.${invoice.status}`)

  return (
    <div
      className="invoice-sheet"
      data-testid="invoice-sheet"
      dir={isRTL ? 'rtl' : 'ltr'}
      id={sheetId}
    >
      <header className="invoice__header">
        <div className="invoice__brand">
          <span aria-hidden="true" className="invoice__brand-mark">
            L
          </span>
          <div>
            <strong>{invoice.seller.name}</strong>
            {invoice.seller.address && <span>{invoice.seller.address}</span>}
            <span>
              {[invoice.seller.phone, invoice.seller.email]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {invoice.seller.website && (
              <span>{invoice.seller.website}</span>
            )}
            {invoice.seller.taxNumber && (
              <span>
                {t('invoice.taxId')}: {invoice.seller.taxNumber}
              </span>
            )}
          </div>
        </div>

        <div className="invoice__meta">
          <span className="invoice__title">{t('invoice.title')}</span>
          <dl>
            <div>
              <dt>{t('invoice.invoiceNo')}</dt>
              <dd>{invoice.number}</dd>
            </div>
            <div>
              <dt>{t('invoice.orderNo')}</dt>
              <dd>#{invoice.orderId.slice(0, 8).toUpperCase()}</dd>
            </div>
            <div>
              <dt>{t('invoice.issueDate')}</dt>
              <dd>{date(invoice.issuedAt)}</dd>
            </div>
            <div>
              <dt>{t('invoice.status')}</dt>
              <dd>
                <span className="invoice__status">{statusLabel}</span>
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="invoice__parties">
        <div className="invoice__party">
          <h3>{t('invoice.billTo')}</h3>
          <strong>{invoice.customer.name || '—'}</strong>
          <span>{invoice.customer.email}</span>
          <span>{invoice.customer.phone}</span>
          {invoice.customer.addressLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
          {invoice.customer.deliveryNotes && (
            <small className="invoice__note">
              {t('invoice.deliveryNote')}: {invoice.customer.deliveryNotes}
            </small>
          )}
        </div>
        <div className="invoice__party invoice__party--meta">
          <h3>{t('invoice.deliveryPayment')}</h3>
          <span>
            <strong>{t('invoice.shippingMethod')}:</strong>{' '}
            {invoice.shippingMethod === 'express'
              ? t('invoice.deliveryExpress')
              : t('invoice.deliveryStandard')}
          </span>
          <span>
            <strong>{t('invoice.paymentMethod')}:</strong>{' '}
            {invoice.paymentMethod === 'cash'
              ? t('invoice.paymentCash')
              : t('invoice.paymentCard')}
          </span>
        </div>
      </section>

      <table className="invoice__items">
        <thead>
          <tr>
            <th className="invoice__col-item">{t('invoice.item')}</th>
            <th>{t('invoice.qty')}</th>
            <th>{t('invoice.unitPrice')}</th>
            <th className="invoice__col-total">{t('invoice.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={item.key}>
              <td>
                <strong>{localized(item.name, item.nameAr) || '—'}</strong>
                <span className="invoice__item-sub">
                  {localized(item.brand, item.brandAr) || '—'}
                  {invoice.items.length > 1 ? ` · ${index + 1}` : ''}
                </span>
              </td>
              <td>{number(item.quantity)}</td>
              <td>{currency(item.unitPrice)}</td>
              <td className="invoice__col-total">
                {currency(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice__totals">
        <dl>
          <div>
            <dt>{t('invoice.subtotal')}</dt>
            <dd>{currency(invoice.subtotal)}</dd>
          </div>
          <div>
            <dt>
              {invoice.shippingMethod === 'express'
                ? t('invoice.deliveryExpress')
                : t('invoice.deliveryStandard')}
            </dt>
            <dd>
              {invoice.shipping === 0
                ? t('invoice.free')
                : currency(invoice.shipping)}
            </dd>
          </div>
          {invoice.couponDiscount > 0 && (
            <div className="invoice__discount">
              <dt>
                {t('checkout.couponLine', { code: invoice.couponCode })}
              </dt>
              <dd>−{currency(invoice.couponDiscount)}</dd>
            </div>
          )}
          <div className="invoice__grand">
            <dt>{t('invoice.total')}</dt>
            <dd>{currency(invoice.total)}</dd>
          </div>
        </dl>
      </div>

      <footer className="invoice__footer">
        <p>
          {invoice.seller.footer ||
            t('invoice.thanks', {
              brand: invoice.seller.name || 'LUCINE',
            })}
        </p>
        <span>
          {invoice.number} · {t('invoice.keepCopy')}
        </span>
      </footer>
    </div>
  )
}

export default InvoiceView
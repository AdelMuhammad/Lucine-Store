import { useMemo, useState } from 'react'
import {
  ArrowForward,
  ExpandMore,
  PeopleAltOutlined,
  PersonOutlined,
  SearchOutlined,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { useAccountStore } from '../../account/store/useAccountStore'
import { deriveCustomerRows } from '../../account/customerRows'
import { useProductStore } from '../../products/store/useProductStore'
import { useWishlistStore } from '../../products/store/useWishlistStore'
import AdminPageHeader from '../components/AdminPageHeader'
import {
  orderNumber,
  orderStatusVariant,
} from '../format'
import { useTranslation } from '../../../hooks/useTranslation'

function CustomersAdminPage() {
  const { t, currency, date, number } = useTranslation()
  const orders = useAccountStore((state) => state.orders)
  const profile = useAccountStore((state) => state.profile)
  const products = useProductStore((state) => state.products)
  const savedProductIds = useWishlistStore((state) => state.savedProductIds)
  const [search, setSearch] = useState('')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const customers = useMemo(() => deriveCustomerRows(orders), [orders])

  const query = search.trim().toLocaleLowerCase()
  const filteredCustomers = customers.filter(
    (customer) =>
      !query ||
      `${customer.name} ${customer.email} ${customer.phone}`
        .toLocaleLowerCase()
        .includes(query),
  )

  return (
    <>
      <AdminPageHeader
        description={t('admin.customersDescription')}
        eyebrow={t('admin.customersEyebrow')}
        title={t('admin.customersTitle')}
      />

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>{t('admin.storeAccountTitle')}</h2>
            <p>{t('admin.storeAccountText')}</p>
          </div>
          <span className="admin-badge admin-badge--neutral">
            <PersonOutlined /> {t('admin.localProfile')}
          </span>
        </div>
        <div className="admin-card__body">
          <div className="admin-mini-stat-row">
            <div className="admin-mini-stat">
              <span>{t('admin.miniName')}</span>
              <strong>
                {[profile.firstName, profile.lastName]
                  .filter(Boolean)
                  .join(' ') || t('common.notSet')}
              </strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.miniEmail')}</span>
              <strong>{profile.email || t('common.notSet')}</strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.miniOrders')}</span>
              <strong>{number(orders.length)}</strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.miniSavedPieces')}</span>
              <strong>{number(savedProductIds.length)}</strong>
            </div>
            <div className="admin-mini-stat">
              <span>{t('admin.miniCatalogueSize')}</span>
              <strong>{number(products.length)}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <SearchOutlined aria-hidden="true" />
          <input
            aria-label={t('admin.searchCustomersAria')}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.searchCustomersPlaceholder')}
            type="search"
            value={search}
          />
        </label>
        <span className="admin-toolbar__count">
          {t('admin.customerCount', {
            count: number(filteredCustomers.length),
          })}
        </span>
      </div>

      <section className="admin-card">
        {filteredCustomers.length > 0 ? (
          <div className="admin-row-list">
            {filteredCustomers.map((customer) => {
              const isOpen = expandedKey === customer.key
              return (
                <div key={customer.key}>
                  <div className="admin-row">
                    <div className="admin-row__main">
                      <strong>{customer.name || t('admin.guestCustomer')}</strong>
                      <span>
                        {customer.email || t('admin.noEmail')} ·{' '}
                        {customer.phone || t('admin.noPhone')}
                      </span>
                    </div>
                    <div className="admin-row__aside">
                      <span className="admin-badge admin-badge--info">
                        {t('admin.orderCountBadge', {
                          count: number(customer.orders.length),
                        })}
                      </span>
                      <span className="admin-badge admin-badge--success">
                        {currency(customer.totalSpent)}
                      </span>
                      <button
                        aria-expanded={isOpen}
                        className="admin-btn admin-btn--sm"
                        onClick={() =>
                          setExpandedKey(isOpen ? null : customer.key)
                        }
                        type="button"
                      >
                        {isOpen ? t('admin.hide') : t('admin.orders')}
                        <ExpandMore
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 160ms ease',
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div
                      className="admin-row-list"
                      style={{
                        padding: '4px 20px 16px',
                        background: 'var(--color-surface-muted)',
                      }}
                    >
                      {customer.orders.map((order) => (
                        <div
                          className="admin-row"
                          key={order.id}
                          style={{ paddingInline: 0 }}
                        >
                          <div className="admin-row__main">
                            <strong>#{orderNumber(order.id)}</strong>
                            <span>
                              {date(order.createdAt)} ·{' '}
                              {t('admin.itemCount', {
                                count: number(order.items.length),
                              })}
                            </span>
                          </div>
                          <div className="admin-row__aside">
                            <span
                              className={`admin-badge admin-badge--${orderStatusVariant(order.status)}`}
                            >
                              {t(`orderStatus.${order.status}`)}
                            </span>
                            <strong>{currency(order.total)}</strong>
                            <Link
                              className="admin-icon-btn"
                              to={`/admin/orders/${order.id}`}
                            >
                              <ArrowForward className="rtl-flip" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="admin-empty">
            <PeopleAltOutlined />
            <h3>{t('admin.noCustomersTitle')}</h3>
            <p>
              {orders.length === 0
                ? t('admin.noCustomersText')
                : t('admin.noCustomersMatch')}
            </p>
          </div>
        )}
      </section>
    </>
  )
}

export default CustomersAdminPage

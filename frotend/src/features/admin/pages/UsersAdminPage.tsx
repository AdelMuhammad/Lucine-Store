import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Add,
  PersonAddAlt1Outlined,
  Search,
  VisibilityOutlined,
} from '@mui/icons-material'
import { Link, useNavigate } from 'react-router-dom'
import { useAccountStore } from '../../account/store/useAccountStore'
import type { AuthRole } from '../../../services/auth'
import AdminModal from '../components/AdminModal'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminPagination from '../components/AdminPagination'
import { useTranslation } from '../../../hooks/useTranslation'
import { useAdminUsersStore } from '../store/useAdminUsersStore'

const PAGE_SIZE = 12

type UserDraft = {
  fullName: string
  email: string
  password: string
  phone: string
  role: AuthRole
}

function emptyDraft(): UserDraft {
  return {
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
  }
}

/** Maps the service's create-user error keys to translation keys. */
const CREATE_USER_ERROR_KEYS: Record<string, string> = {
  'email-in-use': 'admin.userErrorEmailInUse',
  'weak-password': 'admin.userErrorWeakPassword',
  'invalid-email': 'admin.userErrorInvalidEmail',
  forbidden: 'admin.userErrorForbidden',
  'function-missing': 'admin.userErrorFunctionMissing',
  network: 'admin.userErrorNetwork',
}

function createUserErrorKey(error: string): string {
  return CREATE_USER_ERROR_KEYS[error] ?? 'admin.userErrorGeneric'
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function UsersAdminPage() {
  const { t, number, date, currency } = useTranslation()
  const navigate = useNavigate()
  const users = useAdminUsersStore((state) => state.users)
  const status = useAdminUsersStore((state) => state.status)
  const hydrate = useAdminUsersStore((state) => state.hydrate)
  const createUser = useAdminUsersStore((state) => state.createUser)
  const orders = useAccountStore((state) => state.orders)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<UserDraft>(emptyDraft)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Order totals grouped by email so each account can show its own activity.
  const ordersByEmail = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    orders.forEach((order) => {
      const key = order.email.trim().toLocaleLowerCase()
      if (!key) return
      const entry = map.get(key) ?? { count: 0, total: 0 }
      entry.count += 1
      entry.total += order.total
      map.set(key, entry)
    })
    return map
  }, [orders])

  const query = search.trim().toLocaleLowerCase()
  const filteredUsers = users.filter((user) => {
    if (!query) return true
    return `${user.fullName} ${user.email} ${user.phone}`
      .toLocaleLowerCase()
      .includes(query)
  })

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visibleUsers = filteredUsers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  function update<K extends keyof UserDraft>(key: K, value: UserDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  /** Opens a user's detail page; ignores rows without an id. */
  function openUser(userId: string) {
    if (userId) navigate(`/admin/users/${userId}`)
  }

  function openCreate() {
    setDraft(emptyDraft())
    setFormError('')
    setAdding(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const email = draft.email.trim()
    if (!EMAIL_PATTERN.test(email)) {
      setFormError(t('admin.userErrorInvalidEmail'))
      return
    }
    if (draft.password.length < 6) {
      setFormError(t('admin.userErrorWeakPassword'))
      return
    }

    setSubmitting(true)
    const error = await createUser({ ...draft, email })
    setSubmitting(false)

    if (error) {
      setFormError(t(createUserErrorKey(error)))
      return
    }

    setAdding(false)
    setNotice({
      tone: 'success',
      text: t('admin.userCreated', { email }),
    })
  }

  const isLoading = status === 'loading' && users.length === 0
  const hasLoadError = status === 'error' && users.length === 0

  return (
    <>
      <AdminPageHeader
        actions={
          <button
            className="admin-btn admin-btn--primary"
            onClick={openCreate}
            type="button"
          >
            <Add /> {t('admin.addUser')}
          </button>
        }
        description={t('admin.usersDescription')}
        eyebrow={t('admin.usersEyebrow')}
        title={t('admin.usersTitle')}
      />

      {notice &&
        (notice.tone === 'error' ? (
          <p className="admin-form-error" role="alert">
            {notice.text}
          </p>
        ) : (
          <div className="admin-status-notice" role="status">
            <span>{notice.text}</span>
            <button
              aria-label={t('admin.dismissMessage')}
              onClick={() => setNotice(null)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <Search aria-hidden="true" />
          <input
            aria-label={t('admin.searchUsersAria')}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder={t('admin.searchUsersPlaceholder')}
            type="search"
            value={search}
          />
        </label>
        <div className="admin-toolbar__actions">
          <button
            className="admin-btn admin-btn--sm"
            onClick={() => void hydrate({ force: true })}
            type="button"
          >
            {t('admin.refresh')}
          </button>
          <span className="admin-toolbar__count">
            {t('admin.userCount', {
              count: number(filteredUsers.length),
            })}
          </span>
        </div>
      </div>

      {hasLoadError ? (
        <section className="admin-card">
          <div className="admin-empty">
            <PersonAddAlt1Outlined />
            <h3>{t('admin.noUsersTitle')}</h3>
            <p>{t('admin.usersLoadFailed')}</p>
            <button
              className="admin-btn admin-btn--primary"
              onClick={() => void hydrate({ force: true })}
              type="button"
            >
              {t('admin.refresh')}
            </button>
          </div>
        </section>
      ) : isLoading ? (
        <section className="admin-card">
          <div className="admin-loading" role="status">
            {t('common.loading')}
          </div>
        </section>
      ) : (
        <section className="admin-card">
          {visibleUsers.length > 0 ? (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.thUser')}</th>
                      <th>{t('admin.thPhone')}</th>
                      <th>{t('admin.thRole')}</th>
                      <th>{t('admin.thOrders')}</th>
                      <th>{t('admin.thJoined')}</th>
                      <th aria-label={t('admin.thActions')} />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((user) => {
                      const stats = ordersByEmail.get(
                        user.email.toLocaleLowerCase(),
                      )
                      const name = user.fullName || user.email
                      return (
                        <tr
                          className="admin-clickable-row"
                          key={user.id}
                          onClick={() => openUser(user.id)}
                        >
                          <td data-label={t('admin.thUser')}>
                            <div className="admin-table__primary">
                              <strong>
                                <Link
                                  onClick={(event) => event.stopPropagation()}
                                  to={`/admin/users/${user.id}`}
                                >
                                  {name}
                                </Link>
                              </strong>
                              {user.fullName && <span>{user.email}</span>}
                            </div>
                          </td>
                          <td data-label={t('admin.thPhone')}>
                            <span className="admin-table__muted">
                              {user.phone || t('admin.noPhone')}
                            </span>
                          </td>
                          <td data-label={t('admin.thRole')}>
                            <span
                              className={`admin-badge admin-badge--${
                                user.role === 'admin' ? 'info' : 'neutral'
                              }`}
                            >
                              {user.role === 'admin'
                                ? t('admin.roleAdmin')
                                : t('admin.roleCustomer')}
                            </span>
                          </td>
                          <td data-label={t('admin.thOrders')}>
                            {stats ? (
                              <div className="admin-table__primary">
                                <strong>
                                  {t('admin.orderCountBadge', {
                                    count: number(stats.count),
                                  })}
                                </strong>
                                <span>{currency(stats.total)}</span>
                              </div>
                            ) : (
                              <span className="admin-table__muted">
                                {t('admin.userNoOrders')}
                              </span>
                            )}
                          </td>
                          <td data-label={t('admin.thJoined')}>
                            <span className="admin-table__muted">
                              {user.createdAt
                                ? date(user.createdAt, 'short')
                                : t('common.notSet')}
                            </span>
                          </td>
                          <td data-label={t('admin.thActions')}>
                            <div className="admin-table__actions">
                              <Link
                                aria-label={t('admin.viewUser')}
                                className="admin-icon-btn"
                                onClick={(event) => event.stopPropagation()}
                                title={t('admin.viewUser')}
                                to={`/admin/users/${user.id}`}
                              >
                                <VisibilityOutlined />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <AdminPagination
                onPage={setPage}
                page={safePage}
                pageCount={pageCount}
                pageSize={PAGE_SIZE}
                total={filteredUsers.length}
              />
            </>
          ) : (
            <div className="admin-empty">
              <PersonAddAlt1Outlined />
              <h3>{t('admin.noUsersTitle')}</h3>
              <p>
                {users.length === 0
                  ? t('admin.noUsersText')
                  : t('admin.noUsersMatch')}
              </p>
              <button
                className="admin-btn admin-btn--primary"
                onClick={openCreate}
                type="button"
              >
                <Add /> {t('admin.addUser')}
              </button>
            </div>
          )}
        </section>
      )}

      {adding && (
        <AdminModal
          description={t('admin.userModalDescription')}
          onClose={() => setAdding(false)}
          title={t('admin.addUserTitle')}
        >
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <label className="admin-field admin-field--full">
                <span>{t('admin.userFieldFullName')}</span>
                <input
                  autoFocus
                  onChange={(event) => update('fullName', event.target.value)}
                  value={draft.fullName}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>{t('admin.userFieldEmail')}</span>
                <input
                  onChange={(event) => update('email', event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  value={draft.email}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.userFieldPassword')}</span>
                <input
                  onChange={(event) => update('password', event.target.value)}
                  type="text"
                  value={draft.password}
                />
                <span className="admin-field-hint">
                  {t('admin.userPasswordHint')}
                </span>
              </label>
              <label className="admin-field">
                <span>{t('admin.userFieldPhone')}</span>
                <input
                  onChange={(event) => update('phone', event.target.value)}
                  value={draft.phone}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>{t('admin.userFieldRole')}</span>
                <select
                  onChange={(event) =>
                    update('role', event.target.value as AuthRole)
                  }
                  value={draft.role}
                >
                  <option value="customer">{t('admin.roleCustomer')}</option>
                  <option value="admin">{t('admin.roleAdmin')}</option>
                </select>
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
              <button
                className="admin-btn admin-btn--primary"
                disabled={submitting}
                type="submit"
              >
                {t('admin.addUser')}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default UsersAdminPage

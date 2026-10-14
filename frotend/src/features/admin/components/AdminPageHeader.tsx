import type { ReactNode } from 'react'

type AdminPageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header">
      <div>
        {eyebrow && <span className="admin-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="admin-page-header__actions">{actions}</div>}
    </header>
  )
}

export default AdminPageHeader

import { useEffect, type ReactNode } from 'react'
import { Close } from '@mui/icons-material'
import { useTranslation } from '../../../hooks/useTranslation'

type AdminModalProps = {
  title: string
  description?: string
  size?: 'md' | 'lg'
  onClose: () => void
  children: ReactNode
}

function AdminModal({
  title,
  description,
  size = 'md',
  onClose,
  children,
}: AdminModalProps) {
  const { t } = useTranslation()

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

  return (
    <div
      className="admin-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        aria-labelledby="admin-modal-title"
        aria-modal="true"
        className={`admin-modal__panel admin-modal__panel--${size}`}
        role="dialog"
      >
        <header className="admin-modal__header">
          <div>
            <h2 id="admin-modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            aria-label={t('admin.closeDialog')}
            className="admin-icon-btn"
            onClick={onClose}
            type="button"
          >
            <Close />
          </button>
        </header>
        <div className="admin-modal__body">{children}</div>
      </div>
    </div>
  )
}

export default AdminModal

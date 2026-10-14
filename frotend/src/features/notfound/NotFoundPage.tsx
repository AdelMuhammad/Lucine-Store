import { ArrowForward, SearchOffOutlined } from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import './NotFoundPage.css'

function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <section className="not-found">
      <Seo
        description={t('seo.notFound.description')}
        noindex
        path="/404"
        title={t('seo.notFound.title')}
      />
      <div className="not-found__mark" aria-hidden="true">
        <SearchOffOutlined />
      </div>
      <span className="not-found__eyebrow">{t('notFound.eyebrow')}</span>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.text')}</p>
      <Link className="not-found__cta" to="/products">
        {t('notFound.cta')}
        <ArrowForward className="rtl-flip" />
      </Link>
    </section>
  )
}

export default NotFoundPage

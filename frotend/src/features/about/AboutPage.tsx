import {
  ArrowForward,
  AutoAwesome,
  FavoriteBorder,
  SpaOutlined,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { useProductStore } from '../products/store/useProductStore'
import { coverImage } from '../products/data/products'
import { useTranslation } from '../../hooks/useTranslation'
import Seo from '../../components/seo/Seo'
import { breadcrumbSchema } from '../../lib/seo'
import './AboutPage.css'

function AboutPage() {
  const { t } = useTranslation()
  const products = useProductStore((state) => state.products)
  const principles = [
    {
      icon: <AutoAwesome />,
      number: '01',
      title: t('about.principle1Title'),
      description: t('about.principle1Text'),
    },
    {
      icon: <FavoriteBorder />,
      number: '02',
      title: t('about.principle2Title'),
      description: t('about.principle2Text'),
    },
    {
      icon: <SpaOutlined />,
      number: '03',
      title: t('about.principle3Title'),
      description: t('about.principle3Text'),
    },
  ]

  return (
    <div className="about-page">
      <Seo
        description={t('seo.about.description')}
        image={coverImage(
          products.find((product) => product.id === 'crossbody-bag'),
        )}
        imageAlt={t('about.heroAlt')}
        jsonLd={[
          breadcrumbSchema([
            { name: t('productDetail.home'), path: '/' },
            { name: t('nav.story'), path: '/about' },
          ]),
        ]}
        keywords={[t('meta.brand'), t('nav.story'), t('about.valuesTitle')]}
        path="/about"
        title={t('seo.about.title')}
      />
      <section className="about-hero">
        <img
          alt={t('about.heroAlt')}
          className="about-hero__image"
          fetchPriority="high"
          src={coverImage(products.find((product) => product.id === 'crossbody-bag'))}
        />
        <div className="about-hero__overlay" />
        <div className="about-hero__content">
          <span className="about-eyebrow">{t('about.heroEyebrow')}</span>
          <h1>{t('about.heroTitle')}</h1>
          <p>{t('about.heroText')}</p>
        </div>
        <span aria-hidden="true" className="about-hero__edition">
          {t('about.edition')}
        </span>
      </section>

      <section className="about-intro">
        <div className="about-intro__mark" aria-hidden="true">
          L
        </div>
        <div className="about-intro__copy">
          <span className="about-eyebrow">{t('about.storyEyebrow')}</span>
          <h2>{t('about.storyTitle')}</h2>
          <p>{t('about.storyP1')}</p>
          <p>{t('about.storyP2')}</p>
          <Link className="about-text-link" to="/products">
            {t('about.explore')}
            <ArrowForward className="rtl-flip" />
          </Link>
        </div>
      </section>

      <section className="about-values">
        <div className="about-values__heading">
          <span className="about-eyebrow">{t('about.valuesEyebrow')}</span>
          <h2>{t('about.valuesTitle')}</h2>
          <p>{t('about.valuesText')}</p>
        </div>
        <div className="about-principles">
          {principles.map((principle) => (
            <article className="about-principle" key={principle.number}>
              <div className="about-principle__top">
                <span className="about-principle__icon">{principle.icon}</span>
                <span className="about-principle__number">
                  {principle.number}
                </span>
              </div>
              <h3>{principle.title}</h3>
              <p>{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-quote">
        <span className="about-eyebrow">{t('about.quoteEyebrow')}</span>
        <blockquote>{t('about.quote')}</blockquote>
        <span className="about-quote__signature">{t('about.signature')}</span>
      </section>

      <section className="about-visit">
        <div className="about-visit__image">
          <img
            alt={t('about.visitImageAlt')}
            loading="lazy"
            src={coverImage(products.find((product) => product.id === 'gold-hoops'))}
          />
        </div>
        <div className="about-visit__content">
          <span className="about-eyebrow">{t('about.visitEyebrow')}</span>
          <h2>{t('about.visitTitle')}</h2>
          <p>{t('about.visitText')}</p>
          <Link className="about-button" to="/products">
            {t('about.discover')}
            <ArrowForward className="rtl-flip" />
          </Link>
        </div>
      </section>
    </div>
  )
}

export default AboutPage

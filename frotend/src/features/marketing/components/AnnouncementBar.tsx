import { useEffect, useState } from 'react'
import { Close } from '@mui/icons-material'
import { NavLink } from 'react-router-dom'
import { useTranslation } from '../../../hooks/useTranslation'
import { liveBanners, useMarketingStore } from '../store/useMarketingStore'
import '../Marketing.css'

/** How long each announcement stays up before rotating to the next one. */
const ROTATE_MS = 7000

/**
 * The thin promo strip above the store header. Copy, target and schedule all
 * come from the admin banner manager, so nothing here is hard-coded.
 */
function AnnouncementBar() {
  const { t, localized } = useTranslation()
  const banners = useMarketingStore((state) => state.banners)
  const dismissedBanners = useMarketingStore((state) => state.dismissedBanners)
  const dismissBanner = useMarketingStore((state) => state.dismissBanner)
  const [index, setIndex] = useState(0)

  const visible = liveBanners(banners, 'announcement').filter(
    (banner) => !dismissedBanners.includes(banner.id),
  )
  const count = visible.length

  useEffect(() => {
    if (count <= 1) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % count)
    }, ROTATE_MS)
    return () => clearInterval(timer)
  }, [count])

  if (count === 0) return null

  const banner = visible[index % count]
  const title = localized(banner.title, banner.title_ar)
  const cta = localized(banner.ctaLabel, banner.ctaLabel_ar)
  const content = (
    <>
      <span aria-hidden="true" className="announcement-bar__dot" />
      <span className="announcement-bar__text">{title}</span>
      {cta && <span className="announcement-bar__cta">{cta}</span>}
    </>
  )

  return (
    <div className="announcement-bar" role="region" aria-label={title}>
      {banner.link ? (
        <NavLink className="announcement-bar__inner" to={banner.link}>
          {content}
        </NavLink>
      ) : (
        <div className="announcement-bar__inner">{content}</div>
      )}
      <button
        aria-label={t('marketing.dismissAnnouncement')}
        className="announcement-bar__close"
        onClick={() => dismissBanner(banner.id)}
        type="button"
      >
        <Close />
      </button>
    </div>
  )
}

export default AnnouncementBar

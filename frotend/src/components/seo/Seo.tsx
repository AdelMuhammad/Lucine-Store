import { useEffect } from 'react'
import {
  SITE,
  absoluteUrl,
  formatTitle,
  languageUrl,
  organizationSchema,
  websiteSchema,
} from '../../lib/seo'
import { useLocaleStore } from '../../store/useLocaleStore'

export type SeoProps = {
  /** Page title without the brand suffix (unless `fullTitle` is set). */
  title: string
  description: string
  /** Route path used for the canonical URL, e.g. `/products/abc`. */
  path: string
  /** The title already contains the brand, so skip the suffix. */
  fullTitle?: boolean
  /** Absolute or site-relative share image. */
  image?: string
  imageAlt?: string
  type?: 'website' | 'product' | 'article'
  /** Keep this page out of the index (account, checkout, 404…). */
  noindex?: boolean
  keywords?: string[]
  /** One or more JSON-LD (`schema.org`) objects for rich results. */
  jsonLd?: Array<Record<string, unknown>>
}

const JSON_LD_SELECTOR = 'script[data-seo-jsonld]'

function upsertMeta(
  attribute: 'name' | 'property',
  key: string,
  content: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  )
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`
  let element = document.head.querySelector<HTMLLinkElement>(selector)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    if (hreflang) element.setAttribute('hreflang', hreflang)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

function replaceJsonLd(blocks: Array<Record<string, unknown>>) {
  document.head
    .querySelectorAll(JSON_LD_SELECTOR)
    .forEach((node) => node.remove())

  blocks.forEach((block, index) => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-seo-jsonld', String(index))
    script.text = JSON.stringify(block)
    document.head.appendChild(script)
  })
}

/**
 * Declarative document head for a single page. React 19 hoists `<title>` /
 * `<meta>` rendered in components, but doing it imperatively lets us guarantee
 * de-duplication and gives the prerender pass a fully-formed head to snapshot.
 */
function Seo({
  title,
  description,
  path,
  fullTitle = false,
  image,
  imageAlt,
  type = 'website',
  noindex = false,
  keywords,
  jsonLd = [],
}: SeoProps) {
  const language = useLocaleStore((state) => state.language)
  const resolvedTitle = formatTitle(title, fullTitle)
  const canonical = languageUrl(path, language)
  const usingDefaultImage = !image
  const shareImage = image
    ? /^https?:\/\//i.test(image)
      ? image
      : absoluteUrl(image)
    : absoluteUrl(SITE.defaultImage)
  // Organization + WebSite describe the store itself, so they belong on every
  // page and are always emitted first, ahead of the page-specific blocks.
  const blocks = [organizationSchema(), websiteSchema(), ...jsonLd]
  const jsonLdKey = JSON.stringify(jsonLd)

  useEffect(() => {
    document.title = resolvedTitle

    upsertMeta('name', 'description', description)
    upsertMeta(
      'name',
      'robots',
      noindex
        ? 'noindex, follow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    )
    if (keywords && keywords.length > 0) {
      upsertMeta('name', 'keywords', keywords.join(', '))
    }

    // Canonical + language alternates.
    upsertLink('canonical', canonical)
    upsertLink('alternate', languageUrl(path, 'en'), SITE.hreflangs.en)
    upsertLink('alternate', languageUrl(path, 'ar'), SITE.hreflangs.ar)
    upsertLink('alternate', languageUrl(path, 'en'), 'x-default')

    // Open Graph.
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:site_name', SITE.legalName)
    upsertMeta('property', 'og:title', resolvedTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:locale', SITE.ogLocales[language])
    upsertMeta(
      'property',
      'og:locale:alternate',
      SITE.ogLocales[language === 'en' ? 'ar' : 'en'],
    )
    upsertMeta('property', 'og:image', shareImage)
    if (imageAlt) upsertMeta('property', 'og:image:alt', imageAlt)
    if (usingDefaultImage) {
      upsertMeta('property', 'og:image:width', '1200')
      upsertMeta('property', 'og:image:height', '630')
      upsertMeta('property', 'og:image:type', 'image/png')
    }

    // Twitter / X.
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:site', SITE.twitter)
    upsertMeta('name', 'twitter:creator', SITE.twitter)
    upsertMeta('name', 'twitter:title', resolvedTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', shareImage)

    replaceJsonLd(blocks as Array<Record<string, unknown>>)

    return () => {
      document.querySelectorAll(JSON_LD_SELECTOR).forEach((node) => node.remove())
    }
    // `jsonLdKey` stands in for the (unstable) `jsonLd` reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canonical,
    description,
    imageAlt,
    jsonLdKey,
    keywords,
    language,
    noindex,
    resolvedTitle,
    shareImage,
    type,
    path,
  ])

  return null
}

export default Seo

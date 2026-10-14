import type { Product } from '../features/products/data/products'
import type { Language } from './i18n'

/**
 * Central SEO configuration and structured-data (schema.org) builders.
 *
 * The runtime `<Seo>` component and the build-time prerender script both speak
 * the same vocabulary, so a page keeps its title, canonical URL and rich result
 * whether it is served as static HTML to a crawler or rendered in the browser.
 */

export const SITE = {
  name: 'LUCINE',
  legalName: 'Lucine Store',
  tagline: 'Thoughtful pieces, made for every moment.',
  email: 'care@lucine.example',
  /** Social handle used for `twitter:site` / `twitter:creator`. */
  twitter: '@lucinestore',
  /** Default social sharing image, resolved against the site base URL. */
  defaultImage: 'og-default.png',
  /** Open Graph locale values per language. */
  ogLocales: { en: 'en_US', ar: 'ar_EG' } as Record<Language, string>,
  /** `hreflang` values per language. */
  hreflangs: { en: 'en', ar: 'ar' } as Record<Language, string>,
} as const

/** Fallback used when neither `VITE_SITE_URL` nor `window` is available. */
const FALLBACK_SITE_URL = 'https://adelmuhammad.github.io/Lucine-Store/'

function withTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

/**
 * The absolute site base URL (origin + base path, always with a trailing
 * slash). Configure `VITE_SITE_URL` in production so canonical URLs never
 * depend on the host the HTML happens to be served from.
 */
export function siteBaseUrl(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim()
  if (configured) return withTrailingSlash(configured)

  if (typeof window !== 'undefined') {
    return withTrailingSlash(
      new URL(import.meta.env.BASE_URL, window.location.origin).href,
    )
  }

  return FALLBACK_SITE_URL
}

/** Strips any leading slash so a path can be resolved against the base URL. */
function normalizePath(path: string): string {
  return path.replace(/^\/+/, '')
}

/** Absolute URL for a storefront path (e.g. `/products`). */
export function absoluteUrl(path = '/'): string {
  return new URL(normalizePath(path), siteBaseUrl()).href
}

/** Absolute URL for a given page in a given language (`?lang=ar` for Arabic). */
export function languageUrl(path: string, language: Language): string {
  const url = new URL(normalizePath(path), siteBaseUrl())
  if (language === 'ar') url.searchParams.set('lang', 'ar')
  return url.href
}

/** Renders a page title with the brand suffix, avoiding double branding. */
export function formatTitle(title: string, full = false): string {
  if (full || title.includes(SITE.name)) return title
  return `${title} | ${SITE.name}`
}

/**
 * Product URLs use the stable product id, which is what `App.tsx` routes on.
 * Slugs are not stored, so `/products/:id` is the canonical address.
 */
export function productPath(productId: string): string {
  return `/products/${productId}`
}

/** The first usable image for a product, as an absolute URL. */
export function productImage(product: Pick<Product, 'listImage'>): string {
  const [image] = product.listImage
  if (!image) return absoluteUrl(SITE.defaultImage)
  if (/^https?:\/\//i.test(image)) return image
  return absoluteUrl(image)
}

type JsonLd = Record<string, unknown>

/** schema.org Organization — the store behind the site. */
export function organizationSchema(): JsonLd {
  const url = siteBaseUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}#organization`,
    name: SITE.legalName,
    alternateName: SITE.name,
    url,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('favicon.svg'),
    },
    email: SITE.email,
    sameAs: [],
  }
}

/** schema.org WebSite + the sitelinks search box. */
export function websiteSchema(): JsonLd {
  const url = siteBaseUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}#website`,
    name: SITE.legalName,
    alternateName: SITE.name,
    url,
    inLanguage: ['en', 'ar'],
    publisher: { '@id': `${url}#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('products')}?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/** schema.org BreadcrumbList from an ordered list of crumbs. */
export function breadcrumbSchema(
  items: Array<{ name: string; path: string }>,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

type ProductSchemaInput = {
  product: Product
  /** Localised name shown to shoppers. */
  name: string
  /** Localised description shown to shoppers. */
  description: string
  /** Localised category label. */
  category?: string
  /** Localised brand label. */
  brand?: string
  canonical: string
}

/** schema.org Product with an offer, brand, images and review aggregate. */
export function productSchema({
  product,
  name,
  description,
  category,
  brand,
  canonical,
}: ProductSchemaInput): JsonLd {
  const price = Number.isInteger(product.price)
    ? product.price.toFixed(2)
    : String(product.price)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name,
    description: description.replace(/\s+/g, ' ').trim(),
    sku: product.id,
    category,
    brand: {
      '@type': 'Brand',
      name: brand || product.brand,
    },
    image: product.listImage.map((image) =>
      /^https?:\/\//i.test(image) ? image : absoluteUrl(image),
    ),
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'EGP',
      price,
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      priceValidUntil: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 90,
      ).toISOString().slice(0, 10),
    },
  }
}

/** schema.org ItemList for a grid of products. */
export function itemListSchema(
  products: Array<{ name: string; path: string }>,
  listName?: string,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(listName ? { name: listName } : {}),
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name,
      url: absoluteUrl(product.path),
    })),
  }
}

/** schema.org FAQPage from question/answer pairs. */
export function faqSchema(
  faqs: Array<{ question: string; answer: string }>,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

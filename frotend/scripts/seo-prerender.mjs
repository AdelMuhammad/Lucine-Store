// Build-time SEO pre-rendering.
//
// Vite ships a single empty `index.html`, which is the root cause of the
// "React SPA vs. search engines" problem: crawlers that do not execute
// JavaScript see an empty page. This script runs after `vite build` and writes
// a real, crawlable HTML document for every storefront route — full `<head>`
// (title, description, canonical, hreflang, Open Graph, Twitter) plus a
// semantic content snapshot with working links inside `#root`.
//
// React replaces that snapshot when it mounts, so browsers get the normal SPA
// experience while crawlers and non-JS visitors get a meaningful document.
//
// It also emits `sitemap.xml`, `robots.txt` and the GitHub Pages `404.html`.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const distDir = join(root, 'dist')

const BRAND = 'LUCINE'
const LEGAL_NAME = 'Lucine Store'
const DEFAULT_ORIGIN = 'https://adelmuhammad.github.io'
const OG_IMAGE = 'og-default.png'

// --- Environment -------------------------------------------------------------

function loadEnv() {
  const env = { ...process.env }
  try {
    const text = readFileSync(join(root, '.env'), 'utf8')
    for (const line of text.split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (match && env[match[1]] === undefined) {
        env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // No .env file — fall back to the ambient environment only.
  }
  return env
}

const env = loadEnv()

// --- URLs --------------------------------------------------------------------

const template = readFileSync(join(distDir, 'index.html'), 'utf8')

// The `<!--seo-->…<!--/seo-->` block is where the head is injected. It only
// exists in the file `vite build` just produced, so a second run without a
// fresh build would silently leave every page with the wrong head.
if (!template.includes('<!--seo-->') || !template.includes('<!--/seo-->')) {
  throw new Error(
    '[seo] dist/index.html is missing the <!--seo--> marker block. ' +
      'Run `vite build` (or `npm run build`) before the pre-render step.',
  )
}

/** Derives the Vite base path from the asset URLs Vite injected. */
function detectBase() {
  const match =
    template.match(/src="([^"]*?)assets\//) ||
    template.match(/href="([^"]*?)assets\//)
  return match ? match[1] : '/'
}

const base = detectBase()
const siteBase = (() => {
  const configured = env.VITE_SITE_URL?.trim()
  const raw = configured || `${DEFAULT_ORIGIN}${base}`
  return raw.endsWith('/') ? raw : `${raw}/`
})()

const url = (path = '') => new URL(path.replace(/^\/+/, ''), siteBase).href
const trimSlash = (path) => (path === '/' ? '' : path.replace(/^\/+|\/+$/g, ''))

// --- Localisation ------------------------------------------------------------

const en = JSON.parse(readFileSync(join(root, 'src/locales/en.json'), 'utf8'))
const seoCopy = en.seo

const interp = (value, vars = {}) =>
  String(value).replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))

// --- Data --------------------------------------------------------------------

const PRODUCT_FIELDS = [
  'id',
  'name',
  'name_ar',
  'description',
  'description_ar',
  'category',
  'category_ar',
  'brand',
  'brand_ar',
  'price',
  'original_price',
  'rating',
  'review_count',
  'listed_at',
  'list_image',
  'in_stock',
].join(',')

async function fetchProducts() {
  const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    console.warn('[seo] Supabase env missing — pre-rendering without product pages.')
    return []
  }

  const endpoint = `${supabaseUrl}/rest/v1/products?select=${PRODUCT_FIELDS}&order=listed_at.desc`
  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      console.warn(`[seo] Supabase responded ${response.status} — skipping product pages.`)
      return []
    }
    const rows = await response.json()
    return Array.isArray(rows) ? rows : []
  } catch (error) {
    console.warn('[seo] Could not reach Supabase:', error.message)
    return []
  }
}

// --- Helpers -----------------------------------------------------------------

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  )

const truncate = (value, length = 160) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text
}

const money = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(
    Number(value) || 0,
  )

const jsonScript = (data) =>
  `<script type="application/ld+json" data-seo-jsonld>${JSON.stringify(data).replace(
    /</g,
    '\\u003c',
  )}</script>`

// --- Shared head -------------------------------------------------------------

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteBase}#organization`,
  name: LEGAL_NAME,
  alternateName: BRAND,
  url: siteBase,
  logo: { '@type': 'ImageObject', url: url('favicon.svg') },
  email: 'care@lucine.example',
}

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteBase}#website`,
  name: LEGAL_NAME,
  alternateName: BRAND,
  url: siteBase,
  inLanguage: ['en', 'ar'],
  publisher: { '@id': `${siteBase}#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${url('products')}?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: url(item.path),
  })),
})

const productLd = (product) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  '@id': `${url(`products/${product.id}`)}#product`,
  name: product.name,
  description: truncate(product.description, 300),
  sku: product.id,
  category: product.category,
  brand: { '@type': 'Brand', name: product.brand },
  image: (product.list_image ?? []).map((image) =>
    /^https?:\/\//i.test(image) ? image : url(image),
  ),
  ...(Number(product.review_count) > 0
    ? {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: Number(product.rating),
          reviewCount: Number(product.review_count),
          bestRating: 5,
          worstRating: 1,
        },
      }
    : {}),
  offers: {
    '@type': 'Offer',
    url: url(`products/${product.id}`),
    priceCurrency: 'EGP',
    price: Number(product.price).toFixed(2),
    availability: product.in_stock
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
  },
})

const itemListLd = (products, name) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  numberOfItems: products.length,
  itemListElement: products.map((product, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: product.name,
    url: url(`products/${product.id}`),
  })),
})

// --- Content snapshot --------------------------------------------------------

const NAV_LINKS = [
  ['Home', '/'],
  ['Shop', '/products'],
  ['Offers', '/discounts'],
  ['Rewards', '/rewards'],
  ['Our story', '/about'],
  ['Customer care', '/support'],
]

const navHtml = `
      <nav aria-label="Main navigation">
        ${NAV_LINKS.map(
          ([label, path]) => `<a href="${escapeHtml(url(path))}">${label}</a>`,
        ).join('')}
      </nav>`

const footerHtml = `
      <footer>
        <p>${escapeHtml(LEGAL_NAME)} — ${escapeHtml(en.meta.tagline)}</p>${navHtml}
      </footer>`

function productCard(product) {
  const image = (product.list_image ?? [])[0] ?? ''
  const imageUrl = /^https?:\/\//i.test(image) ? image : url(image)
  return `
            <li>
              <a href="${escapeHtml(url(`products/${product.id}`))}">
                ${image ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" width="240" height="320" loading="lazy" />` : ''}
                <span>${escapeHtml(product.brand)}</span>
                <strong>${escapeHtml(product.name)}</strong>
                <span>${escapeHtml(money(product.price))}</span>
              </a>
            </li>`
}

function productListHtml(products) {
  if (products.length === 0) return '<p>New pieces are on their way.</p>'
  return `<ul class="seo-products">${products.map(productCard).join('')}</ul>`
}

// --- Route definitions -------------------------------------------------------

const staticRoutes = [
  {
    path: '/',
    title: `${BRAND} — ${seoCopy.home.title}`,
    fullTitle: true,
    description: seoCopy.home.description,
    priority: '1.0',
    changefreq: 'daily',
    body: (products) => `
        <h1>${escapeHtml(seoCopy.home.title)}</h1>
        <p>${escapeHtml(seoCopy.homeIntro)}</p>
        <h2>${escapeHtml(en.home.featuredTitle)}</h2>
        ${productListHtml(products.slice(0, 8))}
        <p><a href="${escapeHtml(url('products'))}">Shop all products</a></p>`,
  },
  {
    path: '/products',
    title: seoCopy.products.title,
    description: seoCopy.products.description,
    priority: '0.9',
    changefreq: 'daily',
    ld: (products) => [
      itemListLd(products, 'All products'),
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/products' },
      ]),
    ],
    body: (products) => `
        <h1>${escapeHtml(seoCopy.products.title)}</h1>
        <p>${escapeHtml(seoCopy.products.description)}</p>
        ${productListHtml(products)}`,
  },
  {
    path: '/discounts',
    title: seoCopy.discounts.title,
    description: seoCopy.discounts.description,
    priority: '0.8',
    changefreq: 'weekly',
    ld: () => [
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Offers', path: '/discounts' },
      ]),
    ],
    body: (products) => `
        <h1>${escapeHtml(seoCopy.discounts.title)}</h1>
        <p>${escapeHtml(seoCopy.discounts.description)}</p>
        ${productListHtml(
          products.filter((product) => Number(product.original_price) > Number(product.price)),
        )}`,
  },
  {
    path: '/rewards',
    title: seoCopy.rewards.title,
    description: seoCopy.rewards.description,
    priority: '0.5',
    changefreq: 'monthly',
    ld: () => [
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Rewards', path: '/rewards' },
      ]),
    ],
    body: () => `
        <h1>${escapeHtml(seoCopy.rewards.title)}</h1>
        <p>${escapeHtml(seoCopy.rewards.description)}</p>`,
  },
  {
    path: '/about',
    title: seoCopy.about.title,
    description: seoCopy.about.description,
    priority: '0.6',
    changefreq: 'monthly',
    ld: () => [
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Our story', path: '/about' },
      ]),
    ],
    body: () => `
        <h1>${escapeHtml(seoCopy.about.title)}</h1>
        <p>${escapeHtml(seoCopy.about.description)}</p>`,
  },
  {
    path: '/support',
    title: seoCopy.support.title,
    description: seoCopy.support.description,
    priority: '0.5',
    changefreq: 'monthly',
    ld: () => {
      const faqs = [1, 2, 3, 4].map((index) => ({
        '@type': 'Question',
        name: en.support.page.faq[`q${index}`],
        acceptedAnswer: {
          '@type': 'Answer',
          text: en.support.page.faq[`a${index}`],
        },
      }))
      return [
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs },
        breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Customer care', path: '/support' },
        ]),
      ]
    },
    body: () => `
        <h1>${escapeHtml(seoCopy.support.title)}</h1>
        <p>${escapeHtml(seoCopy.support.description)}</p>
        <dl>
          ${[1, 2, 3, 4]
            .map(
              (index) => `<dt>${escapeHtml(en.support.page.faq[`q${index}`])}</dt>
          <dd>${escapeHtml(en.support.page.faq[`a${index}`])}</dd>`,
            )
            .join('')}
        </dl>`,
  },
]

function productRoute(product) {
  return {
    path: `/products/${product.id}`,
    title: interp(seoCopy.product.title, {
      name: product.name,
      brand: product.brand,
    }),
    description: truncate(
      interp(seoCopy.product.description, {
        name: product.name,
        brand: product.brand,
        description: product.description,
      }),
    ),
    image: (product.list_image ?? [])[0],
    imageAlt: product.name,
    type: 'product',
    priority: '0.8',
    changefreq: 'weekly',
    ld: [
      productLd(product),
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/products' },
        { name: product.name, path: `/products/${product.id}` },
      ]),
    ],
    body: () => `
        <nav aria-label="Breadcrumb">
          <a href="${escapeHtml(url('/'))}">Home</a> /
          <a href="${escapeHtml(url('products'))}">Shop</a> /
          <span>${escapeHtml(product.category)}</span>
        </nav>
        <h1>${escapeHtml(product.name)}</h1>
        <p>${escapeHtml(product.brand)}</p>
        <p>${escapeHtml(money(product.price))}</p>
        <p>${escapeHtml(product.description)}</p>
        <p>${product.in_stock ? 'In stock' : 'Currently sold out'}</p>
        <p><a href="${escapeHtml(url('products'))}">Back to the collection</a></p>`,
  }
}

// --- HTML assembly -----------------------------------------------------------

function renderHead(route, products) {
  const canonical = url(route.path)
  const image = route.image
    ? /^https?:\/\//i.test(route.image)
      ? route.image
      : url(route.image)
    : url(OG_IMAGE)
  const title = escapeHtml(
    route.fullTitle || route.title.includes(BRAND)
      ? route.title
      : `${route.title} | ${BRAND}`,
  )
  const robots = route.noindex
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

  const ld = [
    organizationLd,
    websiteLd,
    ...((typeof route.ld === 'function' ? route.ld(products) : route.ld) ?? []),
  ]
  const usingDefaultImage = !route.image

  return `
    <title>${title}</title>
    <meta name="description" content="${escapeHtml(truncate(route.description))}" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <link rel="alternate" hreflang="en" href="${escapeHtml(canonical)}" />
    <link rel="alternate" hreflang="ar" href="${escapeHtml(canonical)}?lang=ar" />
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="${route.type ?? 'website'}" />
    <meta property="og:site_name" content="${escapeHtml(LEGAL_NAME)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${escapeHtml(truncate(route.description))}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:locale:alternate" content="ar_EG" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    ${route.imageAlt ? `<meta property="og:image:alt" content="${escapeHtml(route.imageAlt)}" />` : ''}
    ${usingDefaultImage ? `<meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@lucinestore" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${escapeHtml(truncate(route.description))}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    ${ld.map(jsonScript).join('\n    ')}`
}

function renderDocument(route, products) {
  const head = renderHead(route, products)
  const snapshot = route.snapshot
    ? ''
    : `
    <style>#seo-snapshot{display:none}</style>
    <noscript><style>#seo-snapshot{display:block}</style></noscript>`

  const snapshotBody = route.snapshot
    ? ''
    : `
      <div id="seo-snapshot">
        <header>
          <a href="${escapeHtml(url('/'))}"><strong>${escapeHtml(BRAND)}</strong></a>${navHtml}
        </header>
        <main>
${route.body ? route.body(products) : ''}
        </main>${footerHtml}
      </div>`

  return template
    .replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, head.trim())
    .replace('</head>', `${snapshot}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root">${snapshotBody}</div>`,
    )
}

function writeRoute(route, products) {
  const html = renderDocument(route, products)
  const segments = trimSlash(route.path)
  const target = segments
    ? join(distDir, segments, 'index.html')
    : join(distDir, 'index.html')
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, html)
}

// --- Sitemap / robots / 404 --------------------------------------------------

function writeSitemap(routes) {
  const entries = routes
    .filter((route) => !route.noindex)
    .map((route) => {
      const loc = url(route.path)
      const lastmod = new Date().toISOString().slice(0, 10)
      return `  <url>
    <loc>${escapeHtml(loc)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${escapeHtml(loc)}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${escapeHtml(loc)}?lang=ar" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(loc)}" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq ?? 'weekly'}</changefreq>
    <priority>${route.priority ?? '0.5'}</priority>
  </url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`
  writeFileSync(join(distDir, 'sitemap.xml'), xml)
}

function writeRobots() {
  const source = join(root, 'public', 'robots.txt')
  let contents = existsSync(source)
    ? readFileSync(source, 'utf8')
    : 'User-agent: *\nAllow: /\n'
  contents = contents.replace(
    /^Sitemap:.*$/m,
    `Sitemap: ${url('sitemap.xml')}`,
  )
  if (!/^Sitemap:/m.test(contents)) {
    contents += `\nSitemap: ${url('sitemap.xml')}\n`
  }
  writeFileSync(join(distDir, 'robots.txt'), contents)
}

function write404() {
  const route = {
    path: '/404',
    title: seoCopy.notFound.title,
    description: seoCopy.notFound.description,
    noindex: true,
    snapshot: true,
    body: () => '',
  }
  writeFileSync(join(distDir, '404.html'), renderDocument(route, []))
}

// --- Run ---------------------------------------------------------------------

async function main() {
  const rows = await fetchProducts()
  const products = rows.map((row) => ({
    ...row,
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    brand: String(row.brand ?? ''),
    category: String(row.category ?? ''),
    price: Number(row.price ?? 0),
    original_price: row.original_price ?? null,
    rating: Number(row.rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    list_image: Array.isArray(row.list_image) ? row.list_image : [],
    in_stock: row.in_stock !== false,
  }))

  const routes = [
    ...staticRoutes,
    ...products.filter((product) => product.id).map(productRoute),
  ]

  for (const route of routes) writeRoute(route, products)
  writeSitemap(routes)
  writeRobots()
  write404()

  console.log(
    `[seo] Pre-rendered ${routes.length} route(s) (${products.length} product(s)) → ${distDir}`,
  )
}

main().catch((error) => {
  console.error('[seo] Pre-render failed:', error)
  process.exitCode = 1
})

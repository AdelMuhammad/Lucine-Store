# Lucine Store — frontend

A bilingual (English / Arabic, with full RTL) storefront and admin console built
with React, TypeScript and Vite.

## Features

- **Storefront** — catalogue, product gallery, cart, checkout, account & orders,
  wishlist, a **live coupon-code section** on the offers page, product
  reviews/ratings, a live **customer-care chat** (floating widget + a dedicated
  `/support` page with FAQs), a **newsletter sign-up** in the footer and in the
  marketing popup, a **campaign announcement bar** above the header, a
  **hero slider** driven by published banners, and a **notification bell** for
  order updates, replies from the care team and in-app campaigns.
- **Admin console** — products, categories, brands/colours/sizes/ages & audience,
  orders, customers, review moderation, a **customer-care inbox** where every
  storefront chat can be read, replied to, and marked open/in progress/resolved,
  and a **notifications centre** that lets you broadcast announcements to every
  customer and audit the full notification log. A bell in the admin header rings
  for every new customer message. Orders can be created on a customer's behalf —
  picking an existing customer (rebuilt from previous orders) auto-fills their
  details, or enter a brand-new one — and the order list can be filtered and
  grouped by date (today, yesterday, last 7/30 days, this month, or a custom
  range).
- **Marketing** — a full in-house marketing system: coupon engine, banners
  (announcement bar / homepage hero / popup), campaigns with an outbox,
  audience segments, newsletter subscribers, referrals, analytics and loyalty
  tiers. See [Marketing system](#marketing-system).

## Backend (Supabase)

The catalogue (products, categories, attributes, reviews), orders, customer-care
conversations and messages, the shared notification inbox, and the whole
marketing dataset (coupons, redemptions, banners, subscribers, campaigns,
campaign messages, referral codes and marketing settings) can be stored in
Supabase. Notifications and support-chat rows are streamed live to
open browsers via **Supabase Realtime**, so a customer's bell and the admin
console stay in sync. The app works without it too: when credentials are missing
it falls back to the local seed data.

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL → New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql) and run it. This creates the
   tables, row-level-security policies, the public `product-images` storage
   bucket, seeds the catalog, and publishes the `notifications`,
   `support_messages` and `support_conversations` tables for Realtime.
3. Run [`supabase/delivery-proof.sql`](./supabase/delivery-proof.sql) in a
   separate SQL Editor query after the main schema. This adds shipment carrier
   and agent snapshots and a private delivery-proof image bucket. Admins can
   upload proof from the delivery board; the customer who owns the order can
   view the proof and shipment timeline on its order-tracking page.
4. Copy `.env.example` to `.env` and fill in the values from
   **Project Settings → API**:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Restart the dev server. On first load the app hydrates its stores from
   Supabase, and every admin create/update/delete (and each checkout order) is
   written back to the database. Product images uploaded from the admin form go
   to the `product-images` bucket.

Orders placed before the backend was connected live in `localStorage`; they are
merged in on load and pushed up once so Supabase becomes the single source of
truth. **Orders → Migrate to Supabase** re-runs that push on demand. The orders
table itself is queried server-side — searching, status, date filtering
(today / yesterday / last 7 / last 30 / this month / custom range), sorting and
pagination all happen in Supabase, and the console falls back to local filtering
when credentials are missing.

> The policies in `schema.sql` grant the `anon` role full access because this
> demo has no authentication yet. Tighten them before going to production — see
> the notes at the bottom of the SQL file.

## Marketing system

Everything lives under **Admin → Marketing** (nine pages, all backed by the
`lucine-marketing*` stores and the `coupons` / `banners` / `subscribers` /
`campaigns` / `campaign_messages` / `referral_codes` / `marketing_settings`
tables).

- **Coupons** (`/admin/marketing/coupons`) — the single source of discount
  truth. A code can be a percentage, a flat amount or free shipping, with a
  minimum subtotal, a start/end window, a total usage limit, a per-customer
  limit, a first-order-only flag and a scope (whole cart, selected categories or
  selected products). The same rules module
  ([`coupons.ts`](./src/features/marketing/coupons.ts)) is used by the admin
  list, the checkout and the storefront offers page, so a code behaves
  identically everywhere. Redemptions are recorded per order and feed the
  reports.
- **Banners** (`/admin/marketing/banners`) — three placements:
  `announcement` (the strip above the header, rotates when several are live),
  `hero` (the homepage slider) and `popup` (shown after the delay configured in
  **Loyalty & settings**). Each banner has bilingual copy, an optional CTA link
  and image, a priority and a start/end window. Dismissed banners stay closed in
  that browser.
- **Campaigns** (`/admin/marketing/campaigns`) — compose a campaign, pick a
  channel and a target segment, then send now or schedule. **In-app** campaigns
  reuse the notification bell, so their opens are real (they are read from the
  notification read state). **Email** and **SMS** have no provider wired up:
  sending fills the **outbox** with one `sent` row per recipient, which is the
  honest audit trail instead of fake delivery metrics. There is no cron, so a
  scheduled campaign becomes due and is sent by pressing **Send now**.
- **Segments** (`/admin/marketing/segments`) — build an audience from order
  history: everyone, newsletter subscribers, new, repeat, VIP (spend
  threshold), lapsed (no order for N days) or a city. The builder shows exactly
  who matches before you create a campaign from it.
- **Subscribers** (`/admin/marketing/subscribers`) — the newsletter list
  (footer + popup sign-ups, plus manual additions and unsubscribes) with CSV
  export.
- **Referrals** (`/admin/marketing/referrals`) — friend codes per customer,
  with commission rate and the revenue/orders each code brought in. Storefront
  `?ref=CODE` links are tracked and attached to the order.
- **Analytics** (`/admin/marketing/analytics`) — revenue, orders, average order,
  new customers, coupon discount given, referral revenue and top UTM sources
  over any date range, with CSV export of the underlying orders.
- **Loyalty** (`/admin/marketing/loyalty`) — points per currency unit and the
  silver/gold spend thresholds, plus the member list by lifetime spend and the
  popup delay.

**Attribution**: `?utm_source` / `?utm_medium` / `?utm_campaign` are captured on
the first page view (first touch wins) and stored with the order, which is what
the analytics "top sources" report reads.

**Known limitations**: email/SMS delivery is outbox-only; scheduled campaigns
need a manual send; a coupon's per-customer limit is enforced from the orders
saved in the current browser plus the coupon's global counter.

## SEO & pre-rendering

A plain Vite SPA ships an empty `<div id="root"></div>`, so any crawler that
does not execute JavaScript (or a slower one that gives up early) sees a blank
page. This project fixes that at build time instead of relying on the crawler:

1. `vite build` produces the normal SPA bundle plus `dist/index.html`.
2. [`scripts/seo-prerender.mjs`](./scripts/seo-prerender.mjs) then runs and
   writes a **real, crawlable HTML document for every storefront route** —
   `/`, `/products`, `/discounts`, `/rewards`, `/about`, `/support` and one page
   per product. Each document has a complete `<head>` (title, description,
   canonical, `hreflang`, Open Graph, Twitter) **and** a semantic content
   snapshot (headings, copy and working `<a>` links) inside `#root`.
3. The same pass emits [`sitemap.xml`](./scripts/seo-prerender.mjs),
   rewrites `robots.txt` with the real host, and writes the GitHub Pages
   `404.html` fallback (with `noindex`). Product pages are fetched live from
   Supabase during the build, so new products are indexed on the next deploy.

React clears the snapshot and takes over as soon as it mounts, so browsers still
get the normal SPA experience. On client-side navigation the runtime
[`<Seo>`](./src/components/seo/Seo.tsx) component keeps the head in sync.

**One source of truth**: [`src/lib/seo.ts`](./src/lib/seo.ts) holds the site
config and the schema.org builders used by *both* the prerender script and the
runtime component, so a page keeps the same title, canonical URL and rich result
whether it is served as static HTML or rendered in the browser. Structured data
covers `Organization`, `WebSite` (+ sitelinks search box), `Product` with
`Offer`/`AggregateRating`, `BreadcrumbList`, `ItemList` and `FAQPage` (support
page).

**Bilingual**: English is the primary language (`<html lang="en">`, canonical
URLs without a query string) and Arabic is exposed as a `hreflang="ar"`
alternate at `?lang=ar`. `main.tsx` honours that parameter on a cold load and
`App.tsx` switches `<html lang>`/`dir` to RTL. `og:locale` /
`og:locale:alternate` follow the active language.

**Private pages are kept out of the index**: `/account`, `/checkout`, `/login`,
`/signup`, `/forgot-password` and the whole `/admin` console render a
`noindex, follow` robots tag, and `robots.txt` disallows them as well.

Configure the public origin so canonical URLs never depend on the host the HTML
happens to be served from:

```bash
VITE_SITE_URL=https://adelmuhammad.github.io/Lucine-Store/
```

When it is left empty the build derives the URL from the Vite base path (which
is correct in CI), and at runtime from `window.location`. The social sharing
image (`public/og-default.png`, 1200×630) is generated without any dependency by
`npm run og:image`.

## GitHub Pages deployment

The repository deploys the frontend to
[`https://adelmuhammad.github.io/Lucine-Store/`](https://adelmuhammad.github.io/Lucine-Store/)
whenever changes are pushed to `master`. In the repository's **Settings →
Pages**, set the build and deployment source to **GitHub Actions**.

The Pages workflow builds this frontend and publishes it with the repository
path configured as the Vite base URL. Routes are supported on refresh through
the generated `404.html` fallback. To connect the Supabase backend, add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository Actions secrets;
without them, the app uses its local seed data.

GitHub's free `github.io` hostname is tied to the account name and cannot be
renamed to a store brand. The project name (`Lucine-Store`) appears after the
hostname; using a branded domain such as `lucinestore.com` requires owning that
domain.

## Commands

```bash
npm install      # install dependencies
npm run dev      # start the dev server
npm run build    # type-check, build and pre-render every route for SEO
npm run lint     # run oxlint
```

Extra scripts used by the SEO pipeline:

```bash
npm run build:spa    # type-check + build only (skips the pre-render pass)
npm run prerender    # re-run the pre-render pass over an existing dist/
npm run og:image     # regenerate public/og-default.png
```

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

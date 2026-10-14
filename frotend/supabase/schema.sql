-- ============================================================================
-- Lucine Store — Supabase schema
-- ----------------------------------------------------------------------------
-- Run this file once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It is idempotent: safe to run again, it will not duplicate rows.
--
-- Tables
--   categories  : product categories (bilingual)
--   products    : catalog items, bilingual, with list_image / colors / sizes /
--                 age_groups stored as JSONB
--   promotions  : coupon codes (bilingual)
--   orders      : customer orders with a JSONB address + items snapshot
--   attributes  : bilingual catalog attributes (brands / colours / sizes / ages)
--   reviews     : product reviews + ratings written by shoppers, moderated in admin
--   support_conversations : customer-care chats (one row per thread)
--   support_messages      : individual messages inside a support conversation
--   notifications         : cross-device inbox for customers and the admin team
--   profiles              : one row per auth.users account (role: customer/admin)
--
-- Storage
--   bucket "product-images" : public bucket for uploaded product photos
--
-- Security
--   Row Level Security is enabled on every table. Visitors (anon) may browse
--   the catalog, read published reviews, start guest support chats, and read
--   broadcast announcements. Signed-in accounts own their orders, support
--   conversations, notifications and profile. The admin console is reserved
--   for accounts whose profiles.role = 'admin' (see notes at the end).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id             text primary key,
  name           text not null,
  name_ar        text not null default '',
  description    text not null default '',
  description_ar text not null default '',
  updated_at     timestamptz not null default now()
);

create table if not exists public.products (
  id             text primary key,
  name           text not null,
  name_ar        text not null default '',
  description    text not null default '',
  description_ar text not null default '',
  category       text not null default '',
  category_ar    text not null default '',
  brand          text not null default '',
  brand_ar       text not null default '',
  age_groups     jsonb not null default '[]'::jsonb,
  price          numeric not null default 0,
  original_price numeric,
  rating         numeric not null default 0,
  review_count   integer not null default 0,
  listed_at      date not null default now(),
  list_image     jsonb not null default '[]'::jsonb,
  colors         jsonb not null default '[]'::jsonb,
  sizes          jsonb not null default '[]'::jsonb,
  in_stock       boolean not null default true,
  updated_at     timestamptz not null default now()
);

-- Deprecated: superseded by `public.coupons` below, which adds schedules,
-- usage limits and product/category scopes. Kept so databases created before
-- the marketing upgrade keep loading without errors.
create table if not exists public.promotions (
  code           text primary key,
  percent        integer not null default 0,
  title          text not null default '',
  title_ar       text not null default '',
  description    text not null default '',
  description_ar text not null default '',
  updated_at     timestamptz not null default now()
);

create table if not exists public.orders (
  id              text primary key,
  created_at      timestamptz not null default now(),
  status          text not null default 'placed',
  email           text not null default '',
  phone           text not null default '',
  address         jsonb not null default '{}'::jsonb,
  shipping_method text not null default 'standard',
  payment_method  text not null default 'card',
  items           jsonb not null default '[]'::jsonb,
  subtotal        numeric not null default 0,
  shipping        numeric not null default 0,
  coupon_code     text,
  coupon_discount numeric,
  referred_by     text,
  total           numeric not null default 0,
  updated_at      timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists orders_status_idx      on public.orders (status);
create index if not exists orders_created_at_idx  on public.orders (created_at desc);

-- Where the shopper came from (captured from ?utm_* on their first visit) so the
-- marketing reports can attribute orders to a source, medium and campaign.
alter table public.orders add column if not exists source       text not null default '';
alter table public.orders add column if not exists medium       text not null default '';
alter table public.orders add column if not exists campaign     text not null default '';
alter table public.orders add column if not exists landing_page text not null default '';

-- Bilingual catalog attributes (brands, colours, sizes, ages) managed from the
-- admin console and referenced when creating/editing products. The `kind`
-- column distinguishes the lists so a single table can hold them all.
create table if not exists public.attributes (
  kind       text not null check (kind in ('brands', 'colors', 'sizes', 'ages')),
  id         text not null,
  name       text not null,
  name_ar    text not null default '',
  hex        text not null default '',
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);

-- Extend the allowed kinds on databases created before the ages/audience list
-- existed. Safe to re-run.
alter table public.attributes drop constraint if exists attributes_kind_check;
alter table public.attributes add constraint attributes_kind_check
  check (kind in ('brands', 'colors', 'sizes', 'ages'));

-- Product reviews and ratings submitted from the storefront and moderated from
-- the admin console. The seed rows carry an Arabic translation; reviews written
-- by shoppers are stored in the language they typed.
create table if not exists public.reviews (
  id           text primary key,
  product_id   text not null,
  author_name  text not null,
  author_email text not null default '',
  rating       integer not null default 5 check (rating between 1 and 5),
  title        text not null default '',
  title_ar     text not null default '',
  comment      text not null default '',
  comment_ar   text not null default '',
  status       text not null default 'published' check (status in ('published', 'hidden')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists reviews_product_idx    on public.reviews (product_id);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

-- Customer-care chat. Each conversation groups the messages between one
-- customer (the storefront visitor) and the support team. The unread counters
-- drive the badges in the storefront chat and the admin console.
create table if not exists public.support_conversations (
  id                  text primary key,
  customer_id         text not null,
  customer_name       text not null default '',
  customer_email      text not null default '',
  topic               text not null default 'other'
                        check (topic in ('order', 'product', 'return', 'payment', 'other')),
  subject             text not null default '',
  status              text not null default 'open'
                        check (status in ('open', 'pending', 'resolved')),
  order_id            text,
  unread_for_admin    integer not null default 0,
  unread_for_customer integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.support_messages (
  id              text primary key,
  conversation_id text not null
                    references public.support_conversations (id) on delete cascade,
  author          text not null default 'customer'
                    check (author in ('customer', 'support')),
  author_name     text not null default '',
  body            text not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists support_conversations_updated_idx
  on public.support_conversations (updated_at desc);
create index if not exists support_messages_conversation_idx
  on public.support_messages (conversation_id, created_at);

-- Cross-device notification inbox shared by the storefront and the admin
-- console. Each row is an event for a customer or the care team; the
-- `recipient_id` is a customer's browser id, `all` for a broadcast, or `admin`.
-- Read state is tracked on each device, so broadcasts stay per-user.
create table if not exists public.notifications (
  id           text primary key,
  audience     text not null default 'customer'
                 check (audience in ('customer', 'admin')),
  recipient_id text not null default 'all',
  kind         text not null default 'system'
                 check (kind in ('support', 'order', 'announcement', 'system')),
  title        text not null default '',
  title_ar     text not null default '',
  body         text not null default '',
  body_ar      text not null default '',
  link         text not null default '',
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_created_idx
  on public.notifications (created_at desc);
create index if not exists notifications_audience_idx
  on public.notifications (audience, recipient_id);

-- ---------------------------------------------------------------------------
-- Marketing
--   coupons            : the discount-code engine (schedule, limits, scope)
--   coupon_redemptions : one row per coupon used on an order (reporting)
--   banners            : announcement bar / home hero / popup creatives
--   subscribers        : newsletter sign-ups
--   campaigns          : in-app, email and SMS campaigns
--   campaign_messages  : outbox rows for email + SMS campaigns
--   referral_codes     : word-of-mouth / affiliate codes per customer
--   marketing_settings : the single row of store-wide marketing settings
-- ---------------------------------------------------------------------------

create table if not exists public.coupons (
  code               text primary key,
  title              text not null default '',
  title_ar           text not null default '',
  description        text not null default '',
  description_ar     text not null default '',
  kind               text not null default 'percent'
                       check (kind in ('percent', 'fixed', 'free-shipping')),
  value              numeric not null default 0,
  min_subtotal       numeric not null default 0,
  starts_at          timestamptz,
  ends_at            timestamptz,
  usage_limit        integer,
  per_customer_limit integer not null default 1,
  first_order_only   boolean not null default false,
  scope              text not null default 'all'
                       check (scope in ('all', 'categories', 'products')),
  scope_ids          jsonb not null default '[]'::jsonb,
  is_active          boolean not null default true,
  used_count         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists coupons_active_idx
  on public.coupons (is_active, ends_at);

create table if not exists public.coupon_redemptions (
  id           text primary key,
  coupon_code  text not null default '',
  order_id     text not null default '',
  customer_key text not null default '',
  discount     numeric not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists coupon_redemptions_code_idx
  on public.coupon_redemptions (coupon_code);
create index if not exists coupon_redemptions_customer_idx
  on public.coupon_redemptions (coupon_code, customer_key);

create table if not exists public.banners (
  id           text primary key,
  placement    text not null default 'announcement'
                 check (placement in ('announcement', 'hero', 'popup')),
  eyebrow      text not null default '',
  eyebrow_ar   text not null default '',
  title        text not null default '',
  title_ar     text not null default '',
  body         text not null default '',
  body_ar      text not null default '',
  cta_label    text not null default '',
  cta_label_ar text not null default '',
  link         text not null default '',
  image_url    text not null default '',
  priority     integer not null default 0,
  starts_at    timestamptz,
  ends_at      timestamptz,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists banners_placement_idx
  on public.banners (placement, is_active, priority desc);

create table if not exists public.subscribers (
  email         text primary key,
  name          text not null default '',
  language      text not null default 'en',
  source        text not null default 'footer',
  is_subscribed boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.campaigns (
  id           text primary key,
  name         text not null default '',
  channel      text not null default 'in-app'
                 check (channel in ('in-app', 'email', 'sms')),
  segment      jsonb not null default '{"kind":"all"}'::jsonb,
  subject      text not null default '',
  subject_ar   text not null default '',
  body         text not null default '',
  body_ar      text not null default '',
  link         text not null default '',
  status       text not null default 'draft'
                 check (status in ('draft', 'scheduled', 'sent')),
  scheduled_at timestamptz,
  sent_at      timestamptz,
  recipients   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists campaigns_status_idx
  on public.campaigns (status, created_at desc);

create table if not exists public.campaign_messages (
  id             text primary key,
  campaign_id    text not null default '',
  channel        text not null default 'email',
  recipient      text not null default '',
  recipient_name text not null default '',
  subject        text not null default '',
  body           text not null default '',
  status         text not null default 'queued'
                   check (status in ('queued', 'sent', 'failed')),
  created_at     timestamptz not null default now(),
  sent_at        timestamptz
);

create index if not exists campaign_messages_campaign_idx
  on public.campaign_messages (campaign_id);

create table if not exists public.referral_codes (
  code       text primary key,
  owner_key  text not null default '',
  owner_name text not null default '',
  commission numeric not null default 10,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists referral_codes_owner_idx
  on public.referral_codes (owner_key);

create table if not exists public.marketing_settings (
  id         text primary key default 'default',
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Operations
--   ops_settings    : the single row of store-wide operations settings
--   suppliers       : vendors the store buys stock from
--   purchase_orders : restocking orders (line items kept as JSONB)
--   stock_movements : every stock change, for the inventory audit trail
--   carriers        : shipping companies (external couriers)
--   shipping_zones  : city/area delivery pricing, optionally tied to a carrier
--   delivery_agents : in-house couriers that own deliveries
--   shipments       : one delivery per order (status, tracking, COD)
--   invoices        : customer (sale) and supplier (purchase) invoices
--   accounts        : chart of accounts for double-entry bookkeeping
--   journal_entries : balanced debit/credit entries
--   expenses        : running costs booked straight to the ledger
--   payments        : money received from customers / paid to suppliers
-- ---------------------------------------------------------------------------

-- Buying price + inventory tracking on the catalog. `stock_quantity` is raised
-- when a purchase order is received and lowered when an order is confirmed;
-- `null` means the product's stock is not tracked.
alter table public.products add column if not exists cost_price          numeric;
alter table public.products add column if not exists stock_quantity      integer;
alter table public.products add column if not exists low_stock_threshold integer;
alter table public.products add column if not exists supplier_id         text;

create table if not exists public.ops_settings (
  id         text primary key default 'default',
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id            text primary key,
  name          text not null default '',
  name_ar       text not null default '',
  contact_name  text not null default '',
  phone         text not null default '',
  email         text not null default '',
  address       text not null default '',
  city          text not null default '',
  country       text not null default '',
  tax_id        text not null default '',
  payment_terms integer not null default 0,
  notes         text not null default '',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists suppliers_name_idx on public.suppliers (name);

create table if not exists public.purchase_orders (
  id            text primary key,
  number        text not null default '',
  supplier_id   text not null default '',
  status        text not null default 'draft'
                  check (status in ('draft', 'ordered', 'partial', 'received', 'cancelled')),
  ordered_at    date,
  expected_at   date,
  received_at   date,
  notes         text not null default '',
  items         jsonb not null default '[]'::jsonb,
  discount      numeric not null default 0,
  shipping_cost numeric not null default 0,
  tax_rate      numeric not null default 0,
  amount_paid   numeric not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists purchase_orders_supplier_idx
  on public.purchase_orders (supplier_id);
create index if not exists purchase_orders_status_idx
  on public.purchase_orders (status, ordered_at desc);

create table if not exists public.stock_movements (
  id         text primary key,
  product_id text not null default '',
  quantity   integer not null default 0,
  reason     text not null default 'purchase'
               check (reason in ('purchase', 'order', 'return', 'adjustment')),
  reference  text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_idx
  on public.stock_movements (product_id, created_at desc);

create table if not exists public.carriers (
  id           text primary key,
  name         text not null default '',
  name_ar      text not null default '',
  phone        text not null default '',
  email        text not null default '',
  website      text not null default '',
  tracking_url text not null default '',
  supports_cod boolean not null default true,
  base_rate    numeric not null default 0,
  cod_fee      numeric not null default 0,
  cod_fee_rate numeric not null default 0,
  notes        text not null default '',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.shipping_zones (
  id         text primary key,
  name       text not null default '',
  name_ar    text not null default '',
  city       text not null default '',
  carrier_id text not null default '',
  fee        numeric not null default 0,
  cod_fee    numeric not null default 0,
  eta_days   integer not null default 3,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipping_zones_city_idx
  on public.shipping_zones (city);

create table if not exists public.delivery_agents (
  id         text primary key,
  name       text not null default '',
  phone      text not null default '',
  email      text not null default '',
  vehicle    text not null default 'van'
               check (vehicle in ('motorcycle', 'car', 'van', 'truck')),
  zone_ids   jsonb not null default '[]'::jsonb,
  notes      text not null default '',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id              text primary key,
  order_id        text not null default '',
  order_total     numeric not null default 0,
  customer_name   text not null default '',
  phone           text not null default '',
  city            text not null default '',
  address         text not null default '',
  carrier_id      text not null default '',
  agent_id        text not null default '',
  zone_id         text not null default '',
  tracking_number text not null default '',
  status          text not null default 'pending'
                    check (status in (
                      'pending', 'picked-up', 'in-transit', 'out-for-delivery',
                      'delivered', 'failed', 'returned', 'cancelled'
                    )),
  payment_method  text not null default 'card',
  cod_amount      numeric not null default 0,
  cod_collected   numeric not null default 0,
  shipping_cost   numeric not null default 0,
  attempts        integer not null default 0,
  notes           text not null default '',
  events          jsonb not null default '[]'::jsonb,
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists shipments_order_idx    on public.shipments (order_id);
create index if not exists shipments_status_idx   on public.shipments (status, created_at desc);
create index if not exists shipments_tracking_idx on public.shipments (tracking_number);

create table if not exists public.invoices (
  id                text primary key,
  number            text not null default '',
  kind              text not null default 'sale'
                      check (kind in ('sale', 'purchase')),
  order_id          text not null default '',
  purchase_order_id text not null default '',
  party_name        text not null default '',
  party_email       text not null default '',
  party_phone       text not null default '',
  party_address     text not null default '',
  party_tax_id      text not null default '',
  status            text not null default 'draft'
                      check (status in ('draft', 'issued', 'paid', 'void')),
  issued_at         date,
  due_at            date,
  lines             jsonb not null default '[]'::jsonb,
  discount          numeric not null default 0,
  shipping          numeric not null default 0,
  tax_rate          numeric not null default 0,
  amount_paid       numeric not null default 0,
  currency          text not null default 'USD',
  notes             text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists invoices_kind_idx  on public.invoices (kind, issued_at desc);
create index if not exists invoices_order_idx on public.invoices (order_id);

create table if not exists public.accounts (
  code       text primary key,
  name       text not null default '',
  name_ar    text not null default '',
  type       text not null default 'asset'
               check (type in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id          text primary key,
  number      text not null default '',
  entry_date  date,
  memo        text not null default '',
  source_type text not null default 'manual'
                check (source_type in (
                  'order', 'invoice', 'purchase-order', 'expense', 'payment', 'manual'
                )),
  source_id   text not null default '',
  lines       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists journal_entries_date_idx
  on public.journal_entries (entry_date desc);
create index if not exists journal_entries_source_idx
  on public.journal_entries (source_type, source_id);

create table if not exists public.expenses (
  id           text primary key,
  expense_date date,
  category     text not null default 'other'
                 check (category in (
                   'rent', 'salaries', 'marketing', 'shipping',
                   'utilities', 'supplies', 'other'
                 )),
  description  text not null default '',
  supplier_id  text not null default '',
  amount       numeric not null default 0,
  method       text not null default 'cash'
                 check (method in ('cash', 'card', 'transfer', 'wallet')),
  is_paid      boolean not null default true,
  notes        text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (expense_date desc);

create table if not exists public.payments (
  id          text primary key,
  kind        text not null default 'customer'
                check (kind in ('customer', 'supplier')),
  party_name  text not null default '',
  party_key   text not null default '',
  invoice_id  text not null default '',
  order_id    text not null default '',
  supplier_id text not null default '',
  amount      numeric not null default 0,
  method      text not null default 'cash'
                check (method in ('cash', 'card', 'transfer', 'wallet')),
  paid_at     date,
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists payments_kind_idx on public.payments (kind, paid_at desc);

-- One row per auth account, created automatically when a user signs up. The
-- `role` column decides whether the account may use the admin console.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null default '',
  full_name  text not null default '',
  role       text not null default 'customer' check (role in ('customer', 'admin')),
  phone      text not null default '',
  birthday   text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Creates the profile row the moment a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- True when the signed-in account carries role = 'admin' in profiles. Used by
-- the RLS policies below to gate admin-only reads and writes.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Orders and support conversations carry the owning account so RLS can scope
-- reads and writes per user (null for conversations started by anon visitors).
alter table public.orders add column if not exists user_id
  uuid references auth.users (id) on delete set null;
create index if not exists orders_user_idx on public.orders (user_id);

alter table public.support_conversations add column if not exists user_id
  uuid references auth.users (id) on delete set null;
create index if not exists support_conversations_user_idx
  on public.support_conversations (user_id);

-- Assigns the signed-in account to rows on insert. Runs before RLS checks, so
-- a user can never create an order or conversation owned by someone else.
create or replace function public.set_row_owner()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.user_id = auth.uid();
  return new;
end;
$$;

drop trigger if exists orders_set_owner on public.orders;
create trigger orders_set_owner
  before insert on public.orders
  for each row execute function public.set_row_owner();

drop trigger if exists support_conversations_set_owner on public.support_conversations;
create trigger support_conversations_set_owner
  before insert on public.support_conversations
  for each row execute function public.set_row_owner();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
--
-- ROLES
--   anon          : visitors. May browse the catalog, read published reviews
--                   and active marketing content, start guest support chats.
--   authenticated : signed-in customers AND staff; data access is scoped with
--                   user_id = auth.uid().
--   admin         : accounts whose profiles.role = 'admin' — full manage
--                   access everywhere (gated by public.is_admin()).
--
-- GUEST SUPPORT CHATS
--   Guests can still start a support conversation without an account
--   (user_id stays null). Conversation/message rows with user_id = null are
--   readable by anon so the storefront chat works end-to-end. Rows that belong
--   to a signed-in account are only readable by that account and by admin.
--
-- ORDERS
--   Checkout requires an account, so order INSERT is restricted to the
--   authenticated role. The orders_set_owner trigger stamps user_id server-side
--   before the RLS check, so a client can never claim someone else's order.
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.promotions enable row level security;
alter table public.orders     enable row level security;
alter table public.attributes enable row level security;
alter table public.reviews    enable row level security;
alter table public.profiles   enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages      enable row level security;
alter table public.notifications         enable row level security;

-- Catalog tables: everyone may read; only admin may write.
drop policy if exists "catalog read only" on public.categories;
drop policy if exists "catalog manage admin" on public.categories;
create policy "catalog read only" on public.categories
  for select to anon, authenticated using (true);
create policy "catalog manage admin" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "catalog read only" on public.products;
drop policy if exists "catalog manage admin" on public.products;
create policy "catalog read only" on public.products
  for select to anon, authenticated using (true);
create policy "catalog manage admin" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "catalog read only" on public.promotions;
drop policy if exists "catalog manage admin" on public.promotions;
create policy "catalog read only" on public.promotions
  for select to anon, authenticated using (true);
create policy "catalog manage admin" on public.promotions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "catalog read only" on public.attributes;
drop policy if exists "catalog manage admin" on public.attributes;
create policy "catalog read only" on public.attributes
  for select to anon, authenticated using (true);
create policy "catalog manage admin" on public.attributes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Orders: only signed-in customers place orders; each customer reads and
-- updates their own rows; admin manages everything.
drop policy if exists "orders place" on public.orders;
drop policy if exists "orders read owner" on public.orders;
drop policy if exists "orders read admin" on public.orders;
drop policy if exists "orders update owner" on public.orders;
drop policy if exists "orders update admin" on public.orders;
drop policy if exists "orders delete admin" on public.orders;
create policy "orders place" on public.orders
  for insert to authenticated with check (true);
create policy "orders read owner" on public.orders
  for select to authenticated using (user_id = auth.uid());
create policy "orders read admin" on public.orders
  for select to authenticated using (public.is_admin());
create policy "orders update owner" on public.orders
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "orders update admin" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "orders delete admin" on public.orders
  for delete to authenticated using (public.is_admin());

-- Reviews: published ones are public; shoppers may submit; admin moderates.
drop policy if exists "reviews read published" on public.reviews;
drop policy if exists "reviews read admin" on public.reviews;
drop policy if exists "reviews insert" on public.reviews;
drop policy if exists "reviews moderate admin" on public.reviews;
drop policy if exists "reviews delete admin" on public.reviews;
create policy "reviews read published" on public.reviews
  for select to anon, authenticated using (status = 'published');
create policy "reviews read admin" on public.reviews
  for select to authenticated using (public.is_admin());
create policy "reviews insert" on public.reviews
  for insert to anon, authenticated with check (true);
create policy "reviews moderate admin" on public.reviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "reviews delete admin" on public.reviews
  for delete to authenticated using (public.is_admin());

-- Profiles: an account manages its own row; admin may read every account.
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles read admin" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles read own" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "profiles read admin" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "profiles update own" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Support: guests may start chats (user_id stays null) and read only chats
-- without an owner; signed-in customers read their own chats; admin all.
drop policy if exists "support conversations insert" on public.support_conversations;
drop policy if exists "support conversations read" on public.support_conversations;
drop policy if exists "support conversations read admin" on public.support_conversations;
drop policy if exists "support conversations update" on public.support_conversations;
drop policy if exists "support conversations update admin" on public.support_conversations;
drop policy if exists "support conversations delete admin" on public.support_conversations;
create policy "support conversations insert" on public.support_conversations
  for insert to anon, authenticated with check (true);
create policy "support conversations read" on public.support_conversations
  for select to anon, authenticated using (
    user_id is null or user_id = auth.uid()
  );
create policy "support conversations read admin" on public.support_conversations
  for select to authenticated using (public.is_admin());
create policy "support conversations update" on public.support_conversations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "support conversations update admin" on public.support_conversations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "support conversations delete admin" on public.support_conversations
  for delete to authenticated using (public.is_admin());

drop policy if exists "support messages insert" on public.support_messages;
drop policy if exists "support messages read" on public.support_messages;
drop policy if exists "support messages read admin" on public.support_messages;
drop policy if exists "support messages delete admin" on public.support_messages;
create policy "support messages insert" on public.support_messages
  for insert to anon, authenticated with check (true);
create policy "support messages read" on public.support_messages
  for select to anon, authenticated using (
    exists (
      select 1 from public.support_conversations c
      where c.id = support_messages.conversation_id
        and (c.user_id is null or c.user_id = auth.uid())
    )
  );
create policy "support messages read admin" on public.support_messages
  for select to authenticated using (public.is_admin());
create policy "support messages delete admin" on public.support_messages
  for delete to authenticated using (public.is_admin());

-- Notifications: customers see broadcasts ('all') and messages addressed to
-- their account; admin sees everything. Inserts stay open for the chat/order
-- flows that originate from both customers and staff.
drop policy if exists "notifications read customer" on public.notifications;
drop policy if exists "notifications read admin" on public.notifications;
drop policy if exists "notifications insert" on public.notifications;
drop policy if exists "notifications update admin" on public.notifications;
drop policy if exists "notifications delete admin" on public.notifications;
create policy "notifications read customer" on public.notifications
  for select to anon, authenticated using (
    audience = 'customer'
    and (
      recipient_id = 'all'
      or (auth.uid() is not null and recipient_id = auth.uid()::text)
    )
  );
create policy "notifications read admin" on public.notifications
  for select to authenticated using (public.is_admin());
create policy "notifications insert" on public.notifications
  for insert to anon, authenticated with check (true);
create policy "notifications update admin" on public.notifications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "notifications delete admin" on public.notifications
  for delete to authenticated using (public.is_admin());

-- Marketing tables: active content is readable in the storefront; write access
-- is reserved for admin; newsletter/redemption inserts stay open where the
-- storefront collects them.
alter table public.coupons            enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.banners            enable row level security;
alter table public.subscribers        enable row level security;
alter table public.campaigns          enable row level security;
alter table public.campaign_messages  enable row level security;
alter table public.referral_codes     enable row level security;
alter table public.marketing_settings enable row level security;

drop policy if exists "coupons read public" on public.coupons;
drop policy if exists "coupons manage admin" on public.coupons;
create policy "coupons read public" on public.coupons
  for select to anon, authenticated using (true);
create policy "coupons manage admin" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "coupon_redemptions admin" on public.coupon_redemptions;
create policy "coupon_redemptions admin" on public.coupon_redemptions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "banners read public" on public.banners;
drop policy if exists "banners manage admin" on public.banners;
create policy "banners read public" on public.banners
  for select to anon, authenticated using (is_active = true);
create policy "banners manage admin" on public.banners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "subscribers sign up" on public.subscribers;
drop policy if exists "subscribers manage admin" on public.subscribers;
create policy "subscribers sign up" on public.subscribers
  for insert to anon, authenticated with check (true);
create policy "subscribers manage admin" on public.subscribers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "campaigns admin" on public.campaigns;
create policy "campaigns admin" on public.campaigns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "campaign_messages admin" on public.campaign_messages;
create policy "campaign_messages admin" on public.campaign_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "referral_codes read public" on public.referral_codes;
drop policy if exists "referral_codes manage admin" on public.referral_codes;
create policy "referral_codes read public" on public.referral_codes
  for select to anon, authenticated using (is_active = true);
create policy "referral_codes manage admin" on public.referral_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "marketing_settings admin" on public.marketing_settings;
create policy "marketing_settings admin" on public.marketing_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Operations tables are staff-only: the console reads and writes them with an
-- admin account. The loop below enables RLS and installs the same manage-admin
-- policy on each one, so adding a table later is a single line here.
do $$
declare
  target text;
begin
  foreach target in array array[
    'ops_settings',
    'suppliers',
    'purchase_orders',
    'stock_movements',
    'carriers',
    'shipping_zones',
    'delivery_agents',
    'shipments',
    'invoices',
    'accounts',
    'journal_entries',
    'expenses',
    'payments'
  ]
  loop
    execute format('alter table public.%I enable row level security', target);
    execute format('drop policy if exists "%s admin" on public.%I', target, target);
    execute format(
      'create policy "%s admin" on public.%I for all to authenticated '
      'using (public.is_admin()) with check (public.is_admin())',
      target, target
    );
  end loop;
end $$;

-- …but a signed-in shopper may read the shipment and the invoice issued for
-- their own orders, which is what the storefront order-tracking page shows.
drop policy if exists "shipments read own" on public.shipments;
create policy "shipments read own" on public.shipments
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = shipments.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "invoices read own" on public.invoices;
create policy "invoices read own" on public.invoices
  for select to authenticated
  using (
    kind = 'sale'
    and exists (
      select 1 from public.orders o
      where o.id = invoices.order_id and o.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

-- Publish notification and support-chat changes so the storefront and admin
-- console update live. Guarded because `alter publication ... add table`
-- errors if the table is already part of the publication.
do $$
declare
  target text;
begin
  foreach target in array array[
    'notifications',
    'support_messages',
    'support_conversations',
    'shipments'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        target
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded product images
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product images read" on storage.objects;
create policy "product images read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "product images write" on storage.objects;
create policy "product images write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images update" on storage.objects;
create policy "product images update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images delete" on storage.objects;
create policy "product images delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------------

import { supabase } from '../lib/supabase'
import type {
  Banner,
  BannerPlacement,
  Campaign,
  CampaignChannel,
  CampaignMessage,
  CampaignStatus,
  MarketingSettings,
  ReferralCode,
  Subscriber,
} from '../features/marketing/store/useMarketingStore'
import { defaultMarketingSettings } from '../features/marketing/store/useMarketingStore'
import type { SegmentRule } from '../features/marketing/segments'
import { asNumber, asString } from './mappers'

/* -------------------------------------------------------------------------- */
/* Banners                                                                    */
/* -------------------------------------------------------------------------- */

type BannerRow = {
  id: string
  placement: BannerPlacement
  eyebrow: string
  eyebrow_ar: string
  title: string
  title_ar: string
  body: string
  body_ar: string
  cta_label: string
  cta_label_ar: string
  link: string
  image_url: string
  priority: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  created_at: string
}

function asPlacement(value: unknown): BannerPlacement {
  if (value === 'hero' || value === 'popup') return value
  return 'announcement'
}

function toBanner(row: Partial<BannerRow>): Banner {
  return {
    id: asString(row.id),
    placement: asPlacement(row.placement),
    eyebrow: asString(row.eyebrow),
    eyebrow_ar: asString(row.eyebrow_ar),
    title: asString(row.title),
    title_ar: asString(row.title_ar),
    body: asString(row.body),
    body_ar: asString(row.body_ar),
    ctaLabel: asString(row.cta_label),
    ctaLabel_ar: asString(row.cta_label_ar),
    link: asString(row.link),
    imageUrl: asString(row.image_url),
    priority: asNumber(row.priority),
    startsAt: asString(row.starts_at),
    endsAt: asString(row.ends_at),
    isActive: row.is_active !== false,
    createdAt: asString(row.created_at),
  }
}

function bannerRow(banner: Banner): BannerRow {
  return {
    id: banner.id,
    placement: banner.placement,
    eyebrow: banner.eyebrow,
    eyebrow_ar: banner.eyebrow_ar,
    title: banner.title,
    title_ar: banner.title_ar,
    body: banner.body,
    body_ar: banner.body_ar,
    cta_label: banner.ctaLabel,
    cta_label_ar: banner.ctaLabel_ar,
    link: banner.link,
    image_url: banner.imageUrl,
    priority: banner.priority,
    starts_at: banner.startsAt || null,
    ends_at: banner.endsAt || null,
    is_active: banner.isActive,
    created_at: banner.createdAt || new Date().toISOString(),
  }
}

export async function fetchBanners(): Promise<Banner[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('priority', { ascending: false })

  if (error) {
    console.error('[supabase] failed to load banners', error.message)
    return null
  }

  return (data ?? []).map((row) => toBanner(row as BannerRow))
}

export async function saveBanner(banner: Banner): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('banners')
    .upsert(bannerRow(banner), { onConflict: 'id' })

  if (error) console.error('[supabase] failed to save banner', error.message)
}

export async function upsertBanners(banners: Banner[]): Promise<void> {
  if (!supabase || banners.length === 0) return

  const { error } = await supabase
    .from('banners')
    .upsert(banners.map(bannerRow), { onConflict: 'id' })

  if (error) console.error('[supabase] failed to sync banners', error.message)
}

export async function deleteBanner(bannerId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('banners').delete().eq('id', bannerId)
  if (error) console.error('[supabase] failed to delete banner', error.message)
}

/* -------------------------------------------------------------------------- */
/* Newsletter subscribers                                                     */
/* -------------------------------------------------------------------------- */

type SubscriberRow = {
  email: string
  name: string
  language: string
  source: string
  is_subscribed: boolean
  created_at: string
}

function toSubscriber(row: Partial<SubscriberRow>): Subscriber {
  return {
    email: asString(row.email),
    name: asString(row.name),
    language: asString(row.language, 'en'),
    source: asString(row.source, 'footer'),
    isSubscribed: row.is_subscribed !== false,
    createdAt: asString(row.created_at),
  }
}

function subscriberRow(subscriber: Subscriber): SubscriberRow {
  return {
    email: subscriber.email,
    name: subscriber.name,
    language: subscriber.language,
    source: subscriber.source,
    is_subscribed: subscriber.isSubscribed,
    created_at: subscriber.createdAt || new Date().toISOString(),
  }
}

export async function fetchSubscribers(): Promise<Subscriber[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('subscribers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[supabase] failed to load subscribers', error.message)
    return null
  }

  return (data ?? []).map((row) => toSubscriber(row as SubscriberRow))
}

export async function saveSubscriber(subscriber: Subscriber): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('subscribers')
    .upsert(subscriberRow(subscriber), { onConflict: 'email' })

  if (error) console.error('[supabase] failed to save subscriber', error.message)
}

export async function upsertSubscribers(
  subscribers: Subscriber[],
): Promise<void> {
  if (!supabase || subscribers.length === 0) return

  const { error } = await supabase
    .from('subscribers')
    .upsert(subscribers.map(subscriberRow), { onConflict: 'email' })

  if (error) console.error('[supabase] failed to sync subscribers', error.message)
}

export async function deleteSubscriber(email: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('subscribers').delete().eq('email', email)
  if (error) {
    console.error('[supabase] failed to delete subscriber', error.message)
  }
}

/* -------------------------------------------------------------------------- */
/* Campaigns                                                                  */
/* -------------------------------------------------------------------------- */

type CampaignRow = {
  id: string
  name: string
  channel: CampaignChannel
  segment: SegmentRule
  subject: string
  subject_ar: string
  body: string
  body_ar: string
  link: string
  status: CampaignStatus
  scheduled_at: string | null
  sent_at: string | null
  recipients: number
  created_at: string
}

function asChannel(value: unknown): CampaignChannel {
  if (value === 'email' || value === 'sms') return value
  return 'in-app'
}

function asStatus(value: unknown): CampaignStatus {
  if (value === 'scheduled' || value === 'sent') return value
  return 'draft'
}

function toCampaign(row: Partial<CampaignRow>): Campaign {
  return {
    id: asString(row.id),
    name: asString(row.name),
    channel: asChannel(row.channel),
    segment: (row.segment ?? { kind: 'all' }) as SegmentRule,
    subject: asString(row.subject),
    subject_ar: asString(row.subject_ar),
    body: asString(row.body),
    body_ar: asString(row.body_ar),
    link: asString(row.link),
    status: asStatus(row.status),
    scheduledAt: asString(row.scheduled_at),
    sentAt: asString(row.sent_at),
    recipients: asNumber(row.recipients),
    createdAt: asString(row.created_at),
  }
}

function campaignRow(campaign: Campaign): CampaignRow {
  return {
    id: campaign.id,
    name: campaign.name,
    channel: campaign.channel,
    segment: campaign.segment,
    subject: campaign.subject,
    subject_ar: campaign.subject_ar,
    body: campaign.body,
    body_ar: campaign.body_ar,
    link: campaign.link,
    status: campaign.status,
    scheduled_at: campaign.scheduledAt || null,
    sent_at: campaign.sentAt || null,
    recipients: campaign.recipients,
    created_at: campaign.createdAt || new Date().toISOString(),
  }
}

export async function fetchCampaigns(): Promise<Campaign[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[supabase] failed to load campaigns', error.message)
    return null
  }

  return (data ?? []).map((row) => toCampaign(row as CampaignRow))
}

export async function saveCampaign(campaign: Campaign): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('campaigns')
    .upsert(campaignRow(campaign), { onConflict: 'id' })

  if (error) console.error('[supabase] failed to save campaign', error.message)
}

export async function upsertCampaigns(campaigns: Campaign[]): Promise<void> {
  if (!supabase || campaigns.length === 0) return

  const { error } = await supabase
    .from('campaigns')
    .upsert(campaigns.map(campaignRow), { onConflict: 'id' })

  if (error) console.error('[supabase] failed to sync campaigns', error.message)
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
  if (error) console.error('[supabase] failed to delete campaign', error.message)
}

/* -------------------------------------------------------------------------- */
/* Campaign outbox                                                            */
/* -------------------------------------------------------------------------- */

type MessageRow = {
  id: string
  campaign_id: string
  channel: CampaignChannel
  recipient: string
  recipient_name: string
  subject: string
  body: string
  status: CampaignMessage['status']
  created_at: string
  sent_at: string | null
}

function toMessage(row: Partial<MessageRow>): CampaignMessage {
  const status = asString(row.status, 'queued')
  return {
    id: asString(row.id),
    campaignId: asString(row.campaign_id),
    channel: asChannel(row.channel),
    recipient: asString(row.recipient),
    recipientName: asString(row.recipient_name),
    subject: asString(row.subject),
    body: asString(row.body),
    status:
      status === 'sent' || status === 'failed' ? status : 'queued',
    createdAt: asString(row.created_at),
    sentAt: asString(row.sent_at),
  }
}

function messageRow(message: CampaignMessage): MessageRow {
  return {
    id: message.id,
    campaign_id: message.campaignId,
    channel: message.channel,
    recipient: message.recipient,
    recipient_name: message.recipientName,
    subject: message.subject,
    body: message.body,
    status: message.status,
    created_at: message.createdAt || new Date().toISOString(),
    sent_at: message.sentAt || null,
  }
}

export async function fetchCampaignMessages(): Promise<
  CampaignMessage[] | null
> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('campaign_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[supabase] failed to load campaign messages', error.message)
    return null
  }

  return (data ?? []).map((row) => toMessage(row as MessageRow))
}

export async function createCampaignMessages(
  messages: CampaignMessage[],
): Promise<void> {
  if (!supabase || messages.length === 0) return

  const { error } = await supabase
    .from('campaign_messages')
    .insert(messages.map(messageRow))

  if (error) {
    console.error('[supabase] failed to save campaign messages', error.message)
  }
}

export async function deleteCampaignMessages(
  campaignId: string,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('campaign_messages')
    .delete()
    .eq('campaign_id', campaignId)
  if (error) {
    console.error('[supabase] failed to delete campaign messages', error.message)
  }
}

/* -------------------------------------------------------------------------- */
/* Referral codes                                                             */
/* -------------------------------------------------------------------------- */

type ReferralRow = {
  code: string
  owner_key: string
  owner_name: string
  commission: number
  is_active: boolean
  created_at: string
}

function toReferralCode(row: Partial<ReferralRow>): ReferralCode {
  return {
    code: asString(row.code),
    ownerKey: asString(row.owner_key),
    ownerName: asString(row.owner_name),
    commission: asNumber(row.commission, 10),
    isActive: row.is_active !== false,
    createdAt: asString(row.created_at),
  }
}

function referralRow(code: ReferralCode): ReferralRow {
  return {
    code: code.code,
    owner_key: code.ownerKey,
    owner_name: code.ownerName,
    commission: code.commission,
    is_active: code.isActive,
    created_at: code.createdAt || new Date().toISOString(),
  }
}

export async function fetchReferralCodes(): Promise<ReferralCode[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('referral_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[supabase] failed to load referral codes', error.message)
    return null
  }

  return (data ?? []).map((row) => toReferralCode(row as ReferralRow))
}

export async function saveReferralCode(code: ReferralCode): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('referral_codes')
    .upsert(referralRow(code), { onConflict: 'code' })

  if (error) {
    console.error('[supabase] failed to save referral code', error.message)
  }
}

export async function upsertReferralCodes(
  codes: ReferralCode[],
): Promise<void> {
  if (!supabase || codes.length === 0) return

  const { error } = await supabase
    .from('referral_codes')
    .upsert(codes.map(referralRow), { onConflict: 'code' })

  if (error) {
    console.error('[supabase] failed to sync referral codes', error.message)
  }
}

export async function deleteReferralCode(code: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('referral_codes')
    .delete()
    .eq('code', code)
  if (error) {
    console.error('[supabase] failed to delete referral code', error.message)
  }
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

/** Reads the single settings row, falling back to the built-in defaults. */
export async function fetchSettings(): Promise<MarketingSettings | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('marketing_settings')
    .select('data')
    .eq('id', 'default')
    .maybeSingle()

  if (error) {
    console.error('[supabase] failed to load marketing settings', error.message)
    return null
  }

  const data_ = (data as { data?: unknown } | null)?.data
  if (!data_ || typeof data_ !== 'object') return null

  const stored = data_ as Partial<MarketingSettings>
  const loyalty = stored.loyalty ?? defaultMarketingSettings.loyalty
  const invoice = stored.invoice ?? defaultMarketingSettings.invoice

  return {
    loyalty: {
      pointsPerCurrency: asNumber(
        loyalty.pointsPerCurrency,
        defaultMarketingSettings.loyalty.pointsPerCurrency,
      ),
      silverSpend: asNumber(
        loyalty.silverSpend,
        defaultMarketingSettings.loyalty.silverSpend,
      ),
      goldSpend: asNumber(
        loyalty.goldSpend,
        defaultMarketingSettings.loyalty.goldSpend,
      ),
    },
    popupDelaySeconds: asNumber(
      stored.popupDelaySeconds,
      defaultMarketingSettings.popupDelaySeconds,
    ),
    invoice: {
      sellerName: asString(
        invoice.sellerName,
        defaultMarketingSettings.invoice.sellerName,
      ),
      sellerAddress: asString(
        invoice.sellerAddress,
        defaultMarketingSettings.invoice.sellerAddress,
      ),
      sellerPhone: asString(
        invoice.sellerPhone,
        defaultMarketingSettings.invoice.sellerPhone,
      ),
      sellerEmail: asString(
        invoice.sellerEmail,
        defaultMarketingSettings.invoice.sellerEmail,
      ),
      sellerWebsite: asString(
        invoice.sellerWebsite,
        defaultMarketingSettings.invoice.sellerWebsite,
      ),
      taxNumber: asString(
        invoice.taxNumber,
        defaultMarketingSettings.invoice.taxNumber,
      ),
      footer: asString(invoice.footer, defaultMarketingSettings.invoice.footer),
    },
    profitMargin: asNumber(
      stored.profitMargin,
      defaultMarketingSettings.profitMargin,
    ),
    footer: asString(stored.footer, defaultMarketingSettings.footer),
  }
}

export async function saveSettings(
  settings: MarketingSettings,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase.from('marketing_settings').upsert(
    {
      id: 'default',
      data: settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.error('[supabase] failed to save marketing settings', error.message)
  }
}

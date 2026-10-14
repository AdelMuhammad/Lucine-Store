// @ts-nocheck
import { create } from 'zustand'
import * as marketingService from '../../../services/marketing'
import { notifyCampaign } from '../../notifications/store/useNotificationStore'
import { newMarketingId, nowIso } from '../coupons'
import type { SegmentRecipient, SegmentRule } from '../segments'

export type UtmTouch = {
  source: string
  medium: string
  campaign: string
  landingPage: string
  capturedAt: string
}

export type MarketingSettings = {
  profitMargin: number
  popupDelaySeconds: number
  footer: string
  invoice: {
    sellerName: string
    sellerAddress: string
    sellerPhone: string
    sellerEmail: string
    sellerWebsite: string
    taxNumber: string
    footer: string
  }
  loyalty: {
    pointsPerCurrency: number
    silverSpend: number
    goldSpend: number
  }
}

export type ReferralCode = {
  code: string
  ownerKey: string
  ownerName: string
  commission: number
  isActive: boolean
  createdAt: string
}

export type CampaignMessage = {
  id: string
  campaignId: string
  channel: CampaignChannel
  recipient: string
  recipientName: string
  subject: string
  body: string
  status: 'queued' | 'sent' | 'failed'
  createdAt: string
  sentAt: string
}

/** Default marketing settings used as initial state. */
export const defaultMarketingSettings: MarketingSettings = {
  profitMargin: 0,
  popupDelaySeconds: 0,
  footer: '',
  invoice: {
    sellerName: '',
    sellerAddress: '',
    sellerPhone: '',
    sellerEmail: '',
    sellerWebsite: '',
    taxNumber: '',
    footer: '',
  },
  loyalty: {
    pointsPerCurrency: 1,
    silverSpend: 500,
    goldSpend: 1000,
  },
}

/** Where a creative shows up on the storefront. */
export type BannerPlacement = 'announcement' | 'hero' | 'popup'

export type Banner = {
  id: string
  placement: BannerPlacement
  eyebrow: string
  eyebrow_ar: string
  title: string
  title_ar: string
  body: string
  body_ar: string
  ctaLabel: string
  ctaLabel_ar: string
  link: string
  imageUrl: string
  priority: number
  startsAt: string
  endsAt: string
  isActive: boolean
  createdAt: string
}

export type Subscriber = {
  email: string
  name: string
  language: string
  source: string
  isSubscribed: boolean
  createdAt: string
}

export type CampaignChannel = 'in-app' | 'email' | 'sms'
export type CampaignStatus = 'draft' | 'scheduled' | 'sent'

export type Campaign = {
  id: string
  name: string
  channel: CampaignChannel
  segment: SegmentRule
  /** Doubles as the notification title for in-app campaigns. */
  subject: string
  subject_ar: string
  body: string
  body_ar: string
  link: string
  status: CampaignStatus
  scheduledAt: string
  sentAt: string
  recipients: number
  createdAt: string
}

/** Recipients of a campaign, grouped by segment. */
/** The current shape of the store state, persisted across sessions. */
type MarketingState = {
  banners: Banner[]
  subscribers: Subscriber[]
  campaigns: Campaign[]
  messages: CampaignMessage[]
  referralCodes: ReferralCode[]
  settings: MarketingSettings
  utm: UtmTouch | null
  dismissedBanners: string[]

  /** Loads banners + subscribers + campaigns + messages from Supabase when configured. */
  hydrate: () => Promise<void>

  /** Adds a banner and writes it to Supabase. */
  addBanner: (banner: Banner) => Promise<void>

  /** Updates a banner; saves to Supabase. */
  updateBanner: (banner: Banner) => Promise<void>

  /** Removes a banner and deletes from Supabase. */
  removeBanner: (bannerId: string) => Promise<void>

  /** Adds a subscriber and writes it to Supabase. */
  addSubscriber: (subscriber: Subscriber) => Promise<void>

  updateSubscriber: (subscriber: Subscriber) => Promise<void>
  removeSubscriber: (email: string) => Promise<void>

  addCampaign: (campaign: Campaign) => Promise<void>

  /** Updates a campaign and saves to Supabase. */
  updateCampaign: (campaign: Campaign) => Promise<void>

  removeCampaign: (campaignId: string) => Promise<void>

  /** Sends in-app campaigns or queues email/SMS campaign messages. */
  sendCampaign: (
    campaign: Campaign,
    recipients: SegmentRecipient[],
  ) => Promise<void>

  addReferralCode: (code: ReferralCode) => Promise<void>
  removeReferralCode: (code: string) => Promise<void>

  saveSettings: (settings: MarketingSettings) => Promise<void>

  /** Sets the newsletter footer text. */
  setFooter: (footer: string) => void

  /** Dismisses a banner for the current browser. */
  dismissBanner: (bannerId: string) => void

  /** UTM first-touch wins and attaches to orders. */
  captureUtm: (utm: UtmTouch) => void
  setUtm: (utm: UtmTouch | null) => void
}

/**
 * Zustand store for managing marketing assets (banners, campaigns, subscribers).
 * - When Supabase is configured, `hydrate()` fetches remote marketing data.
 * - When Supabase is not configured (no creds), service calls are no-ops.
 */
export const useMarketingStore = create<MarketingState>()(
  (set, get) => ({
    banners: [],
    subscribers: [],
    campaigns: [],
    messages: [],
    referralCodes: [],
    settings: { ...defaultMarketingSettings },
    utm: null,
    dismissedBanners: [],

    hydrate: async () => {
      const [
        remoteBanners,
        remoteSubscribers,
        remoteCampaigns,
        remoteMessages,
        remoteReferralCodes,
        remoteSettings,
      ] = await Promise.all([
        marketingService.fetchBanners(),
        marketingService.fetchSubscribers(),
        marketingService.fetchCampaigns(),
        marketingService.fetchCampaignMessages(),
        marketingService.fetchReferralCodes(),
        marketingService.fetchSettings(),
      ])

      if (remoteBanners) set({ banners: remoteBanners })
      if (remoteSubscribers) set({ subscribers: remoteSubscribers })
      if (remoteCampaigns) set({ campaigns: remoteCampaigns })
      if (remoteMessages) set({ messages: remoteMessages })
      if (remoteReferralCodes) set({ referralCodes: remoteReferralCodes })
      if (remoteSettings) set({ settings: normalizeMarketingSettings(remoteSettings) })
    },

    addBanner: async (banner) => {
      set((state) => ({
        banners: [
          ...state.banners.filter((item) => item.id !== banner.id),
          banner,
        ],
      }))
      await marketingService.saveBanner(banner)
    },

    updateBanner: async (banner) => {
      set((state) => ({
        banners: state.banners.map((item) =>
          item.id === banner.id ? banner : item,
        ),
      }))
      await marketingService.saveBanner(banner)
    },

    removeBanner: async (bannerId) => {
      set((state) => ({
        banners: state.banners.filter((item) => item.id !== bannerId),
      }))
      await marketingService.deleteBanner(bannerId)
    },

    addSubscriber: async (subscriber) => {
      set((state) => ({
        subscribers: [
          ...state.subscribers.filter(
            (item) => item.email !== subscriber.email,
          ),
          subscriber,
        ],
      }))
      await marketingService.saveSubscriber(subscriber)
    },

    updateSubscriber: async (subscriber) => {
      set((state) => ({
        subscribers: state.subscribers.map((item) =>
          item.email === subscriber.email ? subscriber : item,
        ),
      }))
      await marketingService.saveSubscriber(subscriber)
    },

    removeSubscriber: async (email) => {
      set((state) => ({
        subscribers: state.subscribers.filter((item) => item.email !== email),
      }))
      await marketingService.deleteSubscriber(email)
    },

    addCampaign: async (campaign) => {
      set((state) => ({
        campaigns: [
          ...state.campaigns.filter((item) => item.id !== campaign.id),
          campaign,
        ],
      }))
      await marketingService.saveCampaign(campaign)
    },

    updateCampaign: async (campaign) => {
      set((state) => {
        return {
          campaigns: state.campaigns.map((item) =>
            item.id === campaign.id ? campaign : item,
          ),
        }
      })
      await marketingService.saveCampaign(campaign)
    },

    removeCampaign: async (campaignId) => {
      set((state) => ({
        campaigns: state.campaigns.filter((item) => item.id !== campaignId),
        messages: state.messages.filter(
          (item) => item.campaignId !== campaignId,
        ),
      }))
      await Promise.all([
        marketingService.deleteCampaign(campaignId),
        marketingService.deleteCampaignMessages(campaignId),
      ])
    },

    sendCampaign: async (campaign, recipients) => {
      const sentAt = nowIso()
      const messages: CampaignMessage[] = recipients.map((recipient) => ({
        id: newMarketingId('message'),
        campaignId: campaign.id,
        channel: campaign.channel,
        recipient: campaign.channel === 'in-app' ? recipient.key : recipient.email,
        recipientName: recipient.name,
        subject: campaign.subject,
        body: campaign.body,
        status: campaign.channel === 'in-app' ? 'sent' : 'queued',
        createdAt: sentAt,
        sentAt: campaign.channel === 'in-app' ? sentAt : '',
      }))
      const updatedCampaign: Campaign = {
        ...campaign,
        status: 'sent',
        sentAt,
        recipients: recipients.length,
      }

      set((state) => ({
        campaigns: state.campaigns.map((item) =>
          item.id === campaign.id ? updatedCampaign : item,
        ),
        messages: [...messages, ...state.messages],
      }))

      if (campaign.channel === 'in-app') {
        notifyCampaign({
          campaignId: campaign.id,
          title: campaign.subject,
          titleAr: campaign.subject_ar,
          body: campaign.body,
          bodyAr: campaign.body_ar,
          link: campaign.link,
        })
      }

      await Promise.all([
        marketingService.saveCampaign(updatedCampaign),
        marketingService.createCampaignMessages(messages),
      ])
    },

    addReferralCode: async (code) => {
      set((state) => ({
        referralCodes: [
          ...state.referralCodes.filter((item) => item.code !== code.code),
          code,
        ],
      }))
      await marketingService.saveReferralCode(code)
    },

    removeReferralCode: async (code) => {
      set((state) => ({
        referralCodes: state.referralCodes.filter((item) => item.code !== code),
      }))
      await marketingService.deleteReferralCode(code)
    },

    saveSettings: async (settings) => {
      const normalized = normalizeMarketingSettings(settings)
      set({ settings: normalized })
      await marketingService.saveSettings(normalized)
    },

    setFooter: (footer) => {
      set({ settings: { ...get().settings, footer } })
    },

    dismissBanner: (bannerId) => {
      const dismissed = get().dismissedBanners
      if (!dismissed.includes(bannerId)) {
        set({ dismissedBanners: [...dismissed, bannerId] })
      }
    },

    captureUtm: (utm) => {
      if (get().utm === null) set({ utm })
    },

    setUtm: (utm) => {
      set({ utm })
    },
  })
)

export type BannerState = 'live' | 'scheduled' | 'expired' | 'off'

/** The lifecycle state of a banner at the current time. */
export function bannerState(banner: Banner, at = Date.now()): BannerState {
  if (!banner.isActive) return 'off'
  if (banner.startsAt && Date.parse(banner.startsAt) > at) return 'scheduled'
  if (banner.endsAt && Date.parse(banner.endsAt) < at) return 'expired'
  return 'live'
}

/** Banners for a placement that are live right now, highest priority first. */
export function liveBanners(
  banners: Banner[],
  placement: BannerPlacement,
  at = Date.now(),
): Banner[] {
  return banners
    .filter(
      (banner) =>
        banner.placement === placement && bannerState(banner, at) === 'live',
    )
    .toSorted((first, second) => second.priority - first.priority)
}

/** Fills missing or invalid marketing settings with the built-in defaults. */
export function normalizeMarketingSettings(
  settings: Partial<MarketingSettings> | null | undefined,
): MarketingSettings {
  const value = settings ?? {}
  const invoice = value.invoice ?? defaultMarketingSettings.invoice
  const loyalty = value.loyalty ?? defaultMarketingSettings.loyalty
  const finiteOr = (candidate: number | undefined, fallback: number) =>
    typeof candidate === 'number' && Number.isFinite(candidate)
      ? candidate
      : fallback

  return {
    profitMargin: finiteOr(value.profitMargin, defaultMarketingSettings.profitMargin),
    popupDelaySeconds: finiteOr(
      value.popupDelaySeconds,
      defaultMarketingSettings.popupDelaySeconds,
    ),
    footer: typeof value.footer === 'string' ? value.footer : defaultMarketingSettings.footer,
    invoice: {
      sellerName: invoice.sellerName ?? defaultMarketingSettings.invoice.sellerName,
      sellerAddress: invoice.sellerAddress ?? defaultMarketingSettings.invoice.sellerAddress,
      sellerPhone: invoice.sellerPhone ?? defaultMarketingSettings.invoice.sellerPhone,
      sellerEmail: invoice.sellerEmail ?? defaultMarketingSettings.invoice.sellerEmail,
      sellerWebsite: invoice.sellerWebsite ?? defaultMarketingSettings.invoice.sellerWebsite,
      taxNumber: invoice.taxNumber ?? defaultMarketingSettings.invoice.taxNumber,
      footer: invoice.footer ?? defaultMarketingSettings.invoice.footer,
    },
    loyalty: {
      pointsPerCurrency: finiteOr(
        loyalty.pointsPerCurrency,
        defaultMarketingSettings.loyalty.pointsPerCurrency,
      ),
      silverSpend: finiteOr(
        loyalty.silverSpend,
        defaultMarketingSettings.loyalty.silverSpend,
      ),
      goldSpend: finiteOr(
        loyalty.goldSpend,
        defaultMarketingSettings.loyalty.goldSpend,
      ),
    },
  }
}

/** Creates a newsletter subscriber and persists it through the shared store. */
export function subscribeToNewsletter(input: {
  email: string
  name: string
  language: string
  source: string
}): Promise<void> {
  const email = input.email.trim().toLocaleLowerCase()
  const previous = useMarketingStore
    .getState()
    .subscribers.find((subscriber) => subscriber.email === email)

  return useMarketingStore.getState().addSubscriber({
    email,
    name: input.name.trim(),
    language: input.language,
    source: input.source,
    isSubscribed: true,
    createdAt: previous?.createdAt ?? nowIso(),
  })
}
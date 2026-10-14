import { create } from 'zustand'
import * as notificationService from '../../../services/notifications'

/** Which side of the store a notification is meant for. */
export type NotificationAudience = 'customer' | 'admin'

/** What generated the notification — drives its icon and copy. */
export type NotificationKind = 'support' | 'order' | 'announcement' | 'system'

/** Structured context so the UI can resolve a notification to the right record. */
export type NotificationMeta = {
  conversationId?: string
  orderId?: string
  customerName?: string
  /** Set on broadcasts created by a marketing campaign. */
  campaignId?: string
}

export type AppNotification = {
  id: string
  audience: NotificationAudience
  /**
   * Who should see it. A customer's browser id, `all` for a broadcast to every
   * customer, or `admin` for the care team console.
   */
  recipientId: string
  kind: NotificationKind
  title: string
  titleAr: string
  body: string
  bodyAr: string
  /** In-app route to open when the notification is clicked. */
  link: string
  meta: NotificationMeta
  createdAt: string
}

/** Notification payload before the store assigns an id and timestamp. */
export type NewNotification = Omit<AppNotification, 'id' | 'createdAt'> & {
  id?: string
  createdAt?: string
}

type NotificationState = {
  notifications: AppNotification[]
  /** Ids marked as read during the current session. */
  readIds: string[]
  /** Adds (or merges) a notification and persists it to Supabase. */
  push: (notification: NewNotification) => AppNotification
  /** Merges a notification that arrived from Supabase without writing it back. */
  receive: (notification: AppNotification) => void
  markRead: (notificationId: string) => void
  markManyRead: (notificationIds: string[]) => void
  remove: (notificationId: string) => void
  clearAll: () => void
  /** Loads notifications from Supabase. */
  hydrate: () => Promise<void>
  /** Subscribes to new notifications in realtime; returns an unsubscribe fn. */
  subscribe: () => () => void
}

function sortByNewest(notifications: AppNotification[]): AppNotification[] {
  return notifications.toSorted((first, second) =>
    second.createdAt.localeCompare(first.createdAt),
  )
}

export const useNotificationStore = create<NotificationState>()(
  (set, get) => ({
      notifications: [],
      readIds: [],
      push: (input) => {
        const notification: AppNotification = {
          ...input,
          id: input.id ?? crypto.randomUUID(),
          createdAt: input.createdAt ?? new Date().toISOString(),
        }

        set((state) =>
          state.notifications.some((item) => item.id === notification.id)
            ? state
            : { notifications: [notification, ...state.notifications] },
        )

        void notificationService.createNotification(notification)
        return notification
      },
      receive: (notification) =>
        set((state) => {
          const exists = state.notifications.some(
            (item) => item.id === notification.id,
          )
          return {
            notifications: exists
              ? state.notifications.map((item) =>
                  item.id === notification.id ? notification : item,
                )
              : [notification, ...state.notifications],
          }
        }),
      markRead: (notificationId) =>
        set((state) => ({
          readIds: state.readIds.includes(notificationId)
            ? state.readIds
            : [...state.readIds, notificationId],
        })),
      markManyRead: (notificationIds) =>
        set((state) => ({
          readIds: [...new Set([...state.readIds, ...notificationIds])],
        })),
      remove: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.filter(
            (item) => item.id !== notificationId,
          ),
          readIds: state.readIds.filter((id) => id !== notificationId),
        }))
        void notificationService.deleteNotification(notificationId)
      },
      clearAll: () => set({ notifications: [], readIds: [] }),
      hydrate: async () => {
        const remote = await notificationService.fetchNotifications()
        if (!remote) return

        set({ notifications: sortByNewest(remote) })
      },
      subscribe: () =>
        notificationService.subscribeToNotifications((notification) =>
          get().receive(notification),
        ),
    }),
)

/** Adds a notification from outside a React component. */
export function pushNotification(input: NewNotification): AppNotification {
  return useNotificationStore.getState().push(input)
}

/** Notifies the care team that a shopper wrote in. */
export function notifySupportForAdmin(params: {
  conversationId: string
  customerId: string
  customerName: string
  preview: string
}): void {
  const name = params.customerName.trim() || 'A customer'
  const nameAr = params.customerName.trim() || 'عميل'
  pushNotification({
    audience: 'admin',
    recipientId: 'admin',
    kind: 'support',
    title: 'New customer message',
    titleAr: 'رسالة عميل جديدة',
    body: `${name}: ${params.preview}`,
    bodyAr: `${nameAr}: ${params.preview}`,
    link: `/admin/support/${params.conversationId}`,
    meta: {
      conversationId: params.conversationId,
      customerName: params.customerName,
    },
  })
}

/** Notifies a shopper that the care team replied to their conversation. */
export function notifySupportForCustomer(params: {
  conversationId: string
  recipientId: string
  preview: string
}): void {
  pushNotification({
    audience: 'customer',
    recipientId: params.recipientId,
    kind: 'support',
    title: 'New reply from Lucine care',
    titleAr: 'رد جديد من فريق لوسين',
    body: params.preview,
    bodyAr: params.preview,
    link: `/support?conversation=${params.conversationId}`,
    meta: { conversationId: params.conversationId },
  })
}

const orderStatusLabels: Record<string, { en: string; ar: string }> = {
  placed: { en: 'placed', ar: 'تم استلامه' },
  confirmed: { en: 'confirmed', ar: 'تم تأكيده' },
  processing: { en: 'being prepared', ar: 'قيد التجهيز' },
  shipped: { en: 'shipped', ar: 'تم شحنه' },
  'out-for-delivery': { en: 'out for delivery', ar: 'مع مندوب التوصيل' },
  delivered: { en: 'delivered', ar: 'تم توصيله' },
  cancelled: { en: 'cancelled', ar: 'ملغى' },
}

/**
 * Notifies the owning shopper about an order status change. Broadcast to `all`
 * and filtered in the storefront by the orders stored on the device, so it
 * reaches the right customer even without an authentication layer.
 */
export function notifyOrderStatus(params: {
  orderId: string
  status: string
}): void {
  const label = orderStatusLabels[params.status] ?? {
    en: params.status,
    ar: params.status,
  }
  const shortId = params.orderId.slice(0, 8).toUpperCase()

  pushNotification({
    audience: 'customer',
    recipientId: 'all',
    kind: 'order',
    title: `Order #${shortId} update`,
    titleAr: `تحديث الطلب رقم ${shortId}`,
    body: `Your order is now ${label.en}.`,
    bodyAr: `طلبك الآن ${label.ar}.`,
    link: `/account/orders/${params.orderId}`,
    meta: { orderId: params.orderId },
  })
}

/** Broadcasts an announcement to every customer. */
export function notifyAnnouncement(params: {
  title: string
  titleAr: string
  body: string
  bodyAr: string
  link?: string
}): AppNotification {
  return pushNotification({
    audience: 'customer',
    recipientId: 'all',
    kind: 'announcement',
    title: params.title.trim(),
    titleAr: params.titleAr.trim(),
    body: params.body.trim(),
    bodyAr: params.bodyAr.trim(),
    link: params.link?.trim() ?? '',
    meta: {},
  })
}

/**
 * Broadcasts a marketing campaign to every customer. The campaign id is kept in
 * the notification's meta so the campaign report can read real open counts from
 * the notification read state.
 */
export function notifyCampaign(params: {
  campaignId: string
  title: string
  titleAr: string
  body: string
  bodyAr: string
  link?: string
}): AppNotification {
  return pushNotification({
    audience: 'customer',
    recipientId: 'all',
    kind: 'announcement',
    title: params.title.trim(),
    titleAr: params.titleAr.trim(),
    body: params.body.trim(),
    bodyAr: params.bodyAr.trim(),
    link: params.link?.trim() ?? '',
    meta: { campaignId: params.campaignId },
  })
}

import { supabase } from '../lib/supabase'
import type {
  AppNotification,
  NotificationMeta,
} from '../features/notifications/store/useNotificationStore'
import { asString } from './mappers'

type NotificationRow = {
  id: string
  audience: string
  recipient_id: string
  kind: string
  title: string
  title_ar: string
  body: string
  body_ar: string
  link: string
  meta: NotificationMeta
  created_at: string
}

function toNotification(row: Partial<NotificationRow>): AppNotification {
  return {
    id: asString(row.id),
    audience: asString(row.audience, 'customer') as AppNotification['audience'],
    recipientId: asString(row.recipient_id, 'all'),
    kind: asString(row.kind, 'system') as AppNotification['kind'],
    title: asString(row.title),
    titleAr: asString(row.title_ar),
    body: asString(row.body),
    bodyAr: asString(row.body_ar),
    link: asString(row.link),
    meta: (row.meta ?? {}) as NotificationMeta,
    createdAt: asString(row.created_at),
  }
}

function toNotificationRow(notification: AppNotification): NotificationRow {
  return {
    id: notification.id,
    audience: notification.audience,
    recipient_id: notification.recipientId,
    kind: notification.kind,
    title: notification.title,
    title_ar: notification.titleAr,
    body: notification.body,
    body_ar: notification.bodyAr,
    link: notification.link,
    meta: notification.meta,
    created_at: notification.createdAt,
  }
}

export async function fetchNotifications(): Promise<
  AppNotification[] | null
> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[supabase] failed to load notifications', error.message)
    return null
  }

  return (data ?? []).map((row) => toNotification(row as NotificationRow))
}

export async function createNotification(
  notification: AppNotification,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('notifications')
    .insert(toNotificationRow(notification))
  if (error) {
    console.error('[supabase] failed to create notification', error.message)
  }
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
  if (error) {
    console.error('[supabase] failed to delete notification', error.message)
  }
}

/**
 * Streams newly inserted notifications from Supabase Realtime. Returns an
 * unsubscribe function, or a no-op when Supabase is not configured.
 */
export function subscribeToNotifications(
  onInsert: (notification: AppNotification) => void,
): () => void {
  if (!supabase) return () => {}

  const client = supabase
  const channel = client
    .channel('public:notifications')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        onInsert(toNotification(payload.new as NotificationRow))
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

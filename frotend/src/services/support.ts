import { supabase } from '../lib/supabase'
import type {
  SupportConversation,
  SupportMessage,
} from '../features/support/store/useSupportStore'
import { asNumber, asString } from './mappers'

type ConversationRow = {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  topic: string
  subject: string
  status: string
  order_id: string | null
  unread_for_admin: number
  unread_for_customer: number
  created_at: string
  updated_at: string
}

type MessageRow = {
  id: string
  conversation_id: string
  author: string
  author_name: string
  body: string
  created_at: string
}

function toConversation(row: Partial<ConversationRow>): SupportConversation {
  const orderId = asString(row.order_id)
  return {
    id: asString(row.id),
    customerId: asString(row.customer_id),
    customerName: asString(row.customer_name),
    customerEmail: asString(row.customer_email),
    topic: asString(row.topic, 'other') as SupportConversation['topic'],
    subject: asString(row.subject),
    status: asString(row.status, 'open') as SupportConversation['status'],
    orderId: orderId || undefined,
    unreadForAdmin: asNumber(row.unread_for_admin, 0),
    unreadForCustomer: asNumber(row.unread_for_customer, 0),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at, asString(row.created_at)),
  }
}

function toConversationRow(
  conversation: SupportConversation,
): ConversationRow {
  return {
    id: conversation.id,
    customer_id: conversation.customerId,
    customer_name: conversation.customerName,
    customer_email: conversation.customerEmail,
    topic: conversation.topic,
    subject: conversation.subject,
    status: conversation.status,
    order_id: conversation.orderId ?? null,
    unread_for_admin: conversation.unreadForAdmin,
    unread_for_customer: conversation.unreadForCustomer,
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
  }
}

function toMessage(row: Partial<MessageRow>): SupportMessage {
  return {
    id: asString(row.id),
    conversationId: asString(row.conversation_id),
    author: asString(row.author, 'customer') as SupportMessage['author'],
    authorName: asString(row.author_name),
    body: asString(row.body),
    createdAt: asString(row.created_at),
  }
}

function toMessageRow(message: SupportMessage): MessageRow {
  return {
    id: message.id,
    conversation_id: message.conversationId,
    author: message.author,
    author_name: message.authorName,
    body: message.body,
    created_at: message.createdAt,
  }
}

export async function fetchSupportConversations(): Promise<
  SupportConversation[] | null
> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('support_conversations')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[supabase] failed to load support conversations', error.message)
    return null
  }

  return (data ?? []).map((row) => toConversation(row as ConversationRow))
}

export async function fetchSupportMessages(): Promise<
  SupportMessage[] | null
> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[supabase] failed to load support messages', error.message)
    return null
  }

  return (data ?? []).map((row) => toMessage(row as MessageRow))
}

export async function createSupportConversation(
  conversation: SupportConversation,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('support_conversations')
    .insert(toConversationRow(conversation))
  if (error) {
    console.error('[supabase] failed to create support conversation', error.message)
  }
}

export async function updateSupportConversation(
  conversation: SupportConversation,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('support_conversations')
    .update(toConversationRow(conversation))
    .eq('id', conversation.id)
  if (error) {
    console.error('[supabase] failed to update support conversation', error.message)
  }
}

export async function deleteSupportConversation(
  conversationId: string,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('support_conversations')
    .delete()
    .eq('id', conversationId)
  if (error) {
    console.error('[supabase] failed to delete support conversation', error.message)
  }
}

export async function createSupportMessage(
  message: SupportMessage,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('support_messages').insert(toMessageRow(message))
  if (error) {
    console.error('[supabase] failed to create support message', error.message)
  }
}

/** Streams new support messages in realtime; returns an unsubscribe function. */
export function subscribeToSupportMessages(
  onInsert: (message: SupportMessage) => void,
): () => void {
  if (!supabase) return () => {}

  const client = supabase
  const channel = client
    .channel('public:support_messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_messages' },
      (payload) => onInsert(toMessage(payload.new as MessageRow)),
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

/**
 * Streams support conversation inserts/updates so unread counters and thread
 * metadata stay in sync across the storefront and the admin console.
 */
export function subscribeToSupportConversations(
  onChange: (conversation: SupportConversation) => void,
): () => void {
  if (!supabase) return () => {}

  const client = supabase
  const channel = client
    .channel('public:support_conversations')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_conversations' },
      (payload) => {
        if (payload.eventType === 'DELETE') return
        onChange(toConversation(payload.new as ConversationRow))
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

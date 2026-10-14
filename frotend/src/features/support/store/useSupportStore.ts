import { create } from 'zustand'
import * as supportService from '../../../services/support'
import {
  notifySupportForAdmin,
  notifySupportForCustomer,
} from '../../notifications/store/useNotificationStore'

/** Who wrote a message: the shopper or the care team. */
export type SupportAuthor = 'customer' | 'support'

/** Which side is reading a conversation — drives the unread badges. */
export type SupportReader = 'customer' | 'admin'

/** Lifecycle of a support conversation. */
export type SupportStatus = 'open' | 'pending' | 'resolved'

/** What the conversation is about — used for the topic filter in admin. */
export type SupportTopic = 'order' | 'product' | 'return' | 'payment' | 'other'

export type SupportMessage = {
  id: string
  conversationId: string
  author: SupportAuthor
  authorName: string
  body: string
  createdAt: string
}

export type SupportConversation = {
  id: string
  /** Identity of the shopper's browser — conversation history is keyed on it. */
  customerId: string
  customerName: string
  customerEmail: string
  topic: SupportTopic
  subject: string
  status: SupportStatus
  /** Optional order this conversation is about. */
  orderId?: string
  unreadForAdmin: number
  unreadForCustomer: number
  createdAt: string
  updatedAt: string
}

export const supportStatuses: SupportStatus[] = ['open', 'pending', 'resolved']

export const supportTopics: SupportTopic[] = [
  'order',
  'product',
  'return',
  'payment',
  'other',
]

/** Latest message in a conversation, or `undefined` when the thread is empty. */
export function lastMessageFor(
  messages: SupportMessage[],
  conversationId: string,
): SupportMessage | undefined {
  const thread = messages.filter(
    (message) => message.conversationId === conversationId,
  )
  return thread.at(-1)
}

type StartConversationInput = {
  name: string
  email: string
  topic: SupportTopic
  subject?: string
  orderId?: string
  message: string
}

type SendMessageInput = {
  conversationId: string
  author: SupportAuthor
  authorName: string
  body: string
}

type SupportState = {
  /** Current signed-in customer id, or an anonymous session id. */
  customerId: string
  customerName: string
  customerEmail: string
  conversations: SupportConversation[]
  messages: SupportMessage[]
  /** Creates a conversation with its first message and returns its id. */
  startConversation: (input: StartConversationInput) => string
  /** Appends a message and updates the conversation's unread counters. */
  sendMessage: (input: SendMessageInput) => void
  setStatus: (conversationId: string, status: SupportStatus) => void
  markRead: (conversationId: string, reader: SupportReader) => void
  removeConversation: (conversationId: string) => void
  /** Merges a message that arrived from Supabase Realtime. */
  receiveMessage: (message: SupportMessage) => void
  /** Merges a conversation that arrived from Supabase Realtime. */
  receiveConversation: (conversation: SupportConversation) => void
  /** Loads conversations and messages from Supabase. */
  hydrate: () => Promise<void>
  /** Subscribes to live support updates; returns an unsubscribe fn. */
  subscribe: () => () => void
}

export const useSupportStore = create<SupportState>()(
  (set, get) => ({
      customerId: crypto.randomUUID(),
      customerName: '',
      customerEmail: '',
      conversations: [],
      messages: [],
      startConversation: ({ name, email, topic, subject, orderId, message }) => {
        const conversationId = crypto.randomUUID()
        const now = new Date().toISOString()
        const trimmedName = name.trim()
        const trimmedEmail = email.trim()

        const conversation: SupportConversation = {
          id: conversationId,
          customerId: get().customerId,
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          topic,
          subject: subject?.trim() ?? '',
          status: 'open',
          orderId,
          unreadForAdmin: 1,
          unreadForCustomer: 0,
          createdAt: now,
          updatedAt: now,
        }
        const firstMessage: SupportMessage = {
          id: crypto.randomUUID(),
          conversationId,
          author: 'customer',
          authorName: trimmedName,
          body: message.trim(),
          createdAt: now,
        }

        set((state) => ({
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          conversations: [conversation, ...state.conversations],
          messages: [...state.messages, firstMessage],
        }))

        void supportService.createSupportConversation(conversation)
        void supportService.createSupportMessage(firstMessage)
        notifySupportForAdmin({
          conversationId,
          customerId: conversation.customerId,
          customerName: trimmedName,
          preview: firstMessage.body,
        })
        return conversationId
      },
      sendMessage: ({ conversationId, author, authorName, body }) => {
        const now = new Date().toISOString()
        const message: SupportMessage = {
          id: crypto.randomUUID(),
          conversationId,
          author,
          authorName: authorName.trim(),
          body: body.trim(),
          createdAt: now,
        }

        set((state) => ({
          messages: [...state.messages, message],
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  updatedAt: now,
                  status:
                    conversation.status === 'resolved'
                      ? 'open'
                      : conversation.status,
                  unreadForAdmin:
                    author === 'customer'
                      ? conversation.unreadForAdmin + 1
                      : conversation.unreadForAdmin,
                  unreadForCustomer:
                    author === 'support'
                      ? conversation.unreadForCustomer + 1
                      : conversation.unreadForCustomer,
                }
              : conversation,
          ),
        }))

        void supportService.createSupportMessage(message)
        const updated = get().conversations.find(
          (conversation) => conversation.id === conversationId,
        )
        if (updated) void supportService.updateSupportConversation(updated)

        if (author === 'customer') {
          notifySupportForAdmin({
            conversationId,
            customerId: updated?.customerId ?? '',
            customerName: updated?.customerName ?? authorName,
            preview: message.body,
          })
        } else if (updated) {
          notifySupportForCustomer({
            conversationId,
            recipientId: updated.customerId,
            preview: message.body,
          })
        }
      },
      setStatus: (conversationId, status) => {
        let updated: SupportConversation | undefined
        set((state) => ({
          conversations: state.conversations.map((conversation) => {
            if (conversation.id !== conversationId) return conversation
            updated = { ...conversation, status }
            return updated
          }),
        }))
        if (updated) void supportService.updateSupportConversation(updated)
      },
      markRead: (conversationId, reader) => {
        const conversation = get().conversations.find(
          (item) => item.id === conversationId,
        )
        if (!conversation) return
        const unread =
          reader === 'admin'
            ? conversation.unreadForAdmin
            : conversation.unreadForCustomer
        if (unread === 0) return

        let updated: SupportConversation | undefined
        set((state) => ({
          conversations: state.conversations.map((item) => {
            if (item.id !== conversationId) return item
            updated = {
              ...item,
              unreadForAdmin:
                reader === 'admin' ? 0 : item.unreadForAdmin,
              unreadForCustomer:
                reader === 'customer' ? 0 : item.unreadForCustomer,
            }
            return updated
          }),
        }))
        if (updated) void supportService.updateSupportConversation(updated)
      },
      removeConversation: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.filter(
            (conversation) => conversation.id !== conversationId,
          ),
          messages: state.messages.filter(
            (message) => message.conversationId !== conversationId,
          ),
        }))
        void supportService.deleteSupportConversation(conversationId)
      },
      hydrate: async () => {
        const [conversations, messages] = await Promise.all([
          supportService.fetchSupportConversations(),
          supportService.fetchSupportMessages(),
        ])
        if (conversations) {
          set({
            conversations: conversations.toSorted((a, b) =>
              b.updatedAt.localeCompare(a.updatedAt),
            ),
          })
        }
        if (messages) {
          set({
            messages: messages.toSorted((a, b) =>
              a.createdAt.localeCompare(b.createdAt),
            ),
          })
        }
      },
      receiveMessage: (message) =>
        set((state) =>
          state.messages.some((item) => item.id === message.id)
            ? state
            : { messages: [...state.messages, message] },
        ),
      receiveConversation: (conversation) =>
        set((state) => ({
          conversations: state.conversations.some(
            (item) => item.id === conversation.id,
          )
            ? state.conversations.map((item) =>
                item.id === conversation.id ? conversation : item,
              )
            : [conversation, ...state.conversations],
        })),
      subscribe: () => {
        const unsubscribeMessages = supportService.subscribeToSupportMessages(
          (message) => get().receiveMessage(message),
        )
        const unsubscribeConversations =
          supportService.subscribeToSupportConversations((conversation) =>
            get().receiveConversation(conversation),
          )

        return () => {
          unsubscribeMessages()
          unsubscribeConversations()
        }
      },
    }),
)

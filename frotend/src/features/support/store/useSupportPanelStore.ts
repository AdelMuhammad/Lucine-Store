import { create } from 'zustand'
import type { SupportTopic } from './useSupportStore'

/**
 * Ephemeral UI state for the storefront chat panel. Kept out of the persisted
 * support store so reloading always starts with the panel closed.
 */
type SupportPanelState = {
  isOpen: boolean
  activeConversationId: string | null
  /** When true the panel shows the "start a conversation" form. */
  composing: boolean
  /** A topic chosen elsewhere (e.g. the support page) to prefill the form. */
  draftTopic: SupportTopic | null
  /** Opens the panel, optionally jumping straight into a conversation. */
  open: (conversationId?: string | null) => void
  /** Opens the panel on the "start a conversation" form. */
  openNewConversation: (topic?: SupportTopic) => void
  /** Switches the panel to the "start a conversation" form. */
  startComposing: () => void
  close: () => void
  setActiveConversation: (conversationId: string | null) => void
  setDraftTopic: (topic: SupportTopic | null) => void
}

export const useSupportPanelStore = create<SupportPanelState>((set) => ({
  isOpen: false,
  activeConversationId: null,
  composing: false,
  draftTopic: null,
  open: (conversationId) =>
    set((state) => ({
      isOpen: true,
      composing: false,
      activeConversationId:
        conversationId === undefined
          ? state.activeConversationId
          : conversationId,
    })),
  openNewConversation: (topic) =>
    set({
      isOpen: true,
      composing: true,
      activeConversationId: null,
      draftTopic: topic ?? null,
    }),
  startComposing: () =>
    set({ composing: true, activeConversationId: null, draftTopic: null }),
  close: () => set({ isOpen: false }),
  setActiveConversation: (conversationId) =>
    set({ activeConversationId: conversationId, composing: false }),
  setDraftTopic: (topic) => set({ draftTopic: topic }),
}))

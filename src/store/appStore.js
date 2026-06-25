import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const now = () => Date.now();

const useAppStore = create((set, get) => ({
  identity: { name: "" },
  peers: {},
  conversations: {},
  groups: {},
  notifications: [],
  auditEvents: [],
  broadcasting: false,
  broadcastConfirmed: false,
  sessionStart: null,
  stats: {
    bytesTransferred: 0,
    messagesSent: 0,
    messagesReceived: 0,
    filesTransferred: 0,
    networkHealth: "unknown",
    encryptionActive: true,
    discoveryActive: false,
  },
  typingStates: {},
  activeTransfers: {},
  ui: {
    sidebarCollapsed: false,
    activePage: "home",
    activeChat: null,
    activeGroup: null,
    modalOpen: null,
  },

  setName: (name) => set({ identity: { name } }),

  setSidebarCollapsed: (v) =>
    set((s) => ({ ui: { ...s.ui, sidebarCollapsed: v } })),

  setActivePage: (page, params = {}) =>
    set((s) => ({
      ui: {
        ...s.ui,
        activePage: page,
        activeChat: params.peerId ?? s.ui.activeChat,
        activeGroup: params.groupId ?? s.ui.activeGroup,
      },
    })),

  openModal: (name) => set((s) => ({ ui: { ...s.ui, modalOpen: name } })),
  closeModal: () => set((s) => ({ ui: { ...s.ui, modalOpen: null } })),

  setBroadcasting: (v) => set({ broadcasting: v }),
  setBroadcastConfirmed: (v) => set({ broadcastConfirmed: v }),

  startSession: () => set({ sessionStart: Date.now() }),

  addPeer: (peer) =>
    set((s) => ({
      peers: { ...s.peers, [peer.peerId]: { ...peer, addedAt: now() } },
    })),

  removePeer: (peerId) =>
    set((s) => {
      const peers = { ...s.peers };
      delete peers[peerId];
      return { peers };
    }),

  getPeerList: () => Object.values(useAppStore.getState().peers),

  addMessage: (peerId, message) =>
    set((s) => {
      const conv = s.conversations[peerId] ?? [];
      return {
        conversations: {
          ...s.conversations,
          [peerId]: [...conv, { ...message, id: message.id ?? crypto.randomUUID() }],
        },
        stats: {
          ...s.stats,
          messagesReceived: s.stats.messagesReceived + 1,
          bytesTransferred:
            s.stats.bytesTransferred + (message.content?.length ?? 0),
        },
      };
    }),

  addSentMessage: (peerId, message) =>
    set((s) => {
      const conv = s.conversations[peerId] ?? [];
      return {
        conversations: {
          ...s.conversations,
          [peerId]: [...conv, { ...message, fromSelf: true }],
        },
        stats: {
          ...s.stats,
          messagesSent: s.stats.messagesSent + 1,
        },
      };
    }),

  updateMessageStatus: (peerId, messageId, status) =>
    set((s) => {
      const conv = s.conversations[peerId];
      if (!conv) return s;
      return {
        conversations: {
          ...s.conversations,
          [peerId]: conv.map((m) =>
            m.id === messageId ? { ...m, status } : m
          ),
        },
      };
    }),

  updateMessageSeen: (peerId, messageId) =>
    set((s) => {
      const conv = s.conversations[peerId];
      if (!conv) return s;
      return {
        conversations: {
          ...s.conversations,
          [peerId]: conv.map((m) =>
            m.id === messageId ? { ...m, status: "seen" } : m
          ),
        },
      };
    }),

  addGroup: (group) =>
    set((s) => ({
      groups: {
        ...s.groups,
        [group.groupId]: { ...group, messages: s.groups[group.groupId]?.messages ?? [] },
      },
    })),

  removeGroup: (groupId) =>
    set((s) => {
      const groups = { ...s.groups };
      delete groups[groupId];
      return { groups };
    }),

  addGroupMessage: (groupId, message) =>
    set((s) => {
      const group = s.groups[groupId];
      if (!group) return s;
      return {
        groups: {
          ...s.groups,
          [groupId]: {
            ...group,
            messages: [...(group.messages ?? []), { ...message, id: message.id ?? crypto.randomUUID() }],
          },
        },
      };
    }),

  updateGroupMembers: (groupId, members) =>
    set((s) => {
      const group = s.groups[groupId];
      if (!group) return s;
      return {
        groups: {
          ...s.groups,
          [groupId]: { ...group, members, memberCount: members.length },
        },
      };
    }),

  addNotification: (notification) =>
    set((s) => ({
      notifications: [
        { ...notification, id: notification.id ?? crypto.randomUUID(), readAt: null, createdAt: now() },
        ...s.notifications,
      ],
    })),

  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, readAt: now() } : n
      ),
    })),

  invalidateNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, invalid: true } : n
      ),
    })),

  addAuditEvent: (event) =>
    set((s) => ({
      auditEvents: [event, ...s.auditEvents].slice(0, 500),
    })),

  setTyping: (peerId, name, groupId = null) => {
    const key = groupId ? `group:${groupId}` : `peer:${peerId}`;
    const existing = get().typingStates[key];
    if (existing?.timeout) clearTimeout(existing.timeout);
    const timeout = setTimeout(() => {
      set((s) => {
        const ts = { ...s.typingStates };
        delete ts[key];
        return { typingStates: ts };
      });
    }, 3000);
    set((s) => ({
      typingStates: { ...s.typingStates, [key]: { peerId, name, groupId, timeout } },
    }));
  },

  clearTyping: (peerId, groupId = null) => {
    const key = groupId ? `group:${groupId}` : `peer:${peerId}`;
    const existing = get().typingStates[key];
    if (existing?.timeout) clearTimeout(existing.timeout);
    set((s) => {
      const ts = { ...s.typingStates };
      delete ts[key];
      return { typingStates: ts };
    });
  },

  addTransfer: (transfer) =>
    set((s) => ({
      activeTransfers: { ...s.activeTransfers, [transfer.transferId]: transfer },
    })),

  updateTransferProgress: (transferId, receivedChunks, totalChunks) =>
    set((s) => {
      const t = s.activeTransfers[transferId];
      if (!t) return s;
      return {
        activeTransfers: {
          ...s.activeTransfers,
          [transferId]: { ...t, receivedChunks, totalChunks, progress: receivedChunks / totalChunks },
        },
      };
    }),

  completeTransfer: (transferId, data) =>
    set((s) => {
      const t = s.activeTransfers[transferId];
      if (!t) return s;
      return {
        activeTransfers: {
          ...s.activeTransfers,
          [transferId]: { ...t, status: "complete", data },
        },
        stats: { ...s.stats, filesTransferred: s.stats.filesTransferred + 1 },
      };
    }),

  setNetworkHealth: (health) =>
    set((s) => ({ stats: { ...s.stats, networkHealth: health } })),

  setDiscoveryActive: (v) =>
    set((s) => ({ stats: { ...s.stats, discoveryActive: v } })),

  killAll: () =>
    set({
      peers: {},
      conversations: {},
      groups: {},
      notifications: [],
      auditEvents: [],
      broadcasting: false,
      broadcastConfirmed: false,
      typingStates: {},
      activeTransfers: {},
      sessionStart: null,
      identity: { name: "" },
      stats: {
        bytesTransferred: 0,
        messagesSent: 0,
        messagesReceived: 0,
        filesTransferred: 0,
        networkHealth: "unknown",
        encryptionActive: true,
        discoveryActive: false,
      },
    }),

  bootstrapListeners: () => {
    if (!window.__TAURI_INTERNALS__) return;
    const store = useAppStore.getState();

    listen("peer_discovered", (e) => {
      store.addPeer(e.payload);
      store.addAuditEvent({
        kind: "peer_joined",
        actor: e.payload.name,
        detail: "Joined the network",
        timestamp: e.payload.discoveredAt,
      });
    });

    listen("peer_left", (e) => {
      const peer = useAppStore.getState().peers[e.payload.peerId];
      store.removePeer(e.payload.peerId);
      if (peer) {
        store.addAuditEvent({
          kind: "peer_left",
          actor: peer.name ?? e.payload.peerId,
          detail: "Left the network",
          timestamp: Date.now(),
        });
      }
    });

    listen("message_received", (e) => {
      const { peerId, messageId, content, timestamp, isSystem } = e.payload;
      store.addMessage(peerId, {
        id: messageId,
        content,
        timestamp,
        fromSelf: false,
        status: "received",
        isSystem,
      });
    });

    listen("message_sent", (e) => {
      const state = useAppStore.getState();
      const peerId = state.ui.activeChat;
      if (peerId) {
        state.updateMessageStatus(peerId, e.payload.messageId, "sent");
      }
    });

    listen("message_seen", (e) => {
      const { peerId, messageId } = e.payload;
      useAppStore.getState().updateMessageSeen(peerId, messageId);
    });

    listen("group_message_received", (e) => {
      const { groupId, messageId, senderName, senderId, content, timestamp, isSystem } = e.payload;
      store.addGroupMessage(groupId, {
        id: messageId,
        senderId,
        senderName,
        content,
        timestamp,
        fromSelf: false,
        isSystem,
      });
    });

    listen("group_invite_received", (e) => {
      store.addNotification({
        type: "invite",
        ...e.payload,
      });
    });

    listen("group_member_joined", (e) => {
      const { groupId, peerName, inviterName, timestamp } = e.payload;
      store.addGroupMessage(groupId, {
        content: `${peerName} joined · via ${inviterName || "direct"}`,
        timestamp,
        fromSelf: false,
        isSystem: true,
      });
      store.addAuditEvent({
        kind: "group_joined",
        actor: peerName,
        target: groupId,
        detail: `Joined via invite from ${inviterName}`,
        timestamp,
      });
    });

    listen("screenshot_attempt", (e) => {
      const { peerName, context, timestamp } = e.payload;
      store.addNotification({
        type: "screenshot_blocked",
        actor: peerName,
        context,
        timestamp,
      });
      store.addAuditEvent({
        kind: "screenshot_blocked",
        actor: peerName,
        detail: `Screenshot attempt in ${context}`,
        timestamp,
      });
    });

    listen("file_transfer_init", (e) => {
      store.addTransfer({ ...e.payload, status: "receiving", progress: 0 });
    });

    listen("file_transfer_progress", (e) => {
      const { transferId, receivedChunks, totalChunks } = e.payload;
      store.updateTransferProgress(transferId, receivedChunks, totalChunks);
    });

    listen("file_transfer_complete", (e) => {
      store.completeTransfer(e.payload.transferId, null);
      store.addAuditEvent({
        kind: "transfer_completed",
        actor: e.payload.peerId,
        detail: `${e.payload.fileName} (${(e.payload.fileSize / 1024).toFixed(1)} KB)`,
        timestamp: Date.now(),
      });
    });

    listen("broadcast_status", (e) => {
      set({ broadcasting: e.payload.active });
      if (e.payload.active) {
        store.setDiscoveryActive(true);
      }
    });

    listen("peer_typing", (e) => {
      const { peerId, name, groupId } = e.payload;
      store.setTyping(peerId, name, groupId);
    });

    listen("kill_executed", () => {
      useAppStore.getState().killAll();
    });
  },
}));

export default useAppStore;

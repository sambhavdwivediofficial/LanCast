// src/store/appStore.js
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const useAppStore = create((set, get) => ({
  localName: "",
  broadcasting: false,
  peers: [],
  groups: [],
  privateGroupsCount: 0,
  messages: {},
  groupMessages: {},
  notifications: [],
  auditEvents: [],
  activeChatPeer: null,
  activeGroupId: null,
  fileTransfers: {},
  transferStats: { sent: 0, received: 0 },
  activeTime: 0,

  setLocalName: (name) => set({ localName: name }),
  setBroadcasting: (active) => set({ broadcasting: active }),
  setBroadcastStatus: (active) => set({ broadcasting: active }),

  setPeers: (peers) => set({ peers }),
  addPeer: (peer) =>
    set((state) => {
      const exists = state.peers.find((p) => p.peer_id === peer.peer_id);
      if (exists) {
        return {
          peers: state.peers.map((p) =>
            p.peer_id === peer.peer_id ? { ...p, ...peer } : p
          ),
        };
      }
      return { peers: [...state.peers, peer] };
    }),
  removePeer: (peerId) =>
    set((state) => ({
      peers: state.peers.filter((p) => p.peer_id !== peerId),
    })),

  setGroups: (groups) =>
    set({
      groups,
      privateGroupsCount: groups.filter((g) => g.is_private).length,
    }),
  joinGroup: (group) =>
    set((state) => {
      if (state.groups.find((g) => g.group_id === group.group_id)) return state;
      const newGroups = [...state.groups, { ...group, is_private: true }];
      return {
        groups: newGroups,
        privateGroupsCount: newGroups.filter((g) => g.is_private).length,
      };
    }),

  setActiveChatPeer: (peer) => set({ activeChatPeer: peer, activeGroupId: null }),
  setActiveGroup: (groupId) => set({ activeGroupId: groupId, activeChatPeer: null }),

  addMessage: (msg) =>
    set((state) => {
      const peerMsgs = state.messages[msg.peer_id] || [];
      if (peerMsgs.find((m) => m.message_id === msg.message_id)) return state;
      return {
        messages: {
          ...state.messages,
          [msg.peer_id]: [...peerMsgs, msg].sort((a, b) => a.timestamp - b.timestamp),
        },
      };
    }),
  updateMessageStatus: (messageId, status) =>
    set((state) => {
      const newMessages = { ...state.messages };
      for (const [peerId, msgs] of Object.entries(newMessages)) {
        newMessages[peerId] = msgs.map((m) =>
          m.message_id === messageId ? { ...m, status } : m
        );
      }
      return { messages: newMessages };
    }),

  addGroupMessage: (msg) =>
    set((state) => {
      const groupMsgs = state.groupMessages[msg.group_id] || [];
      if (groupMsgs.find((m) => m.message_id === msg.message_id)) return state;
      return {
        groupMessages: {
          ...state.groupMessages,
          [msg.group_id]: [...groupMsgs, msg].sort((a, b) => a.timestamp - b.timestamp),
        },
      };
    }),

  addNotification: (notif) =>
    set((state) => ({
      notifications: [notif, ...state.notifications],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter(
        (n) => (n.id || n.invite_id) !== id
      ),
    })),
  updateNotificationMemberCount: ({ invite_id, member_count }) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.invite_id === invite_id ? { ...n, member_count } : n
      ),
    })),

  addFileTransfer: (transfer) =>
    set((state) => ({
      fileTransfers: {
        ...state.fileTransfers,
        [transfer.transfer_id]: { ...transfer, progress: 0, completed: false },
      },
    })),
  updateFileTransferProgress: ({ transfer_id, received_chunks, total_chunks }) =>
    set((state) => {
      const progress = Math.round((received_chunks / total_chunks) * 100);
      return {
        fileTransfers: {
          ...state.fileTransfers,
          [transfer_id]: { ...state.fileTransfers[transfer_id], progress },
        },
      };
    }),
  completeFileTransfer: (transfer) =>
    set((state) => {
      const newTransfers = { ...state.fileTransfers };
      newTransfers[transfer.transfer_id] = {
        ...newTransfers[transfer.transfer_id],
        completed: true,
        file_name: transfer.file_name,
      };
      return { fileTransfers: newTransfers };
    }),

  updateTransferStats: (type, mb) =>
    set((state) => ({
      transferStats: {
        sent: type === "sent" ? state.transferStats.sent + mb : state.transferStats.sent,
        received: type === "received" ? state.transferStats.received + mb : state.transferStats.received,
      },
    })),

  addAuditEvent: (event) =>
    set((state) => ({
      auditEvents: [...state.auditEvents, event],
    })),

  setActiveTime: (seconds) => set({ activeTime: seconds }),

  kill: async () => {
    try {
      await invoke("stop_broadcast");
    } catch (e) {}
    set({
      localName: "",
      broadcasting: false,
      peers: [],
      groups: [],
      privateGroupsCount: 0,
      messages: {},
      groupMessages: {},
      notifications: [],
      auditEvents: [],
      activeChatPeer: null,
      activeGroupId: null,
      fileTransfers: {},
      transferStats: { sent: 0, received: 0 },
      activeTime: 0,
    });
    const window = getCurrentWindow();
    await window.close();
  },
}));

export default useAppStore;

// src/components/layout/AppShell.jsx
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useEffect, useRef } from "react";
import useAppStore from "../../store/appStore";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export default function AppShell() {
  const {
    addPeer,
    removePeer,
    addMessage,
    updateMessageStatus,
    addGroupMessage,
    addNotification,
    updateNotificationMemberCount,
    setBroadcastStatus,
    addFileTransfer,
    updateFileTransferProgress,
    completeFileTransfer,
    updateTransferStats,
    addAuditEvent,
    setActiveTime,
  } = useAppStore();

  const unlisteners = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveTime(useAppStore.getState().activeTime + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const setupListeners = async () => {
      unlisteners.current = [
        await listen("peer_discovered", (e) => {
          addPeer(e.payload);
          addAuditEvent({
            type: "peer_discovered",
            peer_name: e.payload.name,
            message: `${e.payload.name} discovered on network`,
            timestamp: e.payload.discovered_at || Date.now(),
          });
        }),

        await listen("peer_left", (e) => {
          const store = useAppStore.getState();
          const peer = store.peers.find((p) => p.peer_id === e.payload.peer_id);
          removePeer(e.payload.peer_id);
          addNotification({
            id: crypto.randomUUID(),
            type: "peer_left",
            peer_name: peer?.name || "Unknown",
            peer_id: e.payload.peer_id,
            timestamp: Date.now(),
          });
          addAuditEvent({
            type: "peer_left",
            peer_name: peer?.name || "Unknown",
            message: `${peer?.name || "A peer"} left the network`,
            timestamp: Date.now(),
          });
        }),

        await listen("message_received", (e) => {
          addMessage(e.payload);
          addAuditEvent({
            type: "message_received",
            peer_name: e.payload.peer_id,
            message: `Message received from a peer`,
            timestamp: e.payload.timestamp || Date.now(),
          });
        }),

        await listen("message_sent", (e) => {
          updateMessageStatus(e.payload.message_id, e.payload.status);
        }),

        await listen("message_seen", (e) => {
          updateMessageStatus(e.payload.message_id, "seen");
        }),

        await listen("group_message_received", (e) => {
          addGroupMessage(e.payload);
        }),

        await listen("group_invite_received", (e) => {
          addNotification({
            id: e.payload.invite_id,
            type: "invite",
            invite_id: e.payload.invite_id,
            group_id: e.payload.group_id,
            group_name: e.payload.group_name,
            inviter_id: e.payload.inviter_id,
            inviter_name: e.payload.inviter_name,
            member_count: e.payload.member_count,
            timestamp: e.payload.timestamp || Date.now(),
          });
          addAuditEvent({
            type: "invite_received",
            message: `${e.payload.inviter_name} invited you to ${e.payload.group_name}`,
            timestamp: e.payload.timestamp || Date.now(),
          });
        }),

        await listen("group_member_count_updated", (e) => {
          updateNotificationMemberCount(e.payload);
        }),

        await listen("group_member_joined", (e) => {
          const store = useAppStore.getState();
          const group = store.groups.find((g) => g.group_id === e.payload.group_id);
          if (group) {
            addGroupMessage({
              message_id: crypto.randomUUID(),
              group_id: e.payload.group_id,
              sender_id: "system",
              sender_name: "System",
              content: `${e.payload.peer_name} joined via invite from ${e.payload.inviter_name}`,
              timestamp: e.payload.timestamp || Date.now(),
              is_system: true,
            });
          }
          addAuditEvent({
            type: "member_joined",
            message: `${e.payload.peer_name} joined group`,
            timestamp: e.payload.timestamp || Date.now(),
          });
        }),

        await listen("screenshot_attempt", (e) => {
          const store = useAppStore.getState();
          const notifId = crypto.randomUUID();
          const timestamp = e.payload.timestamp || Date.now();

          if (e.payload.context === "protection_active") {
            addNotification({
              id: notifId,
              type: "protection_active",
              peer_name: e.payload.peer_name,
              timestamp,
              message: "Screenshot protection is now active on this window.",
            });
            addAuditEvent({
              type: "protection_activated",
              message: "Screenshot protection activated",
              timestamp,
            });
          } else {
            addNotification({
              id: notifId,
              type: "screenshot_attempt",
              peer_name: e.payload.peer_name,
              timestamp,
              context: e.payload.context || "chat/group",
            });
            addAuditEvent({
              type: "screenshot_blocked",
              peer_name: e.payload.peer_name,
              message: `⚠ Screenshot blocked — ${e.payload.peer_name} attempted to capture`,
              timestamp,
            });

            const sysContent = `⚠ Screenshot blocked — ${e.payload.peer_name} attempted to capture`;
            if (store.activeChatPeer) {
              addMessage({
                message_id: crypto.randomUUID(),
                peer_id: store.activeChatPeer.peer_id,
                content: sysContent,
                timestamp,
                is_system: true,
              });
            } else if (store.activeGroupId) {
              addGroupMessage({
                message_id: crypto.randomUUID(),
                group_id: store.activeGroupId,
                sender_id: "system",
                sender_name: "System",
                content: sysContent,
                timestamp,
                is_system: true,
              });
            }
          }
        }),

        await listen("file_transfer_init", (e) => {
          addFileTransfer(e.payload);
          addAuditEvent({
            type: "file_transfer_init",
            message: `File transfer started: ${e.payload.file_name}`,
            timestamp: Date.now(),
          });
        }),

        await listen("file_transfer_progress", (e) => {
          updateFileTransferProgress(e.payload);
        }),

        await listen("file_transfer_complete", (e) => {
          completeFileTransfer(e.payload);
          updateTransferStats("received", e.payload.file_size / (1024 * 1024));
          addAuditEvent({
            type: "file_transfer_complete",
            message: `File received: ${e.payload.file_name}`,
            timestamp: Date.now(),
          });
        }),

        await listen("broadcast_status", (e) => {
          setBroadcastStatus(e.payload.active);
          addAuditEvent({
            type: "broadcast_status",
            message: e.payload.active ? "Broadcast started" : "Broadcast stopped",
            timestamp: Date.now(),
          });
        }),
      ];
    };

    setupListeners();

    return () => {
      unlisteners.current.forEach((unlisten) => {
        if (typeof unlisten === "function") unlisten();
      });
    };
  }, []);

  return (
    <div className="flex h-screen w-screen bg-surface-950 text-surface-200 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

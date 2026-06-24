import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "@store/appStore";

export function useAudit() {
  const auditEvents = useAppStore((s) => s.auditEvents);
  const addAuditEvent = useAppStore((s) => s.addAuditEvent);

  const logEvent = useCallback(
    async (kind, actor, target = null, detail = null) => {
      addAuditEvent({ kind, actor, target, detail, timestamp: Date.now() });
      try {
        await invoke("log_audit_event", { kind, actor, target, detail });
      } catch {}
    },
    [addAuditEvent]
  );

  useEffect(() => {
    invoke("get_audit_events", { limit: 100 })
      .then((res) => {
        if (res?.data) {
          res.data.forEach((e) => addAuditEvent(e));
        }
      })
      .catch(() => {});
  }, []);

  return { auditEvents, logEvent };
}

export const AUDIT_LABELS = {
  peer_joined:         { label: "Peer joined",          color: "success" },
  peer_left:           { label: "Peer left",             color: "surface" },
  screenshot_blocked:  { label: "Screenshot blocked",   color: "danger"  },
  invite_sent:         { label: "Invite sent",           color: "brand"   },
  invite_accepted:     { label: "Invite accepted",       color: "success" },
  invite_declined:     { label: "Invite declined",       color: "surface" },
  file_uploaded:       { label: "File uploaded",         color: "brand"   },
  file_downloaded:     { label: "File downloaded",       color: "brand"   },
  broadcast_started:   { label: "Broadcast started",     color: "success" },
  broadcast_stopped:   { label: "Broadcast stopped",     color: "surface" },
  group_created:       { label: "Group created",         color: "brand"   },
  group_joined:        { label: "Group joined",          color: "success" },
  group_left:          { label: "Group left",            color: "surface" },
  message_sent:        { label: "Message sent",          color: "surface" },
  message_received:    { label: "Message received",      color: "surface" },
  session_started:     { label: "Session started",       color: "success" },
  session_killed:      { label: "Session killed",        color: "danger"  },
  encryption_handshake:{ label: "Keys exchanged",        color: "brand"   },
  transfer_started:    { label: "Transfer started",      color: "brand"   },
  transfer_completed:  { label: "Transfer complete",     color: "success" },
  transfer_cancelled:  { label: "Transfer cancelled",    color: "warning" },
  keys_destroyed:      { label: "Keys destroyed",        color: "danger"  },
  ram_wiped:           { label: "RAM wiped",             color: "danger"  },
};

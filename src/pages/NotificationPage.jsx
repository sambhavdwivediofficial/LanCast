import { useState } from "react";
import { Bell, CheckCheck, ClipboardList, Shield, UserPlus, UserMinus, Camera, Send, Download, Radio, Users, MessageSquare, Zap, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import useAppStore from "@store/appStore";
import NotificationItem from "@components/ui/NotificationItem";
import { useAudit, AUDIT_LABELS } from "@hooks/useAudit";

const KIND_ICONS = {
  peer_joined:          UserPlus,
  peer_left:            UserMinus,
  screenshot_blocked:   Camera,
  invite_sent:          Send,
  invite_accepted:      UserPlus,
  invite_declined:      UserMinus,
  file_uploaded:        Send,
  file_downloaded:      Download,
  broadcast_started:    Radio,
  broadcast_stopped:    Radio,
  group_created:        Users,
  group_joined:         Users,
  group_left:           Users,
  message_sent:         MessageSquare,
  message_received:     MessageSquare,
  session_started:      Zap,
  session_killed:       Trash2,
  encryption_handshake: Shield,
  transfer_started:     Send,
  transfer_completed:   Download,
  transfer_cancelled:   Trash2,
  keys_destroyed:       Shield,
  ram_wiped:            Trash2,
};

const COLOR_MAP = {
  success: { icon: "#4ade80", bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.2)"  },
  danger:  { icon: "#f87171", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.2)"  },
  brand:   { icon: "#818cf8", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.2)" },
  warning: { icon: "#fbbf24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  surface: { icon: "#71717a", bg: "rgba(39,39,42,0.5)",   border: "rgba(63,63,70,0.4)"   },
};

function AuditEntry({ event, index }) {
  const meta = AUDIT_LABELS[event.kind] ?? { label: event.kind, color: "surface" };
  const Icon = KIND_ICONS[event.kind] ?? Shield;
  const c = COLOR_MAP[meta.color] ?? COLOR_MAP.surface;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025 }}
      className="flex items-start gap-3 py-3 border-b border-surface-800/50 last:border-0"
    >
      <span
        className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 mt-0.5"
        style={{ background: c.bg, border: `1px solid ${c.border}` }}
      >
        <Icon size={13} style={{ color: c.icon }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-surface-200">{event.actor}</span>
          <span className="text-xs text-surface-500">{meta.label}</span>
          {event.target && (
            <span className="text-xs text-surface-600 truncate">→ {event.target}</span>
          )}
        </div>
        {event.detail && (
          <p className="text-2xs text-surface-600 mt-0.5 truncate">{event.detail}</p>
        )}
      </div>
      <span className="text-2xs text-surface-700 flex-shrink-0 mt-0.5 whitespace-nowrap">
        {event.timestamp ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }) : ""}
      </span>
    </motion.div>
  );
}

export default function NotificationPage() {
  const [tab, setTab] = useState("notifications");
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const { auditEvents } = useAudit();

  const unread = notifications.filter((n) => !n.readAt && !n.invalid).length;

  const markAll = () => {
    notifications.forEach((n) => { if (!n.readAt) markRead(n.id); });
  };

  return (
    <div className="page">
      <div className="page-header">
        {tab === "notifications"
          ? <Bell size={18} className="text-brand-400" />
          : <ClipboardList size={18} className="text-brand-400" />}
        <div className="flex-1">
          <h1 className="text-base font-bold text-surface-100">
            {tab === "notifications" ? "Notifications" : "Audit Log"}
          </h1>
          <p className="text-2xs text-surface-500">
            {tab === "notifications"
              ? unread > 0 ? `${unread} unread` : "All caught up"
              : `${auditEvents.length} events this session`}
          </p>
        </div>
        {tab === "notifications" && unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors"
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex justify-center mt-3">
      <div className="flex gap-1 p-1 rounded-xl bg-surface-900 border border-surface-800 w-fit">
        {[
          { id: "notifications", label: "Notifications", icon: Bell,      count: unread },
          { id: "audit",         label: "Audit Log",     icon: ClipboardList, count: unread },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 flex-1 justify-center py-2 px-4 rounded-lg text-xs font-semibold transition-all duration-150"
            style={{
              background: tab === t.id ? "rgba(0, 0, 0, 0.77)" : "transparent",
              color: tab === t.id ? "#e4e4e7" : "#71717a",
            }}
          >
            <t.icon size={13} />
            {t.label}
            {t.count > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-2xs"
                style={{
                  background: tab === t.id ? "rgba(99,102,241,0.2)" : "rgba(63,63,70,0.5)",
                  color: tab === t.id ? "#818cf8" : "#52525b",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
      </div>

      <div className="page-scroll px-4 py-4 flex flex-col gap-3">
        <AnimatePresence mode="wait">
          {tab === "notifications" ? (
            notifications.length === 0 ? (
              <motion.div key="empty-notif" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
                <Bell size={28} className="text-surface-700" />
                <p className="text-sm">No notifications</p>
                <p className="text-xs text-surface-600">Invites and alerts appear here</p>
              </motion.div>
            ) : (
              <motion.div key="notif-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
                {notifications.map((n, i) => (
                  <NotificationItem key={n.id ?? i} notification={n} index={i} />
                ))}
              </motion.div>
            )
          ) : (
            auditEvents.length === 0 ? (
              <motion.div key="empty-audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
                <ClipboardList size={28} className="text-surface-700" />
                <p className="text-sm">No audit events yet</p>
                <p className="text-xs text-surface-600">System events will appear here</p>
              </motion.div>
            ) : (
              <motion.div key="audit-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
                {auditEvents.map((event, i) => (
                  <AuditEntry key={event.id ?? i} event={event} index={i} />
                ))}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

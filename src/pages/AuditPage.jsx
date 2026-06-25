import { motion } from "framer-motion";
import { ClipboardList, Shield, UserPlus, UserMinus, Camera, Send, Download, Radio, Users, MessageSquare, Zap, Trash2 } from "lucide-react";
import { useAudit, AUDIT_LABELS } from "@hooks/useAudit";
import { formatDistanceToNow } from "date-fns";

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
  surface: { icon: "#71717a", bg: "rgba(63,63,70,0.3)",   border: "rgba(63,63,70,0.4)"   },
};

function AuditEntry({ event, index }) {
  const meta = AUDIT_LABELS[event.kind] ?? { label: event.kind, color: "surface" };
  const Icon = KIND_ICONS[event.kind] ?? Shield;
  const c = COLOR_MAP[meta.color] ?? COLOR_MAP.surface;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="audit-item"
    >
      <span
        className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 mt-0.5"
        style={{ background: c.bg, border: `1px solid ${c.border}` }}
      >
        <Icon size={14} style={{ color: c.icon }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-surface-200">{event.actor}</span>
          <span className="text-xs text-surface-500">{meta.label}</span>
          {event.target && (
            <span className="text-xs text-surface-600">→ {event.target}</span>
          )}
        </div>
        {event.detail && (
          <p className="text-xs text-surface-500 mt-0.5 truncate">{event.detail}</p>
        )}
      </div>
      <span className="text-2xs text-surface-600 flex-shrink-0 mt-0.5">
        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
      </span>
    </motion.div>
  );
}

export default function AuditPage() {
  const { auditEvents } = useAudit();

  return (
    <div className="page">
      <div className="page-header">
        <ClipboardList size={18} className="text-brand-400" />
        <div>
          <h1 className="text-base font-bold text-surface-100">Audit Log</h1>
        </div>
      </div>

      <div className="page-scroll px-4 py-4">
        {auditEvents.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={32} className="text-surface-700" />
            <p className="text-sm">No events yet</p>
            <p className="text-xs text-surface-600">System events will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {auditEvents.map((event, i) => (
              <AuditEntry key={event.id ?? i} event={event} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

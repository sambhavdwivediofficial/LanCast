import { motion } from "framer-motion";
import { Check, X, Users, Camera, UserPlus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { formatDistanceToNow } from "date-fns";
import useAppStore from "@store/appStore";

function InviteNotification({ notification, onRespond }) {
  const { inviteId, groupId, groupName, inviterName, memberCount, timestamp } = notification;

  return (
    <div className="notification-item">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex-shrink-0 mt-0.5">
          <UserPlus size={14} className="text-brand-400" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-200">
            {inviterName} invited you
          </p>
          <p className="text-xs text-surface-500 mt-0.5">
            Group: <span className="text-surface-300 font-medium">{groupName}</span>
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Users size={10} className="text-surface-600" />
            <span className="text-2xs text-surface-600">{memberCount} members</span>
            <span className="text-2xs text-surface-700 mx-1">·</span>
            <span className="text-2xs text-surface-600">
              {timestamp ? formatDistanceToNow(new Date(timestamp), { addSuffix: true }) : ""}
            </span>
          </div>
        </div>
      </div>

      {!notification.responded && !notification.invalid && (
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => onRespond(inviteId, groupId, true)}
            className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-semibold text-success-400 transition-colors"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <Check size={13} />
            Accept
          </button>
          <button
            type="button"
            onClick={() => onRespond(inviteId, groupId, false)}
            className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-semibold text-danger-400 transition-colors"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <X size={13} />
            Decline
          </button>
        </div>
      )}

      {(notification.responded || notification.invalid) && (
        <p className="text-2xs text-surface-600 mt-2">
          {notification.invalid ? "Invite no longer valid" : notification.accepted ? "Accepted" : "Declined"}
        </p>
      )}
    </div>
  );
}

function ScreenshotNotification({ notification }) {
  return (
    <div className="notification-item border-danger-900/40" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-danger-500/10 border border-danger-500/20 flex-shrink-0">
          <Camera size={14} className="text-danger-400" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-danger-300">Screenshot Blocked</p>
          <p className="text-xs text-surface-500 mt-0.5">
            <span className="text-surface-300">{notification.actor}</span> attempted a screenshot
          </p>
          {notification.timestamp && (
            <span className="text-2xs text-surface-600 mt-1 block">
              {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationItem({ notification, index = 0 }) {
  const markRead = useAppStore((s) => s.markNotificationRead);
  const invalidate = useAppStore((s) => s.invalidateNotification);
  const addGroup = useAppStore((s) => s.addGroup);

  const handleRespond = async (inviteId, groupId, accepted) => {
    try {
      await invoke("respond_to_invite", {
        payload: { inviteId, groupId, accepted },
      });
      markRead(notification.id);
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      {notification.type === "invite" ? (
        <InviteNotification notification={notification} onRespond={handleRespond} />
      ) : notification.type === "screenshot_blocked" ? (
        <ScreenshotNotification notification={notification} />
      ) : (
        <div className="notification-item">
          <p className="text-sm text-surface-400">{notification.detail ?? "System event"}</p>
        </div>
      )}
    </motion.div>
  );
}

import { Bell, CheckCheck } from "lucide-react";
import { motion } from "framer-motion";
import useAppStore from "@store/appStore";
import NotificationItem from "@components/ui/NotificationItem";

export default function NotificationPage() {
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);

  const unread = notifications.filter((n) => !n.readAt && !n.invalid).length;

  const markAll = () => {
    notifications.forEach((n) => {
      if (!n.readAt) markRead(n.id);
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <Bell size={18} className="text-brand-400" />
        <div className="flex-1">
          <h1 className="text-base font-bold text-surface-100">Notifications</h1>
          {unread > 0 && (
            <p className="text-2xs text-surface-500">{unread} unread</p>
          )}
        </div>
        {unread > 0 && (
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

      <div className="page-scroll px-4 py-4 flex flex-col gap-3">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={28} className="text-surface-700" />
            <p className="text-sm">No notifications</p>
            <p className="text-xs text-surface-600">Invites and alerts appear here</p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <NotificationItem key={n.id ?? i} notification={n} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

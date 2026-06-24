// src/components/ui/NotificationItem.jsx
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import useAppStore from "../../store/appStore";
import { invoke } from "@tauri-apps/api/core";

export default function NotificationItem({ notification, onDismiss }) {
  const { joinGroup } = useAppStore();

  const isInvite = notification.type === "invite";
  const isScreenshot = notification.type === "screenshot_attempt";

  const acceptInvite = async () => {
    try {
      await invoke("respond_to_invite", {
        payload: {
          invite_id: notification.invite_id,
          group_id: notification.group_id,
          accepted: true,
        },
      });
      joinGroup({
        group_id: notification.group_id,
        name: notification.group_name,
        is_private: true,
        member_count: notification.member_count,
      });
    } catch (e) {
      console.error(e);
    }
    onDismiss();
  };

  const declineInvite = async () => {
    try {
      await invoke("respond_to_invite", {
        payload: {
          invite_id: notification.invite_id,
          group_id: notification.group_id,
          accepted: false,
        },
      });
    } catch (e) {}
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="bg-surface-900 border border-surface-800 rounded-xl p-4 flex items-start justify-between gap-4"
    >
      <div className="flex-1">
        {isScreenshot && (
          <p className="text-sm text-danger-400">
            ⚠ Screenshot blocked – {notification.peer_name}
          </p>
        )}
        {isInvite && (
          <>
            <p className="text-sm text-surface-100">
              <span className="font-medium">{notification.inviter_name}</span> invited you to{" "}
              <span className="text-brand-400">{notification.group_name}</span>
            </p>
            <p className="text-xs text-surface-500 mt-1">
              {notification.member_count} members
            </p>
          </>
        )}
      </div>
      {isInvite && (
        <div className="flex items-center gap-2">
          <button
            onClick={acceptInvite}
            className="p-1.5 bg-success-500/20 text-success-400 rounded-full hover:bg-success-500/30"
          >
            <Check size={16} />
          </button>
          <button
            onClick={declineInvite}
            className="p-1.5 bg-danger-500/20 text-danger-400 rounded-full hover:bg-danger-500/30"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {isScreenshot && (
        <button onClick={onDismiss} className="text-surface-400 hover:text-white">
          <X size={16} />
        </button>
      )}
    </motion.div>
  );
}

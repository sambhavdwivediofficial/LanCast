// src/pages/NotificationPage.jsx
import { useEffect, useState } from "react";
import useAppStore from "../store/appStore";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, ShieldCheck, ShieldAlert, Clock, Camera, Users, UserPlus, UserX, X, Check
} from "lucide-react";

export default function NotificationPage() {
  const notifications = useAppStore((s) => s.notifications) || [];
  const removeNotification = useAppStore((s) => s.removeNotification);
  const auditEvents = useAppStore((s) => s.auditEvents) || [];
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    invoke("protect_window");
    return () => { invoke("unprotect_window"); };
  }, []);

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true;
    if (activeTab === "invites") return n.type === "invite";
    if (activeTab === "security") return n.type === "screenshot_attempt" || n.type === "protection_active";
    return true;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case "invite":
        return <Users size={16} className="text-brand-400" />;
      case "screenshot_attempt":
        return <Camera size={16} className="text-danger-400" />;
      case "protection_active":
        return <ShieldCheck size={16} className="text-success-400" />;
      case "peer_joined":
        return <UserPlus size={16} className="text-success-400" />;
      case "peer_left":
        return <UserX size={16} className="text-warning-400" />;
      default:
        return <Bell size={16} className="text-surface-400" />;
    }
  };

  const getNotificationBg = (type) => {
    switch (type) {
      case "invite":
        return "border-l-brand-500 bg-brand-500/5";
      case "screenshot_attempt":
        return "border-l-danger-500 bg-danger-500/5";
      case "protection_active":
        return "border-l-success-500 bg-success-500/5";
      case "peer_joined":
        return "border-l-success-500 bg-success-500/5";
      case "peer_left":
        return "border-l-warning-500 bg-warning-500/5";
      default:
        return "border-l-surface-600 bg-surface-800/50";
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell size={22} className="text-brand-400" />
          Notifications
        </h2>
        <p className="text-surface-400 text-sm mt-1">
          Alerts, invites, and security events
        </p>
      </motion.div>

      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: "All", count: notifications.length },
          { key: "invites", label: "Invites", count: notifications.filter((n) => n.type === "invite").length },
          { key: "security", label: "Security", count: notifications.filter((n) => n.type === "screenshot_attempt" || n.type === "protection_active").length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.key
                ? "bg-brand-600/20 text-brand-400 border border-brand-500/30"
                : "bg-surface-800 text-surface-400 border border-surface-700 hover:text-surface-200"
            }`}
          >
            {tab.label}
            <span className="bg-surface-700 text-surface-300 px-1.5 py-0.5 rounded text-2xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {filteredNotifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-surface-500"
        >
          <Bell size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm mt-1">
            {activeTab === "security"
              ? "No security events"
              : activeTab === "invites"
              ? "No pending invites"
              : "You're all caught up"}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id || notification.invite_id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className={`bg-surface-900 border border-surface-800 border-l-2 rounded-xl p-4 ${getNotificationBg(
                  notification.type
                )}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-surface-800 shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="min-w-0">
                      {notification.type === "screenshot_attempt" && (
                        <>
                          <div className="flex items-center gap-2 mb-0.5">
                            <ShieldAlert size={14} className="text-danger-400" />
                            <span className="text-xs font-semibold text-danger-400 uppercase tracking-wide">
                              Security Violation
                            </span>
                          </div>
                          <p className="text-sm text-surface-200">
                            <span className="font-medium text-danger-400">
                              {notification.peer_name}
                            </span>{" "}
                            attempted to take a screenshot
                          </p>
                          <p className="text-xs text-surface-500 mt-1">
                            Screenshot was blocked. This incident has been logged.
                          </p>
                        </>
                      )}

                      {notification.type === "protection_active" && (
                        <>
                          <div className="flex items-center gap-2 mb-0.5">
                            <ShieldCheck size={14} className="text-success-400" />
                            <span className="text-xs font-semibold text-success-400 uppercase tracking-wide">
                              Protection Active
                            </span>
                          </div>
                          <p className="text-sm text-surface-200">{notification.message}</p>
                        </>
                      )}

                      {notification.type === "invite" && (
                        <>
                          <p className="text-sm text-surface-200">
                            <span className="font-medium text-brand-400">
                              {notification.inviter_name}
                            </span>{" "}
                            invited you to join{" "}
                            <span className="font-medium text-white">
                              {notification.group_name}
                            </span>
                          </p>
                          <p className="text-xs text-surface-500 mt-1 flex items-center gap-2">
                            <Users size={12} />
                            {notification.member_count} members
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={async () => {
                                try {
                                  await invoke("respond_to_invite", {
                                    payload: {
                                      invite_id: notification.invite_id,
                                      group_id: notification.group_id,
                                      accepted: true,
                                    },
                                  });
                                  useAppStore.getState().joinGroup({
                                    group_id: notification.group_id,
                                    name: notification.group_name,
                                    is_private: true,
                                    member_count: notification.member_count,
                                  });
                                } catch (e) {
                                  console.error(e);
                                }
                                removeNotification(notification.invite_id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-success-500/20 text-success-400 rounded-lg text-xs font-medium hover:bg-success-500/30 transition-all"
                            >
                              <Check size={14} /> Accept
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await invoke("respond_to_invite", {
                                    payload: {
                                      invite_id: notification.invite_id,
                                      group_id: notification.group_id,
                                      accepted: false,
                                    },
                                  });
                                } catch (e) {}
                                removeNotification(notification.invite_id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-500/20 text-danger-400 rounded-lg text-xs font-medium hover:bg-danger-500/30 transition-all"
                            >
                              <X size={14} /> Decline
                            </button>
                          </div>
                        </>
                      )}

                      {notification.type === "peer_joined" && (
                        <p className="text-sm text-surface-200">
                          <span className="font-medium text-success-400">
                            {notification.peer_name}
                          </span>{" "}
                          joined the network
                        </p>
                      )}

                      {notification.type === "peer_left" && (
                        <p className="text-sm text-surface-200">
                          <span className="font-medium text-warning-400">
                            {notification.peer_name}
                          </span>{" "}
                          left the network
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-2xs text-surface-500 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(notification.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      onClick={() =>
                        removeNotification(notification.id || notification.invite_id)
                      }
                      className="p-1 text-surface-500 hover:text-surface-300 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {auditEvents.filter((e) => e.type === "screenshot_blocked").length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-danger-500/5 border border-danger-500/20 rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold text-danger-400 flex items-center gap-2 mb-3">
            <ShieldAlert size={16} />
            Security Audit Log — Screenshot Attempts
          </h3>
          <div className="space-y-2">
            {auditEvents
              .filter((e) => e.type === "screenshot_blocked")
              .slice(-10)
              .reverse()
              .map((event, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs text-surface-300 py-1 border-b border-surface-800 last:border-0"
                >
                  <span>
                    <span className="text-danger-400 font-medium">{event.peer_name}</span> attempted screenshot
                  </span>
                  <span className="text-surface-500">
                    {new Date(event.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

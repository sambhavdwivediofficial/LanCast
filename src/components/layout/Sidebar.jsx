import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, MessageSquare, Users, Bell, Radio,
  Zap, ChevronLeft, ChevronRight, ShieldAlert,
  ClipboardList,
} from "lucide-react";
import Tooltip from "./Tooltip";
import useAppStore from "@store/appStore";
import { useKillSwitch } from "@hooks/useSession";
import { invoke } from "@tauri-apps/api/core";
import logo from "/logo.png";

const NAV_ITEMS = [
  { id: "home",          path: "/",              icon: Home,          label: "Home" },
  { id: "chat",          path: "/chat",          icon: MessageSquare, label: "Chat" },
  { id: "group",         path: "/group",         icon: Users,         label: "Groups" },
  { id: "peers",         path: "/peers",         icon: Zap,           label: "Peers" },
  { id: "notifications", path: "/notifications", icon: Bell,          label: "Notifications" },
  { id: "audit",         path: "/audit",         icon: ClipboardList, label: "Audit Log" },
];

function NavItem({ item, collapsed, isActive, onClick }) {
  return (
    <Tooltip content={item.label} disabled={!collapsed}>
      <button
        type="button"
        onClick={onClick}
        className={`nav-item w-full ${collapsed ? "justify-center px-0" : ""} ${isActive ? "active" : ""}`}
        style={collapsed ? { padding: "10px 0", justifyContent: "center" } : {}}
      >
        <item.icon size={18} className="flex-shrink-0" />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              key="label"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-medium truncate"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </Tooltip>
  );
}

function BroadcastButton({ collapsed }) {
  const broadcasting = useAppStore((s) => s.broadcasting);
  const broadcastConfirmed = useAppStore((s) => s.broadcastConfirmed);
  const setBroadcasting = useAppStore((s) => s.setBroadcasting);
  const setBroadcastConfirmed = useAppStore((s) => s.setBroadcastConfirmed);
  const startSession = useAppStore((s) => s.startSession);
  const identity = useAppStore((s) => s.identity);
  const addAuditEvent = useAppStore((s) => s.addAuditEvent);

  const handleToggle = async () => {
    if (!broadcasting) {
      try {
        await invoke("start_broadcast", { name: identity.name });
        setBroadcasting(true);
        startSession();
        addAuditEvent({
          kind: "broadcast_started",
          actor: identity.name,
          detail: "Broadcast started",
          timestamp: Date.now(),
        });
      } catch {}
    } else {
      try {
        await invoke("stop_broadcast");
        setBroadcasting(false);
        setBroadcastConfirmed(false);
        addAuditEvent({
          kind: "broadcast_stopped",
          actor: identity.name,
          detail: "Broadcast stopped",
          timestamp: Date.now(),
        });
      } catch {}
    }
  };

  const dot = (
    <span className="relative flex-shrink-0" style={{ width: 8, height: 8 }}>
      <span
        className="block rounded-full"
        style={{
          width: 8,
          height: 8,
          background: broadcasting ? "#22c55e" : "#ef4444",
          boxShadow: broadcasting
            ? "0 0 8px rgba(34,197,94,0.6)"
            : "0 0 6px rgba(239,68,68,0.5)",
        }}
      />
      {broadcasting && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: "rgba(34,197,94,0.4)" }}
        />
      )}
    </span>
  );

  if (collapsed) {
    return (
      <Tooltip content={broadcasting ? "Broadcasting" : "Start Broadcast"}>
        <button
          type="button"
          onClick={handleToggle}
          className={`broadcast-btn ${broadcasting ? "active" : "inactive"} w-full justify-center`}
          style={{ padding: "10px 0" }}
        >
          {dot}
        </button>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`broadcast-btn ${broadcasting ? "active" : "inactive"} w-full`}
    >
      <Radio size={18} className="flex-shrink-0" />
      <span className="text-sm font-semibold flex-1 text-left">Broadcast</span>
      {dot}
    </button>
  );
}

function KillButton({ collapsed }) {
  const { killing, confirmed, requestKill, executeKill } = useKillSwitch();

  const handleClick = () => {
    if (!confirmed) { requestKill(); return; }
    executeKill();
  };

  if (collapsed) {
    return (
      <Tooltip content="Kill Switch">
        <button
          type="button"
          onClick={handleClick}
          className="kill-btn w-full justify-center"
          style={{ padding: "10px 0" }}
        >
          <ShieldAlert
            size={18}
            className={`flex-shrink-0 ${confirmed ? "animate-danger-pulse" : ""}`}
          />
        </button>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="kill-btn w-full"
      disabled={killing}
    >
      <ShieldAlert
        size={18}
        className={`flex-shrink-0 ${confirmed ? "animate-danger-pulse" : ""}`}
      />
      <span className="text-sm font-semibold flex-1 text-left">
        {killing ? "Killing…" : confirmed ? "Confirm Kill" : "Kill"}
      </span>
    </button>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useAppStore((s) => s.notifications);
  const unread = notifications.filter((n) => !n.readAt && !n.invalid).length;

  const isActive = (item) => {
    if (item.path === "/") return location.pathname === "/";
    return location.pathname.startsWith(item.path);
  };

  return (
    <motion.nav
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="sidebar flex-shrink-0"
      style={{ minWidth: collapsed ? 64 : 240 }}
    >
      <div className="flex flex-col h-full">
        <div
          className="flex items-center justify-between px-3 py-4 border-b border-surface-800"
          style={{ height: 60, flexShrink: 0 }}
        >
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2">
                <img src={logo} alt="LANCAST" className="w-7 h-7 rounded-lg flex-shrink-0" />
                <span className="text-lg font-extrabold text-white tracking-wide select-none">
                  LANCAST
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="btn-ghost p-1.5 rounded-lg"
              >
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="group relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-800 transition-colors mx-auto"
            >
              <img
                src={logo}
                alt="LANCAST"
                className="absolute w-7 h-7 rounded-lg pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity duration-150"
              />
              <ChevronRight
                size={18}
                className="absolute text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-0.5 px-2 py-3 flex-1 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map((item) => (
            <div key={item.id} className="relative">
              <NavItem
                item={item}
                collapsed={collapsed}
                isActive={isActive(item)}
                onClick={() => navigate(item.path)}
              />
              {item.id === "notifications" && unread > 0 && (
                <span
                  className="absolute top-1.5 right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-brand-500 text-white text-2xs font-bold px-1"
                  style={{ pointerEvents: "none" }}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-0.5 px-2 pb-3 border-t border-surface-800 pt-2">
          <KillButton collapsed={collapsed} />
          <BroadcastButton collapsed={collapsed} />
        </div>
      </div>
    </motion.nav>
  );
}

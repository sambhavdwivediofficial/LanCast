// src/components/layout/Sidebar.jsx
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Wifi, MessageCircle, UsersRound, Bell, Radio, ChevronLeft,
  ChevronRight, Skull
} from "lucide-react";
import { motion } from "framer-motion";
import Tooltip from "./Tooltip";
import useAppStore from "../../store/appStore";
import { invoke } from "@tauri-apps/api/core";
import logo from "/image.png";

const navItems = [
  { to: "/app/home", icon: Home, label: "Home" },
  { to: "/app/peers", icon: Wifi, label: "Peers" },
  { to: "/app/chat", icon: MessageCircle, label: "Chat" },
  { to: "/app/group", icon: UsersRound, label: "Group" },
  { to: "/app/notification", icon: Bell, label: "Notification" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { broadcasting, setBroadcasting, kill } = useAppStore();

  const toggleBroadcast = async () => {
    try {
      if (broadcasting) {
        await invoke("stop_broadcast");
        setBroadcasting(false);
      } else {
        await invoke("start_broadcast");
        setBroadcasting(true);
      }
    } catch (e) {
      console.error("Broadcast toggle failed:", e);
    }
  };

  const handleKill = async () => {
    await kill();
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-full bg-surface-900 border-r border-surface-800 flex flex-col shrink-0 overflow-hidden relative"
    >
      <div className="h-14 flex items-center justify-between px-4 border-b border-surface-800 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <img src={logo} alt="LANCAST" className="w-7 h-7 rounded-lg" />
            <span className="text-lg font-extrabold text-white tracking-wide select-none">
              LANCAST
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="group relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-800 transition-colors"
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
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-md hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-brand-600/20 text-brand-400 font-medium"
                  : "text-surface-400 hover:bg-surface-800 hover:text-surface-200"
              }`
            }
          >
            <span className="flex items-center justify-center w-5 h-5 shrink-0">
              <Icon size={20} />
            </span>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm truncate"
              >
                {label}
              </motion.span>
            )}
            {collapsed && <Tooltip label={label} />}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-surface-800 space-y-2 shrink-0">
        <button
          onClick={handleKill}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-danger-400 hover:bg-danger-500/10"
        >
          <span className="flex items-center justify-center w-5 h-5 shrink-0">
            <Skull size={20} />
          </span>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm truncate"
            >
              Kill
            </motion.span>
          )}
          {collapsed && <Tooltip label="Kill LANCAST" />}
        </button>

        <button
          onClick={toggleBroadcast}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
            broadcasting
              ? "bg-success-500/15 text-success-400"
              : "bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200"
          }`}
        >
          <span className="flex items-center justify-center w-5 h-5 shrink-0 relative">
            <Radio size={20} />
            <span
              className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-900 ${
                broadcasting ? "bg-success-500 animate-pulse-dot" : "bg-danger-500"
              }`}
            />
          </span>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm truncate"
            >
              {broadcasting ? "Broadcasting" : "Broadcast"}
            </motion.span>
          )}
          {collapsed && <Tooltip label={broadcasting ? "Broadcasting" : "Start Broadcast"} />}
        </button>
      </div>
    </motion.aside>
  );
}

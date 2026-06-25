import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Globe, Users, MoreHorizontal, LogIn, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "@store/appStore";

export default function GroupCard({ group, index = 0, isOwn = false }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const addGroup = useAppStore((s) => s.addGroup);
  const removeGroup = useAppStore((s) => s.removeGroup);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleJoin = async () => {
    try {
      await invoke("join_group", { groupId: group.groupId });
      addGroup(group);
      navigate(`/group/${group.groupId}`);
    } catch {}
    setMenuOpen(false);
  };

  const handleLeave = async () => {
    try {
      await invoke("leave_group", { groupId: group.groupId });
      removeGroup(group.groupId);
    } catch {}
    setMenuOpen(false);
  };

  const handleOpen = () => navigate(`/group/${group.groupId}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="group-card group"
      onDoubleClick={handleOpen}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 text-sm font-bold"
          style={{
            background: group.isPrivate
              ? "rgba(239,68,68,0.1)"
              : "rgba(99,102,241,0.1)",
            color: group.isPrivate ? "#f87171" : "#818cf8",
            border: `1px solid ${group.isPrivate ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.2)"}`,
          }}
        >
          {group.name?.[0]?.toUpperCase() ?? "G"}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-surface-200 truncate">{group.name}</p>
            {group.isPrivate ? (
              <Lock size={11} className="text-danger-500 flex-shrink-0" />
            ) : (
              <Globe size={11} className="text-brand-400 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Users size={10} className="text-surface-600" />
            <span className="text-2xs text-surface-600">{group.memberCount ?? group.members?.length ?? 0} members</span>
          </div>
        </div>
      </div>

      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-surface-700 bg-surface-900 shadow-overlay animate-scale-in z-dropdown overflow-hidden">
            <button
              type="button"
              onClick={() => { handleOpen(); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800 transition-colors"
            >
              <LogIn size={14} />
              {isOwn ? "Open" : "Join"}
            </button>
            {!isOwn && (
              <button
                type="button"
                onClick={handleJoin}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800 transition-colors"
              >
                <LogIn size={14} />
                Join group
              </button>
            )}
            {isOwn && (
              <button
                type="button"
                onClick={handleLeave}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-danger-400 hover:bg-surface-800 transition-colors"
              >
                <Trash2 size={14} />
                Leave group
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

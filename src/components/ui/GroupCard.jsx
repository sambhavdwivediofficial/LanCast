import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Globe, Users, MoreHorizontal, Trash2, EyeOff, LogOut } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "@store/appStore";

export default function GroupCard({ group, index = 0, onPeersPage = false }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);

  const identity = useAppStore((s) => s.identity);
  const removeGroup = useAppStore((s) => s.removeGroup);
  const hideGroup = useAppStore((s) => s.hideGroup);
  const broadcasting = useAppStore((s) => s.broadcasting);

  const isCreator = group.createdByMe === true;
  const isJoined = group.joined === true || isCreator;

  useEffect(() => {
    if (!menuOpen) setConfirmDelete(false);
  }, [menuOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleCardClick = () => {
    if (onPeersPage) return;
    if (!isCreator && !isJoined) return;
    navigate(`/group/${group.groupId}`);
  };

  const handleJoin = async (e) => {
    e.stopPropagation();
    if (!broadcasting) return;
    try {
      await invoke("join_group", { groupId: group.groupId });
      useAppStore.getState().addGroup({ ...group, joined: true });
      navigate(`/group/${group.groupId}`);
    } catch {}
    setMenuOpen(false);
  };

  const handleLeave = async (e) => {
    e.stopPropagation();
    try {
      await invoke("leave_group", { groupId: group.groupId });
      removeGroup(group.groupId);
    } catch {}
    setMenuOpen(false);
  };

  const handleHide = (e) => {
    e.stopPropagation();
    hideGroup(group.groupId);
    setMenuOpen(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await invoke("leave_group", { groupId: group.groupId });
    } catch {}
    removeGroup(group.groupId);
    setMenuOpen(false);
  };

  const memberCount = group.memberCount ?? group.members?.length ?? 0;

  const renderMenu = () => {
    if (group.isPrivate) {
      if (isCreator) {
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDelete(e); }}
            className="p-1.5 rounded-lg text-danger-500 hover:bg-danger-900/30 transition-colors flex-shrink-0"
            title={confirmDelete ? "Click again to confirm" : "Delete group"}
          >
            <Trash2 size={14} className={confirmDelete ? "animate-danger-pulse" : ""} />
          </button>
        );
      }
    if (onPeersPage && isCreator) {
      return null;
    }
      return (
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-surface-700 bg-surface-900 shadow-overlay z-dropdown overflow-hidden"
              >
                <button type="button" onClick={handleLeave} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-danger-400 hover:bg-surface-800 transition-colors">
                  <LogOut size={13} /> Leave group
                </button>
                <button type="button" onClick={handleHide} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-surface-400 hover:bg-surface-800 transition-colors">
                  <EyeOff size={13} /> Hide group
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-surface-700 bg-surface-900 shadow-overlay z-dropdown overflow-hidden"
            >
              {isCreator && (
                <>
                  <button type="button" onClick={handleLeave} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800 transition-colors">
                    <LogOut size={13} /> Leave group
                  </button>
                  <button type="button" onClick={handleDelete} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors" style={{ color: confirmDelete ? "#ef4444" : "#f87171" }}>
                    <Trash2 size={13} /> {confirmDelete ? "Confirm delete" : "Delete group"}
                  </button>
                </>
              )}
              {!isCreator && !isJoined && (
                <>
                  <button type="button" onClick={handleJoin} disabled={!broadcasting} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800 transition-colors disabled:opacity-40">
                    <Users size={13} /> Join group
                  </button>
                  <button type="button" onClick={handleHide} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-surface-400 hover:bg-surface-800 transition-colors">
                    <EyeOff size={13} /> Hide group
                  </button>
                </>
              )}
              {!isCreator && isJoined && (
                <>
                  <button type="button" onClick={handleLeave} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-danger-400 hover:bg-surface-800 transition-colors">
                    <LogOut size={13} /> Leave group
                  </button>
                  <button type="button" onClick={handleHide} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-surface-400 hover:bg-surface-800 transition-colors">
                    <EyeOff size={13} /> Hide group
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.18 }}
      onClick={handleCardClick}
      className="flex flex-col gap-2 p-3 rounded-xl border border-surface-800 bg-surface-900/60 transition-colors duration-150"
      style={{ cursor: (!onPeersPage && (isCreator || isJoined)) ? "pointer" : "default" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 text-sm font-extrabold"
            style={{
              background: group.isPrivate ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.12)",
              color: group.isPrivate ? "#f87171" : "#818cf8",
              border: `1px solid ${group.isPrivate ? "rgba(239,68,68,0.25)" : "rgba(99,102,241,0.25)"}`,
            }}
          >
            {group.name?.[0]?.toUpperCase() ?? "G"}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-surface-100 truncate">{group.name}</p>
              {group.isPrivate
                ? <Lock size={10} className="text-danger-500 flex-shrink-0" />
                : <Globe size={10} className="text-brand-400 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xs font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: group.isPrivate ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.1)",
                  color: group.isPrivate ? "#f87171" : "#818cf8",
                }}>
                {group.isPrivate ? "Private" : "Public"}
              </span>
              <div className="flex items-center gap-1">
                <Users size={9} className="text-surface-600" />
                <span className="text-2xs text-surface-600">{memberCount}</span>
              </div>
            </div>
          </div>
        </div>
        {renderMenu()}
      </div>

      {onPeersPage && isCreator && (
        <p className="text-2xs text-surface-500 italic">You own this group</p>
      )}
    </motion.div>
  );
}

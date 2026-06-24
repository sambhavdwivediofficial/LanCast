// src/components/ui/PeerCard.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, LogIn, MessageCircle } from "lucide-react";
import useAppStore from "../../store/appStore";
import { invoke } from "@tauri-apps/api/core";

export default function PeerCard({ peer, group }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { setActiveChatPeer, joinGroup, addAuditEvent } = useAppStore();

  const handleJoin = async () => {
    if (group) {
      try {
        await invoke("join_group", { groupId: group.group_id });
        joinGroup(group);
        addAuditEvent({ message: `Joined public group "${group.name}"`, timestamp: Date.now() });
        setMenuOpen(false);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleChat = () => {
    if (peer) {
      setActiveChatPeer(peer);
    }
  };

  if (group) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        className="relative bg-surface-900 border border-surface-800 hover:border-brand-500/30 rounded-xl p-4 transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-surface-100">{group.name}</h4>
            <p className="text-xs text-surface-500">{group.member_count || 0} members</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 hover:bg-surface-800 rounded-md text-surface-400 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-8 bg-surface-800 border border-surface-700 rounded-lg p-1 z-dropdown shadow-elevated"
              >
                <button
                  onClick={handleJoin}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-surface-200 hover:bg-surface-700 rounded w-full whitespace-nowrap transition-colors"
                >
                  <LogIn size={14} /> Join Group
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleChat}
      className="relative bg-surface-900 border border-surface-800 hover:border-brand-500/30 rounded-xl p-4 cursor-pointer transition-all"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
          peer.broadcasting
            ? "bg-brand-600/20 text-brand-400"
            : "bg-surface-800 text-surface-500"
        }`}>
          {peer.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-surface-100 truncate">{peer.name}</h4>
          <p className={`text-xs ${peer.broadcasting ? "text-success-400" : "text-surface-500"}`}>
            {peer.broadcasting ? "Online" : "Offline"}
          </p>
        </div>
        {peer.broadcasting && (
          <MessageCircle size={16} className="text-surface-600 ml-auto" />
        )}
      </div>
    </motion.div>
  );
}

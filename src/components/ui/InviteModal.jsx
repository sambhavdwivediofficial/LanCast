// src/components/ui/InviteModal.jsx
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import { X, UserPlus } from "lucide-react";
import useAppStore from "../../store/appStore";

export default function InviteModal({ groupId, onClose }) {
  const { peers } = useAppStore();
  const [selected, setSelected] = useState([]);

  const togglePeer = (peerId) => {
    setSelected((prev) =>
      prev.includes(peerId) ? prev.filter((id) => id !== peerId) : [...prev, peerId]
    );
  };

  const sendInvites = async () => {
    for (const peerId of selected) {
      try {
        await invoke("invite_peer_to_group", {
          payload: { group_id: groupId, peer_id: peerId },
        });
      } catch (e) {
        console.error(e);
      }
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-modal"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-900 border border-surface-700 rounded-2xl p-6 w-96 max-h-[80vh] shadow-overlay overflow-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Invite to Group</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {peers.length === 0 && <p className="text-surface-500 text-sm">No peers online.</p>}
          {peers.map((peer) => (
            <label key={peer.peer_id} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(peer.peer_id)}
                onChange={() => togglePeer(peer.peer_id)}
                className="rounded bg-surface-700 border-surface-600 text-brand-500"
              />
              <span className="text-sm text-surface-200">{peer.name}</span>
            </label>
          ))}
        </div>
        <button
          onClick={sendInvites}
          disabled={selected.length === 0}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-surface-800 text-white py-2.5 rounded-xl font-medium transition-all"
        >
          <UserPlus size={16} /> Send Invites
        </button>
      </motion.div>
    </motion.div>
  );
}

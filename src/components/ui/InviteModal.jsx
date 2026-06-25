import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Check, Search } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { usePeers } from "@hooks/usePeers";
import useAppStore from "@store/appStore";

export default function InviteModal({ groupId, groupName, onClose }) {
  const { peers } = usePeers();
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const identity = useAppStore((s) => s.identity);
  const addAuditEvent = useAppStore((s) => s.addAuditEvent);

  const broadcasting = peers.filter((p) => p.broadcasting);
  const filtered = broadcasting.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (peerId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(peerId) ? next.delete(peerId) : next.add(peerId);
      return next;
    });
  };

  const handleInvite = async () => {
    if (selected.size === 0) return;
    setSending(true);
    try {
      for (const peerId of selected) {
        await invoke("invite_peer_to_group", { payload: { groupId, peerId } });
        addAuditEvent({
          kind: "invite_sent",
          actor: identity.name,
          target: groupName,
          detail: `Invited peer to ${groupName}`,
          timestamp: Date.now(),
        });
      }
      onClose();
    } catch {}
    setSending(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="modal-panel"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-surface-100">Invite to Group</h2>
            <p className="text-xs text-surface-500 mt-0.5">{groupName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            className="input-base pl-9"
            placeholder="Search peers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto mb-4">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-surface-600 py-6">
              No broadcasting peers found
            </p>
          ) : (
            filtered.map((peer) => {
              const isSelected = selected.has(peer.peerId);
              return (
                <button
                  key={peer.peerId}
                  type="button"
                  onClick={() => toggle(peer.peerId)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 text-left"
                  style={{
                    background: isSelected ? "rgba(99,102,241,0.08)" : "rgba(39,39,42,0.4)",
                    borderColor: isSelected ? "rgba(99,102,241,0.3)" : "rgba(63,63,70,0.5)",
                  }}
                >
                  <span className="online-dot flex-shrink-0" />
                  <span className="text-sm font-medium text-surface-200 flex-1">{peer.name}</span>
                  <span
                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      borderColor: isSelected ? "#6366f1" : "#52525b",
                      background: isSelected ? "#6366f1" : "transparent",
                    }}
                  >
                    {isSelected && <Check size={11} className="text-white" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={handleInvite}
          disabled={selected.size === 0 || sending}
          className="btn-primary w-full"
        >
          {sending ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              <UserPlus size={15} />
              Invite {selected.size > 0 ? `${selected.size} peer${selected.size > 1 ? "s" : ""}` : ""}
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}

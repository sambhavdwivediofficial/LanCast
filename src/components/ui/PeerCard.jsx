import { motion } from "framer-motion";
import { MessageSquare, MoreHorizontal } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function PeerCard({ peer, index = 0, showActions = true }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const lastSeen = peer.lastSeen
    ? formatDistanceToNow(new Date(peer.lastSeen), { addSuffix: true })
    : "just now";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="peer-card group"
    >
      <span className="online-dot flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-200 truncate">{peer.name}</p>
        <p className="text-2xs text-surface-600 truncate">{lastSeen}</p>
      </div>

      {showActions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => navigate(`/chat/${peer.peerId}`)}
            className="p-1.5 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-surface-800 transition-colors"
            title="Message"
          >
            <MessageSquare size={14} />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-surface-700 bg-surface-900 shadow-overlay animate-scale-in z-dropdown overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => { navigate(`/chat/${peer.peerId}`); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800 transition-colors"
                >
                  <MessageSquare size={14} />
                  Send message
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

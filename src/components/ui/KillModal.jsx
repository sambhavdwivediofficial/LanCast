// src/components/ui/KillModal.jsx
import { motion } from "framer-motion";
import { Skull, X } from "lucide-react";

export default function KillModal({ onConfirm, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-modal"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-900 border border-danger-500/20 rounded-2xl p-6 w-96 shadow-overlay"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-danger-400">
            <Skull size={24} />
            <h3 className="text-lg font-bold">Kill LANCAST</h3>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-surface-300 mb-6">
          This will immediately wipe all RAM, destroy encryption keys, cancel all transfers, and close the app.
          <strong className="text-danger-400 block mt-1">This cannot be undone.</strong>
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-surface-300 hover:text-white bg-surface-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-danger-600 hover:bg-danger-500 text-white rounded-xl font-bold flex items-center gap-2"
          >
            <Skull size={16} />
            Kill Now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

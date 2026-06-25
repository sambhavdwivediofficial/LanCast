import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X } from "lucide-react";
import { useKillSwitch } from "@hooks/useSession";

export default function KillSwitch({ collapsed = false }) {
  const { killing, confirmed, requestKill, executeKill } = useKillSwitch();

  const handleClick = () => {
    if (!confirmed) { requestKill(); return; }
    executeKill();
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="kill-btn w-full justify-center"
        style={{ padding: "10px 0" }}
        title={confirmed ? "Click again to confirm" : "Kill Switch"}
      >
        <ShieldAlert
          size={18}
          className={`flex-shrink-0 ${confirmed ? "animate-danger-pulse text-danger-400" : "text-danger-500"}`}
        />
      </button>
    );
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={killing}
        className="kill-btn w-full"
      >
        <ShieldAlert
          size={18}
          className={`flex-shrink-0 ${confirmed ? "animate-danger-pulse" : ""}`}
        />
        <span className="text-sm font-semibold flex-1 text-left">
          {killing ? "Terminating…" : confirmed ? "Confirm — Kill All" : "Kill"}
        </span>
        {killing && (
          <span className="w-4 h-4 rounded-full border-2 border-danger-500/30 border-t-danger-500 animate-spin" />
        )}
      </button>

      <AnimatePresence>
        {confirmed && !killing && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-0 right-0 px-3 py-2 rounded-lg text-2xs text-danger-400 text-center"
            style={{
              background: "rgba(127,29,29,0.3)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            All data will be wiped. Click again to confirm.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// src/components/layout/Tooltip.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function Tooltip({ label }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-surface-800 text-surface-200 text-xs rounded-md shadow-elevated pointer-events-none whitespace-nowrap z-tooltip"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// src/components/ui/TypingIndicator.jsx
import { motion } from "framer-motion";

export default function TypingIndicator({ name }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="px-4 py-1 text-xs text-surface-400 italic"
    >
      {name} is typing...
    </motion.div>
  );
}

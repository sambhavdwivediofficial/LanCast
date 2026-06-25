import { motion, AnimatePresence } from "framer-motion";

export default function TypingIndicator({ name, visible }) {
  return (
    <AnimatePresence>
      {visible && name && (
        <motion.div
          initial={{ opacity: 0, y: 4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: 4, height: 0 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-2 px-1 py-1"
        >
          <div className="flex items-center gap-1 px-3 py-2 rounded-2xl rounded-bl-sm bg-surface-800 border border-surface-700/50">
            <span className="flex gap-0.5 items-end h-3">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block w-1 rounded-full bg-surface-400"
                  animate={{ height: ["4px", "10px", "4px"] }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: "easeInOut",
                  }}
                  style={{ height: 4 }}
                />
              ))}
            </span>
          </div>
          <span className="text-2xs text-surface-500">
            {name} is typing
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

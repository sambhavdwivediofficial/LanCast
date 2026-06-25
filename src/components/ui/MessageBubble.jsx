import { useState, useCallback } from "react";
import { Check, CheckCheck, Copy, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import FilePreview from "./FilePreview";

const MAX_COLLAPSED = 300;

function TickIcon({ status }) {
  if (status === "sending") return <Check size={11} className="text-surface-600" />;
  if (status === "sent")    return <Check size={11} className="text-surface-500" />;
  if (status === "received") return <CheckCheck size={11} className="text-surface-500" />;
  if (status === "seen")    return <CheckCheck size={11} className="text-brand-400" />;
  return null;
}

export default function MessageBubble({ message, fromSelf }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { content, timestamp, status, isSystem, isDanger, files } = message;

  const handleCopy = useCallback(async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [content]);

  if (isSystem && isDanger) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="message-bubble-danger flex items-center gap-2 self-center"
      >
        <AlertTriangle size={12} className="flex-shrink-0" />
        <span>{content}</span>
      </motion.div>
    );
  }

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="message-bubble-system self-center"
      >
        {content}
      </motion.div>
    );
  }

  const isLong = content && content.length > MAX_COLLAPSED;
  const displayContent = isLong && !expanded
    ? content.slice(0, MAX_COLLAPSED) + "…"
    : content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`group relative flex flex-col gap-1 ${fromSelf ? "items-end" : "items-start"}`}
    >
      <div className={fromSelf ? "message-bubble-out" : "message-bubble-in"}>
        {files && files.length > 0 && (
          <div className="flex flex-col gap-2 mb-2">
            {files.map((f, i) => (
              <FilePreview key={i} file={f} />
            ))}
          </div>
        )}

        {content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {displayContent}
          </p>
        )}

        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-2xs text-brand-400 mt-1 hover:text-brand-300 transition-colors"
          >
            {expanded ? (
              <><ChevronUp size={11} /> Show less</>
            ) : (
              <><ChevronDown size={11} /> Show more</>
            )}
          </button>
        )}

        <div className={`flex items-center gap-1.5 mt-1 ${fromSelf ? "justify-end" : "justify-start"}`}>
          <span className="text-2xs text-surface-600">
            {timestamp ? format(new Date(timestamp), "HH:mm") : ""}
          </span>
          {fromSelf && <TickIcon status={status} />}
        </div>
      </div>

      {content && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute -right-7 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-surface-800"
          style={fromSelf ? { right: "auto", left: "-28px" } : { right: "-28px" }}
          title="Copy"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span key="ok" initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
                <Check size={12} className="text-success-400" />
              </motion.span>
            ) : (
              <motion.span key="copy" initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
                <Copy size={12} className="text-surface-500" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      )}
    </motion.div>
  );
}

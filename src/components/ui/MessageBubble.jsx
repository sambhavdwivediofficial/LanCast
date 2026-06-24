// src/components/ui/MessageBubble.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Copy } from "lucide-react";

export default function MessageBubble({ message }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const isSelf = message.sender_id === "self" || message.status;
  const longMessage = message.content?.length > 300;

  const copyText = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const statusIcon = () => {
    if (!isSelf) return null;
    switch (message.status) {
      case "sending": return <Check size={14} className="text-surface-500" />;
      case "sent": return <CheckCheck size={14} className="text-surface-400" />;
      case "seen": return <CheckCheck size={14} className="text-brand-400" />;
      default: return null;
    }
  };

  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
    >
      <div className={`group relative max-w-[80%] ${isSelf ? "bg-brand-600/20" : "bg-surface-800"} rounded-2xl px-4 py-2.5`}>
        {!message.is_system && message.isGroup && !isSelf && (
          <p className="text-xs font-medium text-brand-400 mb-0.5">{message.sender_name}</p>
        )}
        <div className={`text-sm ${expanded ? "" : "max-h-32 overflow-hidden"} ${longMessage ? "cursor-pointer" : ""}`}
          onClick={() => longMessage && setExpanded(!expanded)}>
          {message.content}
        </div>
        {longMessage && !expanded && (
          <button className="text-xs text-brand-400 mt-1">Show more</button>
        )}
        {longMessage && expanded && (
          <button className="text-xs text-brand-400 mt-1">Show less</button>
        )}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-2xs text-surface-500">{time}</span>
          {statusIcon()}
        </div>
        <button
          onClick={copyText}
          className="absolute -top-2 -right-2 p-1 bg-surface-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <Check size={12} className="text-success-400" /> : <Copy size={12} className="text-surface-300" />}
        </button>
      </div>
    </motion.div>
  );
}

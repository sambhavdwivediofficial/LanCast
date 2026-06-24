// src/components/ui/EmojiPicker.jsx
import { useState, useEffect, useRef } from "react";
import { Smile } from "lucide-react";

const EMOJI_LIST = [
  "😀","😂","🤣","😍","😎","😢","😡","👍","👎","❤️","🔥","🎉",
  "😊","🙏","💪","🤝","👀","✨","💯","✅","❌","⚠️","📎","📁",
  "🖥️","🔒","🔑","📡","💻","📱","⌛","⏳","📊","📈","🏠","👥",
];

export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-12 left-0 bg-surface-800 border border-surface-700 rounded-xl p-2 grid grid-cols-6 gap-1 z-dropdown shadow-elevated"
    >
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="p-1.5 text-lg hover:bg-surface-700 rounded-lg transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

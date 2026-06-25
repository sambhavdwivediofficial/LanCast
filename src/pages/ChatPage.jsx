import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "@store/appStore";
import { useMessages } from "@hooks/useMessages";
import { useTyping } from "@hooks/useTyping";
import { usePeers } from "@hooks/usePeers";
import MessageBubble from "@components/ui/MessageBubble";
import TypingIndicator from "@components/ui/TypingIndicator";
import EmojiPicker from "@components/ui/EmojiPicker";
import FilePreview from "@components/ui/FilePreview";

const MAX_FILES = 4;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function ChatPage() {
  const { peerId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const identity = useAppStore((s) => s.identity);
  const { messages, sendMessage } = useMessages(peerId);
  const { isTyping, typingName, sendTyping } = useTyping(peerId);
  const { getPeer } = usePeers();
  const peer = getPeer(peerId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [peerId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;

    if (text) {
      setInput("");
      await sendMessage(text);
    }

    for (const file of pendingFiles) {
      const transferId = crypto.randomUUID();
      const chunks = [];
      const chunkSize = 65536;
      for (let i = 0; i < file.data.length; i += chunkSize) {
        chunks.push(file.data.slice(i, i + chunkSize));
      }
      for (let i = 0; i < chunks.length; i++) {
        await invoke("send_file_chunk", {
          payload: {
            transferId,
            peerId,
            chunkIndex: i,
            totalChunks: chunks.length,
            fileName: file.name,
            fileSize: file.data.length,
            mimeType: file.mimeType,
            data: Array.from(chunks[i]),
            isLast: i === chunks.length - 1,
          },
        });
      }
    }

    setPendingFiles([]);
    inputRef.current?.focus();
  }, [input, pendingFiles, peerId, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    sendTyping();
  };

  const handleFilePick = async () => {
    if (pendingFiles.length >= MAX_FILES) return;
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "All Files", extensions: ["*"] }],
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      const toAdd = paths.slice(0, MAX_FILES - pendingFiles.length);
      const loaded = await Promise.all(
        toAdd.map(async (path) => {
          const data = await readFile(path);
          const name = path.split(/[\\/]/).pop();
          const ext = name.split(".").pop()?.toLowerCase() ?? "";
          if (data.length > MAX_FILE_SIZE) return null;
          return { name, data, mimeType: `application/${ext}`, path };
        })
      );
      setPendingFiles((prev) => [...prev, ...loaded.filter(Boolean)]);
    } catch {}
  };

  const handleEmojiSelect = (emoji) => {
    setInput((v) => v + emoji);
    inputRef.current?.focus();
  };

  const removeFile = (i) => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));

  const displayName = peer?.name ?? peerId;

  return (
    <div className="page">
      <div className="page-header">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="online-dot" />
          <div>
            <h1 className="text-sm font-bold text-surface-100">{displayName}</h1>
            <p className="text-2xs text-surface-600">End-to-end encrypted</p>
          </div>
        </div>
      </div>

      <div className="page-scroll px-4 py-4 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id ?? i}
              message={msg}
              fromSelf={msg.fromSelf}
            />
          ))}
        </AnimatePresence>
        <TypingIndicator name={typingName} visible={isTyping} />
        <div ref={endRef} />
      </div>

      <div className="chat-input-area">
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {pendingFiles.map((f, i) => (
              <FilePreview key={i} file={f} onRemove={() => removeFile(i)} compact />
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <EmojiPicker onSelect={handleEmojiSelect} />

          <button
            type="button"
            onClick={handleFilePick}
            disabled={pendingFiles.length >= MAX_FILES}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700 transition-colors flex-shrink-0"
            title="Attach file"
          >
            <Paperclip size={16} />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${displayName}…`}
              rows={1}
              className="input-base resize-none w-full pr-3"
              style={{ minHeight: 40, maxHeight: 120 }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() && pendingFiles.length === 0}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600 text-white flex-shrink-0 transition-all duration-150 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

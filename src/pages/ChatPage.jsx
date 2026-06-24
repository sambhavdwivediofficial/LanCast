// src/pages/ChatPage.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import useAppStore from "../store/appStore";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Paperclip, X, File as FileIcon, Smile } from "lucide-react";
import MessageBubble from "../components/ui/MessageBubble";
import FilePreview from "../components/ui/FilePreview";
import EmojiPicker from "../components/ui/EmojiPicker";
import TypingIndicator from "../components/ui/TypingIndicator";
import { listen } from "@tauri-apps/api/event";

export default function ChatPage() {
  const {
    peers, messages, activeChatPeer, setActiveChatPeer,
    addMessage, updateMessageStatus, addAuditEvent,
    fileTransfers, addFileTransfer, updateFileTransferProgress, completeFileTransfer,
    updateTransferStats,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(null);
  const [localTypingTimer, setLocalTypingTimer] = useState(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingListenersRef = useRef([]);

  useEffect(() => {
    invoke("protect_window");
    return () => { invoke("unprotect_window"); };
  }, [activeChatPeer]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChatPeer]);

  useEffect(() => {
    const setupTypingListener = async () => {
      const unlisten = await listen("typing_indicator", (event) => {
        const { peer_id, name, is_typing } = event.payload;
        if (is_typing && activeChatPeer?.peer_id === peer_id) {
          setRemoteTyping(name);
        } else {
          setRemoteTyping(null);
        }
      });
      typingListenersRef.current.push(unlisten);
    };
    setupTypingListener();
    return () => {
      typingListenersRef.current.forEach((fn) => fn());
    };
  }, [activeChatPeer]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (activeChatPeer) {
      if (localTypingTimer) clearTimeout(localTypingTimer);
      const timer = setTimeout(() => {
        invoke("send_typing", { peer_id: activeChatPeer.peer_id, is_typing: false });
      }, 2000);
      invoke("send_typing", { peer_id: activeChatPeer.peer_id, is_typing: true });
      setLocalTypingTimer(timer);
    }
  };

  const sendMessage = async () => {
    if (!activeChatPeer) return;
    const content = input.trim();
    if (!content && selectedFiles.length === 0) return;

    if (content) {
      const messageId = crypto.randomUUID();
      addMessage({
        message_id: messageId,
        peer_id: activeChatPeer.peer_id,
        content,
        timestamp: Date.now(),
        is_system: false,
        status: "sending",
      });
      try {
        await invoke("send_message", {
          payload: { peer_id: activeChatPeer.peer_id, content, message_id: messageId },
        });
        updateMessageStatus(messageId, "sent");
        addAuditEvent({ message: `Message sent to ${activeChatPeer.name}`, timestamp: Date.now() });
      } catch (e) {
        updateMessageStatus(messageId, "error");
      }
      setInput("");
    }

    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        sendFile(file, activeChatPeer.peer_id);
      }
      setSelectedFiles([]);
    }
    setShowEmoji(false);
  };

  const sendFile = async (file, peerId) => {
    const CHUNK_SIZE = 65536;
    const transferId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const reader = file.stream().getReader();
    let index = 0;
    addFileTransfer({
      transfer_id: transferId,
      peer_id: peerId,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      chunk_count: totalChunks,
    });
    updateTransferStats("sent", file.size / (1024 * 1024));

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
          const chunk = value.slice(i, i + CHUNK_SIZE);
          const isLast = index === totalChunks - 1;
          await invoke("send_file_chunk", {
            payload: {
              transfer_id: transferId,
              peer_id: peerId,
              chunk_index: index,
              total_chunks: totalChunks,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type || "application/octet-stream",
              data: Array.from(chunk),
              is_last: isLast,
            },
          });
          index++;
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 4) return;
    const valid = files.filter((f) => f.size <= 104857600);
    setSelectedFiles((prev) => [...prev, ...valid]);
    e.target.value = "";
  };

  const removeFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const chatMessages = activeChatPeer ? (messages[activeChatPeer.peer_id] || []) : [];

  if (!activeChatPeer) {
    return (
      <div className="flex-1 flex items-center justify-center text-surface-500">
        Select a peer to start chatting
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="h-14 border-b border-surface-800 flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={() => setActiveChatPeer(null)}
          className="p-1 hover:bg-surface-800 rounded-md text-surface-400"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-surface-100">{activeChatPeer.name}</h3>
          <AnimatePresence>
            {remoteTyping ? (
              <TypingIndicator name={remoteTyping} />
            ) : (
              <p className="text-xs text-surface-500">Online</p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chatMessages.map((msg) => (
          <MessageBubble key={msg.message_id} message={msg} />
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-surface-800 p-3 space-y-2">
        <AnimatePresence>
          {selectedFiles.length > 0 && (
            <motion.div className="flex gap-2 overflow-x-auto pb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {selectedFiles.map((file, idx) => (
                <FilePreview
                  key={idx}
                  file={file}
                  onRemove={() => removeFile(idx)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-surface-400 hover:text-brand-400 transition-colors"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="relative">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-2 text-surface-400 hover:text-brand-400 transition-colors"
            >
              <Smile size={20} />
            </button>
            {showEmoji && (
              <EmojiPicker
                onSelect={(emoji) => setInput((prev) => prev + emoji)}
                onClose={() => setShowEmoji(false)}
              />
            )}
          </div>
          <div className="flex-1 bg-surface-900 border border-surface-700 rounded-xl px-4 py-2 flex items-center">
            <input
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-sm text-surface-100 placeholder-surface-500 outline-none"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() && selectedFiles.length === 0}
            className="p-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-surface-800 rounded-xl text-white transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

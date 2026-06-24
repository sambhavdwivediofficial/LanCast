// src/pages/GroupPage.jsx
import { useState, useEffect, useRef } from "react";
import useAppStore from "../store/appStore";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Lock, Plus, MoreVertical, Send, Paperclip,
  X, File as FileIcon, Smile
} from "lucide-react";
import GroupCard from "../components/ui/GroupCard";
import MessageBubble from "../components/ui/MessageBubble";
import FilePreview from "../components/ui/FilePreview";
import EmojiPicker from "../components/ui/EmojiPicker";
import TypingIndicator from "../components/ui/TypingIndicator";
import InviteModal from "../components/ui/InviteModal";

export default function GroupPage() {
  const {
    groups, groupMessages, activeGroupId, setActiveGroup, addGroupMessage,
    fileTransfers, addFileTransfer, updateFileTransferProgress, completeFileTransfer,
    updateTransferStats, addAuditEvent, localName,
  } = useAppStore();

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingListenerCleanup = useRef(null);

  useEffect(() => {
    invoke("protect_window");
    return () => { invoke("unprotect_window"); };
  }, [activeGroupId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages, activeGroupId]);

  useEffect(() => {
    const setupTypingListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const unlisten = await listen("typing_indicator", (event) => {
        const { group_id, name, is_typing } = event.payload;
        if (is_typing && activeGroupId === group_id && name !== localName) {
          setRemoteTyping(name);
        } else {
          setRemoteTyping(null);
        }
      });
      typingListenerCleanup.current = unlisten;
    };
    setupTypingListener();
    return () => {
      if (typingListenerCleanup.current) typingListenerCleanup.current();
    };
  }, [activeGroupId, localName]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (activeGroupId) {
      invoke("send_typing", { group_id: activeGroupId, is_typing: true });
      clearTimeout(window.groupTypingTimer);
      window.groupTypingTimer = setTimeout(() => {
        invoke("send_typing", { group_id: activeGroupId, is_typing: false });
      }, 2000);
    }
  };

  const createGroup = async () => {
    if (!newName.trim()) return;
    try {
      await invoke("create_group", {
        payload: { name: newName.trim(), is_private: isPrivate },
      });
      const res = await invoke("get_groups");
      if (res?.data) useAppStore.setState({ groups: res.data });
      addAuditEvent({ message: `Group "${newName}" created`, timestamp: Date.now() });
      setShowNewGroup(false);
      setNewName("");
      setIsPrivate(false);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!activeGroupId) return;
    const content = input.trim();
    if (!content && selectedFiles.length === 0) return;

    if (content) {
      const messageId = crypto.randomUUID();
      addGroupMessage({
        message_id: messageId,
        group_id: activeGroupId,
        sender_id: "self",
        sender_name: localName,
        content,
        timestamp: Date.now(),
        is_system: false,
      });
      try {
        await invoke("send_group_message", {
          payload: { group_id: activeGroupId, content, message_id: messageId },
        });
        addAuditEvent({ message: `Message sent to group ${activeGroup?.name}`, timestamp: Date.now() });
      } catch (e) {
        console.error(e);
      }
      setInput("");
    }

    for (const file of selectedFiles) {
      const CHUNK_SIZE = 65536;
      const transferId = crypto.randomUUID();
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      addFileTransfer({
        transfer_id: transferId,
        peer_id: "group",
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        chunk_count: totalChunks,
      });
      updateTransferStats("sent", file.size / (1024 * 1024));

      const reader = file.stream().getReader();
      let index = 0;
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
                peer_id: "group",  // Backend may need group file handling
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
        addAuditEvent({ message: `File sent: ${file.name}`, timestamp: Date.now() });
      } catch (e) {
        console.error("File send failed:", e);
      }
    }
    setSelectedFiles([]);
    setShowEmoji(false);
  };

  const removeFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const activeGroup = groups.find((g) => g.group_id === activeGroupId);

  if (activeGroup) {
    const msgs = groupMessages[activeGroupId] || [];
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="h-14 border-b border-surface-800 flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setActiveGroup(null)} className="p-1 hover:bg-surface-800 rounded-md text-surface-400">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
              {activeGroup.name}
              {activeGroup.is_private && <Lock size={12} className="text-amber-400" />}
            </h3>
            <AnimatePresence>
              {remoteTyping ? (
                <TypingIndicator name={remoteTyping} />
              ) : (
                <p className="text-xs text-surface-500">{activeGroup.member_count} members</p>
              )}
            </AnimatePresence>
          </div>
          {activeGroup.is_private && (
            <button onClick={() => setShowInvite(true)} className="p-2 hover:bg-surface-800 rounded-lg text-surface-400">
              <MoreVertical size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {msgs.map((msg) => (
            <MessageBubble key={msg.message_id} message={{ ...msg, isGroup: true }} />
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-surface-800 p-3 space-y-2">
          <AnimatePresence>
            {selectedFiles.length > 0 && (
              <motion.div className="flex gap-2 overflow-x-auto pb-2">
                {selectedFiles.map((file, idx) => (
                  <FilePreview key={idx} file={file} onRemove={() => removeFile(idx)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2 relative">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-surface-400 hover:text-brand-400">
              <Paperclip size={20} />
            </button>
            <input ref={fileInputRef} type="file" multiple onChange={(e) => {
              const files = Array.from(e.target.files);
              setSelectedFiles((prev) => [...prev, ...files].slice(0, 4));
              e.target.value = "";
            }} className="hidden" />
            <div className="relative">
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-surface-400 hover:text-brand-400">
                <Smile size={20} />
              </button>
              {showEmoji && (
                <EmojiPicker onSelect={(emoji) => setInput((prev) => prev + emoji)} onClose={() => setShowEmoji(false)} />
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

        {showInvite && (
          <InviteModal groupId={activeGroupId} onClose={() => setShowInvite(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Groups</h2>
        <button
          onClick={() => setShowNewGroup(true)}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
        >
          <Plus size={16} /> New Group
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {groups.map((group) => (
          <GroupCard
            key={group.group_id}
            group={group}
            onClick={() => setActiveGroup(group.group_id)}
          />
        ))}
        {groups.length === 0 && (
          <p className="text-surface-500 col-span-full text-center py-10">No groups yet.</p>
        )}
      </div>

      {showNewGroup && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-modal"
          onClick={() => setShowNewGroup(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }} animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-900 border border-surface-700 rounded-2xl p-6 w-96 shadow-overlay"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Create Group</h3>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name"
              className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 mb-3 outline-none focus:border-brand-500"
              autoFocus
            />
            <label className="flex items-center gap-2 text-sm text-surface-300 mb-4">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded bg-surface-800 border-surface-600 text-brand-500 focus:ring-brand-500"
              />
              Private group
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowNewGroup(false)} className="px-4 py-2 text-surface-300 hover:text-white">Cancel</button>
              <button onClick={createGroup} className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium">Create</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

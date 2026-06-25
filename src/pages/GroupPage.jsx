import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Send, Paperclip, Users, Lock,
  Globe, MoreHorizontal, UserPlus, LogOut, X, Check,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "@store/appStore";
import { useGroups } from "@hooks/useGroups";
import { useTyping } from "@hooks/useTyping";
import MessageBubble from "@components/ui/MessageBubble";
import TypingIndicator from "@components/ui/TypingIndicator";
import EmojiPicker from "@components/ui/EmojiPicker";
import GroupCard from "@components/ui/GroupCard";
import InviteModal from "@components/ui/InviteModal";

const MAX_FILES = 4;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

function CreateGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Enter a group name"); return; }
    if (trimmed.length > 64) { setError("Max 64 characters"); return; }
    setLoading(true);
    try {
      await onCreate(trimmed, isPrivate);
      onClose();
    } catch { setError("Failed to create group"); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="modal-panel"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-surface-100">New Group</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Group Name</label>
            <input
              type="text"
              className="input-base"
              placeholder="My group…"
              value={name}
              maxLength={64}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            {error && <p className="text-xs text-danger-400 mt-1">{error}</p>}
          </div>

          <button
            type="button"
            onClick={() => setIsPrivate((v) => !v)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-150 text-left"
            style={{
              background: isPrivate ? "rgba(239,68,68,0.06)" : "rgba(39,39,42,0.4)",
              borderColor: isPrivate ? "rgba(239,68,68,0.25)" : "rgba(63,63,70,0.5)",
            }}
          >
            <span
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all border-2"
              style={{
                borderColor: isPrivate ? "#ef4444" : "#52525b",
                background: isPrivate ? "#ef4444" : "transparent",
              }}
            >
              {isPrivate && <Check size={11} className="text-white" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-surface-200">Private</p>
              <p className="text-xs text-surface-500">Only visible to invited members</p>
            </div>
            {isPrivate ? <Lock size={14} className="text-danger-400 ml-auto flex-shrink-0" /> : <Globe size={14} className="text-brand-400 ml-auto flex-shrink-0" />}
          </button>
        </div>

        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 border border-surface-700">Cancel</button>
          <button type="button" onClick={handleCreate} disabled={!name.trim() || loading} className="btn-primary flex-1">
            {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Create Group"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function GroupChat({ group }) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const identity = useAppStore((s) => s.identity);
  const addGroupMessage = useAppStore((s) => s.addGroupMessage);
  const { isTyping, typingName } = useTyping(null, group.groupId);
  const { leaveGroup } = useGroups();

  const messages = group.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => { inputRef.current?.focus(); }, [group.groupId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;

    if (text) {
      const messageId = crypto.randomUUID();
      setInput("");
      addGroupMessage(group.groupId, {
        id: messageId,
        content: text,
        senderName: identity.name,
        timestamp: Date.now(),
        fromSelf: true,
      });
      await invoke("send_group_message", {
        payload: { groupId: group.groupId, content: text, messageId },
      });
    }

    setPendingFiles([]);
    inputRef.current?.focus();
  }, [input, pendingFiles, group.groupId, identity.name, addGroupMessage]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFilePick = async () => {
    if (pendingFiles.length >= MAX_FILES) return;
    try {
      const selected = await open({ multiple: true, filters: [{ name: "All Files", extensions: ["*"] }] });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      const toAdd = paths.slice(0, MAX_FILES - pendingFiles.length);
      const loaded = await Promise.all(
        toAdd.map(async (path) => {
          const data = await readFile(path);
          const name = path.split(/[\\/]/).pop();
          if (data.length > MAX_FILE_SIZE) return null;
          return { name, data, mimeType: "application/octet-stream" };
        })
      );
      setPendingFiles((prev) => [...prev, ...loaded.filter(Boolean)]);
    } catch {}
  };

  const handleLeave = async () => {
    await leaveGroup(group.groupId);
    navigate("/group");
  };

  return (
    <div className="page">
      <div className="page-header">
        <button type="button" onClick={() => navigate("/group")} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors">
          <ArrowLeft size={16} />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {group.isPrivate ? <Lock size={14} className="text-danger-400 flex-shrink-0" /> : <Globe size={14} className="text-brand-400 flex-shrink-0" />}
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-surface-100 truncate">{group.name}</h1>
            <div className="flex items-center gap-1">
              <Users size={10} className="text-surface-600" />
              <span className="text-2xs text-surface-600">{group.memberCount ?? group.members?.length ?? 0} members</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {group.isPrivate && (
            <button type="button" onClick={() => setInviteOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-brand-400 hover:bg-surface-800 transition-colors">
              <UserPlus size={13} />
              Invite
            </button>
          )}
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors">
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-surface-700 bg-surface-900 shadow-overlay animate-scale-in z-dropdown overflow-hidden">
                <button type="button" onClick={() => { setInviteOpen(true); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800 transition-colors">
                  <UserPlus size={14} /> Invite peers
                </button>
                <div className="divider" />
                <button type="button" onClick={handleLeave} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-danger-400 hover:bg-surface-800 transition-colors">
                  <LogOut size={14} /> Leave group
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-scroll px-4 py-4 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <div key={msg.id ?? i}>
              {!msg.fromSelf && !msg.isSystem && (
                <p className="text-2xs text-surface-600 mb-1 px-1">{msg.senderName}</p>
              )}
              <MessageBubble message={msg} fromSelf={msg.fromSelf} />
            </div>
          ))}
        </AnimatePresence>
        <TypingIndicator name={typingName} visible={isTyping} />
        <div ref={endRef} />
      </div>

      <div className="chat-input-area">
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {pendingFiles.map((f, i) => (
              <div key={i} className="relative">
                <FilePreview file={f} onRemove={() => setPendingFiles((p) => p.filter((_, idx) => idx !== i))} compact />
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <EmojiPicker onSelect={(e) => { setInput((v) => v + e); inputRef.current?.focus(); }} />
          <button type="button" onClick={handleFilePick} disabled={pendingFiles.length >= MAX_FILES} className="flex items-center justify-center w-8 h-8 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700 transition-colors flex-shrink-0">
            <Paperclip size={16} />
          </button>
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${group.name}…`}
              rows={1}
              className="input-base resize-none w-full"
              style={{ minHeight: 40, maxHeight: 120 }}
              onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            />
          </div>
          <button type="button" onClick={handleSend} disabled={!input.trim() && pendingFiles.length === 0} className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600 text-white flex-shrink-0 hover:bg-brand-500 disabled:opacity-40 transition-all">
            <Send size={15} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {inviteOpen && (
          <InviteModal groupId={group.groupId} groupName={group.name} onClose={() => setInviteOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { myGroups, createGroup } = useGroups();
  const groups = useAppStore((s) => s.groups);

  if (groupId) {
    const group = groups[groupId];
    if (!group) {
      return (
        <div className="page">
          <div className="page-header">
            <button type="button" onClick={() => navigate("/group")} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800">
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-sm font-bold text-surface-100">Group not found</h1>
          </div>
        </div>
      );
    }
    return <GroupChat group={group} />;
  }

  return (
    <div className="page">
      <div className="page-header">
        <Users size={18} className="text-brand-400" />
        <div className="flex-1">
          <h1 className="text-base font-bold text-surface-100">Groups</h1>
          <p className="text-2xs text-surface-500">{myGroups.length} groups</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary px-3 py-2 text-xs">
          <Plus size={14} />
          New Group
        </button>
      </div>

      <div className="page-scroll px-4 py-4 flex flex-col gap-2">
        {myGroups.length === 0 ? (
          <div className="empty-state">
            <Users size={28} className="text-surface-700" />
            <p className="text-sm">No groups yet</p>
            <p className="text-xs text-surface-600">Create a group to get started</p>
            <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary mt-2 px-4 py-2 text-xs">
              <Plus size={13} /> Create group
            </button>
          </div>
        ) : (
          myGroups.map((group, i) => (
            <GroupCard key={group.groupId} group={group} index={i} isOwn />
          ))
        )}
      </div>

      <AnimatePresence>
        {createOpen && (
          <CreateGroupModal
            onClose={() => setCreateOpen(false)}
            onCreate={createGroup}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

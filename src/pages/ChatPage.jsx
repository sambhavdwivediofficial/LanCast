import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, MessageSquare, Users, MoreHorizontal, EyeOff, UserPlus, X } from "lucide-react";
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

function PeerMenuDropdown({ peerId, peerName, onClose, onInvite }) {
  const ref = useRef(null);
  const hiddenPeersRaw = useAppStore((s) => s.hiddenPeers);
  const hiddenPeers = useMemo(() => hiddenPeersRaw ?? new Set(), [hiddenPeersRaw]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleHide = () => {
    useAppStore.setState((s) => ({
      hiddenPeers: new Set([...(s.hiddenPeers ?? []), peerId]),
    }));
    onClose();
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.12 }}
      className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-surface-700 bg-surface-900 shadow-overlay z-dropdown overflow-hidden"
    >
      <button
        type="button"
        onClick={() => { onInvite(peerId, peerName); onClose(); }}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800 transition-colors"
      >
        <UserPlus size={13} /> Invite
      </button>
      <button
        type="button"
        onClick={handleHide}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-surface-400 hover:bg-surface-800 transition-colors"
      >
        <EyeOff size={13} /> Hide Peer
      </button>
    </motion.div>
  );
}

function InvitePeersModal({ onClose }) {
  const { peers } = usePeers();
  const identity = useAppStore((s) => s.identity);
  const hiddenPeersRaw = useAppStore((s) => s.hiddenPeers);
  const broadcasting = useAppStore((s) => s.broadcasting);
  const [openMenu, setOpenMenu] = useState(null);
  const [invitedPeers, setInvitedPeers] = useState(new Set());

  const hiddenPeers = useMemo(() => hiddenPeersRaw ?? new Set(), [hiddenPeersRaw]);
  const visiblePeers = useMemo(() => peers.filter((p) => !hiddenPeers.has(p.peerId)), [peers, hiddenPeers]);

  const handleInvite = async (peerId, peerName) => {
    try {
      await invoke("send_message", {
        payload: {
          peerId,
          content: `__CHAT_INVITE__:${identity.name}`,
          messageId: crypto.randomUUID(),
        },
      });
      setInvitedPeers((prev) => new Set([...prev, peerId]));
    } catch {}
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="modal-panel"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-surface-100">Invite Peers</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              {visiblePeers.length} peer{visiblePeers.length !== 1 ? "s" : ""} on this network
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {visiblePeers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-surface-600">
              <Users size={24} />
              <p className="text-sm">No peers found</p>
              <p className="text-xs">
                {broadcasting ? "No one else is broadcasting" : "Start broadcasting first"}
              </p>
            </div>
          ) : (
            visiblePeers.map((peer) => {
              const invited = invitedPeers.has(peer.peerId);
              return (
                <div
                  key={peer.peerId}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-surface-800 bg-surface-900/50"
                >
                  <span className="online-dot flex-shrink-0" />
                  <span className="text-sm font-medium text-surface-200 flex-1 truncate">
                    {peer.name}
                  </span>
                  <div className="relative flex-shrink-0">
                    {invited ? (
                      <span className="text-2xs text-success-400 font-semibold px-2 py-1 rounded-full bg-success-500/10">
                        Invited
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setOpenMenu(openMenu === peer.peerId ? null : peer.peerId)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        <AnimatePresence>
                          {openMenu === peer.peerId && (
                            <PeerMenuDropdown
                              peerId={peer.peerId}
                              peerName={peer.name}
                              onClose={() => setOpenMenu(null)}
                              onInvite={handleInvite}
                            />
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* <button
          type="button"
          onClick={onClose}
          className="btn-ghost w-full border border-surface-700 mt-4"
        >
          Close
        </button> */}
      </motion.div>
    </div>
  );
}

function ChatInterface({ peerId, peer }) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const { messages, sendMessage } = useMessages(peerId);
  const { isTyping, typingName, sendTyping } = useTyping(peerId);
  const broadcasting = useAppStore((s) => s.broadcasting);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [peerId]);

  const handleSend = useCallback(async () => {
    if (!broadcasting) return;
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;

    if (text) {
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      await sendMessage(text);
    }

    for (const file of pendingFiles) {
      const transferId = crypto.randomUUID();
      const chunkSize = 65536;
      const chunks = [];
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
  }, [input, pendingFiles, peerId, sendMessage, broadcasting]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    sendTyping();
  };

  const handleFilePick = async () => {
    if (!broadcasting || pendingFiles.length >= MAX_FILES) return;
    try {
      const selected = await open({ multiple: true, filters: [{ name: "All Files", extensions: ["*"] }] });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      const toAdd = paths.slice(0, MAX_FILES - pendingFiles.length);
      const loaded = await Promise.all(
        toAdd.map(async (path) => {
          const data = await readFile(path);
          const name = path.split(/[\\/]/).pop();
          const ext = name.split(".").pop()?.toLowerCase() ?? "";
          if (data.length > MAX_FILE_SIZE) return null;
          return { name, data, mimeType: `application/${ext}` };
        })
      );
      setPendingFiles((prev) => [...prev, ...loaded.filter(Boolean)]);
    } catch {}
  };

  const displayName = peer?.name ?? peerId;

  return (
    <div className="page">
      <div className="page-header">
        <button
          type="button"
          onClick={() => navigate("/chat")}
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
            <MessageBubble key={msg.id ?? i} message={msg} fromSelf={msg.fromSelf} />
          ))}
        </AnimatePresence>
        <TypingIndicator name={typingName} visible={isTyping} />
        <div ref={endRef} />
      </div>

      <div className="chat-input-area">
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {pendingFiles.map((f, i) => (
              <FilePreview
                key={i}
                file={f}
                onRemove={() => setPendingFiles((p) => p.filter((_, idx) => idx !== i))}
                compact
              />
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <EmojiPicker onSelect={(e) => { setInput((v) => v + e); inputRef.current?.focus(); }} disabled={!broadcasting} />
          <button
            type="button"
            onClick={handleFilePick}
            disabled={pendingFiles.length >= MAX_FILES || !broadcasting}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700 transition-colors flex-shrink-0 disabled:opacity-40"
            title="Attach file"
          >
            <Paperclip size={16} />
          </button>
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={broadcasting ? `Message ${displayName}…` : "Start broadcasting to send messages…"}
              disabled={!broadcasting}
              rows={1}
              className="input-base resize-none w-full disabled:opacity-50"
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
            disabled={(!input.trim() && pendingFiles.length === 0) || !broadcasting}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600 text-white flex-shrink-0 transition-all hover:bg-brand-500 disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatList() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const navigate = useNavigate();
  const conversations = useAppStore((s) => s.conversations);
  const { getPeer } = usePeers();
  const broadcasting = useAppStore((s) => s.broadcasting);

  const activeChats = Object.entries(conversations)
    .filter(([, msgs]) => msgs.length > 0)
    .map(([peerId, msgs]) => ({
      peerId,
      peer: getPeer(peerId),
      lastMessage: msgs[msgs.length - 1],
      unread: msgs.filter((m) => !m.fromSelf && m.status !== "seen").length,
    }));

  return (
    <div className="page">
      <div className="page-header" style={{ background: "#0605051b", }}>
        <MessageSquare size={18} className="text-brand-400" />
        <div className="flex-1">
          <h1 className="text-base font-bold text-surface-100">Chats</h1>
          {/* <p className="text-2xs text-surface-500">{activeChats.length} conversations</p> */}
        </div>
        <button
          type="button"
          onClick={() => broadcasting && setInviteOpen(true)}
          disabled={!broadcasting}
          className="btn-primary px-3 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          title={!broadcasting ? "Start broadcasting to invite peers" : ""}
        >
          <UserPlus size={14} />
          Invite Peers
        </button>
      </div>

      {!broadcasting && (
        <div className="flex justify-center mt-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-warning-500/20 bg-warning-500/5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning-500 flex-shrink-0" />
            <p className="text-xs text-warning-400">Start broadcasting to invite peers</p>
          </div>
        </div>
      )}

      <div className="page-scroll px-4 py-4 flex flex-col gap-2">
        {activeChats.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={28} className="text-surface-700" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs text-surface-600">Invite a peer to start chatting</p>
            {broadcasting && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="btn-primary mt-2 px-4 py-2 text-xs"
              >
                <UserPlus size={13} /> Invite Peers
              </button>
            )}
          </div>
        ) : (
          <>
            {activeChats.map((chat, i) => {
              const name = chat.peer?.name ?? chat.peerId;
              const last = chat.lastMessage;
              return (
                <motion.div
                  key={chat.peerId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/chat/${chat.peerId}`)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl border border-surface-800 bg-surface-900/50 cursor-pointer hover:bg-surface-900 hover:border-surface-700 transition-all duration-150"
                >
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 text-sm font-extrabold"
                    style={{
                      background: "rgba(99,102,241,0.12)",
                      color: "#818cf8",
                      border: "1px solid rgba(99,102,241,0.25)",
                    }}
                  >
                    {name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-surface-200 truncate">{name}</p>
                      {last?.timestamp && (
                        <span className="text-2xs text-surface-600 flex-shrink-0 ml-2">
                          {new Date(last.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-surface-500 truncate">
                        {last?.isSystem ? "System event" : last?.content ?? "No messages yet"}
                      </p>
                      {chat.unread > 0 && (
                        <span className="flex-shrink-0 ml-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-brand-500 text-white text-2xs font-bold px-1">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {broadcasting && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="btn-ghost border border-surface-700 w-full mt-2 text-xs"
              >
                <UserPlus size={13} /> Invite more peers
              </button>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {inviteOpen && <InvitePeersModal onClose={() => setInviteOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default function ChatPage() {
  const { peerId } = useParams();
  const { getPeer } = usePeers();

  if (peerId) {
    const peer = getPeer(peerId);
    return <ChatInterface peerId={peerId} peer={peer} />;
  }

  return <ChatList />;
}

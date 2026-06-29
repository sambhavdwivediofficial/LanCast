import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Users, MessageSquare, Shield, Wifi, Activity,
  Lock, Clock, HardDrive, Radio, LayoutGrid, Globe,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "@store/appStore";
import { useSessionTimer } from "@hooks/useSession";
import { usePeers } from "@hooks/usePeers";
import { useGroups } from "@hooks/useGroups";

function StatCard({ icon: Icon, label, value, sub, color = "brand", delay = 0 }) {
  const colors = {
    brand:   { icon: "#818cf8", bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.15)"  },
    success: { icon: "#4ade80", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.15)"   },
    warning: { icon: "#fbbf24", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.15)"  },
    danger:  { icon: "#f87171", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.15)"   },
    surface: { icon: "#a1a1aa", bg: "rgba(63,63,70,0.3)",     border: "rgba(63,63,70,0.5)"     },
  };
  const c = colors[color] ?? colors.brand;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="stat-card"
      style={{ background: c.bg, borderColor: c.border }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">{label}</span>
        <span className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: `${c.icon}18` }}>
          <Icon size={14} style={{ color: c.icon }} />
        </span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-surface-100 leading-none">{value}</p>
        {sub && <p className="text-2xs text-surface-500 mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-2xs font-semibold text-surface-500 uppercase tracking-widest px-1 mb-2">
      {children}
    </h2>
  );
}

function NetworkHealthBar({ health }) {
  const levels = { excellent: 100, good: 70, fair: 40, poor: 15, unknown: 0 };
  const pct = levels[health] ?? 0;
  const color = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : pct > 0 ? "#ef4444" : "#3f3f46";

  return (
    <div className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

function useNetworkHealth(broadcasting) {
  const [health, setHealth] = useState("unknown");
  const setNetworkHealth = useAppStore((s) => s.setNetworkHealth);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!broadcasting) {
      setHealth("unknown");
      setNetworkHealth("unknown");
      return;
    }

    const measure = async () => {
      try {
        const start = performance.now();
        await invoke("get_active_peers");
        const latency = performance.now() - start;

        let h;
        if (latency < 20)       h = "excellent";
        else if (latency < 60)  h = "good";
        else if (latency < 150) h = "fair";
        else                    h = "poor";

        setHealth(h);
        setNetworkHealth(h);
      } catch {
        setHealth("poor");
        setNetworkHealth("poor");
      }
    };

    measure();
    intervalRef.current = setInterval(measure, 5000);
    return () => clearInterval(intervalRef.current);
  }, [broadcasting]);

  return health;
}

function useNetworkStats() {
  const peers = useAppStore((s) => s.peers);
  const groups = useAppStore((s) => s.groups);

  const allGroups = Object.values(groups);
  return {
    totalPeers: Object.keys(peers).length,
    totalPublicGroups: allGroups.filter((g) => !g.isPrivate).length,
    totalPrivateGroups: allGroups.filter((g) => g.isPrivate).length,
  };
}

export default function HomePage() {
  const identity = useAppStore((s) => s.identity);
  const stats = useAppStore((s) => s.stats);
  const broadcasting = useAppStore((s) => s.broadcasting);
  const conversations = useAppStore((s) => s.conversations);
  const timer = useSessionTimer();
  const { peers, count: peerCount } = usePeers();
  const { myGroups, publicGroups, privateGroups } = useGroups();
  const health = useNetworkHealth(broadcasting);
  const networkStats = useNetworkStats();

  const activeChats = Object.keys(conversations).filter(
    (k) => conversations[k].length > 0
  ).length;

  const formatBytes = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  };

  const healthColor = {
    excellent: "success",
    good:      "success",
    fair:      "warning",
    poor:      "danger",
    unknown:   "surface",
  }[health] ?? "surface";

  return (
    <div className="page page-scroll px-6 py-6 flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-surface-500 text-xs mb-0.5">Welcome back</p>
          <h1 className="text-2xl font-extrabold text-white">{identity.name}</h1>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
          style={{
            background: broadcasting ? "rgba(34,197,94,0.08)" : "rgba(63,63,70,0.3)",
            borderColor: broadcasting ? "rgba(34,197,94,0.2)" : "rgba(63,63,70,0.5)",
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: broadcasting ? "#22c55e" : "#3f3f46",
              boxShadow: broadcasting ? "0 0 6px rgba(34,197,94,0.6)" : "none",
            }}
          />
          <span className="text-xs font-medium text-surface-400">
            {broadcasting ? "Broadcasting" : "Offline"}
          </span>
        </div>
      </motion.div>

      <section>
        <SectionTitle>Network</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Users}
            label="Active Peers"
            value={broadcasting ? peerCount : "—"}
            sub={broadcasting ? "on this WiFi" : "Start broadcasting"}
            color="brand"
            delay={0.05}
          />
          <StatCard
            icon={Radio}
            label="Discovery"
            value={broadcasting ? "Active" : "Idle"}
            sub={broadcasting ? `${peerCount} peer${peerCount !== 1 ? "s" : ""} found` : "Not broadcasting"}
            color={broadcasting ? healthColor : "surface"}
            delay={0.1}
          />
          <StatCard
            icon={Wifi}
            label="Network"
            value={broadcasting ? health.charAt(0).toUpperCase() + health.slice(1) : "—"}
            sub="connection quality"
            color={broadcasting ? healthColor : "surface"}
            delay={0.15}
          />
          <StatCard
            icon={Lock}
            label="Encryption"
            value="AES-256"
            sub="GCM · Always active"
            color="brand"
            delay={0.2}
          />
        </div>
        <div className="mt-3 px-4 py-3 rounded-xl border border-surface-800 bg-surface-900/40">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-surface-500">Network Health</span>
            <span className="text-xs font-semibold text-surface-400 capitalize">
              {broadcasting ? health : "Start broadcasting"}
            </span>
          </div>
          <NetworkHealthBar health={broadcasting ? health : "unknown"} />
        </div>
      </section>

      <section>
        <SectionTitle>This Network</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Users}
            label="Peers Online"
            value={broadcasting ? networkStats.totalPeers : "—"}
            sub="broadcasting on WiFi"
            color="brand"
            delay={0.05}
          />
          <StatCard
            icon={Globe}
            label="Public Groups"
            value={broadcasting ? networkStats.totalPublicGroups : "—"}
            sub="visible on network"
            color="brand"
            delay={0.1}
          />
        </div>
      </section>

      <section>
        <SectionTitle>Session</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Clock}         label="Active Time"      value={timer}                                       sub="since app opened"                                                   color="success" delay={0.1}  />
          <StatCard icon={HardDrive}     label="Data Transferred" value={formatBytes(stats.bytesTransferred)}         sub="this session"                                                       color="brand"   delay={0.15} />
          <StatCard icon={MessageSquare} label="Messages"         value={stats.messagesSent + stats.messagesReceived} sub={`${stats.messagesSent} sent · ${stats.messagesReceived} received`}  color="brand"   delay={0.2}  />
          <StatCard icon={Activity}      label="Files"            value={stats.filesTransferred}                      sub="transferred"                                                        color="success" delay={0.25} />
        </div>
      </section>

      <section>
        <SectionTitle>My Activity</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={MessageSquare} label="Active Chats" value={activeChats}     sub="open conversations"                                              color="brand" delay={0.1}  />
          <StatCard icon={LayoutGrid}    label="My Groups"    value={myGroups.length} sub={`${privateGroups.length} private · ${publicGroups.length} public`} color="brand" delay={0.15} />
        </div>
      </section>

      {broadcasting && peers.length > 0 && (
        <section>
          <SectionTitle>Peers Online</SectionTitle>
          <div className="flex flex-col gap-2">
            {peers.slice(0, 5).map((peer, i) => (
              <motion.div
                key={peer.peerId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-900/50 border border-surface-800"
              >
                <span className="online-dot" />
                <span className="text-sm font-medium text-surface-200 flex-1">{peer.name}</span>
                <span className="text-2xs text-surface-600">broadcasting</span>
              </motion.div>
            ))}
            {peers.length > 5 && (
              <p className="text-2xs text-surface-600 text-center py-1">
                +{peers.length - 5} more peers
              </p>
            )}
          </div>
        </section>
      )}

      <div className="pb-4" />
    </div>
  );
}

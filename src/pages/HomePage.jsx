// src/pages/HomePage.jsx
import { useEffect, useCallback } from "react";
import useAppStore from "../store/appStore";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import {
  Activity, Users, Layers, Lock, Wifi, Shield, FileText,
  Clock, Radio, Skull
} from "lucide-react";

export default function HomePage() {
  const {
    peers, groups, privateGroupsCount, localName, broadcasting,
    setPeers, setGroups, auditEvents,
    activeTime, transferStats,
    kill,
  } = useAppStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [peersRes, groupsRes] = await Promise.all([
          invoke("get_active_peers"),
          invoke("get_groups"),
        ]);
        if (peersRes?.data) setPeers(peersRes.data);
        if (groupsRes?.data) setGroups(groupsRes.data);
      } catch (e) {
        console.error("Home fetch error:", e);
      }
    };
    fetchData();
  }, []);

  const handleKill = useCallback(async () => {
    await kill();
  }, [kill]);

  const activePeersCount = peers.filter((p) => p.broadcasting).length;
  const publicGroupsCount = groups.filter((g) => !g.is_private).length;
  const totalGroups = groups.length;

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const recentAudit = auditEvents.slice(-10).reverse();

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-white">Welcome, {localName}</h2>
          <p className="text-surface-400 text-sm mt-1">Your secure LAN control center</p>
        </div>
        <button
          onClick={handleKill}
          className="flex items-center gap-1.5 bg-danger-500/10 border border-danger-500/20 hover:bg-danger-500/20 text-danger-400 px-4 py-2 rounded-xl text-sm font-medium transition-all"
        >
          <Skull size={16} />
          Kill
        </button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard icon={<Activity size={20} />} label="Active Peers" value={activePeersCount} color="text-brand-400" bg="bg-brand-600/10" />
        <StatCard icon={<Layers size={20} />} label="Public Groups" value={publicGroupsCount} color="text-emerald-400" bg="bg-emerald-600/10" />
        <StatCard icon={<Lock size={20} />} label="Private Groups" value={privateGroupsCount} color="text-amber-400" bg="bg-amber-600/10" />
        <StatCard icon={<Clock size={20} />} label="Session Uptime" value={formatTime(activeTime)} color="text-cyan-400" bg="bg-cyan-600/10" />
        <StatCard icon={<Radio size={20} />} label="Broadcast" value={broadcasting ? "ON" : "OFF"} color={broadcasting ? "text-success-400" : "text-surface-400"} bg={broadcasting ? "bg-success-600/10" : "bg-surface-700/10"} />
        <StatCard icon={<Shield size={20} />} label="Encryption" value="AES-256-GCM" color="text-violet-400" bg="bg-violet-600/10" />
        <StatCard icon={<Wifi size={20} />} label="Network Health" value={activePeersCount > 0 ? "Good" : "Idle"} color="text-blue-400" bg="bg-blue-600/10" />
        <StatCard icon={<FileText size={20} />} label="Data Transferred" value={`${(transferStats.sent + transferStats.received).toFixed(1)} MB`} color="text-pink-400" bg="bg-pink-600/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-surface-200 mb-3 flex items-center gap-2">
            <Activity size={16} className="text-brand-400" /> Audit Timeline
          </h3>
          {recentAudit.length === 0 ? (
            <p className="text-surface-500 text-xs">No events yet.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {recentAudit.map((event, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-surface-300">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-surface-600 shrink-0" />
                  <span>{event.message}</span>
                  <span className="text-surface-500 ml-auto text-2xs">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-surface-200 mb-3 flex items-center gap-2">
            <Layers size={16} className="text-brand-400" /> Your Groups & Chats
          </h3>
          <div className="space-y-2 text-xs text-surface-300">
            <p>Groups joined: <span className="text-white">{totalGroups}</span></p>
            <p>Active 1-on-1 chats: <span className="text-white">{activePeersCount}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface-900 border border-surface-800 rounded-xl p-4 flex items-center gap-4"
    >
      <div className={`p-2 rounded-lg ${bg} ${color}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-white truncate">{value}</div>
        <div className="text-2xs text-surface-400">{label}</div>
      </div>
    </motion.div>
  );
}

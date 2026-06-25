import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Search, Globe, Users } from "lucide-react";
import { usePeers } from "@hooks/usePeers";
import { useGroups } from "@hooks/useGroups";
import PeerCard from "@components/ui/PeerCard";
import GroupCard from "@components/ui/GroupCard";

export default function PeersPage() {
  const { peers } = usePeers();
  const { publicGroups } = useGroups();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("peers");

  const filteredPeers = peers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredGroups = publicGroups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <Zap size={18} className="text-brand-400" />
        <div className="flex-1">
          <h1 className="text-base font-bold text-surface-100">Peers</h1>
          <p className="text-2xs text-surface-500">
          </p>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            className="input-base pl-9"
            style={{ background: "#11101044", border: "1px solid #515154" }}
            placeholder="Search peers and groups…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-surface-900 border border-surface-800">
          {[
            { id: "peers",  label: "Peers",  icon: Zap,   count: filteredPeers.length  },
            { id: "groups", label: "Groups", icon: Globe,  count: filteredGroups.length },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                background: tab === t.id ? "#49494b7c" : "transparent",
                color: tab === t.id ? "#e4e4e7" : "#71717a",
              }}
            >
              <t.icon size={13} />
              {t.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-2xs"
                style={{
                  background: tab === t.id ? "rgba(99,102,241,0.2)" : "rgba(63,63,70,0.5)",
                  color: tab === t.id ? "#818cf8" : "#52525b",
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="page-scroll px-4 pb-4 flex flex-col gap-2">
        {tab === "peers" ? (
          filteredPeers.length === 0 ? (
            <div className="empty-state">
              <Zap size={28} className="text-surface-700" />
              <p className="text-sm">No peers broadcasting</p>
              <p className="text-xs text-surface-600">Start broadcasting to become discoverable</p>
            </div>
          ) : (
            filteredPeers.map((peer, i) => (
              <PeerCard key={peer.peerId} peer={peer} index={i} />
            ))
          )
        ) : (
          filteredGroups.length === 0 ? (
            <div className="empty-state">
              <Globe size={28} className="text-surface-700" />
              <p className="text-sm">No public groups</p>
              <p className="text-xs text-surface-600">Public groups appear here</p>
            </div>
          ) : (
            filteredGroups.map((group, i) => (
              <GroupCard key={group.groupId} group={group} index={i} isOwn={false} />
            ))
          )
        )}
      </div>
    </div>
  );
}

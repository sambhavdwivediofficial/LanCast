import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Search, Globe, Radio } from "lucide-react";
import { usePeers } from "@hooks/usePeers";
import { useGroups } from "@hooks/useGroups";
import PeerCard from "@components/ui/PeerCard";
import GroupCard from "@components/ui/GroupCard";
import useAppStore from "@store/appStore";

export default function PeersPage() {
  const { peers } = usePeers();
  const { publicGroups } = useGroups();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("peers");
  const broadcasting = useAppStore((s) => s.broadcasting);
  const hiddenGroups = useAppStore((s) => s.hiddenGroups);
  const identity = useAppStore((s) => s.identity);

  const filteredPeers = broadcasting
    ? peers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const filteredGroups = broadcasting
    ? publicGroups.filter(
        (g) =>
          !hiddenGroups.has(g.groupId) &&
          g.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="page">
      <div className="page-header" style={{ background: "#0605051b", }} >
        <Zap size={18} className="text-brand-400" />
        <div className="flex-1">
          <h1 className="text-base font-bold text-surface-100">Peers</h1>
          <p className="text-2xs text-surface-500">
            {broadcasting
              ? `${filteredPeers.length} peers · ${filteredGroups.length} groups`
              : "Broadcasting is off"}
          </p>
        </div>
      </div>

      {!broadcasting && (
        <div className="flex justify-center px-4 mt-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-surface-700/40 bg-surface-900/40">
            <Radio size={13} className="text-surface-500 flex-shrink-0" />
            <p className="text-xs text-surface-500">
              Start broadcasting to discover peers and groups
            </p>
          </div>
        </div>
      )}

      {broadcasting && (
        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
         <div className="relative flex-1">
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
         <div className="flex gap-2 p-2 rounded-xl border border-surface-600 flex-shrink-0">
            {[
              { id: "peers",  label: "Peers",  icon: Zap,   count: filteredPeers.length  },
              { id: "groups", label: "Groups", icon: Globe,  count: filteredGroups.length },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 flex-1 justify-center py-1 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  background: tab === t.id ? "rgba(0, 0, 0, 0.5)" : "transparent",
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
      )}

      <div className="page-scroll px-4 pb-4 flex flex-col gap-2">
        {!broadcasting ? null : tab === "peers" ? (
          filteredPeers.length === 0 ? (
            <div className="empty-state">
              <Zap size={28} className="text-surface-700" />
              <p className="text-sm">No peers found</p>
              <p className="text-xs text-surface-600">Other LANCAST devices will appear here</p>
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
              <p className="text-xs text-surface-600">Public groups from other peers appear here</p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {filteredGroups.map((group, i) => (
                <GroupCard key={group.groupId} group={group} index={i} onPeersPage={true} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

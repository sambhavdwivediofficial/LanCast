// src/pages/PeersPage.jsx
import { useEffect, useRef } from "react";
import useAppStore from "../store/appStore";
import { invoke } from "@tauri-apps/api/core";
import PeerCard from "../components/ui/PeerCard";
import { motion } from "framer-motion";
import { Wifi, WifiOff, UsersRound } from "lucide-react";

export default function PeersPage() {
  const peers = useAppStore((s) => s.peers) || [];
  const groups = useAppStore((s) => s.groups) || [];
  const broadcasting = useAppStore((s) => s.broadcasting);
  const setPeers = useAppStore((s) => s.setPeers);
  const setGroups = useAppStore((s) => s.setGroups);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const fetch = async () => {
      if (!mountedRef.current) return;
      try {
        const [p, g] = await Promise.all([
          invoke("get_active_peers"),
          invoke("get_public_groups"),
        ]);
        if (mountedRef.current) {
          if (p?.data) setPeers(p.data);
          if (g?.data) setGroups(g.data);
        }
      } catch (e) {
        console.error("Peers fetch error:", e);
      }
    };

    fetch();
    intervalRef.current = setInterval(fetch, 5000);

    invoke("protect_window");

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      invoke("unprotect_window");
    };
  }, []);

  const publicGroups = groups.filter((g) => !g.is_private);
  const onlinePeers = peers.filter((p) => p.broadcasting);
  const offlinePeers = peers.filter((p) => !p.broadcasting);

  return (
    <div className="flex-1 p-6 overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wifi size={22} className="text-brand-400" />
          Peers & Public Groups
        </h2>
        <p className="text-surface-400 text-sm mt-1">
          Devices on your WIFI running LANCAST
        </p>
      </motion.div>

      {peers.length === 0 && publicGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-surface-500">
          <WifiOff size={48} className="mb-4 opacity-40" />
          <p className="text-lg font-medium">No peers discovered</p>
          <p className="text-sm mt-1">
            {broadcasting
              ? "Waiting for other LANCAST users on this WiFi..."
              : "Start broadcasting to discover peers"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {onlinePeers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
                <Wifi size={16} className="text-success-400" />
                Online ({onlinePeers.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {onlinePeers.map((peer) => (
                  <PeerCard key={peer.peer_id} peer={peer} />
                ))}
              </div>
            </div>
          )}

          {offlinePeers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
                <WifiOff size={16} className="text-surface-500" />
                Offline ({offlinePeers.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 opacity-60">
                {offlinePeers.map((peer) => (
                  <PeerCard key={peer.peer_id} peer={peer} />
                ))}
              </div>
            </div>
          )}

          {publicGroups.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
                <UsersRound size={16} className="text-amber-400" />
                Public Groups ({publicGroups.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {publicGroups.map((group) => (
                  <PeerCard key={group.group_id} group={group} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

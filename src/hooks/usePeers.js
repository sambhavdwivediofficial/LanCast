import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "@store/appStore";

export function usePeers() {
  const peers = useAppStore((s) => s.peers);
  const addPeer = useAppStore((s) => s.addPeer);

  const refresh = useCallback(async () => {
    try {
      const res = await invoke("get_active_peers");
      if (res?.data) {
        res.data.forEach((p) => addPeer(p));
      }
    } catch {}
  }, [addPeer]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  return {
    peers: Object.values(peers),
    peerMap: peers,
    count: Object.keys(peers).length,
    getPeer: (id) => peers[id] ?? null,
  };
}

// src/hooks/usePeers.js
import useAppStore from "../store/appStore";

export default function usePeers() {
  const peers = useAppStore((s) => s.peers);
  return peers;
}

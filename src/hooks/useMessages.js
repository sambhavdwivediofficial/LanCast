// src/hooks/useMessages.js
import useAppStore from "../store/appStore";

export default function useMessages(peerId) {
  return useAppStore((s) => s.messages[peerId] || []);
}

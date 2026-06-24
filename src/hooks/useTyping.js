import { useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "@store/appStore";

export function useTyping(peerId, groupId = null) {
  const typingStates = useAppStore((s) => s.typingStates);
  const lastSentRef = useRef(0);

  const key = groupId ? `group:${groupId}` : `peer:${peerId}`;
  const isTyping = !!typingStates[key];
  const typingName = typingStates[key]?.name ?? null;

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < 2000) return;
    lastSentRef.current = now;
    invoke("emit_typing", { peerId, groupId }).catch(() => {});
  }, [peerId, groupId]);

  const getTypingForGroup = useCallback(
    (gid) => {
      const k = `group:${gid}`;
      return typingStates[k] ?? null;
    },
    [typingStates]
  );

  return { isTyping, typingName, sendTyping, getTypingForGroup };
}

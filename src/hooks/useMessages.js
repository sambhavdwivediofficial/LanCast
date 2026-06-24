import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "@store/appStore";

export function useMessages(peerId) {
  const conversations = useAppStore((s) => s.conversations);
  const addSentMessage = useAppStore((s) => s.addSentMessage);
  const messages = conversations[peerId] ?? [];

  const sendMessage = useCallback(
    async (content) => {
      const messageId = crypto.randomUUID();
      const timestamp = Date.now();

      addSentMessage(peerId, {
        id: messageId,
        content,
        timestamp,
        fromSelf: true,
        status: "sending",
      });

      try {
        await invoke("send_message", { payload: { peerId, content, messageId } });
      } catch {}
    },
    [peerId, addSentMessage]
  );

  const sendGroupMessage = useCallback(
    async (groupId, content) => {
      const messageId = crypto.randomUUID();
      await invoke("send_group_message", {
        payload: { groupId, content, messageId },
      });
    },
    []
  );

  return { messages, sendMessage, sendGroupMessage };
}

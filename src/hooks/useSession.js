import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import useAppStore from "@store/appStore";

export function useSessionTimer() {
  const sessionStart = useAppStore((s) => s.sessionStart);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sessionStart) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  const hours   = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

export function useKillSwitch() {
  const killAll = useAppStore((s) => s.killAll);
  const [killing, setKilling] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const timerRef = useRef(null);

  const requestKill = useCallback(() => {
    setConfirmed(true);
    timerRef.current = setTimeout(() => setConfirmed(false), 3000);
  }, []);

  const executeKill = useCallback(async () => {
    if (!confirmed) return;
    clearTimeout(timerRef.current);
    setKilling(true);
    try {
      await invoke("execute_kill");
      killAll();
      await getCurrentWindow().close();
    } catch {
      setKilling(false);
      setConfirmed(false);
    }
  }, [confirmed, killAll]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { killing, confirmed, requestKill, executeKill };
}

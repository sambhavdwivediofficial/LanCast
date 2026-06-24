import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./Sidebar";
import { isProtected } from "@/router";

export default function AppShell({ children }) {
  const location = useLocation();

  useEffect(() => {
    const protect = isProtected(location.pathname);
    invoke(protect ? "protect_window" : "unprotect_window").catch(() => {});
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

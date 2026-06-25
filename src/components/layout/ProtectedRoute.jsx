import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { isProtected } from "@/router";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  useEffect(() => {
    const protect = isProtected(location.pathname);
    invoke(protect ? "protect_window" : "unprotect_window").catch(() => {});
  }, [location.pathname]);

  return children;
}

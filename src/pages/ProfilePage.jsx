// src/pages/ProfilePage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Github, Globe, Linkedin } from "lucide-react";
import logo from "/image.png";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEnter = async () => {
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await invoke("set_local_name", { name: name.trim() });
      navigate("/app");
    } catch (e) {
      setError(e?.toString() || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-surface-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="LANCAST" className="w-20 h-20 mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">LANCAST</h1>
          <p className="text-surface-400 text-sm text-center">
            Broadcast on LAN. Encrypted. Instant. Traceless.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-surface-400 mb-1.5 ml-0.5">
              Your display name
            </label>
            <motion.input
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnter()}
              placeholder="Enter your name"
              maxLength={32}
              className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-3 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              autoFocus
            />
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-danger-400 text-xs mt-1.5 ml-0.5"
              >
                {error}
              </motion.p>
            )}
          </div>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            onClick={handleEnter}
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {loading ? "Entering..." : "Enter LANCAST"}
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-6 mt-10"
        >
          <span className="text-xs text-surface-500">Created by Sambhav Dwivedi</span>
          <div className="flex gap-4">
            <a href="https://linkedin.com/in/sambhavdwivedi" target="_blank" rel="noreferrer" className="text-surface-400 hover:text-brand-400 transition-colors">
              <Linkedin size={18} />
            </a>
            <a href="https://sambhavdwivedi.com" target="_blank" rel="noreferrer" className="text-surface-400 hover:text-brand-400 transition-colors">
              <Globe size={18} />
            </a>
            <a href="https://github.com/sambhavdwivediofficial" target="_blank" rel="noreferrer" className="text-surface-400 hover:text-brand-400 transition-colors">
              <Github size={18} />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

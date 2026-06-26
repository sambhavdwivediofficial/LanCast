import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Shell, ArrowRight, Linkedin, Globe, Github, ShieldCheck, Zap, Lock } from "lucide-react";
import useAppStore from "@store/appStore";
import logo from "/image.png";

const FEATURES = [
  { icon: ShieldCheck, text: "End-to-end encrypted with AES-256-GCM" },
  { icon: Zap,         text: "Zero cloud · Zero servers · Zero accounts" },
  { icon: Lock,        text: "RAM-only · Everything erased on close" },
];

const CREATOR = {
  name: "Sambhav Dwivedi",
  links: [
    { icon: Globe,    href: "https://www.sambhavdwivedi.in/",                      label: "Website"  },
    { icon: Linkedin, href: "https://www.linkedin.com/in/sambhavdwivedi/",          label: "LinkedIn" },
    { icon: Github,   href: "https://github.com/sambhavdwivediofficial",            label: "GitHub"   },
  ],
};

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const setStoreName = useAppStore((s) => s.setName);
  const startSession = useAppStore((s) => s.startSession);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 300);
    const t2 = setTimeout(() => setStep(2), 700);
    const t3 = setTimeout(() => setStep(3), 1100);
    const t4 = setTimeout(() => {
      setStep(4);
      setTimeout(() => inputRef.current?.focus(), 100);
    }, 1500);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Please enter your name"); return; }
    if (trimmed.length > 32) { setError("Name must be under 32 characters"); return; }
    setLoading(true);
    setError("");
    try {
      await invoke("set_local_name", { name: trimmed });
      setStoreName(trimmed);
      startSession();
    } catch (e) {
      setError("Failed to set name. Try again.");
      setLoading(false);
    }
  };

  const openLink = async (href) => {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(href);
  };

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden relative"
      style={{ background: "#09090b" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
      />

      <div className="flex flex-col flex-1 items-center justify-center px-6 relative z-10">
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-center -gap-20 mb-8"
            >
              <img src={logo} alt="LANCAST" className="w-200 h-24" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 1 && (
            <motion.p
              key="tagline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-surface-400 text-sm text-center mb-8 max-w-xs"
            >
              Encrypted LAN communication. No cloud. No trace. Just your network.
            </motion.p>
          )}
        </AnimatePresence>

        {/* <AnimatePresence>
          {step >= 3 && (
            <motion.div
              key="features"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-2 mb-8 w-full max-w-sm"
            >
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-900/60 border border-surface-800/60"
                >
                  <f.icon size={14} className="text-brand-400 flex-shrink-0" />
                  <span className="text-xs text-surface-400">{f.text}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence> */}

        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="w-full max-w-sm"
            >
              <div className="rounded-2xl border border-surface-800 bg-surface-900/80 p-6"
                style={{ backdropFilter: "blur(16px)" }}>
                <p className="text-sm font-semibold text-surface-200 mb-1">
                  What should people call you?
                </p>
                <p className="text-xs text-surface-500 mb-4">
                  This name is visible to peers on your network. No account needed.
                </p>

                <div className="relative mb-3">
                  <input
                    ref={inputRef}
                    type="text"
                    className="input-base pr-12"
                    style={{ background: "#11101044", border: "1px solid #515154" }} 
                    placeholder="Your name…"
                    value={name}
                    maxLength={15}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs text-surface-600">
                    {name.length}/15
                  </span>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      key="err"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-danger-400 mb-3"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!name.trim() || loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <>
                      Enter LANCAST
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {step >= 1 && (
          <motion.footer
            key="footer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-2 pb-6 relative z-10"
          >
            <p className="text-2xs text-surface-300">Crafted by</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-surface-100">{CREATOR.name}</span>
              <div className="flex items-center gap-1">
                {CREATOR.links.map((l) => (
                  <button
                    key={l.label}
                    type="button"
                    onClick={() => openLink(l.href)}
                    className="p-1.5 rounded-lg text-surface-500 hover:text-surface-100 hover:bg-surface-850 transition-colors"
                  >
                    <l.icon size={15} />
                  </button>
                ))}
              </div>
            </div>
            <p className="text-2xs text-surface-400">Apache 2.0 · Open Source</p>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}

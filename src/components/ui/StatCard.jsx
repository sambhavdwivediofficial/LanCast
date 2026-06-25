import { motion } from "framer-motion";

const COLOR_MAP = {
  brand:   { icon: "#818cf8", bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.15)"  },
  success: { icon: "#4ade80", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.15)"   },
  warning: { icon: "#fbbf24", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.15)"  },
  danger:  { icon: "#f87171", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.15)"   },
  surface: { icon: "#a1a1aa", bg: "rgba(39,39,42,0.6)",     border: "rgba(63,63,70,0.5)"     },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "brand",
  delay = 0,
  onClick,
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.brand;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="stat-card"
      style={{
        background: c.bg,
        borderColor: c.border,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs font-semibold text-surface-500 uppercase tracking-widest">
          {label}
        </span>
        {Icon && (
          <span
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: `${c.icon}18` }}
          >
            <Icon size={14} style={{ color: c.icon }} />
          </span>
        )}
      </div>
      <div className="mt-1">
        <p className="text-2xl font-extrabold text-surface-100 leading-none tracking-tight">
          {value}
        </p>
        {sub && <p className="text-2xs text-surface-500 mt-1 leading-relaxed">{sub}</p>}
      </div>
    </motion.div>
  );
}

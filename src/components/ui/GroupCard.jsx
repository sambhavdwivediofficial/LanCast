// src/components/ui/GroupCard.jsx
import { Lock } from "lucide-react";

export default function GroupCard({ group, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-surface-900 border border-surface-800 rounded-xl p-4 cursor-pointer hover:border-brand-500/30 transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        {group.is_private && <Lock size={14} className="text-amber-400" />}
        <h4 className="text-sm font-semibold text-surface-100 truncate">{group.name}</h4>
      </div>
      <p className="text-xs text-surface-500">{group.member_count} members</p>
    </div>
  );
}

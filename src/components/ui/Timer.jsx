import { useSessionTimer } from "@hooks/useSession";
import { Clock } from "lucide-react";

export default function Timer({ showIcon = true, className = "" }) {
  const time = useSessionTimer();

  return (
    <span className={`flex items-center gap-1.5 font-mono text-sm tabular-nums ${className}`}>
      {showIcon && <Clock size={13} className="text-surface-500 flex-shrink-0" />}
      <span className="text-surface-300">{time}</span>
    </span>
  );
}

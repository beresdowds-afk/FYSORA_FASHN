import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface SessionTimerProps {
  hoursBooked: number;
  isActive: boolean;
}

const SessionTimer = ({ hoursBooked, isActive }: SessionTimerProps) => {
  const [elapsed, setElapsed] = useState(0);
  const totalSeconds = hoursBooked * 3600;
  const remaining = Math.max(0, totalSeconds - elapsed);
  const isLow = remaining < 300 && remaining > 0; // < 5 min
  const isOver = remaining === 0 && elapsed > 0;

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono font-medium transition-colors ${
        isOver
          ? "bg-destructive/15 text-destructive"
          : isLow
          ? "bg-primary/15 text-primary animate-pulse"
          : "bg-muted text-foreground"
      }`}
    >
      {isLow || isOver ? <AlertTriangle size={14} /> : <Clock size={14} />}
      <span>{fmt(elapsed)}</span>
      <span className="text-muted-foreground">/</span>
      <span className="text-muted-foreground">{fmt(totalSeconds)}</span>
      {isOver && <span className="text-xs ml-1">(overtime)</span>}
    </div>
  );
};

export default SessionTimer;

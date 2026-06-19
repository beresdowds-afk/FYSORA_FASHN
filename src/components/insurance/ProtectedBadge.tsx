import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProtectedBadge({
  size = "sm",
  className,
  label = "Protected",
}: { size?: "sm" | "md"; className?: string; label?: string }) {
  return (
    <span
      title="Order Protection active"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        "border-[hsl(43,65%,52%)]/40 bg-[hsl(43,65%,52%)]/10 text-[hsl(43,65%,38%)]",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
        className,
      )}
    >
      <Shield size={size === "sm" ? 10 : 12} />
      {label}
    </span>
  );
}
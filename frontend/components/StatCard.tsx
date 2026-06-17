import { ReactNode } from "react";

export default function StatCard({
  label,
  value,
  unit,
  icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-5 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-text-faint">{label}</p>
        {icon && <span className="text-accent">{icon}</span>}
      </div>
      <p
        className={`font-display text-3xl mt-3 ${
          accent ? "text-accent-glow" : "text-text-primary"
        }`}
      >
        {value}
        {unit && <span className="text-base text-text-muted ml-1">{unit}</span>}
      </p>
    </div>
  );
}

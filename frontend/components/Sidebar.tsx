"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", glyph: "01" },
  { href: "/live", label: "Live Monitoring", glyph: "02" },
  { href: "/logs", label: "Detection Logs", glyph: "03" },
  { href: "/map", label: "Hazard Map", glyph: "04" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-base-border bg-base-surface shrink-0">
      <div className="px-5 py-6 border-b border-base-border">
        <p className="font-display text-sm tracking-[0.2em] text-accent-glow uppercase">
          Road Hazard
        </p>
        <p className="font-mono text-[11px] text-text-faint mt-1">YOLOv8 · DETECTION SYS</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-accent/10 text-accent-glow shadow-glow"
                  : "text-text-muted hover:bg-base-surface2 hover:text-text-primary"
              }`}
            >
              <span
                className={`font-mono text-[10px] w-5 ${
                  active ? "text-accent-glow" : "text-text-faint group-hover:text-accent"
                }`}
              >
                {item.glyph}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-base-border">
        <p className="font-mono text-[10px] text-text-faint leading-relaxed">
          Real-Time Road Hazard
          <br />
        </p>
      </div>
    </aside>
  );
}

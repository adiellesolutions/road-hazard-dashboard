"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live" },
  { href: "/logs", label: "Logs" },
  { href: "/map", label: "Map" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden flex border-b border-base-border bg-base-surface overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 text-center py-3 text-xs font-mono whitespace-nowrap px-4 border-b-2 ${
              active
                ? "border-accent text-accent-glow"
                : "border-transparent text-text-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

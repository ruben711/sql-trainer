"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/exercises", label: "Oefeningen" },
  { href: "/playground", label: "Playground" },
  { href: "/exam", label: "Examensimulatie" },
  { href: "/theory", label: "Theorie" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/schema", label: "Schema" },
];

export default function NavTabs() {
  const path = usePathname();
  return (
    <nav className="flex items-stretch border-l border-line" role="tablist">
      {tabs.map((t) => {
        const active = path === t.href || (t.href !== "/" && path?.startsWith(t.href));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`nav-tab ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

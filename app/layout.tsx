import "../styles/globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import DatabaseExplorer from "@/components/DatabaseExplorer";
import StatusBar from "@/components/StatusBar";
import NavTabs from "@/components/NavTabs";
import ModeSwitch from "@/components/ModeSwitch";
import ThemeToggle from "@/components/ThemeToggle";
import ModeProvider from "@/components/ModeProvider";
import NotificationBell from "@/components/NotificationBell";

export const metadata: Metadata = {
  title: "SQL Trainer — Examen Voorbereiding",
  description: "Een IDE-stijl SQL oefenomgeving voor het examen",
};

// Inline script om FOUC te voorkomen — zet theme en mode VOOR React laadt
const themeInitScript = `
(function() {
  try {
    var t = JSON.parse(localStorage.getItem('sql-trainer-theme') || '{}').state || {};
    var theme = t.theme || 'system';
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : theme;
    document.documentElement.classList.add(resolved);
    var m = JSON.parse(localStorage.getItem('sql-trainer-mode') || '{}').state || {};
    document.documentElement.setAttribute('data-mode', m.mode || 'exam');
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-mode', 'exam');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="overflow-hidden">
        <ModeProvider>
          <div className="h-screen flex flex-col">
            {/* ─── TOP BAR ───────────────────────────────────────── */}
            <header className="h-10 border-b border-line bg-pane flex items-center px-3 select-none">
              <Link href="/" className="flex items-center gap-2 mr-3 font-semibold text-fg">
                <span className="inline-block w-4 h-4 border-2 border-brand bg-brand/20" />
                <span className="text-sm">SQL.Trainer</span>
              </Link>

              {/* GROTE mode switcher — altijd zichtbaar */}
              <ModeSwitch />

              <NavTabs />

              <div className="ml-auto flex items-center gap-2">
                <span className="hidden md:flex items-center gap-2 text-2xs text-fg-dim font-mono">
                  <span><span className="kbd">Ctrl</span>+<span className="kbd">↵</span> uitvoeren</span>
                </span>
                <NotificationBell />
                <ThemeToggle />
              </div>
            </header>

            {/* Subtiele kleurstrip onder header die de actieve modus aangeeft */}
            <div className="mode-strip" />

            {/* ─── MAIN ────────────────────────────────────────────── */}
            <div className="flex-1 grid grid-cols-[260px_1fr] min-h-0">
              <aside className="overflow-hidden">
                <DatabaseExplorer />
              </aside>
              <main className="overflow-y-auto bg-canvas">
                {children}
              </main>
            </div>

            <StatusBar />
          </div>
        </ModeProvider>
      </body>
    </html>
  );
}

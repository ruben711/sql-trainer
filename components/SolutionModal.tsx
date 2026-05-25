"use client";
import { useEffect, useMemo, useState } from "react";
import { formatSql } from "@/lib/sqlFormat";
import { HighlightedSql } from "@/lib/sqlHighlight";

export default function SolutionModal({
  open,
  rawSolution,
  currentQuery,
  onClose,
  onApply,
}: {
  open: boolean;
  rawSolution: string;
  currentQuery: string;
  onClose: () => void;
  onApply: (formatted: string) => void;
}) {
  const formatted = useMemo(() => formatSql(rawSolution), [rawSolution]);
  const [copied, setCopied] = useState(false);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const hasOwnCode = currentQuery.trim().length > 0;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="pane w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pane-header justify-between">
          <span>Modeloplossing — review & toepassen</span>
          <button
            onClick={onClose}
            className="text-fg-dim hover:text-fg normal-case font-normal text-sm"
            title="Sluiten (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Code preview */}
        <div className="flex-1 overflow-auto bg-sunken border-b border-line">
          <div className="px-4 py-3 text-sm leading-relaxed">
            <HighlightedSql sql={formatted} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 flex items-center gap-2 flex-wrap">
          <button
            className="btn-primary"
            onClick={() => { onApply(formatted); onClose(); }}
            title={hasOwnCode ? "Vervangt je huidige query" : "Plakt de oplossing in de editor"}
          >
            ✓ Toepassen in editor
          </button>
          <button className="btn" onClick={copyToClipboard}>
            {copied ? "✓ Gekopieerd" : "📋 Kopieer"}
          </button>
          <button className="btn" onClick={onClose}>
            ✕ Annuleren
          </button>
          {hasOwnCode && (
            <span className="ml-auto text-2xs text-warn">
              ⚠ Je huidige query wordt overschreven
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

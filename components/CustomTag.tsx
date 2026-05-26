"use client";

export type CustomTagData = { label: string; color: string; emoji?: string };

/** Geeft contrasterend tekst-kleur (zwart/wit) terug op basis van achtergrond. */
function readable(hex: string): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#fff";
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Relatieve luminositeit
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 140 ? "#0a0d12" : "#ffffff";
}

export default function CustomTag({ tag }: { tag: CustomTagData }) {
  const fg = readable(tag.color);
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 h-5 text-2xs font-mono font-bold uppercase tracking-wider rounded-sm border"
      style={{
        background: tag.color,
        color: fg,
        borderColor: tag.color,
        boxShadow: `0 0 0 1px ${tag.color}33, 0 0 6px ${tag.color}44`,
      }}
    >
      {tag.emoji && <span style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.4))" }}>{tag.emoji}</span>}
      <span>{tag.label}</span>
    </span>
  );
}

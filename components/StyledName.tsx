"use client";
import clsx from "clsx";

export type NameStyleData = {
  color?: string;
  gradient?: { from: string; to: string; angle?: number };
  glow?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  font?: "default" | "mono" | "serif" | "cursive" | "display";
  sparkle?: boolean;
  rainbow?: boolean;
  pulse?: boolean;
  shake?: boolean;
};

export default function StyledName({ name, style }: { name: string; style?: NameStyleData | null }) {
  if (!style) {
    return <span>{name}</span>;
  }
  const classes = clsx(
    "styled-name",
    style.font && style.font !== "default" && `font-${style.font}`,
    style.bold && "b",
    style.italic && "i",
    style.underline && "u",
    style.strike && "s",
    style.rainbow && "rainbow",
    style.pulse && "pulse",
    style.shake && "shake",
    style.sparkle && "sparkle"
  );

  // Build inline styles voor color/gradient/glow
  const inner: React.CSSProperties = {};
  if (!style.rainbow) {
    if (style.gradient) {
      const angle = style.gradient.angle ?? 90;
      inner.background = `linear-gradient(${angle}deg, ${style.gradient.from}, ${style.gradient.to})`;
      inner.WebkitBackgroundClip = "text";
      inner.backgroundClip = "text";
      inner.color = "transparent";
    } else if (style.color) {
      inner.color = style.color;
    }
  }
  if (style.glow) {
    // Voor gradient/rainbow text moet je een drop-shadow gebruiken i.p.v. text-shadow
    if (style.gradient || style.rainbow) {
      inner.filter = `drop-shadow(0 0 6px ${style.glow}) drop-shadow(0 0 12px ${style.glow})`;
    } else {
      inner.textShadow = `0 0 6px ${style.glow}, 0 0 12px ${style.glow}`;
    }
  }

  return (
    <span className={classes}>
      <span className="name-text" style={inner}>{name}</span>
    </span>
  );
}

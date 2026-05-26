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
  font?: "default" | "mono" | "serif" | "cursive" | "display" | "minecraft" | "terminal";
  sparkle?: boolean;
  rainbow?: boolean;
  pulse?: boolean;
  shake?: boolean;
  snow?: boolean;
  orbit?: boolean;
  fire?: boolean;
  stars?: boolean;
  hearts?: boolean;
};

function Particles({ kind, char, count }: { kind: string; char: string; count: number }) {
  // Spread evenly over the name width
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const pct = ((i + 0.5) / count) * 100;
        const delay = `-${(i * (2.5 / count)).toFixed(2)}s`;
        return (
          <span
            key={i}
            className={`particle ${kind}`}
            style={{ left: `${pct}%`, animationDelay: delay }}
          >
            {char}
          </span>
        );
      })}
    </>
  );
}

function Stars() {
  // 3 sterren op vaste posities boven, beneden, midden-rechts
  const positions = [
    { top: "-0.4em", left: "10%", delay: "0s" },
    { top: "60%", left: "85%", delay: "-0.6s" },
    { top: "20%", left: "55%", delay: "-1.2s" },
  ];
  return (
    <>
      {positions.map((p, i) => (
        <span key={i} className="particle stars-p"
          style={{ top: p.top, left: p.left, animationDelay: p.delay }}>
          ⭐
        </span>
      ))}
    </>
  );
}

function Orbit() {
  // 3 orbs op verschillende fase
  return (
    <>
      {[0, -0.8, -1.6].map((d, i) => (
        <span key={i} className="particle orbit-p" style={{ animationDelay: `${d}s`, color: "currentColor" }}>
          ●
        </span>
      ))}
    </>
  );
}

export default function StyledName({ name, style }: { name: string; style?: NameStyleData | null }) {
  if (!style) return <span>{name}</span>;

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
    style.sparkle && "sparkle",
    style.snow && "snow",
    style.orbit && "orbit",
    style.fire && "fire",
    style.stars && "stars",
    style.hearts && "hearts"
  );

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
    if (style.gradient || style.rainbow) {
      inner.filter = `drop-shadow(0 0 6px ${style.glow}) drop-shadow(0 0 12px ${style.glow})`;
    } else {
      inner.textShadow = `0 0 6px ${style.glow}, 0 0 12px ${style.glow}`;
    }
  }

  return (
    <span className={classes}>
      <span className="name-text" style={inner}>{name}</span>
      {style.snow && <Particles kind="" char="❄" count={4} />}
      {style.hearts && <Particles kind="" char="💕" count={3} />}
      {style.stars && <Stars />}
      {style.orbit && <Orbit />}
      {style.fire && <Particles kind="fire-p" char="🔥" count={3} />}
    </span>
  );
}

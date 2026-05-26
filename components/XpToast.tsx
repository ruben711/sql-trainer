"use client";
import { useEffect, useState } from "react";

/** Korte zichtbare "+25 XP" animatie. Verschijnt wanneer `amount > 0` wijzigt
 *  via een nieuwe trigger-key. Verdwijnt automatisch na ~1.6s. */
export default function XpToast({ amount, trigger }: { amount: number; trigger: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger > 0 && amount > 0) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 1600);
      return () => clearTimeout(t);
    }
  }, [trigger, amount]);

  if (!visible) return null;
  return (
    <div className="xp-toast" key={trigger} aria-live="polite" aria-atomic="true">
      +{amount}
      <span className="xp-sub">xp gained</span>
    </div>
  );
}

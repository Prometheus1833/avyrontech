import { useEffect, useState } from "react";

/**
 * ThemeSwitch — Avyron Products (avyron.ro/produse)
 * Comutator zi/noapte în care soarele devine lună printr-o mască, nu prin
 * două pictograme suprapuse. Ține minte alegerea și ascultă preferința
 * sistemului până când utilizatorul alege el.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

const KEY = "theme";

export function ThemeSwitch({ size = 44, onChange }: { size?: number; onChange?: (dark: boolean) => void }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(KEY);
    } catch {
      /* storage blocat: rămânem pe preferința sistemului */
    }
    setDark(stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    onChange?.(next);
    try {
      window.localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      /* nimic de salvat */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Comută pe tema deschisă" : "Comută pe tema întunecată"}
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,.14)",
        background: dark ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.9)",
        cursor: "pointer",
        transition: "background .35s ease",
      }}
    >
      <span
        style={{
          position: "relative",
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: 999,
          background: dark ? "#e9d5ff" : "#f59e0b",
          boxShadow: dark ? "none" : "0 0 18px rgba(245,158,11,.55)",
          transition: "background .35s ease, box-shadow .35s ease",
        }}
      >
        {/* Masca lunii: un cerc de fundal care „mușcă" din disc. */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background: dark ? "rgba(10,12,20,1)" : "transparent",
            transform: dark ? "translate(28%, -28%) scale(.92)" : "translate(60%, -60%) scale(.2)",
            transition: "transform .4s cubic-bezier(.22,1,.36,1), background .35s ease",
          }}
        />
      </span>
    </button>
  );
}

export default ThemeSwitch;

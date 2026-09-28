import { useCallback, type MouseEvent } from "react";
import { useCurrency } from "@/hooks/useCurrency";

/** Prerendering runs the app inside JSDOM: never start GL or measure layout there. */
export function isRealBrowser() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return !/jsdom/i.test(navigator.userAgent);
}

/** Small ink ripple from the click point — confirms the press without moving layout. */
export function ripple(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const s = document.createElement("span");
  const size = Math.max(r.width, r.height) * 2.2;
  s.className = "l3d-ripple";
  s.style.width = s.style.height = `${size}px`;
  s.style.left = `${e.clientX - r.left}px`;
  s.style.top = `${e.clientY - r.top}px`;
  el.appendChild(s);
  window.setTimeout(() => s.remove(), 650);
}

/** Prices are set in lei. RON shows lei; EUR shows a rounded euro amount at the live rate. */
export function useLeiPrice(lang: "ro" | "en") {
  const locale = lang === "ro" ? "ro-RO" : "en-IE";
  const { currency, rate } = useCurrency(locale);
  return useCallback(
    (ron: number) => {
      const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
      return currency === "RON" ? `${nf.format(ron)} lei` : `${nf.format(Math.round(ron / rate))} €`;
    },
    [currency, rate, locale],
  );
}

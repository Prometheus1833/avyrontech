import { useCallback, useEffect, useState } from "react";

/**
 * Coșul de efecte.
 *
 * Ține codurile din catalog (PRZ-S2, SHP-S1…) în browser, până când
 * utilizatorul trimite cererea de ofertă. Nimic pe server până atunci.
 */

const KEY = "avyron-brief-v1";
const EVENT = "avyron-brief-change";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(codes: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(codes));
  } catch {
    /* modul privat sau stocare plină — coșul rămâne doar în memorie */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useBrief() {
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setCodes(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((code: string) => {
    const current = read();
    write(current.includes(code) ? current.filter((c) => c !== code) : [...current, code]);
  }, []);

  const remove = useCallback((code: string) => {
    write(read().filter((c) => c !== code));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { codes, toggle, remove, clear, has: (code: string) => codes.includes(code) };
}

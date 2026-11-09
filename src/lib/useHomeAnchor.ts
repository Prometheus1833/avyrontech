import { useEffect, useState } from "react";

const depths: Record<string, number> = {
  exemple: 0,
  domenii: 0,
  "de-ce": 1,
  "logo-studio": 2,
  proces: 3,
  "verificare-domeniu": 4,
  avantaje: 5,
  "avyron-quality-standard": 6,
  cta: 7,
  "blog-avyron": 8,
  "descopera-avyron": 9,
  social: 10,
};
export const homeAnchorDepth = (hash: string) => depths[hash.slice(1)] ?? -1;

/** Reveal preceding sections first; never restore an obsolete anchor after user input. */
export function useHomeAnchor(hash: string) {
  const [settled, setSettled] = useState("");
  useEffect(() => {
    if (!hash) return;
    const root = document.querySelector("main");
    if (!root) return;
    let stopped = false,
      timer = 0,
      deadline = 0;
    const remove = () => {
      window.clearTimeout(timer);
      window.clearTimeout(deadline);
      mutations.disconnect();
      resize.disconnect();
      for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
        window.removeEventListener(event, cancel);
    };
    const finish = () => {
      if (stopped) return;
      stopped = true;
      remove();
      setSettled(hash);
    };
    const cancel = () => finish();
    const check = () => {
      if (stopped) return;
      const target = document.getElementById(hash.slice(1));
      if (!target || document.fonts?.status === "loading") return;
      const pending = [
        ...root.querySelectorAll(
          "[data-deferred-pending], [data-deferred-lazy]",
        ),
      ].some(
        (node) =>
          !!(
            node.compareDocumentPosition(target) &
            Node.DOCUMENT_POSITION_FOLLOWING
          ),
      );
      if (pending) return;
      target.scrollIntoView({ behavior: "instant", block: "start" });
      finish();
    };
    const schedule = () => {
      if (stopped || timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        check();
      }, 120);
    };
    const mutations = new MutationObserver(schedule),
      resize = new ResizeObserver(schedule);
    mutations.observe(root, { childList: true, subtree: true });
    resize.observe(root);
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
      window.addEventListener(event, cancel, { passive: true });
    document.fonts?.ready.then(schedule).catch(() => {});
    deadline = window.setTimeout(() => {
      check();
      finish();
    }, 8000);
    schedule();
    return () => {
      stopped = true;
      remove();
    };
  }, [hash]);
  return !hash || settled === hash;
}

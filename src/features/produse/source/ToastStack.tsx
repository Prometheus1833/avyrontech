import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * ToastStack — Avyron Products (avyron.ro/produse)
 * Șase tipuri de notificări: succes, eroare, info, progres, anulare (undo) și
 * promisiune. Stivă care se desface la hover, glisare pentru închidere,
 * anunțuri aria-live. Fără dependențe.
 */

export type ToastKind = "success" | "error" | "info" | "progress" | "undo" | "promise";

type Toast = {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  progress?: number;
  action?: { label: string; onClick: () => void };
  state?: "pending" | "done" | "failed";
};

type Api = {
  push: (toast: Omit<Toast, "id">) => number;
  update: (id: number, patch: Partial<Toast>) => void;
  dismiss: (id: number) => void;
  promise: <T>(task: Promise<T>, labels: { pending: string; done: string; failed: string }) => Promise<T>;
};

const Ctx = createContext<Api | null>(null);

const TONE: Record<ToastKind, string> = {
  success: "#34d399",
  error: "#f87171",
  info: "#60a5fa",
  progress: "#a78bfa",
  undo: "#fbbf24",
  promise: "#22d3ee",
};

export function ToastProvider({ children, max = 4 }: { children: ReactNode; max?: number }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expanded, setExpanded] = useState(false);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const update = useCallback((id: number, patch: Partial<Toast>) => setToasts((all) => all.map((t) => (t.id === id ? { ...t, ...patch } : t))), []);
  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setToasts((all) => [{ ...toast, id }, ...all].slice(0, max));
      if (toast.kind !== "progress" && toast.kind !== "promise") window.setTimeout(() => dismiss(id), 5200);
      return id;
    },
    [dismiss, max],
  );
  const promise = useCallback(
    async <T,>(task: Promise<T>, labels: { pending: string; done: string; failed: string }) => {
      const id = push({ kind: "promise", title: labels.pending, state: "pending" });
      try {
        const value = await task;
        update(id, { title: labels.done, state: "done" });
        return value;
      } catch (error) {
        update(id, { title: labels.failed, state: "failed" });
        throw error;
      } finally {
        window.setTimeout(() => dismiss(id), 2600);
      }
    },
    [push, update, dismiss],
  );

  const api = useMemo(() => ({ push, update, dismiss, promise }), [push, update, dismiss, promise]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <ol
        aria-live="polite"
        onPointerEnter={() => setExpanded(true)}
        onPointerLeave={() => setExpanded(false)}
        style={{ position: "absolute", right: 16, bottom: 16, width: "min(340px, calc(100% - 32px))", listStyle: "none", margin: 0, padding: 0, height: 0 }}
      >
        {toasts.map((toast, index) => (
          <ToastRow key={toast.id} toast={toast} index={index} expanded={expanded} onClose={() => dismiss(toast.id)} />
        ))}
      </ol>
    </Ctx.Provider>
  );
}

function ToastRow({ toast, index, expanded, onClose }: { toast: Toast; index: number; expanded: boolean; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  const [dragX, setDragX] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const offset = expanded ? index * 76 : index * 10;
  const scale = expanded ? 1 : 1 - index * 0.05;
  const tone = toast.state === "failed" ? TONE.error : toast.state === "done" ? TONE.success : TONE[toast.kind];

  return (
    <li
      onPointerDown={(e) => (start.current = e.clientX)}
      onPointerMove={(e) => start.current !== null && setDragX(Math.max(0, e.clientX - start.current))}
      onPointerUp={() => {
        if (dragX > 90) onClose();
        start.current = null;
        setDragX(0);
      }}
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        width: "100%",
        transform: `translate3d(${dragX}px, ${shown ? -offset : 40}px, 0) scale(${scale})`,
        opacity: shown ? (index > 2 && !expanded ? 0 : 1 - dragX / 240) : 0,
        transition: start.current === null ? "transform .45s cubic-bezier(.22,1,.36,1), opacity .35s" : "none",
        zIndex: 10 - index,
        background: "rgba(16,18,28,.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 14,
        padding: "12px 14px",
        color: "#fff",
        boxShadow: "0 18px 40px -18px rgba(0,0,0,.8)",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        touchAction: "pan-y",
      }}
    >
      <span aria-hidden="true" style={{ marginTop: 5, width: 8, height: 8, borderRadius: 99, background: tone, boxShadow: `0 0 12px ${tone}`, flex: "none", animation: toast.state === "pending" ? "pulse 1s infinite" : undefined }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{toast.title}</p>
        {toast.body && <p style={{ margin: "2px 0 0", fontSize: 12.5, opacity: 0.65 }}>{toast.body}</p>}
        {toast.kind === "progress" && (
          <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round((toast.progress ?? 0) * 100)}%`, background: tone, transition: "width .25s" }} />
          </div>
        )}
      </div>
      {toast.action && (
        <button type="button" onClick={() => { toast.action!.onClick(); onClose(); }} style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: 0, borderRadius: 8, padding: "5px 9px", fontSize: 12, cursor: "pointer" }}>
          {toast.action.label}
        </button>
      )}
      <button type="button" aria-label="Închide" onClick={onClose} style={{ background: "none", border: 0, color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>
        ×
      </button>
    </li>
  );
}

export function useToasts() {
  const api = useContext(Ctx);
  if (!api) throw new Error("useToasts trebuie folosit în <ToastProvider>");
  return api;
}

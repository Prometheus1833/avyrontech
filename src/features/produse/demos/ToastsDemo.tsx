import { ToastProvider, useToasts } from "../source/ToastStack";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

function Buttons({ lang }: { lang: "ro" | "en" }) {
  const { push, update, dismiss, promise } = useToasts();
  const ro = lang === "ro";
  const kinds: Array<{ label: string; run: () => void }> = [
    { label: ro ? "Succes" : "Success", run: () => push({ kind: "success", title: ro ? "Comandă trimisă" : "Order sent", body: ro ? "Îți scriem în 24 de ore." : "We'll reply within 24 hours." }) },
    { label: ro ? "Eroare" : "Error", run: () => push({ kind: "error", title: ro ? "Plata a fost refuzată" : "Payment declined", body: ro ? "Verifică datele cardului." : "Check the card details." }) },
    { label: "Info", run: () => push({ kind: "info", title: ro ? "Versiune nouă disponibilă" : "New version available" }) },
    {
      label: ro ? "Progres" : "Progress",
      run: () => {
        const id = push({ kind: "progress", title: ro ? "Se încarcă fișierele" : "Uploading files", progress: 0 });
        let p = 0;
        const timer = window.setInterval(() => {
          p += 0.14;
          update(id, { progress: Math.min(1, p), title: ro ? `Se încarcă ${Math.round(Math.min(1, p) * 100)}%` : `Uploading ${Math.round(Math.min(1, p) * 100)}%` });
          if (p >= 1) {
            window.clearInterval(timer);
            window.setTimeout(() => dismiss(id), 900);
          }
        }, 320);
      },
    },
    { label: ro ? "Anulare" : "Undo", run: () => push({ kind: "undo", title: ro ? "Produs șters" : "Product deleted", action: { label: ro ? "Anulează" : "Undo", onClick: () => push({ kind: "success", title: ro ? "Am readus produsul" : "Product restored" }) } }) },
    {
      label: ro ? "Promisiune" : "Promise",
      run: () => {
        void promise(new Promise((resolve) => window.setTimeout(resolve, 1500)), {
          pending: ro ? "Se salvează…" : "Saving…",
          done: ro ? "Salvat" : "Saved",
          failed: ro ? "Nu s-a salvat" : "Not saved",
        });
      },
    },
  ];
  return (
    <div className="flex max-w-xs flex-wrap justify-center gap-2">
      {kinds.map((k) => (
        <button
          key={k.label}
          type="button"
          onClick={k.run}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:border-white/35 hover:text-white"
        >
          {k.label}
        </button>
      ))}
    </div>
  );
}

export default function ToastsDemo({ lang }: DemoProps) {
  return (
    <div className="relative h-full w-full">
      <ToastProvider>
        <Stage>
          <Buttons lang={lang} />
        </Stage>
      </ToastProvider>
    </div>
  );
}

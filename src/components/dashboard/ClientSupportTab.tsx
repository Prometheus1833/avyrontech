import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { TicketsTab } from "./TicketsTab";
const Conversations = lazy(() => import("./ProjectConversations"));
export default function ClientSupportTab() {
  const [params, setParams] = useSearchParams(),
    messages = params.get("supportView") === "messages";
  return (
    <section className="min-w-0 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Suport Staff</h1>
        <p className="mt-1 text-sm text-slate-400">
          Solicitările tale și conversațiile cu echipa proiectelor, într-un
          singur loc.
        </p>
      </header>
      <nav aria-label="Suport Staff" className="flex flex-wrap gap-2">
        {[
          [false, "Solicitări de suport"],
          [true, "Mesaje proiecte"],
        ].map(([value, label]) => (
          <button
            key={String(value)}
            aria-pressed={messages === value}
            className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${messages === value ? "border-violet-400/40 bg-violet-500/15" : "border-white/10"}`}
            onClick={() => {
              const next = new URLSearchParams(params);
              if (value) next.set("supportView", "messages");
              else next.delete("supportView");
              setParams(next, { replace: true });
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {messages ? (
        <Suspense fallback={<p role="status">Se încarcă mesajele…</p>}>
          <Conversations />
        </Suspense>
      ) : (
        <TicketsTab embedded />
      )}
    </section>
  );
}

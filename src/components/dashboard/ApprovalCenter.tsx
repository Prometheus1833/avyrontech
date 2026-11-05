import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { osApi } from "@/lib/osApi";
import {
  approvalLabels,
  approvalSources,
  type ApprovalDetail,
  type ApprovalInbox,
  type ApprovalItem,
  type ApprovalSource,
} from "@/shared/approvals";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const button =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium hover:bg-white/10 disabled:opacity-50";
export default function ApprovalCenter({
  authorized,
}: {
  authorized: boolean;
}) {
  const navigate = useNavigate();
  const [inbox, setInbox] = useState<ApprovalInbox | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [expanded, setExpanded] = useState(false),
    [source, setSource] = useState<ApprovalSource | undefined>(),
    [selected, setSelected] = useState<ApprovalDetail | null>(null),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const sequence = useRef(0),
    alive = useRef(true),
    decisionKey = useRef(crypto.randomUUID());
  const allowed = useRef(authorized);
  allowed.current = authorized;
  const load = useCallback(
    async (cursor?: string) => {
      const current = ++sequence.current;
      if (!authorized) return;
      setLoading(true);
      setError("");
      try {
        const next = await osApi.approvals(source, cursor);
        if (alive.current && current === sequence.current)
          setInbox((old) =>
            cursor && old
              ? { ...next, data: [...old.data, ...next.data] }
              : next,
          );
      } catch (e) {
        if (alive.current && current === sequence.current)
          setError(
            e instanceof Error ? e.message : "Aprobările nu pot fi încărcate.",
          );
      } finally {
        if (alive.current && current === sequence.current) setLoading(false);
      }
    },
    [authorized, source],
  );
  useEffect(() => {
    alive.current = true;
    if (!authorized) {
      setInbox(null);
      setSelected(null);
      setExpanded(false);
    }
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("avyron:approvals-changed", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("avyron:approvals-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load, authorized]);
  const review = async (item: ApprovalItem) => {
    setBusy(true);
    setError("");
    setConfirmed(false);
    decisionKey.current = crypto.randomUUID();
    try {
      const next = await osApi.approval(item);
      if (alive.current && allowed.current) setSelected(next);
    } catch (e) {
      if (alive.current && allowed.current) {
        setError(
          e instanceof Error
            ? e.message
            : "Solicitarea nu mai este disponibilă.",
        );
        void load();
      }
    } finally {
      setBusy(false);
    }
  };
  const decide = async (decision: "approved" | "rejected") => {
    if (!selected || !confirmed || busy) return;
    setBusy(true);
    try {
      await osApi.decideItem(selected, decision, decisionKey.current);
      toast.success(
        decision === "approved"
          ? "Aprobarea a fost înregistrată. Publicarea și trimiterea rămân acțiuni separate."
          : "Solicitarea a fost respinsă.",
      );
      setSelected(null);
      window.dispatchEvent(new Event("avyron:approvals-changed"));
      await load();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Decizia nu a fost salvată.",
      );
      await load();
    } finally {
      setBusy(false);
    }
  };
  const rows = (all: boolean) => (
    <div className="space-y-2">
      {(all ? inbox?.data : inbox?.data.slice(0, 4))?.map((item) => (
        <article
          key={item.source + item.id}
          className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-fuchsia-200/70">
              {approvalLabels[item.source]}
            </p>
            <p className="mt-1 break-words text-sm font-medium text-slate-100">
              {item.title}
            </p>
            <p className="mt-1 break-words text-xs text-slate-400">
              {item.summary}
            </p>
          </div>
          <button
            className={button + " shrink-0"}
            disabled={busy}
            onClick={() => void review(item)}
          >
            Revizuiește
          </button>
        </article>
      ))}
    </div>
  );
  return (
    <section
      className="self-start rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4 sm:p-5 xl:col-span-5"
      aria-labelledby="approval-center-title"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-fuchsia-200/70">
            Control uman
          </p>
          <h2
            id="approval-center-title"
            className="mt-1 font-display text-lg font-semibold text-white"
          >
            Centru de aprobări{" "}
            <span className="text-sm text-fuchsia-200">
              {inbox?.total ?? ""}
            </span>
          </h2>
        </div>
        <button
          className={button}
          aria-label="Actualizează aprobările"
          disabled={loading || !authorized}
          onClick={() => void load()}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>
      {!authorized ? (
        <p className="text-xs text-slate-400">
          Solicitările sunt vizibile responsabililor autorizați.
        </p>
      ) : (
        <>
          <p className="mb-3 text-[11px] text-slate-400">
            {inbox
              ? "Citire directă din module · actualizare automată la 30 secunde"
              : "Se citesc solicitările din module…"}
          </p>
          {error && (
            <p role="alert" className="mb-3 text-xs text-amber-200">
              {error}{" "}
              <button className="underline" onClick={() => void load()}>
                Reîncearcă
              </button>
            </p>
          )}
          {inbox?.total === 0 && !error && (
            <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-400">
              Nu există solicitări active de aprobat sau revizuit.
            </p>
          )}
          {rows(false)}
          {inbox && inbox.total > 0 && (
            <button
              className={button + " mt-3 w-full"}
              onClick={() => setExpanded(true)}
            >
              Vezi toate solicitările · {inbox.total}
            </button>
          )}
        </>
      )}
      <Dialog
        open={expanded}
        onOpenChange={(open) => {
          setExpanded(open);
          if (!open) setSource(undefined);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Toate aprobările și revizuirile</DialogTitle>
            <DialogDescription>
              Fiecare solicitare păstrează permisiunile și verificările
              modulului sursă.
            </DialogDescription>
          </DialogHeader>
          <label className="text-xs">
            Tipul solicitării
            <select
              aria-label="Filtrează aprobările"
              value={source || ""}
              onChange={(e) =>
                setSource((e.target.value as ApprovalSource) || undefined)
              }
              className="ml-2 max-w-full rounded-lg border border-white/10 bg-[#10162a] p-2"
            >
              <option value="">Toate</option>
              {approvalSources.map((s) => (
                <option key={s} value={s}>
                  {approvalLabels[s]}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p role="alert" className="text-xs text-amber-200">
              {error}{" "}
              <button className="underline" onClick={() => void load()}>
                Reîncearcă
              </button>
            </p>
          )}
          {loading && (
            <p role="status" className="text-xs text-slate-400">
              Se actualizează solicitările…
            </p>
          )}
          {!loading && !error && inbox?.total === 0 && (
            <p className="text-sm text-slate-400">
              Nu există solicitări pentru acest filtru.
            </p>
          )}
          {rows(true)}
          {inbox?.nextCursor && (
            <button
              disabled={loading}
              className={button}
              onClick={() => void load(inbox.nextCursor!)}
            >
              Încarcă următoarele
            </button>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title || "Revizuire"}</DialogTitle>
            <DialogDescription>
              {selected && approvalLabels[selected.source]} · verifică
              solicitarea înaintea deciziei.
            </DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap break-words rounded-xl bg-white/5 p-4 text-sm leading-relaxed">
            {selected?.detail}
          </div>
          {selected?.canDecide && (
            <>
              <p className="text-xs text-slate-400">
                Decizia privește versiunea revizuită. Publicarea, expedierea și
                execuția externă nu sunt confirmate prin această aprobare.
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Am verificat conținutul și confirm decizia.
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className={button + " text-emerald-300"}
                  disabled={!confirmed || busy}
                  onClick={() => void decide("approved")}
                >
                  <ShieldCheck className="mr-1 inline size-4" />
                  Confirmă aprobarea
                </button>
                {selected.canReject && (
                  <button
                    className={button + " text-rose-300"}
                    disabled={!confirmed || busy}
                    onClick={() => void decide("rejected")}
                  >
                    Respinge
                  </button>
                )}
              </div>
            </>
          )}
          {selected && (
            <button
              className={button}
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setExpanded(false);
                navigate(selected.href);
              }}
            >
              Deschide în modulul sursă
            </button>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cfAuth } from "@/lib/cfAuth";
type Snapshot = {
  checkedAt: number;
  environment: string;
  modules: Record<string, number>;
  resources: { id: string; label: string; status: string; detail: string }[];
};
const labels: Record<string, string> = {
  clients: "Clienți",
  projects: "Proiecte",
  products: "Produse",
  knowledge: "Cunoaștere aprobată",
  documents: "Documente autorizate",
};
export default function StorageStatus() {
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const check = async () => {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      setData(await cfAuth.request<Snapshot>("/api/os/storage"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Verificarea nu este disponibilă.",
      );
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  return (
    <section
      className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-3"
      aria-label="Surse Cloudflare conectate"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Sursele de date AVYRON</h3>
          <p className="mt-1 text-xs text-slate-400">
            Modulele citesc aceleași înregistrări autorizate. Verificarea
            păstrează separarea dintre producție și test.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs disabled:opacity-50"
          disabled={busy}
          onClick={() => void check()}
        >
          <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
          {busy ? "Se verifică…" : "Verifică sursele"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs text-amber-200">
          {error}
        </p>
      )}
      {data && (
        <>
          <p className="mt-3 text-[11px] text-slate-400">
            {data.environment === "production" ? "Producție" : "Test"} · citit{" "}
            {new Date(data.checkedAt).toLocaleString("ro-RO")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(data.modules).map(([key, value]) => (
              <span
                key={key}
                className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300"
              >
                {labels[key] || key}: {value}
              </span>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {data.resources.map((resource) => (
              <div
                key={resource.id}
                className="min-w-0 rounded-lg border border-white/[0.06] p-2"
              >
                <p className="break-words text-xs">{resource.label}</p>
                <p
                  className={`mt-1 text-[11px] ${resource.status === "funcțional" ? "text-emerald-300" : resource.status === "eroare" ? "text-rose-300" : "text-slate-400"}`}
                >
                  {resource.status}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                  {resource.detail}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

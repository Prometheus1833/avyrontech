import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  RefreshCw,
  ScanSearch,
  Trash2,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cfAuth } from "@/lib/cfAuth";
import { useAntivirus } from "@/hooks/useAntivirus";
import {
  ANTIVIRUS_LIMITS,
  ANTIVIRUS_SOURCES,
  ANTIVIRUS_SOURCE_LABELS,
  ANTIVIRUS_STATUS_LABELS,
  type AntivirusSource,
  type AntivirusJob,
} from "@/shared/antivirus";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
const panel = "rounded-2xl border border-white/10 bg-white/[0.025] p-4";
const control =
  "min-h-10 rounded-xl border border-white/10 bg-[#0b1120] px-3 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";
const bytes = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)} MB`
    : `${Math.ceil(n / 1000)} KB`;
const date = (n: number) => new Date(n).toLocaleString("ro-RO");
type Action = {
  path: string;
  title: string;
  description: string;
  sample?: string;
  id: string;
};
function Status({ job }: { job: AntivirusJob }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${job.status === "clean" ? "bg-emerald-500/15 text-emerald-200" : ["malicious", "suspicious"].includes(job.status) ? "bg-rose-500/15 text-rose-200" : "bg-amber-400/10 text-amber-200"}`}
    >
      {ANTIVIRUS_STATUS_LABELS[job.status]}
    </span>
  );
}
export default function AntivirusTab() {
  const [source, setSource] = useState(""),
    query = useAntivirus(source),
    d = query.data,
    client = useQueryClient();
  const [action, setAction] = useState<Action | null>(null),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const inFlight = useRef(false);
  const open = (
    path: string,
    title: string,
    description: string,
    sample?: string,
  ) => {
    setError("");
    setAccepted(false);
    setAction({ path, title, description, sample, id: crypto.randomUUID() });
  };
  const run = async () => {
    if (!action || !accepted || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await cfAuth.request<{ status?: string; scanId?: string }>(
        "/api/antivirus" + action.path,
        {
          method: "POST",
          headers: { "Idempotency-Key": action.id },
          body: JSON.stringify({
            confirmed: true,
            ...(action.sample ? { sample: action.sample } : {}),
          }),
        },
      );
      if (action.sample === "eicar" && r.status === "clean")
        toast.error("Verdict neașteptat pentru EICAR. Testul nu este validat.");
      else if (r.status === "clean")
        toast.success("Bouncer a confirmat verdictul CLEAN.");
      else if (r.status === "malicious" || r.status === "suspicious")
        toast.info(
          "Bouncer a detectat fișierul de test; accesul rămâne blocat.",
        );
      else if (
        r.status === "pending" ||
        r.status === "unknown" ||
        r.status === "submitting" ||
        r.status === "quarantined"
      )
        toast.info(
          "Nu există încă un verdict final. Fișierul rămâne în carantină.",
        );
      else if (r.status === "failed" || r.status === "purging")
        toast.error(
          "Operațiunea nu are un verdict final CLEAN. Fișierul rămâne blocat.",
        );
      else toast.success("Operațiunea a fost înregistrată.");
      setAction(null);
      await client.invalidateQueries({ queryKey: ["antivirus"] });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Operațiunea nu a fost confirmată. Nu presupunem scanarea reușită.",
      );
      await client.invalidateQueries({ queryKey: ["antivirus"] });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const used = d?.quota
      ? Math.max(d.quota.reserved, d.quota.provider_used)
      : null,
    limit = Math.min(500, d?.quota?.provider_limit || 500),
    remaining = used === null ? null : Math.max(0, limit - used);
  const ready = !!d?.configured && !!d?.enabled && !!d?.storageVerified,
    canSendSensitive = ready && !!d?.sensitiveApproved;
  const blocked = d
    ? Object.entries(d.counts)
        .filter(([s]) => !["clean", "purged"].includes(s))
        .reduce((n, [, v]) => n + v, 0) + d.legacyCount
    : 0;
  return (
    <div className="min-w-0 space-y-4 text-slate-100">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[.22em] text-violet-300">
            Principal · securitate fișiere
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-white">
            <ShieldCheck className="size-6 text-violet-300" />
            Antivirus
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Bouncer Malware API · un singur furnizor · fișierele sunt accesibile
            numai după verdictul CLEAN.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw
            className={`mr-2 size-4 ${query.isFetching ? "animate-spin" : ""}`}
          />
          Actualizează
        </Button>
      </header>
      {query.isPending && (
        <p role="status" className={panel}>
          Se încarcă monitorizarea antivirus…
        </p>
      )}
      {query.isError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          Starea antivirus nu a putut fi citită. Verifică sesiunea și
          disponibilitatea API-ului; nu presupunem că scanarea funcționează.
        </div>
      )}
      {d && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Furnizor",
                !d.configured
                  ? "Neconfigurat"
                  : d.enabled
                    ? "Configurat"
                    : "Dezactivat",
                "Bouncer Malware API · Free",
              ],
              [
                "Cotă lunară",
                used === null ? "Neverificată" : `${used} / ${limit}`,
                remaining === null
                  ? "Sincronizează înaintea testării"
                  : `${remaining} scanări rămase · resetare la 1, UTC`,
              ],
              [
                "Fișiere blocate",
                String(blocked),
                `${d.legacyCount} obiecte istorice de verificat`,
              ],
              [
                "Carantină locală",
                bytes(d.storageBytes),
                `Limită suplimentară: ${bytes(ANTIVIRUS_LIMITS.quarantineBytes)}`,
              ],
            ].map(([title, value, detail]) => (
              <article key={title} className={panel}>
                <p className="text-xs text-slate-400">{title}</p>
                <p className="mt-2 text-xl font-semibold text-white">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{detail}</p>
              </article>
            ))}
          </div>
          <section
            aria-label="Conformitate și activare"
            className={`${panel} ${d.sensitiveApproved ? "border-emerald-400/20" : "border-amber-400/25"}`}
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="size-4 text-amber-200" />
              {d.sensitiveApproved
                ? "Aprobarea operatorului pentru date sensibile este configurată"
                : "Uploadurile reale/confidențiale sunt blocate"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Furnizorul declară procesare în AWS Mumbai, India, și ștergerea
              fișierelor în maximum 24 de ore. DPA-ul și garanțiile transferului
              necesită verificare umană înainte de activarea datelor reale.
            </p>
            {!!d.complianceReasons.length && (
              <ul className="mt-2 space-y-1 pl-5 text-xs text-amber-100">
                {d.complianceReasons.map((r) => (
                  <li key={r} className="list-disc">
                    {r}
                  </li>
                ))}
              </ul>
            )}
            {!d.configured && (
              <p className="mt-2 text-xs text-slate-400">
                Cheia se configurează securizat ca secret{" "}
                <code>BOUNCER_API_KEY</code>. Nu se introduce în documente,
                loguri sau conversații. Configurarea și testarea nu fac deploy
                automat din această pagină.
              </p>
            )}
            {!d.storageVerified && (
              <p className="mt-2 text-xs text-amber-100">
                Caracterul privat al bucketurilor R2 trebuie verificat înainte
                de scanare. Lipsa verificării blochează trimiterea fișierelor.
              </p>
            )}
            {!d.enabled && (
              <p className="mt-2 text-xs text-slate-400">
                Integrarea necesită activare explicită prin configurația
                Workerului. Nu se schimbă planul și nu se activează servicii
                plătite.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-violet-200">
              {[
                ["Documentație API", "https://usebouncer.dev/docs/"],
                ["Confidențialitate", "https://usebouncer.dev/privacy/"],
                ["Termeni", "https://usebouncer.dev/terms/"],
              ].map(([t, url]) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-1 underline"
                >
                  {t}
                  <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          </section>
          <section className={panel} aria-label="Teste și control cotă">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Teste și verificări</h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                  Se trimit numai mostre sintetice generate de server. Fiecare
                  test nou consumă o scanare Free. Fișierele reale rămân blocate
                  până la aprobarea conformității; fără retry automat la
                  transmitere incertă.
                </p>
              </div>
              <Button
                variant="outline"
                disabled={!d.configured}
                onClick={() =>
                  open(
                    "/usage/sync",
                    "Sincronizează cota",
                    "Citește planul și utilizarea reală din Bouncer. Nu trimite fișiere și nu consumă o scanare.",
                  )
                }
              >
                Sincronizează cota
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                [
                  "clean",
                  "Test curat",
                  "Verifică o mostră text fără date reale. Verdict așteptat: CLEAN.",
                ],
                [
                  "eicar",
                  "Test EICAR",
                  "Trimite semnătura standard EICAR, inofensivă și neexecutabilă aici. Verdict așteptat: fișier blocat.",
                ],
                [
                  "large_clean",
                  "Test fișier 5 MB",
                  "Verifică fluxul v2 pentru fișiere peste limita v1. Mostră sintetică, fără date reale.",
                ],
              ].map(([sample, title, desc]) => (
                <Button
                  key={sample}
                  variant="outline"
                  disabled={!ready || remaining === 0}
                  onClick={() => open("/test", title, desc, sample)}
                >
                  <ScanSearch className="mr-2 size-4" />
                  {title}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Maximum 25 MB/fișier la antivirus; limitele mai mici ale modulelor
              rămân aplicate. Cota de 500/lună și planul Free se verifică
              înainte de fiecare cerere nouă.
            </p>
            {d.quota && (
              <p className="mt-1 text-[11px] text-slate-400">
                Ultima citire furnizor: {date(d.quota.checked_at)}. Rezervările
                incerte rămân contabilizate, pentru a evita depășirea cotei.
              </p>
            )}
          </section>
          <section className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Scanări și carantină</h2>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                Modul
                <select
                  aria-label="Filtrează scanările după modul"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className={control}
                >
                  <option value="">Toate modulele</option>
                  {ANTIVIRUS_SOURCES.map((k) => (
                    <option key={k} value={k}>
                      {ANTIVIRUS_SOURCE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 space-y-2">
              {!d.jobs.length && (
                <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                  Nu există scanări în acest context. Lipsa scanărilor nu
                  confirmă protecția antivirus.
                </p>
              )}
              {d.jobs.map((job) => (
                <article
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium">
                        {ANTIVIRUS_SOURCE_LABELS[job.source]}
                      </h3>
                      <Status job={job} />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {bytes(job.size_bytes)} · {date(job.updated_at)} ·{" "}
                      {job.attempts} încercări
                    </p>
                    <p className="mt-1 break-all font-mono text-[10px] text-slate-400">
                      {job.id}
                    </p>
                    {job.reason && (
                      <p className="mt-1 text-xs text-amber-200">
                        Motiv: {job.reason.replace(/_/g, " ")}
                      </p>
                    )}
                    {job.status === "unknown" && !job.provider_scan_id && (
                      <p className="mt-1 max-w-xl text-xs text-amber-100">
                        Cerere incertă fără ID confirmat. Necesită reconciliere
                        cu furnizorul; retrimiterea automată este interzisă.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!job.provider_scan_id && job.status === "unknown" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          open(
                            `/jobs/${job.id}/reconcile`,
                            "Reconciliază cererea",
                            "Caută ID-ul în istoricul Bouncer după numele opac al acestei mostre. Nu trimite fișierul și nu consumă altă scanare. Dacă nu există o potrivire unică, păstrează carantina.",
                          )
                        }
                      >
                        <RefreshCw className="mr-1 size-3.5" />
                        Reconciliază
                      </Button>
                    )}
                    {job.provider_scan_id &&
                      ["pending", "unknown"].includes(job.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            open(
                              `/jobs/${job.id}/poll`,
                              "Verifică verdictul",
                              "Citește rezultatul scanării existente, fără a crea o scanare nouă.",
                            )
                          }
                        >
                          <RefreshCw className="mr-1 size-3.5" />
                          Verifică
                        </Button>
                      )}
                    {job.quarantine_held === 1 &&
                      ["quarantined", "failed"].includes(job.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={job.sensitive ? !canSendSensitive : !ready}
                          onClick={() =>
                            open(
                              `/jobs/${job.id}/retry`,
                              "Reîncearcă scanarea",
                              "Creează o nouă încercare Bouncer și consumă o scanare Free. Se verifică din nou cota, integritatea și conformitatea.",
                            )
                          }
                        >
                          <RotateCcw className="mr-1 size-3.5" />
                          Reîncearcă
                        </Button>
                      )}
                    {job.quarantine_held === 1 &&
                      !["pending", "submitting"].includes(job.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            open(
                              `/jobs/${job.id}/purge`,
                              "Elimină copia din carantină",
                              "Elimină numai copia izolată din carantină. Documentele originale deja înregistrate și istoricul nu se șterg. O mostră nealocată nu va mai putea fi recuperată. Nu șterge copia temporară de la furnizor și nu rambursează scanări.",
                            )
                          }
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          Curăță carantina
                        </Button>
                      )}
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className={panel}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={!source || source === "synthetic"}
                onClick={() =>
                  open(
                    "/inventory/" + source,
                    "Inventariază stocarea",
                    "Citește cel mult 25 de metadate R2 pentru modulul selectat. Găsește și fișiere nelegate de înregistrări. Nu trimite conținut la Bouncer și nu consumă scanări.",
                  )
                }
              >
                Inventariază stocarea
              </Button>
              <span className="text-xs text-slate-400">
                Selectează un modul; repetă pentru următorul lot de metadate.
              </span>
            </div>
            <h2 className="text-sm font-semibold">
              Fișiere istorice neverificate{" "}
              <span className="text-slate-400">({d.legacyCount})</span>
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Nu sunt declarate automat curate. Sunt păstrate în stocarea
              existentă, iar accesul este blocat. Scanarea se lansează
              individual, în limita cotei și după verificarea conformității. Se
              afișează cel mult 30 de obiecte.
            </p>
            <div className="mt-3 space-y-2">
              {!d.legacy.length && (
                <p className="text-sm text-slate-400">
                  Nu există obiecte istorice în acest filtru.
                </p>
              )}
              {d.legacy.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      {ANTIVIRUS_SOURCE_LABELS[f.source] || f.source}
                    </p>
                    <p className="mt-1 break-all font-mono text-[10px] text-slate-400">
                      {f.id} ·{" "}
                      {f.size_bytes
                        ? bytes(f.size_bytes)
                        : "Dimensiune de verificat"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      !canSendSensitive ||
                      f.size_bytes > ANTIVIRUS_LIMITS.fileBytes
                    }
                    onClick={() =>
                      open(
                        `/legacy/${f.id}/scan`,
                        "Scanează fișierul istoric",
                        "Trimite obiectul existent la Bouncer numai după verificarea DPA/transferului. Consumă o scanare Free. Nu se creează un server sau un bucket nou.",
                      )
                    }
                  >
                    <ScanSearch className="mr-1 size-3.5" />
                    Scanează
                  </Button>
                </div>
              ))}
            </div>
          </section>
          <section className={panel}>
            <h2 className="text-sm font-semibold">Jurnal antivirus</h2>
            <p className="mt-1 text-xs text-slate-400">
              Acțiuni, stări și coduri tehnice; fără conținutul fișierelor, chei
              API sau URL-uri de upload.
            </p>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {!d.events.length && (
                <p className="text-sm text-slate-400">
                  Nicio operațiune înregistrată.
                </p>
              )}
              {d.events.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-white/5 py-2 text-xs"
                >
                  <span className="min-w-0 break-words text-slate-300">
                    {ANTIVIRUS_SOURCE_LABELS[e.source as AntivirusSource] ||
                      e.source}{" "}
                    · {e.action.replace(/\./g, " / ")}
                    {e.code ? ` · ${e.code}` : ""}
                  </span>
                  <time className="shrink-0 text-slate-400">
                    {date(e.created_at)}
                  </time>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <Dialog
        open={!!action}
        onOpenChange={(v) => {
          if (!v && !busy) setAction(null);
        }}
      >
        <DialogContent className="dark max-h-[85dvh] overflow-y-auto border-white/10 bg-[#0b1120] text-slate-100">
          <DialogHeader>
            <DialogTitle>{action?.title}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {action?.description}
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={busy}
              className="mt-1 size-4 accent-violet-500"
            />
            <span>Confirm operațiunea descrisă și limitele aplicabile.</span>
          </label>
          {error && (
            <p
              role="alert"
              className="break-words rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-100"
            >
              {error}
            </p>
          )}
          <Button disabled={!accepted || busy} onClick={() => void run()}>
            {busy ? "Se verifică…" : action?.title}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  Bell,
  ShieldCheck,
  Save,
  RefreshCw,
  Clock3,
  ArrowUpRight,
} from "lucide-react";
import { cfAuth } from "@/lib/cfAuth";
import {
  notificationSettingsSchema,
  GUEST_CONTEXTS,
  type NotificationSettings,
} from "@/shared/notifications";
import { Link } from "react-router-dom";

export type AdminData = {
  config: NotificationSettings;
  revision: number;
  updated_at: number;
  counts: { category: string; total: number; unread: number }[];
};
const labels = {
  general: "General",
  website: "Website",
  commerce: "Magazin online",
  social: "Social media",
  logo: "Logo și identitate",
  ai: "Automatizări și AI",
};
export default function NotificationSettingsTab() {
  const [data, setData] = useState<AdminData | null>(null),
    [draft, setDraft] = useState<NotificationSettings | null>(null);
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [context, setContext] =
      useState<(typeof GUEST_CONTEXTS)[number]>("website"),
    [language, setLanguage] = useState<"ro" | "en">("ro");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const next = await cfAuth.request<AdminData>("/api/notifications/admin");
      setData(next);
      setDraft(structuredClone(next.config));
    } catch {
      setError(
        "Configurația nu a putut fi încărcată. Verifică sesiunea și confirmarea MFA.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    void cfAuth
      .request<AdminData>("/api/notifications/admin")
      .then((next) => {
        if (active) {
          setData(next);
          setDraft(structuredClone(next.config));
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Configurația nu a putut fi încărcată. Verifică sesiunea și confirmarea MFA.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const save = async () => {
    const parsed = notificationSettingsSchema.safeParse(draft);
    if (!parsed.success) {
      setError(
        "Completează textele în ambele limbi. Întârzierea acceptată este 30–600 secunde, iar pauza 1–720 ore.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await cfAuth.request<{
        revision: number;
        updated_at: number;
      }>("/api/notifications/admin", {
        method: "PUT",
        body: JSON.stringify({ revision: data?.revision, config: parsed.data }),
      });
      setData((current) =>
        current ? { ...current, ...result, config: parsed.data } : current,
      );
      setSuccess(
        "Configurația a fost salvată. Notificările existente sunt păstrate.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Salvarea a eșuat. Reîncarcă pentru a verifica ultima versiune.",
      );
    } finally {
      setBusy(false);
    }
  };
  const fieldClass =
    "min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";
  return (
    <section className="space-y-5 text-slate-200">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">
            AVYRON OS · comunicare contextuală
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white">
            Sistem de notificări
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Mesaje discrete pe site. Actualizări relevante în cont. O singură
            căsuță, conectată la proiecte și abonamente.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void load()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm"
          >
            <RefreshCw className="size-4" />
            Reîncarcă
          </button>
          <button
            type="button"
            disabled={!draft || busy || loading}
            onClick={() => void save()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save className="size-4" />
            {busy ? "Se salvează…" : "Salvează"}
          </button>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100"
        >
          {success}
        </p>
      )}
      {loading && <p role="status">Se încarcă configurația…</p>}
      {data && draft && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [
                "Notificări · 30 de zile",
                data.counts.reduce((s, r) => s + r.total, 0),
              ],
              [
                "Necitite · 30 de zile",
                data.counts.reduce((s, r) => s + r.unread, 0),
              ],
              ["Versiune configurare", data.revision],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
              >
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-1 font-display text-2xl text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <h3 className="text-base font-semibold text-white">
                Vizitatori fără cont
              </h3>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={draft.guest.enabled}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      guest: { ...draft.guest, enabled: e.target.checked },
                    })
                  }
                  className="size-4 accent-violet-500"
                />
                Activează sugestiile de contact
              </label>
              <p className="text-xs leading-relaxed text-slate-400">
                O singură invitație pe sesiune, după timp vizibil pe pagină și
                alegerea preferințelor cookie. Mesajele promoționale respectă
                acordul de marketing. Fără afișare peste formulare, în cont, pe
                pagina de contact sau în checkout. Invitația automată la
                newsletter este amânată când acest flux este activ.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-xs">
                  Timp activ înainte de afișare (secunde)
                  <input
                    type="number"
                    min={30}
                    max={600}
                    value={draft.guest.delaySeconds}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        guest: {
                          ...draft.guest,
                          delaySeconds: Number(e.target.value),
                        },
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="space-y-2 text-xs">
                  Pauză între sesiuni (ore)
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={draft.guest.cooldownHours}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        guest: {
                          ...draft.guest,
                          cooldownHours: Number(e.target.value),
                        },
                      })
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-xs">
                  Context
                  <select
                    value={context}
                    onChange={(e) =>
                      setContext(e.target.value as typeof context)
                    }
                    className={fieldClass}
                  >
                    {GUEST_CONTEXTS.map((key) => (
                      <option key={key} value={key}>
                        {labels[key]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-xs">
                  Limba
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as "ro" | "en")}
                    className={fieldClass}
                  >
                    <option value="ro">Română</option>
                    <option value="en">English</option>
                  </select>
                </label>
              </div>
              {(
                [
                  ["title", "Titlu"],
                  ["body", "Descriere"],
                  ["cta", "Buton de contact"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block space-y-2 text-xs">
                  {label}
                  <textarea
                    rows={key === "body" ? 3 : 2}
                    maxLength={240}
                    value={draft.guest.messages[context][key][language]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        guest: {
                          ...draft.guest,
                          messages: {
                            ...draft.guest.messages,
                            [context]: {
                              ...draft.guest.messages[context],
                              [key]: {
                                ...draft.guest.messages[context][key],
                                [language]: e.target.value,
                              },
                            },
                          },
                        },
                      })
                    }
                    className={fieldClass}
                  />
                </label>
              ))}
            </div>
            <aside className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-violet-400/25 bg-[#0c1120] shadow-xl">
                <div className="flex items-center gap-2 bg-gradient-to-r from-violet-500/20 to-cyan-500/10 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-violet-200">
                  <Bell className="size-4" />
                  Previzualizare · {labels[context]}
                </div>
                <div className="space-y-3 p-5">
                  <h3 className="break-words text-lg font-semibold text-white">
                    {draft.guest.messages[context].title[language]}
                  </h3>
                  <p className="break-words text-sm leading-relaxed text-slate-300">
                    {draft.guest.messages[context].body[language]}
                  </p>
                  <span className="inline-block rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white">
                    {draft.guest.messages[context].cta[language]}
                  </span>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-white/10 p-5">
                <h3 className="font-semibold text-white">
                  Evenimente din platformă
                </h3>
                {(
                  [
                    ["projects", "Proiecte, etape și propuneri"],
                    ["subscriptions", "Abonamente și date de facturare"],
                    ["blog", "Noutăți publicate în blog"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex min-h-11 items-center gap-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={draft.events[key]}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          events: { ...draft.events, [key]: e.target.checked },
                        })
                      }
                      className="size-4 accent-violet-500"
                    />
                    {label}
                  </label>
                ))}
                <p className="text-xs leading-relaxed text-slate-400">
                  Oprirea unui eveniment împiedică generarea notificărilor noi.
                  Nu șterge istoricul. Clienții pot opri individual noutățile
                  din blog.
                </p>
                <Link
                  to="/profil?tab=notifications"
                  className="inline-flex min-h-11 items-center gap-2 text-sm text-violet-200"
                >
                  Deschide căsuța mea
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </aside>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/15 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="size-4 text-emerald-300" />
                Destinatari și acces
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Proiect nou: responsabilii de platformă, stafful cu acces global
                și beneficiarii autorizați. Alocare: membrul staff implicat.
                Propunere: exclusiv stafful alocat, fără autor. Accesul este
                reverificat la citire; revocarea elimină notificarea din căsuță
                și din contoare.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Clock3 className="size-4 text-violet-300" />
                Recomandări pentru claritate
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Păstrează o întârziere de cel puțin 60 de secunde și un mesaj
                scurt, specific paginii. Proiectele și abonamentele sunt
                evidențiate fără să schimbe ordinea cronologică. Contoarele
                măsoară înregistrări din căsuță, fără a pretinde livrare e-mail
                sau push.
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

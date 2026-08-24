import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Gift, Paperclip, X, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";
import { apiUrl } from "@/lib/apiBase";
import Turnstile, { TURNSTILE_SITE_KEY } from "@/components/site/Turnstile";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

type Summary = {
  leadId: string;
  submittedAt: string;
  name: string;
  business: string;
  phone: string;
  email: string;
  website?: string;
  description?: string;
  files: { name: string; size: number }[];
};

const CTA = () => {
  const { t, lang } = useLang();
  const location = useLocation();
  const isAuditRequest = new URLSearchParams(location.search).get("request") === "audit";
  const schema = z.object({
    name: z.string().trim().min(2, t.cta.errNameShort).max(80),
    business: z.string().trim().min(2, t.cta.errBusiness).max(80),
    description: z.string().trim().max(2000).optional(),
    website: z.string().trim().max(200).optional(),
    phone: z.string().trim().min(6, t.cta.errPhone).max(30),
    email: z.string().trim().email(t.cta.errEmail).max(120),
  });

  const emptyData = {
    name: "",
    business: "",
    description: isAuditRequest
      ? lang === "ro"
        ? "Doresc un audit pentru website-ul sau produsul meu digital."
        : "I would like an audit for my website or digital product."
      : "",
    website: "",
    phone: "",
    email: "",
  };
  const [data, setData] = useState(emptyData);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const valid = incoming.filter((f) => {
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name}: max 10MB`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    if (fileInput.current) fileInput.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (TURNSTILE_SITE_KEY && !token) {
      toast.error(t.cta.captchaRequired);
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(parsed.data).forEach(([k, v]) => fd.append(k, v ?? ""));
      fd.append("lang", lang);
      fd.append("company_url", honeypot.current?.value ?? "");
      if (token) fd.append("cf-turnstile-response", token);
      files.forEach((f) => fd.append("files", f, f.name));

      const res = await fetch(apiUrl("/api/contact/demo"), { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as {
        summary?: Summary;
        error?: string;
        leadId?: string;
      };

      if (res.status === 429) {
        toast.error(t.cta.rateLimited);
        return;
      }
      if (res.status === 403) {
        toast.error(t.cta.captchaFailed);
        setToken("");
        setResetKey((k) => k + 1);
        return;
      }
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);

      toast.success(t.cta.success);
      setSummary(
        body.summary ?? {
          leadId: body.leadId ?? "—",
          submittedAt: new Date().toISOString(),
          name: parsed.data.name,
          business: parsed.data.business,
          phone: parsed.data.phone,
          email: parsed.data.email,
          website: parsed.data.website,
          description: parsed.data.description,
          files: files.map((f) => ({ name: f.name, size: f.size })),
        },

      );
      setData(emptyData);
      setFiles([]);
      setToken("");
      setResetKey((k) => k + 1);
    } catch (err) {
      console.error("demo-request submit failed", err);
      toast.error(t.cta.sendError);
    } finally {
      setLoading(false);
    }
  };

  const set = (k: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));


  return (
    <section id="cta" className="py-10 md:py-14">
      <div className="mx-auto max-w-5xl px-4">
        <div className="rounded-[2rem] overflow-hidden grid md:grid-cols-2 shadow-elev border border-border/60">
          <div className="bg-pink p-6 sm:p-8 md:p-10 text-background relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 size-60 rounded-full bg-white/20 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                <Gift className="size-3.5" aria-hidden="true" focusable="false" /> {t.cta.badge}
              </div>
              <h2 className="mt-4 font-display text-2xl sm:text-3xl md:text-3xl font-bold leading-tight">
                {t.cta.title}
              </h2>
              <p className="mt-3 text-sm text-background/90">{t.cta.desc}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-background/90">
                {t.cta.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          </div>
          {summary ? (
            <div className="bg-card p-5 sm:p-6 md:p-8" role="status" aria-live="polite">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-6 text-brand shrink-0" aria-hidden="true" focusable="false" />
                <div>
                  <h3 className="font-display text-lg font-semibold">{t.cta.successTitle}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.cta.successDesc}</p>
                </div>
              </div>

              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.cta.summaryTitle}
              </p>
              <dl className="mt-2 divide-y divide-border/60 rounded-xl border border-border/60 text-sm">
                {[
                  [t.cta.name, summary.name],
                  [t.cta.business, summary.business],
                  [t.cta.phone, summary.phone],
                  [t.cta.email, summary.email],
                  [t.cta.website, summary.website || "—"],
                  [t.cta.description, summary.description || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-3 gap-2 px-3 py-2">
                    <dt className="text-xs text-muted-foreground col-span-1">{label}</dt>
                    <dd className="col-span-2 break-words">{value}</dd>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 px-3 py-2">
                  <dt className="text-xs text-muted-foreground col-span-1">{t.cta.files}</dt>
                  <dd className="col-span-2 break-words">
                    {summary.files.length
                      ? summary.files.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(", ")
                      : t.cta.summaryNoFiles}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-[11px] text-muted-foreground">
                {t.cta.summaryRef}: <span className="font-mono">{summary.leadId.slice(0, 8)}</span> ·{" "}
                {new Date(summary.submittedAt).toLocaleString(lang === "ro" ? "ro-RO" : "en-GB")}
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={() => setSummary(null)}
                className="mt-5 h-10 rounded-full w-full gap-2"
              >
                <RotateCcw className="size-4" aria-hidden="true" focusable="false" /> {t.cta.sendAnother}
              </Button>
            </div>
          ) : (
          <form onSubmit={submit} className="bg-card p-5 sm:p-6 md:p-8 space-y-3">

            <div>
              <Label htmlFor="name" className="text-xs">{t.cta.name}</Label>
              <Input id="name" value={data.name} onChange={set("name")} className="mt-1 h-10 rounded-xl" placeholder={t.cta.namePh} />
            </div>
            <div>
              <Label htmlFor="business" className="text-xs">{t.cta.business}</Label>
              <Input id="business" value={data.business} onChange={set("business")} className="mt-1 h-10 rounded-xl" placeholder={t.cta.businessPh} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label htmlFor="phone" className="text-xs">{t.cta.phone}</Label>
                <Input id="phone" value={data.phone} onChange={set("phone")} className="mt-1 h-10 rounded-xl" placeholder={t.cta.phonePh} />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs">{t.cta.email}</Label>
                <Input id="email" value={data.email} onChange={set("email")} className="mt-1 h-10 rounded-xl" placeholder={t.cta.emailPh} />
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-xs">{t.cta.description}</Label>
              <Textarea
                id="description"
                value={data.description}
                onChange={set("description")}
                maxLength={2000}
                rows={2}
                className="mt-1 rounded-xl resize-none text-sm"
                placeholder={t.cta.descriptionPh}
              />
            </div>

            <div>
              <Label className="text-xs">{t.cta.files}</Label>
              <input
                ref={fileInput}
                id="files"
                type="file"
                multiple
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={files.length >= MAX_FILES}
                className="mt-1 h-9 rounded-lg border border-dashed border-border bg-background/40 text-xs text-muted-foreground hover:border-brand hover:text-foreground transition-colors inline-flex items-center justify-center gap-1.5 px-3 disabled:opacity-50"
              >
                <Paperclip className="size-3.5" aria-hidden="true" focusable="false" /> {t.cta.filesAdd}
              </button>
              <p className="mt-1 text-[11px] text-muted-foreground">{t.cta.filesHint}</p>
              {files.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-secondary/60 px-2 py-1 text-xs">
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-muted-foreground shrink-0">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                      <button
                        type="button"
                        aria-label="Elimină fișierul"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <Label htmlFor="website" className="text-xs">{t.cta.website}</Label>
              <Input id="website" value={data.website} onChange={set("website")} className="mt-1 h-10 rounded-xl" placeholder={t.cta.websitePh} />
            </div>

            {/* honeypot — invizibil pentru utilizatori, completat doar de boți */}
            <input
              ref={honeypot}
              type="text"
              name="company_url"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
/>

            <Turnstile onToken={setToken} resetKey={resetKey} action="contact-demo" />

            <Button type="submit" disabled={loading} aria-busy={loading} className="w-full h-11 rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" focusable="false" /> {t.cta.sending}
                </span>
              ) : (
                t.cta.submit
              )}
            </Button>
          </form>
          )}

        </div>
      </div>
    </section>
  );
};

export default CTA;

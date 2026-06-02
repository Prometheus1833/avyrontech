import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Sparkles, Globe, Loader2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");

const tlds = [".ro", ".com", ".eu", ".net", ".org", ".io", ".app", ".dev", ".tech", ".store", ".online", ".biz", ".info", ".co", ".shop"];

type Result = { tld: string; available: boolean; uncertain?: boolean };

const DomainCheck = () => {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [tld, setTld] = useState(".ro");
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<null | Result[]>(null);
  const [livePreview, setLivePreview] = useState("");

  const slug = slugify(name).slice(0, 30);

  useEffect(() => {
    setLivePreview(slug);
  }, [slug]);

  const check = async () => {
    if (!slug || slug.length < 2) return;
    setChecking(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("check-domain", {
        body: { name: slug, tld: tld.replace(/^\./, "") },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults([{ tld, available: !!data.available, uncertain: !!data.uncertain }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Verificare eșuată";
      toast.error(msg);
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="pt-2 pb-10 md:pt-4 md:pb-16 bg-secondary/40">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-[1.5rem] md:rounded-[2rem] bg-darkgrad text-white p-6 sm:p-8 md:p-14 shadow-elev relative overflow-hidden ring-1 ring-white/10 dark:ring-brand/40 dark:shadow-glow">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -top-20 -right-20 size-80 rounded-full bg-brand/30 blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute -bottom-20 -left-20 size-80 rounded-full bg-brand-2/30 blur-3xl"
          />
          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
              <Sparkles className="size-3.5" /> {t.domain.badge}
            </div>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold tracking-tight">
              {t.domain.title1}<br />{t.domain.title2}
            </h2>
            <p className="mt-3 text-white/70 max-w-lg mx-auto">
              {t.domain.desc}
            </p>

            <motion.div
              initial={false}
              animate={{ opacity: livePreview ? 1 : 0.5 }}
              className="mt-7 rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-3 max-w-lg mx-auto"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="size-2.5 rounded-full bg-brand-3" />
                <span className="size-2.5 rounded-full bg-accent" />
                <span className="size-2.5 rounded-full bg-brand" />
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-2 text-xs sm:text-sm overflow-hidden">
                <Globe className="size-4 opacity-70 shrink-0" />
                <span className="opacity-60 hidden sm:inline">https://</span>
                <span className="font-mono font-semibold text-white truncate">
                  {livePreview || t.domain.placeholderUrl}
                </span>
                <span className="opacity-60">{tld}</span>
              </div>
            </motion.div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-lg mx-auto">
              <div className="flex gap-2 sm:contents">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 40))}
                  onKeyDown={(e) => e.key === "Enter" && check()}
                  placeholder={t.domain.placeholder}
                  className="h-12 rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50 px-5 focus-visible:ring-brand-glow flex-1 min-w-0"
                />
                <select
                  value={tld}
                  onChange={(e) => setTld(e.target.value)}
                  aria-label={t.domain.tldLabel}
                  className="h-12 rounded-full bg-white/10 border border-white/20 text-white px-3 sm:px-5 font-mono font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow appearance-none cursor-pointer shrink-0"
                >
                  {tlds.map((x) => (
                    <option key={x} value={x} className="bg-foreground text-white">{x}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={check}
                disabled={!slug || checking}
                className="h-12 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 px-6 font-semibold disabled:opacity-60"
              >
                {checking ? <Loader2 className="size-4 animate-spin" /> : t.domain.check}
              </Button>
            </div>

            <AnimatePresence>
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 max-w-md mx-auto"
                >
                  {results.map((r, i) => (
                    <motion.div
                      key={r.tld}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08 }}
                      className={`rounded-2xl border p-4 flex items-center justify-between backdrop-blur ${
                        r.available
                          ? "bg-accent/15 border-accent/30"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`size-8 rounded-full grid place-items-center ${
                            r.available ? "bg-accent text-accent-foreground" : "bg-white/10"
                          }`}
                        >
                          {r.uncertain ? <AlertTriangle className="size-4" /> : r.available ? <Check className="size-4" /> : <X className="size-4" />}
                        </span>
                        <div className="text-left">
                          <div className="font-mono font-semibold">
                            {slug}
                            <span className="opacity-70">{r.tld}</span>
                          </div>
                          <div className="text-xs text-white/60">
                            {r.uncertain ? "Verificare incertă — încearcă din nou" : r.available ? t.domain.available : t.domain.taken}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {results && results.some((r) => r.available) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-5 text-sm text-white/80"
              >
                {t.domain.success}
              </motion.p>
            )}

            <p className="mt-4 text-xs text-white/50">{t.domain.disclaimer}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DomainCheck;

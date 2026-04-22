import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Sparkles, Globe, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

const tlds = [".ro", ".com", ".eu", ".net"];

const DomainCheck = () => {
  const [name, setName] = useState("");
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<null | { tld: string; available: boolean }[]>(null);
  const [livePreview, setLivePreview] = useState("");

  const slug = slugify(name).slice(0, 30);

  useEffect(() => {
    setLivePreview(slug);
  }, [slug]);

  const check = () => {
    if (!slug) return;
    setChecking(true);
    setResults(null);
    setTimeout(() => {
      // Demo pseudo-random per TLD
      const r = tlds.map((tld, i) => ({
        tld,
        available: ((slug.length + i) % 3) !== 0 && slug.length > 3,
      }));
      setResults(r);
      setChecking(false);
    }, 700);
  };

  return (
    <section className="pt-2 pb-14 md:pt-4 md:pb-20 bg-secondary/40">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-[2rem] bg-darkgrad text-background p-8 md:p-14 shadow-elev relative overflow-hidden">
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
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
              <Sparkles className="size-3.5" /> Verificare în timp real
            </div>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold tracking-tight">
              Numele afacerii tale<br />arată bine online?
            </h2>
            <p className="mt-3 text-background/70 max-w-lg">
              Introdu numele business-ului și vezi instant pe ce extensii e disponibil.
            </p>

            {/* Live browser preview */}
            <motion.div
              initial={false}
              animate={{ opacity: livePreview ? 1 : 0.5 }}
              className="mt-7 rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-3 max-w-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="size-2.5 rounded-full bg-brand-3" />
                <span className="size-2.5 rounded-full bg-accent" />
                <span className="size-2.5 rounded-full bg-brand" />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
                <Globe className="size-4 opacity-70 shrink-0" />
                <span className="opacity-60">https://</span>
                <span className="font-mono font-semibold text-background">
                  {livePreview || "numele-tau"}
                </span>
                <span className="opacity-60">.ro</span>
              </div>
            </motion.div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3 max-w-lg">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 40))}
                onKeyDown={(e) => e.key === "Enter" && check()}
                placeholder="ex: cafeaua mea"
                className="h-12 rounded-full bg-white/10 border-white/20 text-background placeholder:text-background/50 px-5 focus-visible:ring-brand-glow"
              />
              <Button
                onClick={check}
                disabled={!slug || checking}
                className="h-12 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 px-6 font-semibold disabled:opacity-60"
              >
                {checking ? <Loader2 className="size-4 animate-spin" /> : "Verifică"}
              </Button>
            </div>

            <AnimatePresence>
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 grid sm:grid-cols-2 gap-2"
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
                          {r.available ? <Check className="size-4" /> : <X className="size-4" />}
                        </span>
                        <div>
                          <div className="font-mono font-semibold">
                            {slug}
                            <span className="opacity-70">{r.tld}</span>
                          </div>
                          <div className="text-xs text-background/60">
                            {r.available ? "Disponibil" : "Probabil ocupat"}
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
                className="mt-5 text-sm text-background/80"
              >
                ✨ Îți rezervăm domeniul ales direct în pachet. Fără bătăi de cap.
              </motion.p>
            )}

            <p className="mt-4 text-xs text-background/50">* Verificare demonstrativă. Disponibilitatea reală se confirmă la rezervare.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DomainCheck;

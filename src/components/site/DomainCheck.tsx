import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

const DomainCheck = () => {
  const [name, setName] = useState("");
  const [result, setResult] = useState<null | { available: boolean; base: string; alts: string[] }>(null);

  const check = () => {
    const slug = slugify(name).slice(0, 30);
    if (!slug) return;
    // Demo: pseudo-random based on length
    const available = (slug.length % 2 === 0) && slug.length > 4;
    setResult({
      available,
      base: `${slug}.ro`,
      alts: [`${slug}.eu`, `${slug}-online.ro`, `get${slug}.com`],
    });
  };

  return (
    <section className="py-20 md:py-28 bg-secondary/40">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-[2rem] bg-darkgrad text-background p-8 md:p-14 shadow-elev relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-80 rounded-full bg-brand/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 size-80 rounded-full bg-brand-2/30 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
              <Sparkles className="size-3.5" /> Verificare în timp real
            </div>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold tracking-tight">
              Numele afacerii tale<br />arată bine online?
            </h2>
            <p className="mt-3 text-background/70 max-w-lg">
              Introdu numele business-ului și vezi instant dacă domeniul .ro e disponibil.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3 max-w-lg">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 40))}
                onKeyDown={(e) => e.key === "Enter" && check()}
                placeholder="ex: cafeaua mea"
                className="h-12 rounded-full bg-white/10 border-white/20 text-background placeholder:text-background/50 px-5 focus-visible:ring-brand-glow"
              />
              <Button onClick={check} className="h-12 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 px-6 font-semibold">
                Verifică
              </Button>
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 rounded-2xl bg-white/10 backdrop-blur p-5 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    {result.available ? (
                      <span className="size-9 rounded-full bg-accent text-accent-foreground grid place-items-center">
                        <Check className="size-5" />
                      </span>
                    ) : (
                      <span className="size-9 rounded-full bg-brand-3 grid place-items-center">
                        <X className="size-5" />
                      </span>
                    )}
                    <div>
                      <div className="font-display font-semibold text-lg">
                        {result.base} {result.available ? "pare disponibil" : "este probabil deja folosit"}
                      </div>
                      <div className="text-sm text-background/70">
                        {result.available
                          ? "Putem să-l înregistrăm pentru tine în pachet."
                          : "Niciun stres — avem alternative excelente:"}
                      </div>
                    </div>
                  </div>
                  {!result.available && (
                    <ul className="mt-4 grid sm:grid-cols-3 gap-2">
                      {result.alts.map((a) => (
                        <li key={a} className="rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-center border border-white/10">
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <p className="mt-4 text-xs text-background/50">* Verificare demonstrativă. Disponibilitatea reală se confirmă la rezervare.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DomainCheck;

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, Mail, Phone, Wand2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/apiBase";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email("Email invalid").max(255),
  phone: z.string().trim().min(5, "Telefon prea scurt").max(30, "Telefon prea lung"),
});

type Props = {
  open: boolean;
  onClose: () => void;
  source: {
    slug: string;
    name: string;
    category: string;
  } | null;
};

export const RequestExampleModal = ({ open, onClose, source }: Props) => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setPhone("");
      setDone(false);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source) return;

    const parsed = schema.safeParse({ email, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    const response = await fetch(apiUrl("/api/contact/example"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: parsed.data.email,
        phone: parsed.data.phone,
        source_slug: source.slug,
        source_category: source.category,
        source_name: source.name,
      }),
    }).catch(() => null);
    setSubmitting(false);

    if (!response?.ok) {
      toast.error("A apărut o eroare. Te rugăm încearcă din nou.");
      return;
    }

    setDone(true);
    setTimeout(() => onClose(), 2400);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm grid place-items-center p-4"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-card border border-border/60 shadow-elev p-6 sm:p-7 relative"
          >
            <button
              onClick={onClose}
              aria-label="Închide"
              className="absolute top-3 right-3 size-9 rounded-full grid place-items-center text-muted-foreground hover:bg-secondary transition-colors"
            >
              <X className="size-4" />
            </button>

            {done ? (
              <div className="py-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 14 }}
                  className="size-14 rounded-full bg-brand/15 text-brand grid place-items-center mx-auto mb-3"
                >
                  <Check className="size-7" />
                </motion.div>
                <h3 className="font-display font-bold text-xl">Solicitarea a fost trimisă!</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Te contactăm în maxim 24 de ore cu un exemplu personalizat asemănător cu <span className="font-semibold text-foreground">{source?.name}</span>.
                </p>
              </div>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 text-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                  <Wand2 className="size-3" /> Exemplu personalizat
                </div>
                <h3 className="mt-3 font-display font-bold text-xl sm:text-2xl leading-tight">
                  Solicită un exemplu asemănător cu{" "}
                  <span className="text-brand">{source?.name}</span>
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Lasă-ne emailul și numărul de telefon. Te contactăm cu o variantă personalizată pentru activitatea ta.
                </p>

                <form onSubmit={submit} className="mt-5 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground/80 mb-1 flex items-center gap-1.5">
                      <Mail className="size-3.5" /> Email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplu.ro"
                      required
                      maxLength={255}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground/80 mb-1 flex items-center gap-1.5">
                      <Phone className="size-3.5" /> Telefon
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XX XXX XXX"
                      required
                      maxLength={30}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-full bg-brand text-background hover:bg-brand/90 font-semibold mt-2"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : "Trimite solicitarea"}
                  </Button>

                  <p className="text-[11px] text-muted-foreground text-center pt-1">
                    Solicitarea include sursa: <span className="font-mono">{source?.slug}</span>
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

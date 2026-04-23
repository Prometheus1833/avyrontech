import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

const CTA = () => {
  const { t } = useLang();
  const schema = z.object({
    name: z.string().trim().min(2, t.cta.errNameShort).max(80),
    business: z.string().trim().min(2, t.cta.errBusiness).max(80),
    website: z.string().trim().max(120).optional(),
    phone: z.string().trim().min(6, t.cta.errPhone).max(30),
    email: z.string().trim().email(t.cta.errEmail).max(120),
  });

  const [data, setData] = useState({ name: "", business: "", website: "", phone: "", email: "" });
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success(t.cta.success);
      setData({ name: "", business: "", website: "", phone: "", email: "" });
      setLoading(false);
    }, 700);
  };

  const set = (k: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  return (
    <section id="cta" className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4">
        <div className="rounded-[2rem] overflow-hidden grid md:grid-cols-2 shadow-elev border border-border/60">
          <div className="bg-pink p-7 sm:p-10 md:p-12 text-background relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 size-60 rounded-full bg-white/20 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium">
                <Sparkles className="size-3.5" /> {t.cta.badge}
              </div>
              <h2 className="mt-5 font-display text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                {t.cta.title}
              </h2>
              <p className="mt-4 text-background/90">{t.cta.desc}</p>
              <ul className="mt-6 space-y-2 text-sm text-background/90">
                {t.cta.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          </div>
          <form onSubmit={submit} className="bg-card p-6 sm:p-8 md:p-10 space-y-4">
            <div>
              <Label htmlFor="name">{t.cta.name}</Label>
              <Input id="name" value={data.name} onChange={set("name")} className="mt-1.5 h-11 rounded-xl" placeholder={t.cta.namePh} />
            </div>
            <div>
              <Label htmlFor="business">{t.cta.business}</Label>
              <Input id="business" value={data.business} onChange={set("business")} className="mt-1.5 h-11 rounded-xl" placeholder={t.cta.businessPh} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="phone">{t.cta.phone}</Label>
                <Input id="phone" value={data.phone} onChange={set("phone")} className="mt-1.5 h-11 rounded-xl" placeholder={t.cta.phonePh} />
              </div>
              <div>
                <Label htmlFor="email">{t.cta.email}</Label>
                <Input id="email" value={data.email} onChange={set("email")} className="mt-1.5 h-11 rounded-xl" placeholder={t.cta.emailPh} />
              </div>
            </div>
            <div>
              <Label htmlFor="website">{t.cta.website}</Label>
              <Input id="website" value={data.website} onChange={set("website")} className="mt-1.5 h-11 rounded-xl" placeholder={t.cta.websitePh} />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold">
              {loading ? t.cta.sending : t.cta.submit}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default CTA;

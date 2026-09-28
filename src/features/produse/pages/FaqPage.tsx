import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { FAQ, FAQ_GROUPS, type FaqItem } from "../data/faq";
import { FeatureRequest } from "../components/Forms";
import { PageFaq, Reveal, Seam, Section, SectionHead } from "../components/Primitives";
import { faqPath, homePath } from "../lib/paths";
import { applySeo, breadcrumb, faqLd } from "../lib/seo";
import { fold } from "../lib/search";

/** Pagina completă de întrebări frecvente — indexabilă separat. */
export default function FaqPage({ lang }: { lang: Lang }) {
  const ro = lang === "ro";
  const [query, setQuery] = useState("");
  const path = faqPath(lang);

  const groups = useMemo(() => {
    const q = fold(query.trim());
    const match = (entry: FaqItem) => !q || fold(entry.q[lang]).includes(q) || fold(entry.a[lang]).includes(q);
    return (Object.keys(FAQ_GROUPS) as Array<FaqItem["group"]>)
      .map((group) => ({ group, items: FAQ.filter((entry) => entry.group === group && match(entry)) }))
      .filter((section) => section.items.length > 0);
  }, [query, lang]);

  useEffect(() => {
    const title = ro ? "Întrebări frecvente — Produse Avyron" : "Frequently asked questions — Avyron Products";
    void applySeo({
      title,
      description: ro
        ? "Limite zilnice de copiere, licență pentru proiecte de client, facturi și e-Factura, rambursări, tehnologii compatibile — toate răspunsurile despre Produsele Avyron."
        : "Daily copy limits, licence for client projects, invoices and e-Invoicing, refunds, compatible technologies — every answer about Avyron Products.",
      path,
      lang,
      jsonLd: [
        ["faq-full", faqLd(FAQ.map((entry) => ({ q: entry.q[lang], a: entry.a[lang] })))],
        [
          "breadcrumb",
          breadcrumb(lang, [
            { name: ro ? "Produse Avyron" : "Avyron Products", path: homePath(lang) },
            { name: ro ? "Întrebări frecvente" : "FAQ", path },
          ]),
        ],
      ],
    });
  }, [lang, ro, path]);

  return (
    <div className="pb-16">
      <Section id="faq" hue={220}>
        <SectionHead
          titleAs="h1"
          eyebrow={ro ? "Întrebări frecvente" : "Frequently asked"}
          title={ro ? "Tot ce se întreabă înainte de prima copiere" : "Everything people ask before their first copy"}
          lead={ro ? "Dacă rămâne ceva neclar, scrie-ne — răspunsurile utile ajung aici." : "If something stays unclear, write to us — useful answers end up here."}
        />
        <Reveal>
          <div className="pa-glass mb-5 flex items-center gap-2 rounded-xl px-3 py-2">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ro ? "Caută în întrebări: limite, factură, licență…" : "Search the questions: limits, invoice, licence…"}
              aria-label={ro ? "Caută în întrebări" : "Search the questions"}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
            />
          </div>
        </Reveal>

        {groups.map((section, index) => (
          <Reveal key={section.group} index={index} className="mb-6">
            <h2 className="pa-mono mb-2 text-[11px] uppercase tracking-[0.2em] text-brand">{FAQ_GROUPS[section.group][lang]}</h2>
            <PageFaq items={section.items.map((entry) => ({ id: entry.id, q: entry.q[lang], a: entry.a[lang] }))} />
          </Reveal>
        ))}

        {groups.length === 0 && (
          <p className="pa-glass rounded-2xl p-5 text-sm text-muted-foreground">
            {ro ? "Nicio întrebare nu se potrivește. Scrie-ne direct mai jos." : "No question matches. Write to us below."}
          </p>
        )}
      </Section>

      <Seam />

      <Section id="cerere" hue={195}>
        <Reveal>
          <FeatureRequest lang={lang} />
        </Reveal>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to={homePath(lang)} className="underline underline-offset-4 hover:text-foreground">
            {ro ? "Înapoi la Produse Avyron" : "Back to Avyron Products"}
          </Link>
        </p>
      </Section>
    </div>
  );
}

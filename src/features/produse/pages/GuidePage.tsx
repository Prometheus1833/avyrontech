import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Terminal } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { PLANS } from "../data/plans";
import { CopyButton, Reveal, Seam, Section, SectionHead } from "../components/Primitives";
import { faqPath, guidePath, homePath } from "../lib/paths";
import { applySeo, breadcrumb, STATS } from "../lib/seo";

/**
 * Ghidul: introducere, de ce Avyron, licențe și instalare, într-o singură
 * pagină cu ancore — ușor de trimis și ușor de indexat.
 */
export default function GuidePage({ lang }: { lang: Lang }) {
  const ro = lang === "ro";
  const path = guidePath(lang);

  useEffect(() => {
    const title = ro ? "Ghid — cum folosești Produsele Avyron" : "Guide — how to use Avyron Products";
    void applySeo({
      title,
      description: ro
        ? "Introducere, standardele pe care le ținem, licența de utilizare în proiecte proprii și de client, plus instalarea din CLI, cod, MCP sau prompt AI."
        : "Introduction, the standards we hold, the licence for personal and client projects, plus installing from the CLI, code, MCP or an AI prompt.",
      path,
      lang,
      jsonLd: [
        [
          "guide-howto",
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: ro ? "Cum instalezi un produs Avyron" : "How to install an Avyron product",
            step: [
              { "@type": "HowToStep", name: ro ? "Alege produsul" : "Pick the product", text: ro ? "Deschide pagina produsului și reglează setările din Editor Mode." : "Open the product page and adjust the settings in Editor Mode." },
              { "@type": "HowToStep", name: ro ? "Obține codul" : "Get the code", text: ro ? "Apasă butonul Obține produsul și alege CLI, cod, MCP sau prompt AI." : "Press Get the product and choose CLI, code, MCP or an AI prompt." },
              { "@type": "HowToStep", name: ro ? "Pune-l în proiect" : "Drop it into your project", text: ro ? "Copiază fișierul în componentele tale și importă-l unde ai nevoie." : "Copy the file into your components and import it where you need it." },
            ],
          },
        ],
        [
          "breadcrumb",
          breadcrumb(lang, [
            { name: ro ? "Produse Avyron" : "Avyron Products", path: homePath(lang) },
            { name: ro ? "Ghid" : "Guide", path },
          ]),
        ],
      ],
    });
  }, [lang, ro, path]);

  const cliExample = "npx shadcn@latest add https://avyron.ro/r/buton-unda-refractie.json";
  const mcpExample = `{
  "registries": {
    "@avyron": "https://avyron.ro/r/{name}.json"
  }
}`;

  return (
    <div className="pb-16">
      <Section id="introducere" hue={265}>
        <SectionHead
          titleAs="h1"
          eyebrow={ro ? "Ghid" : "Guide"}
          title={ro ? "Introducere" : "Introduction"}
          lead={
            ro
              ? `Produsele Avyron sunt ${STATS.total} piese de interfață și integrări pe care le folosim în proiectele clienților noștri: componente React, secțiuni întregi, template-uri, efecte 3D, unelte și API-uri. ${STATS.free} sunt gratuite pentru conturile înregistrate.`
              : `Avyron Products are ${STATS.total} interface pieces and integrations we use in our own client projects: React components, whole sections, templates, 3D effects, tools and APIs. ${STATS.free} are free for registered accounts.`
          }
        />
        <Reveal>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { ro: ["1. Cauți", "Bara de căutare sau ⌘K găsește după nume, categorie și tehnologie, cu sau fără diacritice."], en: ["1. Search", "The search bar or ⌘K finds by name, category and technology, with or without diacritics."] },
              { ro: ["2. Încerci", "Demo-ul rulează în pagină, iar Editor Mode îți schimbă setările pe loc."], en: ["2. Try", "The demo runs on the page and Editor Mode changes the settings live."] },
              { ro: ["3. Iei codul", "CLI, cod, MCP sau prompt pentru asistentul tău AI — toate cu setările tale."], en: ["3. Take the code", "CLI, code, MCP or a prompt for your AI assistant — all with your settings."] },
            ].map((step, index) => (
              <div key={step.ro[0]} className="pa-glass rounded-2xl p-4" style={{ "--pa-hue": 265 + index * 20 } as never}>
                <p className="font-display text-sm font-bold text-foreground">{ro ? step.ro[0] : step.en[0]}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{ro ? step.ro[1] : step.en[1]}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <Seam />

      <Section id="de-ce" hue={200}>
        <SectionHead eyebrow={ro ? "Standarde" : "Standards"} title={ro ? "De ce Avyron Products" : "Why Avyron Products"} />
        <Reveal>
          <ul className="grid list-none gap-2 p-0 text-sm text-muted-foreground sm:grid-cols-2">
            {(ro
              ? [
                  "Fiecare produs are greutatea scrisă în kB și cerințele de GPU.",
                  "Efectele 3D au trepte de calitate și fallback static, verificate fără WebGL.",
                  "Contrast, focus vizibil și „mișcare redusă” sunt tratate din start.",
                  "Codul e TypeScript comentat, fără dependențe ascunse.",
                  "Ce preluăm din surse cu licență permisivă rămâne gratuit, cu atribuire.",
                  "Produsele intră singure în parteneriate: Studio azi, Pro în 60 de zile.",
                ]
              : [
                  "Every product states its weight in kB and its GPU needs.",
                  "3D effects have quality tiers and a static fallback, checked without WebGL.",
                  "Contrast, visible focus and reduced motion are handled from the start.",
                  "The code is commented TypeScript with no hidden dependencies.",
                  "Anything taken from permissively licensed sources stays free, with attribution.",
                  "Products enter plans on their own: Studio today, Pro in 60 days.",
                ]
            ).map((line) => (
              <li key={line} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <Seam />

      <Section id="licente" hue={150}>
        <SectionHead eyebrow={ro ? "Licență" : "Licence"} title={ro ? "Licențe și utilizare" : "Licence and use"} />
        <Reveal>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="pa-glass rounded-2xl p-4">
              <p className="font-display text-sm font-bold text-lime-300">{ro ? "Ai voie" : "You may"}</p>
              <ul className="mt-2 grid list-none gap-1.5 p-0 text-[13px] text-muted-foreground">
                {(ro
                  ? [
                      "Să folosești produsele în proiecte personale și comerciale, nelimitat.",
                      "Să le folosești în proiecte pentru clienți; clientul nu are nevoie de licență separată.",
                      "Să modifici codul cât vrei și să-l păstrezi în proiect după expirarea parteneriatului.",
                      "Să vinzi site-uri și produse finite construite cu ele.",
                    ]
                  : [
                      "Use the products in personal and commercial projects, without limit.",
                      "Use them in client projects; the client needs no separate licence.",
                      "Modify the code freely and keep it in the project after your plan ends.",
                      "Sell websites and finished products built with them.",
                    ]
                ).map((line) => (
                  <li key={line}>— {line}</li>
                ))}
              </ul>
            </div>
            <div className="pa-glass rounded-2xl p-4">
              <p className="font-display text-sm font-bold text-red-300">{ro ? "Nu ai voie" : "You may not"}</p>
              <ul className="mt-2 grid list-none gap-1.5 p-0 text-[13px] text-muted-foreground">
                {(ro
                  ? [
                      "Să revinzi sau să redistribui produsele ca atare, într-un kit sau pe un marketplace.",
                      "Să publici codul produselor plătite într-un depozit public.",
                      "Să dai acces la contul tău altor persoane (echipele au AVY Studio).",
                    ]
                  : [
                      "Resell or redistribute the products as such, in a kit or on a marketplace.",
                      "Publish the code of paid products in a public repository.",
                      "Share your account with other people (teams have AVY Studio).",
                    ]
                ).map((line) => (
                  <li key={line}>— {line}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {ro
              ? "Bibliotecile open-source folosite (Three.js, GSAP, Lenis și altele) păstrează licențele lor, menționate pe pagina fiecărui produs."
              : "The open-source libraries used (Three.js, GSAP, Lenis and others) keep their own licences, listed on each product page."}
          </p>
        </Reveal>
      </Section>

      <Seam />

      <Section id="instalare" hue={265}>
        <SectionHead eyebrow={ro ? "Instalare" : "Installation"} title={ro ? "Patru căi spre același fișier" : "Four ways to the same file"} />
        <Reveal>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="pa-glass rounded-2xl p-4">
              <p className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
                <Terminal className="size-4 text-brand" aria-hidden /> CLI
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {ro
                  ? "Registrul e compatibil cu CLI-ul shadcn, deci merge din bun, npm, pnpm sau yarn, fără să instalezi nimic global."
                  : "The registry is shadcn-CLI compatible, so it works from bun, npm, pnpm or yarn without installing anything globally."}
              </p>
              <pre className="pa-mono mt-2 overflow-x-auto rounded-xl border border-foreground/10 bg-black/40 p-3 text-[11.5px] text-foreground">{cliExample}</pre>
              <CopyButton value={cliExample} label={ro ? "Copiază" : "Copy"} copiedLabel={ro ? "Copiat" : "Copied"} className="mt-2 inline-flex rounded-full border border-foreground/15 px-3 py-1.5 text-[11.5px] font-semibold text-foreground" />
            </div>
            <div className="pa-glass rounded-2xl p-4">
              <p className="font-display text-sm font-bold text-foreground">MCP</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {ro
                  ? "Adaugi registrul în components.json și asistentul tău (Claude, Cursor, Copilot) cere produsele pe nume: @avyron/nume-produs."
                  : "Add the registry to components.json and your assistant (Claude, Cursor, Copilot) pulls products by name: @avyron/product-name."}
              </p>
              <pre className="pa-mono mt-2 overflow-x-auto rounded-xl border border-foreground/10 bg-black/40 p-3 text-[11.5px] text-foreground">{mcpExample}</pre>
              <CopyButton value={mcpExample} label={ro ? "Copiază" : "Copy"} copiedLabel={ro ? "Copiat" : "Copied"} className="mt-2 inline-flex rounded-full border border-foreground/15 px-3 py-1.5 text-[11.5px] font-semibold text-foreground" />
            </div>
          </div>
          <div className="pa-glass mt-3 rounded-2xl p-4">
            <p className="font-display text-sm font-bold text-foreground">{ro ? "Limitele zilnice, pe scurt" : "The daily limits, in short"}</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">{ro ? "Parteneriat" : "Partnership"}</th>
                    <th className="px-2 py-1.5 font-semibold">{ro ? "Componente" : "Components"}</th>
                    <th className="px-2 py-1.5 font-semibold">{ro ? "Secțiuni" : "Sections"}</th>
                    <th className="px-2 py-1.5 font-semibold">{ro ? "Template-uri" : "Templates"}</th>
                  </tr>
                </thead>
                <tbody>
                  {PLANS.map((plan) => (
                    <tr key={plan.id} className="border-t border-foreground/8">
                      <td className="px-2 py-1.5 text-foreground">{plan.name}</td>
                      <td className="pa-mono px-2 py-1.5 text-muted-foreground">{plan.limits.components}</td>
                      <td className="pa-mono px-2 py-1.5 text-muted-foreground">{plan.limits.sections}</td>
                      <td className="pa-mono px-2 py-1.5 text-muted-foreground">{plan.limits.templates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {ro
                ? "O copiere = prima obținere a unui produs într-o zi. Re-copierea aceluiași produs în aceeași zi nu consumă."
                : "One copy = the first time you get a product on a given day. Getting it again the same day doesn't count."}
            </p>
          </div>
        </Reveal>

        <Reveal index={1} className="mt-5 flex flex-wrap gap-2">
          <Link to={homePath(lang)} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white" data-ripple>
            {ro ? "Înapoi la produse" : "Back to the products"} <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link to={faqPath(lang)} className="inline-flex items-center rounded-full border border-foreground/15 px-4 py-2.5 text-sm font-semibold text-foreground" data-ripple>
            {ro ? "Întrebări frecvente" : "Frequently asked questions"}
          </Link>
        </Reveal>
      </Section>
    </div>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, Sparkles, Briefcase, Megaphone, Code2, Users2, Wallet, Wand2, Workflow } from "lucide-react";

type Doc = {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  icon: any;
  accent: string;
  body: React.ReactNode;
};

const DOCS: Doc[] = [
  {
    id: "d1",
    num: "01",
    title: "Întrebări inițiale client",
    subtitle: "Discovery briefing — ce întrebăm la primul contact",
    icon: Users2,
    accent: "from-blue-500/20 to-cyan-500/10",
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>Set de întrebări pe care le adresăm clientului în prima discuție pentru a aduna toate informațiile necesare unei oferte și unui prim mockup.</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Cu ce vă ocupați? (domeniu / nișă / piață țintă)</li>
          <li>Aveți deja un site sau prezență online? Link-uri.</li>
          <li>Ce vă doriți de la noul site / aplicație? (vânzări, prezentare, programări, lead-uri)</li>
          <li>Aveți identitate vizuală? (logo, culori, fonturi) sau o creăm noi?</li>
          <li>Aveți texte și poze pregătite sau le generăm/redactăm noi?</li>
          <li>Câte pagini / secțiuni estimați?</li>
          <li>Buget estimat și termen dorit pentru lansare.</li>
          <li>Aveți concurenți / site-uri care vă plac ca model?</li>
          <li>Doriți integrări speciale? (plăți, curieri, AI chat, programări, newsletter)</li>
          <li>Cine va administra ulterior site-ul — voi sau noi (mentenanță)?</li>
        </ol>
      </div>
    ),
  },
  {
    id: "d2",
    num: "02",
    title: "Informații generale Avyron",
    subtitle: "Pitch deck intern — ce suntem și cum vorbim despre noi",
    icon: Briefcase,
    accent: "from-amber-500/20 to-orange-500/10",
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p><strong>Avyron Tech</strong> este un studio digital românesc care construiește site-uri, aplicații și ecosisteme online complete pentru afaceri mici și medii.</p>
        <p><strong>Ce facem:</strong> design UI/UX, dezvoltare web (React, Lovable, Supabase), integrări AI, e-commerce, SEO, administrare cont-uri, marketing pentru rețele sociale.</p>
        <p><strong>Diferențiator:</strong> livrăm rapid (sub-domenii temporare în Cloudflare pentru testare în timp real), oferim mentenanță continuă, și putem prelua complet administrarea tehnică (Cloudflare, Supabase, Vercel, Hostico).</p>
        <p><strong>Ton:</strong> tech-confident, prietenos, orientat pe rezultate. Vorbim clar, nu folosim jargon inutil.</p>
        <p><strong>Contact:</strong> contact@avyron.ro · avyron.ro</p>
      </div>
    ),
  },
  {
    id: "d3",
    num: "03",
    title: "Modele marketing",
    subtitle: "Metode 1–4 pentru achiziție clienți",
    icon: Megaphone,
    accent: "from-pink-500/20 to-rose-500/10",
    body: (
      <div className="space-y-4 text-sm leading-relaxed">
        <p>Conversațiile cu clienții pot avea loc pe orice cont Avyron. În discuții urmărim:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>transmitere clară și informare completă, la obiect;</li>
          <li>aflarea nevoilor clientului, tipul de activitate și dorințele de la site;</li>
          <li>comunicarea intervalului de preț și a timpului după consultare cu un developer;</li>
          <li>accent pe avantajele aduse de site în activitatea sa.</li>
        </ul>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="font-medium">Metoda 1</p>
          <p>1–2–3 SS de pe profilul FB/Insta al clientului cu activitatea/afacerea + creare imagine vizuală a website-ului în ChatGPT/Gemini + prim mesaj/propunere către client despre oportunitatea de a-i crea o identitate completă online pentru a fi mai vizibil.</p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="font-medium">Metoda 2</p>
          <p>Mesaj universal dar personalizabil trimis mai multor potențiali clienți din aceeași nișă.</p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="font-medium">Metoda 3</p>
          <p>E-mail către firmele care nu au un site.</p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="font-medium">Metoda 4</p>
          <p>Sondaje pe story-urile postate pe rețelele de socializare cu răspunsuri relevante.</p>
        </div>
      </div>
    ),
  },
  {
    id: "d4",
    num: "04",
    title: "Creare Website prompt",
    subtitle: "Ghid creare site în Lovable — proces standard",
    icon: Code2,
    accent: "from-emerald-500/20 to-teal-500/10",
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p><strong>Ghid creare site în Lovable.</strong></p>
        <p>După identificarea nevoilor clientului și notarea într-un fișier text a informațiilor și resurselor oferite (imagini sau video) ori create cu AI, se face o descriere completă a site-ului în Lovable și completarea detaliilor cerute. Inițial se aleg cât mai multe integrări vizuale; backend-ul vine mai târziu.</p>
        <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-3">
          <p className="font-medium">Regula domeniului</p>
          <p>Domeniul <code className="px-1 py-0.5 rounded bg-background">.lovable</code> <u>nu se distribuie niciodată</u> clientului. Se creează un subdomeniu temporar în Cloudflare și se conectează la Lovable, astfel încât clientul să poată vedea și testa în timp real și să propună modificări.</p>
        </div>
        <p className="text-muted-foreground italic">Tip: pentru proiecte mai mari, mai întâi blochezi paleta de culori și tipografia în briefing, apoi te bazezi pe componente shadcn refolosibile pentru consistență.</p>
      </div>
    ),
  },
  {
    id: "d5",
    num: "05",
    title: "Conturi",
    subtitle: "Acces și administrare cont-uri tehnice",
    icon: Users2,
    accent: "from-violet-500/20 to-purple-500/10",
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>Pentru fiecare client putem prelua administrarea completă a 4 conturi tehnice:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Cloudflare</strong> — DNS, subdomenii, SSL, protecție bot.</li>
          <li><strong>Supabase / Lovable Cloud</strong> — bază de date, autentificare, storage.</li>
          <li><strong>Vercel</strong> — hosting, deploy automat, monitoring.</li>
          <li><strong>Hostico</strong> — domeniu .ro, email-uri profesionale, redirect-uri.</li>
        </ul>
        <p>Toate parolele se țin în vault-ul intern. Niciun cont nu se transferă către client fără cerere scrisă și predare oficială.</p>
      </div>
    ),
  },
  {
    id: "d6",
    num: "06",
    title: "Prețuri și costuri",
    subtitle: "Estimare costuri pentru comunicarea inițială",
    icon: Wallet,
    accent: "from-yellow-500/20 to-amber-500/10",
    body: (
      <div className="space-y-4 text-sm leading-relaxed">
        <p className="text-muted-foreground italic">Costurile sunt orientative și estimative pentru comunicarea inițială cu clientul; pot fi făcute reduceri.</p>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="font-medium">Site prezentare light — 1500 lei</p>
          <p>Include: cod website, design, descrieri (dacă e necesar), logo (dacă e necesar), optimizare, indexare SEO performantă, securizare, bază de date, 1–3 pagini (în afara celor minime — cookies/politici, 3–6 subsecțiuni), design personalizat, butoane interactive la apăsare, butoane WhatsApp/telefon/Messenger integrate pe ecran, formular de contact.</p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="font-medium">Site prezentare Pro — 1500–3000 lei</p>
          <p>Tot din light + 1–5 pagini, animații 3D, chat AI, FAQ interactiv, integrare programări, e-mailuri automate, notificări interactive, chestionare, alte improvements.</p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="font-medium">Site de vânzări (mic / mediu) — 2000–5000 lei</p>
          <p>Include: 5–15 pagini, liste de produse, categorii, filtre inteligente, sistem promoții, panou Dashboard admin avansat cu diverse instrumente și statistici, integrare servicii plăți, curieri, ramburs, plăți online. Include: restaurante, magazine online de vânzări.</p>
        </div>

        <div className="rounded-lg border bg-card p-3 space-y-1.5">
          <p className="font-medium">Costuri servicii / integrări</p>
          <ul className="space-y-1 font-mono text-xs">
            <li>AI chat Flowbotic — <strong>500 lei</strong> implem. / <strong>1000 lei</strong> lunar</li>
            <li>Amazon AI chat — <strong>2000 lei</strong> implem. / <strong>50 lei</strong> lunar</li>
            <li>Servicii plăți online — <strong>1000 lei</strong></li>
            <li>Servicii curieri — <strong>1000 lei</strong></li>
            <li>Prezentare prima pagină 3D — <strong>500–1500 lei</strong></li>
            <li>Logo Dinamic Special — <strong>500–1500 lei</strong></li>
            <li>Mai mult de 5 pagini — <strong>100–500 lei / pagină</strong></li>
            <li>Creare 4 conturi admin complet (Cloudflare, Supabase, Vercel, Hostico) — <strong>500 lei</strong></li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "d7",
    num: "07",
    title: "Prompt General Avyron",
    subtitle: "ADN-ul vizual și de produs — citește înainte de orice site",
    icon: Wand2,
    accent: "from-violet-500/25 to-fuchsia-500/10",
    body: (
      <div className="space-y-4 text-sm leading-relaxed">
        <p>Avyron este o echipă care produce produse digitale — în special website-uri. Accent mare pe <strong>performanță</strong>, <strong>fluiditate</strong>, <strong>intuitivitate</strong> și <strong>viteză de încărcare</strong>. Scroll foarte fluid.</p>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="font-medium">Identitate vizuală</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Paleta logo — <strong>violet, mov</strong>.</li>
            <li>Inspirație design — Cursor / Revolut / Uber / Apple / nVidia: tech, modern, minimalist (pot fi incluse și alte stiluri unde se potrivesc).</li>
            <li><strong>Liquid glass</strong> de integrat în special la sidebar-ul de sus.</li>
            <li><code className="px-1 py-0.5 rounded bg-background">getdesign.md</code> = sursă bună de inspirație.</li>
            <li>Font principal: <strong>Times New Roman</strong>, dar și altele în funcție de secțiune.</li>
            <li>Contrast corespunzător pe orice secțiune — totul trebuie să fie lizibil în light & dark.</li>
          </ul>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="font-medium">Conținut & SEO</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>SEO optimizat pentru orice descriere / secțiune.</li>
            <li>Unde e cazul → descrieri generate cu AI sau hint-uri relevante dacă nu sunt oferite de client.</li>
            <li>Mesaje prestabilite personalizate în funcție de secțiune / rol.</li>
            <li>Logo-ul Avyron în subsol — minimalist, „Powered by / Descoperă-ne" cu buton către <strong>avyron.ro</strong>.</li>
            <li>Stilul nostru: modern, friendly, orientat spre <strong>conversia vizitelor în comenzi</strong>.</li>
          </ul>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
          <p className="font-medium">Efecte & micro-interacțiuni</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cursor premium — magnetic, glow, blur, trail discret (fără a afecta fluiditatea).</li>
            <li>Glassmorphism real + blur dinamic.</li>
            <li>Card-urile reacționează la mouse / light movement (nu doar blur static), unde e relevant.</li>
            <li>Micro-animații la hover · butoane, iconițe, carduri care „respiră" fin, fără aglomerare.</li>
            <li>Scroll reveal inteligent (parțial sau deloc, după caz).</li>
            <li>Text gradient animat — în special pe headline-urile hero.</li>
            <li>Progress scroll bar premium — doar unde e relevant.</li>
            <li>Sound design subtil — <strong>întreabă înainte</strong> de implementare.</li>
            <li>AI generated illustrations / 3D blobs — fără să încetinească site-ul.</li>
            <li>Background dinamic subtil (gradient animat, aurora, particles, noise layer) — nu wallpaper static.</li>
            <li>Tranziții fluide, premium, la schimbarea paginilor.</li>
          </ul>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="font-medium">Integrări & secțiuni speciale</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Google Maps — unde afacerea are locație fizică.</li>
            <li>Formulare premium (când se cer) — <strong>NU</strong> formulare clasice urâte. Folosim: step by step, progress, animații, iconuri.</li>
            <li>Before / after — pentru clinici, detailing, beauty, construcții.</li>
            <li>Spacing optimizat în toată aplicația.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "d8",
    num: "08",
    title: "Setup workflow",
    subtitle: "Stack-ul intern Avyron — tools, librării, comenzi de instalare",
    icon: Workflow,
    accent: "from-cyan-500/25 to-blue-500/10",
    body: (
      <div className="space-y-4 text-sm leading-relaxed">
        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="font-medium">Platforme & infrastructură</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Lovable / Claude / Cursor</strong> — workflow AI complet.</li>
            <li><strong>Lovable</strong> — MVP rapid, landing-uri.</li>
            <li><strong>Atom</strong> — supliment la Lovable.</li>
            <li><strong>Claude</strong> — baza pentru proiecte mari.</li>
            <li><strong>Supabase</strong> — bază de date.</li>
            <li><strong>Cloudflare</strong> — DNS și deploy.</li>
            <li><strong>Hostico</strong> — domenii .ro.</li>
            <li><strong>GitHub</strong> — hub proiect / push.</li>
          </ul>
        </div>

        <div className="rounded-lg border bg-card p-3 space-y-2">
          <p className="font-medium">Librării de instalat</p>
          <div className="space-y-2 font-mono text-xs">
            <div>
              <p className="text-muted-foreground"># Lenis — scroll fluid cinematic / luxury</p>
              <code className="block px-2 py-1 rounded bg-background">npm install lenis</code>
            </div>
            <div>
              <p className="text-muted-foreground"># GSAP — parallax, reveal text, tranziții, mouse effects</p>
              <code className="block px-2 py-1 rounded bg-background">npm install gsap</code>
            </div>
            <div>
              <p className="text-muted-foreground"># Motion (Framer Motion) — hover, page transitions, cards, micro-interacțiuni</p>
              <code className="block px-2 py-1 rounded bg-background">npm install motion</code>
            </div>
            <div>
              <p className="text-muted-foreground"># Three.js</p>
              <code className="block px-2 py-1 rounded bg-background">npm install three</code>
            </div>
            <div>
              <p className="text-muted-foreground"># tsParticles React</p>
              <code className="block px-2 py-1 rounded bg-background">npm install @tsparticles/react tsparticles tsparticles-slim</code>
            </div>
            <div>
              <p className="text-muted-foreground"># Vanta.js</p>
              <code className="block px-2 py-1 rounded bg-background">npm install vanta three</code>
            </div>
            <div>
              <p className="text-muted-foreground"># React Bits</p>
              <code className="block px-2 py-1 rounded bg-background">npm install reactbits</code>
            </div>
            <div>
              <p className="text-muted-foreground"># Magic UI (via shadcn)</p>
              <code className="block px-2 py-1 rounded bg-background">npx shadcn@latest init</code>
              <code className="block px-2 py-1 rounded bg-background mt-1">npx shadcn@latest add "https://magicui.design/r/components/all.json"</code>
            </div>
            <div>
              <p className="text-muted-foreground"># Spline React</p>
              <code className="block px-2 py-1 rounded bg-background">npm install @splinetool/react-spline</code>
            </div>
            <div>
              <p className="text-muted-foreground"># React Three Fiber (recomandat cu Three.js)</p>
              <code className="block px-2 py-1 rounded bg-background">npm install @react-three/fiber @react-three/drei</code>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground italic text-xs">Tip: instalează doar ce e nevoie pentru proiectul curent — bundle-ul rămâne mic, site-ul rămâne rapid.</p>
      </div>
    ),
  },
];

export const StaffResourcesTab = () => {
  const [open, setOpen] = useState<Doc | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <p className="text-sm text-muted-foreground">Documente interne — apasă pentru a deschide.</p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {DOCS.map(d => {
          const Icon = d.icon;
          return (
            <button
              key={d.id}
              onClick={() => setOpen(d)}
              className={`group relative overflow-hidden text-left rounded-xl border bg-gradient-to-br ${d.accent} p-4 hover:border-primary/60 hover:shadow-md transition-all`}
            >
              <div className="absolute top-2 right-3 font-mono text-[10px] tracking-widest text-muted-foreground/70">DOC · {d.num}</div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-background/70 backdrop-blur p-2 ring-1 ring-border">
                  <Icon className="size-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0 pr-12">
                  <h3 className="font-medium leading-snug">Document {d.num} — {d.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.subtitle}</p>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground group-hover:text-primary transition">
                <FileText className="size-3" />open ↗
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden flex flex-col p-0">
          {open && (
            <>
              {/* Mini windows-style title bar */}
              <div className="flex items-center gap-2 border-b bg-muted/60 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <span className="size-3 rounded-full bg-red-500/80" />
                  <span className="size-3 rounded-full bg-yellow-500/80" />
                  <span className="size-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 text-center font-mono text-xs text-muted-foreground truncate">
                  document-{open.num}-{open.title.toLowerCase().replace(/\s+/g, "-")}.txt
                </div>
                <div className="w-12" />
              </div>

              <div className="overflow-y-auto px-6 py-5">
                <DialogHeader className="mb-4">
                  <DialogTitle className="flex items-center gap-2">
                    <open.icon className="size-5 text-primary" />
                    Document {open.num} — {open.title}
                  </DialogTitle>
                  <DialogDescription>{open.subtitle}</DialogDescription>
                </DialogHeader>

                {open.body}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

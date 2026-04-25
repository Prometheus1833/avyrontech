import { Calendar, Phone, MapPin, Star, Download, FileText, ShoppingBag, Wallet, ScanLine, Sparkles, Clock, Mail, MessageCircle, ChevronRight, Menu, Search, Shield, Award, Users, Utensils, Bed, Wrench, Scale, Building2, Wifi, Coffee, Car, Heart, Gift, Megaphone, ArrowRight } from "lucide-react";
import salon from "@/assets/work-beauty-flawless.jpg";
import resto from "@/assets/work-restaurant-new.jpg";
import lawyer from "@/assets/work-lawyer-new.jpg";
import hotel from "@/assets/work-hotel-new.jpg";
import local from "@/assets/work-local-new.jpg";
import publicImg from "@/assets/work-public-miago.jpg";
import retuvoLogo from "@/assets/retuvo-logo.png";

/* Browser frame wrapper — every mockup is a "real" homepage rendered inside it. */
const Frame = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <div className="w-full h-full bg-card flex flex-col">
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border/60 bg-muted/40 shrink-0">
      <span className="size-1.5 rounded-full bg-red-400" />
      <span className="size-1.5 rounded-full bg-yellow-400" />
      <span className="size-1.5 rounded-full bg-green-400" />
      <div className="ml-1.5 flex-1 flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5">
        <span className="text-[7px] text-muted-foreground/60">🔒</span>
        <span className="text-[7px] font-mono text-muted-foreground truncate">{url}</span>
      </div>
    </div>
    <div className="flex-1 overflow-hidden text-[8px] leading-tight bg-background">{children}</div>
  </div>
);

const Nav = ({ logo, name, items, accent }: { logo: React.ReactNode; name: string; items: string[]; accent: string }) => (
  <div className="flex items-center justify-between px-2 py-1 border-b border-border/40 bg-card/80 backdrop-blur">
    <div className="flex items-center gap-1">
      <div className={`size-3.5 rounded grid place-items-center ${accent}`}>{logo}</div>
      <span className="font-display font-bold text-[8px]">{name}</span>
    </div>
    <div className="hidden xs:flex items-center gap-1.5 text-[6.5px] text-muted-foreground">
      {items.map((i) => <span key={i}>{i}</span>)}
    </div>
    <Menu className="size-2.5 text-muted-foreground" />
  </div>
);

/* ------------------------------- BEAUTY --------------------------------- */
export const BeautyMockup = () => (
  <Frame url="lumina-beauty.ro">
    <div className="h-full overflow-hidden flex flex-col">
      <Nav
        accent="bg-pink-500 text-white"
        logo={<Sparkles className="size-2" />}
        name="Lumina Beauty"
        items={["Servicii", "Echipă", "Galerie", "Programări"]}
      />
      {/* Hero with image */}
      <div className="relative h-14 overflow-hidden">
        <img src={salon} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="relative h-full px-2 flex flex-col justify-center text-white max-w-[60%]">
          <span className="text-[6px] uppercase tracking-widest opacity-80">Salon & SPA · București</span>
          <div className="font-display font-bold text-[11px] leading-tight">Frumusețea ta, redefinită.</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="bg-pink-500 text-white rounded px-1 py-0.5 text-[6.5px] font-bold flex items-center gap-0.5">
              <Calendar className="size-1.5" /> Programează
            </span>
            <span className="text-[6.5px] flex items-center gap-0.5"><Star className="size-1.5 text-yellow-300 fill-yellow-300" /> 4.9 · 312</span>
          </div>
        </div>
      </div>
      {/* Services grid */}
      <div className="px-2 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] font-bold uppercase tracking-wider text-foreground/60">Servicii populare</span>
          <span className="text-[6.5px] text-pink-500">vezi toate →</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[["Manichiură", "120"], ["Facial", "240"], ["Coafură", "90"]].map(([s, p]) => (
            <div key={s} className="rounded border border-border/50 p-1 bg-card">
              <div className="size-3 rounded-full bg-pink-500/15 grid place-items-center mb-0.5"><Heart className="size-1.5 text-pink-500" /></div>
              <div className="text-[7px] font-semibold leading-none">{s}</div>
              <div className="text-[6.5px] text-pink-500 font-bold mt-0.5">{p} lei</div>
            </div>
          ))}
        </div>
      </div>
      {/* Quiz + voucher banner */}
      <div className="px-2 mt-auto pb-1.5 grid grid-cols-2 gap-1">
        <div className="rounded bg-pink-500/10 border border-pink-500/30 p-1">
          <div className="text-[6.5px] font-bold text-pink-600 flex items-center gap-0.5"><Sparkles className="size-1.5" /> Quiz</div>
          <div className="text-[6.5px] text-foreground/70 leading-tight">Ce tratament ți se potrivește?</div>
        </div>
        <div className="rounded bg-foreground text-background p-1">
          <div className="text-[6.5px] font-bold flex items-center gap-0.5"><Gift className="size-1.5" /> Voucher cadou</div>
          <div className="text-[6.5px] opacity-80">de la 100 lei</div>
        </div>
      </div>
    </div>
  </Frame>
);

/* ------------------------------- RESTO ---------------------------------- */
export const RestoMockup = () => (
  <Frame url="bistro-aroma.ro">
    <div className="h-full flex flex-col">
      <Nav
        accent="bg-amber-600 text-white"
        logo={<Utensils className="size-2" />}
        name="Bistro Aroma"
        items={["Meniu", "Rezervări", "Despre", "Contact"]}
      />
      <div className="relative h-12 overflow-hidden">
        <img src={resto} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="relative h-full px-2 flex flex-col justify-end pb-1 text-white">
          <div className="text-[6px] uppercase tracking-widest opacity-70">Bucătărie de autor · București</div>
          <div className="font-display font-bold text-[10px] leading-tight">Aromă, atmosferă, autenticitate.</div>
        </div>
      </div>
      {/* Daily menu hero card */}
      <div className="px-2 py-1.5">
        <div className="rounded-md border border-amber-600/40 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/40 dark:to-amber-900/20 p-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[6.5px] font-bold uppercase tracking-wider text-amber-700">Meniul zilei</span>
            <span className="bg-amber-600 text-white rounded px-1 py-0.5 text-[6.5px] font-bold">-20%</span>
          </div>
          <div className="text-[8px] font-semibold leading-tight">Ciorbă de burtă · Mușchi de vită · Tort de ciocolată</div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[6.5px] text-muted-foreground flex items-center gap-0.5"><Clock className="size-1.5" /> 12:00–16:00</span>
            <span className="text-[8px] font-bold text-amber-700">45 lei</span>
          </div>
        </div>
      </div>
      {/* CTA grid */}
      <div className="px-2 grid grid-cols-2 gap-1 mb-1">
        <button className="bg-foreground text-background rounded py-1 text-[7px] font-semibold flex items-center justify-center gap-0.5">
          <Calendar className="size-1.5" /> Rezervă masă
        </button>
        <button className="border border-border rounded py-1 text-[7px] font-semibold flex items-center justify-center gap-0.5">
          <Utensils className="size-1.5" /> Vezi meniul
        </button>
      </div>
      {/* Delivery partners */}
      <div className="px-2 mt-auto pb-1.5">
        <div className="text-[6px] uppercase tracking-wider text-muted-foreground mb-0.5">Comandă online</div>
        <div className="flex gap-1">
          {[["Glovo", "bg-yellow-400 text-black"], ["Tazz", "bg-pink-500 text-white"], ["Bolt", "bg-emerald-500 text-white"]].map(([n, c]) => (
            <span key={n} className={`rounded px-1.5 py-0.5 text-[6.5px] font-bold ${c}`}>{n}</span>
          ))}
          <span className="ml-auto text-[6.5px] flex items-center gap-0.5 text-emerald-600"><MessageCircle className="size-1.5" /> WhatsApp</span>
        </div>
      </div>
    </div>
  </Frame>
);

/* ------------------------------- PUBLIC --------------------------------- */
export const PublicMockup = () => (
  <Frame url="primaria-orasului.ro">
    <div className="h-full flex flex-col">
      {/* Official top bar */}
      <div className="bg-blue-900 text-white px-2 py-0.5 flex items-center justify-between text-[6px]">
        <span className="flex items-center gap-1"><Shield className="size-1.5" /> Site oficial · gov.ro</span>
        <span>RO · EN · Accesibilitate ♿</span>
      </div>
      <Nav
        accent="bg-blue-700 text-white"
        logo={<Building2 className="size-2" />}
        name="Primăria Orașului"
        items={["Despre", "Servicii", "Documente", "Anunțuri", "Investiții"]}
      />
      {/* Search hero */}
      <div className="relative bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/40 dark:to-blue-900/20 px-2 py-1.5">
        <div className="text-[7px] font-bold text-blue-900 dark:text-blue-200">Servicii pentru cetățean</div>
        <div className="text-[6.5px] text-muted-foreground">Caută documente, programări, anunțuri</div>
        <div className="mt-1 flex items-center gap-1 bg-card rounded border border-border px-1 py-0.5">
          <Search className="size-2 text-muted-foreground" />
          <span className="text-[6.5px] text-muted-foreground">ex: certificat urbanism</span>
        </div>
      </div>
      {/* Quick actions */}
      <div className="px-2 py-1 grid grid-cols-3 gap-1">
        {[["Programări", Calendar], ["Documente", FileText], ["Plăți", Wallet]].map(([l, I]: any) => (
          <div key={l} className="rounded border border-border/50 p-1 text-center">
            <I className="size-2 text-blue-700 mx-auto mb-0.5" />
            <div className="text-[6.5px] font-semibold">{l}</div>
          </div>
        ))}
      </div>
      {/* Announcements */}
      <div className="px-2 mt-auto pb-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[6.5px] font-bold uppercase tracking-wider text-foreground/60 flex items-center gap-0.5"><Megaphone className="size-1.5" /> Anunțuri</span>
          <span className="text-[6px] text-blue-700">toate →</span>
        </div>
        <div className="space-y-0.5">
          {[["Buget local 2025 aprobat", "azi"], ["Licitație lucrări parc central", "ieri"], ["Program audiențe primar", "2 zile"]].map(([a, d]) => (
            <div key={a} className="flex items-center justify-between px-1 py-0.5 rounded bg-secondary/40 text-[6.5px]">
              <span className="flex items-center gap-0.5 truncate"><ChevronRight className="size-1.5 text-blue-700 shrink-0" /> {a}</span>
              <span className="text-muted-foreground shrink-0">{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Frame>
);

/* ------------------------------- TURISM --------------------------------- */
export const TurismMockup = () => (
  <Frame url="pensiunea-bradet.ro">
    <div className="h-full flex flex-col">
      <Nav
        accent="bg-emerald-700 text-white"
        logo={<Bed className="size-2" />}
        name="Pensiunea Brădet"
        items={["Camere", "Experiențe", "Galerie", "Rezervări"]}
      />
      <div className="relative h-14 overflow-hidden">
        <img src={hotel} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
        <div className="absolute top-1 left-1.5 bg-white/95 text-foreground rounded px-1 py-0.5 text-[6.5px] font-bold flex items-center gap-0.5">
          <Star className="size-1.5 text-yellow-500 fill-yellow-500" /> 4.8 · 213 recenzii
        </div>
        {/* Booking widget overlay */}
        <div className="absolute bottom-1 left-1.5 right-1.5 rounded-md bg-card/95 backdrop-blur p-1 grid grid-cols-4 gap-1 items-center">
          <div className="text-[6px]"><div className="text-muted-foreground">Check-in</div><div className="font-semibold">12 mai</div></div>
          <div className="text-[6px]"><div className="text-muted-foreground">Check-out</div><div className="font-semibold">15 mai</div></div>
          <div className="text-[6px]"><div className="text-muted-foreground">Oaspeți</div><div className="font-semibold">2 adulți</div></div>
          <button className="bg-emerald-700 text-white rounded py-1 text-[7px] font-bold">Caută</button>
        </div>
      </div>
      {/* Room card */}
      <div className="px-2 py-1.5">
        <div className="rounded border border-border/60 p-1.5 flex items-center gap-1.5">
          <div className="size-8 rounded bg-emerald-700/15 grid place-items-center shrink-0"><Bed className="size-3 text-emerald-700" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-[7.5px] font-semibold leading-tight">Cameră Dublă Deluxe</div>
            <div className="text-[6.5px] text-muted-foreground flex items-center gap-1.5">
              <span className="flex items-center gap-0.5"><Wifi className="size-1.5" /> Wi-Fi</span>
              <span className="flex items-center gap-0.5"><Coffee className="size-1.5" /> Mic dejun</span>
              <span className="flex items-center gap-0.5"><Car className="size-1.5" /> Parcare</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[6px] text-muted-foreground">de la</div>
            <div className="font-bold text-[9px] text-emerald-700 leading-none">320 lei</div>
            <div className="text-[6px] text-muted-foreground">/noapte</div>
          </div>
        </div>
      </div>
      <div className="px-2 mt-auto pb-1.5 grid grid-cols-3 gap-1 text-center">
        {[["Drumeții", "🥾"], ["SPA", "💆"], ["Tradițional", "🍲"]].map(([t, e]) => (
          <div key={t} className="bg-emerald-700/10 rounded py-1">
            <div className="text-[8px]">{e}</div>
            <div className="text-[6.5px] font-semibold text-emerald-800 dark:text-emerald-300">{t}</div>
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

/* --------------------------------- PRO ---------------------------------- */
export const ProMockup = () => (
  <Frame url="cabinet-ionescu.ro">
    <div className="h-full flex flex-col">
      <Nav
        accent="bg-slate-800 text-white"
        logo={<Scale className="size-2" />}
        name="Cabinet Ionescu"
        items={["Despre", "Practică", "Echipă", "Contact"]}
      />
      {/* Hero with portrait */}
      <div className="relative px-2 py-1.5 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900/60 dark:to-slate-900/20">
        <div className="flex items-start gap-1.5">
          <img src={lawyer} alt="" className="size-10 rounded-full object-cover border-2 border-white shadow-sm" />
          <div className="flex-1 min-w-0">
            <div className="text-[6px] uppercase tracking-widest text-slate-500">Cabinet de avocatură</div>
            <div className="font-display font-bold text-[10px] leading-tight">Av. Maria Ionescu</div>
            <div className="text-[6.5px] text-muted-foreground">Drept civil, comercial & familie · 12 ani experiență</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[6px] flex items-center gap-0.5 text-slate-700 dark:text-slate-300"><Award className="size-1.5" /> Baroul București</span>
            </div>
          </div>
        </div>
      </div>
      {/* Practice areas */}
      <div className="px-2 py-1">
        <div className="text-[6.5px] font-bold uppercase tracking-wider text-foreground/60 mb-0.5">Arii de practică</div>
        <div className="grid grid-cols-4 gap-0.5">
          {["Civil", "Comercial", "Familie", "Imobiliar"].map((x) => (
            <div key={x} className="px-1 py-0.5 rounded bg-secondary/60 text-[6.5px] text-center font-medium">{x}</div>
          ))}
        </div>
      </div>
      {/* CTA + contact + docs */}
      <div className="px-2 mt-auto pb-1.5 space-y-1">
        <button className="w-full bg-slate-800 text-white rounded py-1 text-[7.5px] font-bold flex items-center justify-center gap-0.5">
          <Calendar className="size-2" /> Programează o consultație
        </button>
        <div className="flex items-center justify-between text-[6.5px] bg-secondary/40 rounded px-1.5 py-0.5">
          <span className="flex items-center gap-0.5"><FileText className="size-1.5 text-slate-700" /> Procură-tip notarială</span>
          <Download className="size-1.5 text-slate-700" />
        </div>
        <div className="flex items-center justify-around pt-0.5 border-t border-border/40 text-[6.5px]">
          <span className="flex items-center gap-0.5"><Phone className="size-1.5 text-slate-700" /> Apel</span>
          <span className="flex items-center gap-0.5"><MessageCircle className="size-1.5 text-slate-700" /> WhatsApp</span>
          <span className="flex items-center gap-0.5"><Mail className="size-1.5 text-slate-700" /> Email</span>
          <span className="flex items-center gap-0.5"><MapPin className="size-1.5 text-slate-700" /> Maps</span>
        </div>
      </div>
    </div>
  </Frame>
);

/* -------------------------------- LOCAL --------------------------------- */
export const LocalMockup = () => (
  <Frame url="instalatii-rapide.ro">
    <div className="h-full flex flex-col">
      <Nav
        accent="bg-orange-600 text-white"
        logo={<Wrench className="size-2" />}
        name="Instalații Rapide"
        items={["Servicii", "Tarife", "Lucrări", "Contact"]}
      />
      <div className="relative h-12 overflow-hidden">
        <img src={local} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 to-black/30" />
        <div className="relative h-full px-2 flex flex-col justify-center text-white max-w-[60%]">
          <div className="text-[6px] uppercase tracking-widest opacity-80 flex items-center gap-0.5"><Clock className="size-1.5" /> Non-stop · răspuns 15 min</div>
          <div className="font-display font-bold text-[10px] leading-tight">Reparații instalații, fără bătăi de cap.</div>
        </div>
      </div>
      {/* Big call CTA */}
      <div className="px-2 py-1.5">
        <a href="#" className="block w-full bg-orange-600 text-white rounded-md py-1.5 font-bold flex items-center justify-center gap-1 text-[10px] shadow-sm">
          <Phone className="size-2.5" /> 0722 123 456
        </a>
      </div>
      {/* Quote form */}
      <div className="px-2">
        <div className="text-[6.5px] font-bold uppercase tracking-wider text-foreground/60 mb-0.5">Cerere ofertă în 30 sec</div>
        <div className="grid grid-cols-2 gap-1 mb-1">
          <div className="px-1 py-0.5 rounded border border-border text-muted-foreground text-[6.5px]">Tip lucrare</div>
          <div className="px-1 py-0.5 rounded border border-border text-muted-foreground text-[6.5px]">Urgență</div>
          <div className="col-span-2 px-1 py-0.5 rounded border border-border text-muted-foreground text-[6.5px]">Adresa & detalii</div>
        </div>
        <button className="w-full bg-foreground text-background rounded py-0.5 font-semibold text-[7px]">Trimite cerere</button>
      </div>
      {/* Calc + coverage */}
      <div className="px-2 mt-auto pb-1.5 grid grid-cols-2 gap-1">
        <div className="rounded bg-orange-600/10 border border-orange-600/30 p-1">
          <div className="text-[6px] uppercase font-bold text-orange-700">Calculator preț</div>
          <div className="text-[7.5px] font-bold">~ 250 lei</div>
        </div>
        <div className="rounded bg-secondary/60 p-1 flex items-center gap-1">
          <MapPin className="size-2 text-orange-600" />
          <div className="text-[6.5px] leading-tight">Acoperire zona metropolitană</div>
        </div>
      </div>
    </div>
  </Frame>
);

/* ------------------------------ NATIONAL (RETUVO — păstrat) ------------- */
export const NationalMockup = () => (
  <Frame url="retuvo.ro · app">
    <div className="h-full flex flex-col p-2">
      <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-border/60">
        <img src={retuvoLogo} alt="" className="size-6 object-contain" />
        <div>
          <div className="font-display font-bold text-[10px] leading-none">Retuvo</div>
          <div className="text-[8px] text-muted-foreground">Recuperează garanția SGR</div>
        </div>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-brand to-brand/70 text-background p-2 mb-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[8px] uppercase opacity-80 flex items-center gap-0.5"><Wallet className="size-2.5" /> Wallet</span>
          <span className="text-[8px] opacity-80">disponibil</span>
        </div>
        <div className="font-bold text-[16px] leading-tight mt-0.5">24,50 RON</div>
        <div className="text-[8px] opacity-80">49 recipiente returnate</div>
      </div>
      <button className="w-full bg-foreground text-background rounded-md py-1.5 font-semibold flex items-center justify-center gap-1 mb-1.5 text-[9px]">
        <ScanLine className="size-2.5" /> Scanează cod de bare
      </button>
      <div className="text-[9px] font-bold mb-1 text-foreground/70 uppercase">Puncte colectare</div>
      <div className="space-y-0.5">
        {[["Kaufland Berceni", "0.3 km"], ["Lidl Vitan", "1.1 km"]].map(([n, d]) => (
          <div key={n} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-secondary/60 text-[9px]">
            <span className="flex items-center gap-1"><MapPin className="size-2 text-brand" /> {n}</span>
            <span className="text-muted-foreground">{d}</span>
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

/* -------------------------------- OTHER --------------------------------- */
export const OtherMockup = () => (
  <Frame url="proiectul-tau.avyron.ro">
    <div className="h-full flex flex-col">
      <Nav
        accent="bg-gradient-to-br from-brand to-brand/60 text-background"
        logo={<Sparkles className="size-2" />}
        name="Avyron Studio"
        items={["Servicii", "Proces", "Lucrări", "Contact"]}
      />
      <div className="relative px-2 py-2 bg-gradient-to-br from-brand/15 via-background to-background flex-1 flex flex-col">
        <div className="text-[6px] uppercase tracking-widest text-brand font-bold">Proiect personalizat</div>
        <div className="font-display font-bold text-[11px] leading-tight mt-0.5">De la idee la produs digital, împreună.</div>
        <div className="text-[6.5px] text-muted-foreground mt-0.5">Web, mobile, integrări API, AI și hardware.</div>
        {/* Capability chips */}
        <div className="flex flex-wrap gap-0.5 mt-1">
          {["Web", "Mobile", "API", "AI", "Plăți", "Hardware"].map((x) => (
            <span key={x} className="text-[6.5px] rounded-full bg-card border border-border px-1.5 py-0.5">{x}</span>
          ))}
        </div>
        {/* Lead form */}
        <div className="mt-auto rounded-md bg-card border border-border p-1.5">
          <div className="text-[6.5px] font-bold mb-0.5">Spune-ne ideea ta</div>
          <div className="px-1 py-0.5 rounded border border-dashed border-border text-muted-foreground text-[6.5px] mb-1">descrie pe scurt proiectul...</div>
          <button className="w-full bg-foreground text-background rounded py-0.5 font-semibold text-[7px] flex items-center justify-center gap-0.5">
            Trimite <ArrowRight className="size-1.5" />
          </button>
          <div className="text-[6px] text-muted-foreground text-center mt-0.5 flex items-center justify-center gap-0.5"><Clock className="size-1.5" /> Răspuns în 24h · ofertă gratuită</div>
        </div>
      </div>
    </div>
  </Frame>
);

export const mockups = {
  beauty: BeautyMockup,
  resto: RestoMockup,
  public: PublicMockup,
  turism: TurismMockup,
  pro: ProMockup,
  local: LocalMockup,
  national: NationalMockup,
  other: OtherMockup,
};

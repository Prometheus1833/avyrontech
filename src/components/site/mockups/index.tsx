import { Calendar, Phone, MapPin, Star, Download, FileText, Wallet, ScanLine, Sparkles, Clock, Mail, MessageCircle, ChevronRight, Menu, Search, Shield, Award, Utensils, Bed, Wrench, Scale, Building2, Wifi, Coffee, Car, Heart, Gift, Megaphone, ArrowRight, Play, Check, Flame, ShoppingBag, Quote, Camera, Zap, Briefcase, Users, TrendingUp, Globe, type LucideIcon } from "lucide-react";
import salonHero from "@/assets/work-salon.jpg";
import resto from "@/assets/work-restaurant-new.jpg";
import lawyer from "@/assets/work-lawyer-new.jpg";
import hotel from "@/assets/work-hotel-new.jpg";
import local from "@/assets/work-local-new.jpg";
import publicImg from "@/assets/work-public-miago.jpg";
import retuvoLogo from "@/assets/retuvo-logo.png";
import miagoTruck from "@/assets/work-miago-truck.jpg";

const PUBLIC_SERVICE_LINKS: Array<[string, LucideIcon, string]> = [
  ["Programări", Calendar, "bg-[#0b3a6f]"],
  ["Documente", FileText, "bg-[#1a5fa8]"],
  ["Plăți taxe", Wallet, "bg-[#2a7fc7]"],
  ["Sesizări", Megaphone, "bg-[#3d96d8]"],
];

const RETUVO_ACTIONS: Array<[string, LucideIcon]> = [
  ["Istoric", FileText],
  ["Hartă", MapPin],
  ["Retragere", ArrowRight],
];

/* Browser frame — fills its container 100% */
const Frame = ({ children, url, dark = false }: { children: React.ReactNode; url: string; dark?: boolean }) => (
  <div className={`w-full h-full flex flex-col ${dark ? "bg-[#0a0a0a]" : "bg-card"}`}>
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border-b shrink-0 ${dark ? "border-white/10 bg-white/5" : "border-border/60 bg-muted/40"}`}>
      <span className="size-1.5 rounded-full bg-red-400" />
      <span className="size-1.5 rounded-full bg-yellow-400" />
      <span className="size-1.5 rounded-full bg-green-400" />
      <div className={`ml-1.5 flex-1 flex items-center gap-1 rounded-full px-2 py-0.5 ${dark ? "bg-white/10" : "bg-background/70"}`}>
        <span className="text-[7px] opacity-60">🔒</span>
        <span className={`text-[7px] font-mono truncate ${dark ? "text-white/70" : "text-muted-foreground"}`}>{url}</span>
      </div>
    </div>
    <div className="flex-1 overflow-hidden text-[8px] leading-tight relative">{children}</div>
  </div>
);

/* ============================== BEAUTY — FLAWLESTUDIO ==============================
   Editorial salon homepage, soft pink palette, integrates Flawlestudio identity.
*/
export const BeautyMockup = () => (
  <Frame url="flawlestudio.ro">
    <div className="h-full flex flex-col bg-[#fdf6f3] text-[#2a1a1f]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#e8d5d0]">
        <div className="flex items-center gap-1">
          <div className="size-3 rounded-full bg-gradient-to-br from-[#e8a5a8] to-[#c97b8a] grid place-items-center"><Sparkles className="size-1.5 text-white" /></div>
          <span className="font-display font-bold text-[9px] tracking-wide">Flawle<span className="italic font-light">studio</span></span>
        </div>
        <div className="hidden xs:flex items-center gap-1.5 text-[6.5px] text-[#6b4a52]">
          <span>Servicii</span><span>Echipă</span><span>Galerie</span><span>Ofertă</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[6px] text-[#6b4a52]">RO</span>
          <span className="bg-[#2a1a1f] text-white rounded-full px-1.5 py-0.5 text-[6.5px] font-bold flex items-center gap-0.5"><Calendar className="size-1.5" /> Programează</span>
        </div>
      </div>

      {/* Hero — split editorial */}
      <div className="grid grid-cols-5 gap-1.5 px-2.5 py-2 flex-1 min-h-0">
        <div className="col-span-3 flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-1 text-[6px] uppercase tracking-[0.2em] text-[#c97b8a] font-bold">
              <span className="size-1 rounded-full bg-[#c97b8a] animate-pulse" /> Salon premium · București
            </span>
            <div className="font-display font-bold text-[16px] leading-[0.95] mt-1">
              Pielea ta,<br/>
              <span className="italic font-light text-[#c97b8a]">la fel de</span><br/>
              perfectă ca tine.
            </div>
            <p className="text-[7px] text-[#6b4a52] mt-1.5 leading-snug max-w-[95%]">
              Epilare definitivă MedValley, tratamente faciale și ritualuri de îngrijire cu rezultate vizibile încă de la prima ședință.
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="bg-[#2a1a1f] text-white rounded-full px-2 py-1 text-[7px] font-bold flex items-center gap-0.5">Rezervă o ședință <ArrowRight className="size-2" /></span>
              <span className="rounded-full border border-[#2a1a1f]/30 px-1.5 py-1 text-[7px] flex items-center gap-0.5"><Play className="size-1.5 fill-[#2a1a1f]" /> Tur virtual</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1.5 mt-1 border-t border-[#e8d5d0]">
            <div><div className="font-display font-bold text-[11px] leading-none">19+</div><div className="text-[5.5px] uppercase tracking-wider text-[#6b4a52]">ani exp.</div></div>
            <div><div className="font-display font-bold text-[11px] leading-none">4.9★</div><div className="text-[5.5px] uppercase tracking-wider text-[#6b4a52]">312 review</div></div>
            <div><div className="font-display font-bold text-[11px] leading-none">5K+</div><div className="text-[5.5px] uppercase tracking-wider text-[#6b4a52]">cliente</div></div>
          </div>
        </div>
        <div className="col-span-2 relative rounded-xl overflow-hidden">
          <img src={salonHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {/* Floating booking card */}
          <div className="absolute top-1 right-1 left-1 rounded-lg bg-white/95 backdrop-blur p-1 shadow-md">
            <div className="text-[6px] font-bold text-[#c97b8a] uppercase tracking-wider">Următorul slot</div>
            <div className="text-[7px] font-semibold">Joi · 10:30</div>
            <div className="text-[6px] text-[#6b4a52]">cu Andreea M.</div>
          </div>
          <div className="absolute bottom-1 left-1 right-1 rounded-lg bg-[#2a1a1f]/90 text-white p-1">
            <div className="text-[6px] uppercase tracking-wider opacity-70">Ofertă luna asta</div>
            <div className="text-[7.5px] font-bold">6 ședințe full-body –30%</div>
          </div>
        </div>
      </div>

      {/* Services strip */}
      <div className="px-2.5 pb-2">
        <div className="grid grid-cols-4 gap-1">
          {[
            ["Laser MedValley", "Definitiv", "from-[#f5d5d8]"],
            ["Tratamente faciale", "Anti-age", "from-[#f0e0d5]"],
            ["Manichiură", "Premium", "from-[#fae5e0]"],
            ["Pachete cadou", "Vouchere", "from-[#ecd5e0]"],
          ].map(([t, s, c]) => (
            <div key={t} className={`rounded-lg bg-gradient-to-br ${c} to-white border border-[#e8d5d0] p-1`}>
              <div className="text-[6.5px] font-bold leading-tight">{t}</div>
              <div className="text-[5.5px] text-[#6b4a52] uppercase tracking-wider">{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Frame>
);

/* ============================== RESTO — fine dining ============================== */
export const RestoMockup = () => (
  <Frame url="aroma-bistro.ro" dark>
    <div className="h-full flex flex-col text-white">
      {/* Top nav */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10">
        <div className="flex items-center gap-1">
          <div className="size-3 rounded bg-amber-500 grid place-items-center"><Utensils className="size-1.5 text-black" /></div>
          <span className="font-display font-bold text-[9px] tracking-widest">AROMA</span>
        </div>
        <div className="hidden xs:flex items-center gap-1.5 text-[6.5px] text-white/60">
          <span>Meniu</span><span>Chef</span><span>Eveniment</span><span>Galerie</span>
        </div>
        <span className="border border-amber-500 text-amber-400 rounded-full px-1.5 py-0.5 text-[6.5px] font-bold">Rezervă masă</span>
      </div>

      {/* Hero image full */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <img src={resto} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
        <div className="absolute top-2 left-2 right-2">
          <span className="text-[6px] uppercase tracking-[0.3em] text-amber-400">Bucătărie de autor · est. 2014</span>
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="font-display font-bold text-[18px] leading-[0.9]">
            <span className="italic font-light">savoare</span><br/>
            <span className="text-amber-400">&</span> emoție.
          </div>
          <p className="text-[6.5px] text-white/70 mt-1 max-w-[70%]">Un meniu de sezon construit alături de producători locali, în inima Bucureștiului.</p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="bg-amber-500 text-black rounded-full px-2 py-0.5 text-[7px] font-bold">Rezervă masă</span>
            <span className="rounded-full border border-white/30 px-1.5 py-0.5 text-[6.5px] flex items-center gap-0.5"><FileText className="size-1.5" /> Vezi meniul</span>
          </div>
        </div>
      </div>

      {/* Bottom strip — chef's pick + delivery */}
      <div className="border-t border-white/10 grid grid-cols-3 gap-px bg-white/10">
        <div className="bg-[#0a0a0a] p-1.5">
          <div className="text-[5.5px] uppercase tracking-wider text-amber-400">Felul zilei</div>
          <div className="text-[7px] font-bold leading-tight">Mușchi de vită · sos demi-glace</div>
          <div className="text-[7px] font-bold text-amber-400 mt-0.5">85 lei</div>
        </div>
        <div className="bg-[#0a0a0a] p-1.5">
          <div className="text-[5.5px] uppercase tracking-wider text-white/50">Rezervări online</div>
          <div className="flex items-center gap-0.5 mt-0.5"><Clock className="size-2 text-amber-400" /><span className="text-[7px] font-semibold">19:00 disponibil</span></div>
          <div className="text-[5.5px] text-white/50 mt-0.5">12 mese libere astăzi</div>
        </div>
        <div className="bg-[#0a0a0a] p-1.5">
          <div className="text-[5.5px] uppercase tracking-wider text-white/50">Comandă acasă</div>
          <div className="flex gap-0.5 mt-0.5">
            <span className="rounded bg-yellow-400 text-black px-1 py-px text-[5.5px] font-bold">Glovo</span>
            <span className="rounded bg-pink-500 px-1 py-px text-[5.5px] font-bold">Tazz</span>
            <span className="rounded bg-emerald-500 px-1 py-px text-[5.5px] font-bold">Bolt</span>
          </div>
        </div>
      </div>
    </div>
  </Frame>
);

/* ============================== PUBLIC — instituție ============================== */
export const PublicMockup = () => (
  <Frame url="primaria-orasului.ro">
    <div className="h-full flex flex-col">
      {/* Official top bar */}
      <div className="bg-[#0b3a6f] text-white px-2.5 py-0.5 flex items-center justify-between text-[6px]">
        <span className="flex items-center gap-1"><Shield className="size-1.5" /> Site oficial · gov.ro</span>
        <span className="flex items-center gap-2"><span>RO · EN</span><span>♿ Accesibilitate</span></span>
      </div>
      {/* Main nav */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/60 bg-white">
        <div className="flex items-center gap-1.5">
          <div className="size-4 rounded bg-[#0b3a6f] grid place-items-center"><Building2 className="size-2 text-white" /></div>
          <div>
            <div className="font-display font-bold text-[8px] leading-none text-[#0b3a6f]">PRIMĂRIA</div>
            <div className="text-[5.5px] text-muted-foreground tracking-widest">MUNICIPIULUI</div>
          </div>
        </div>
        <div className="hidden xs:flex items-center gap-1.5 text-[6.5px] text-foreground/70">
          <span>Despre</span><span>Servicii</span><span>Documente</span><span>Investiții</span><span>Contact</span>
        </div>
      </div>

      {/* Hero */}
      <div className="relative px-2.5 py-2 bg-gradient-to-br from-[#e8eef7] via-[#f4f7fc] to-white border-b border-border/40">
        <div className="text-[6px] uppercase tracking-[0.2em] text-[#0b3a6f] font-bold">Servicii pentru cetățean</div>
        <div className="font-display font-bold text-[14px] leading-tight text-[#0b3a6f] mt-0.5">
          Tot orașul tău,<br/><span className="font-light italic">la un click distanță.</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1 bg-white rounded-md border border-border shadow-sm px-1.5 py-1">
          <Search className="size-2.5 text-[#0b3a6f]" />
          <span className="text-[6.5px] text-muted-foreground flex-1">Caută: certificat urbanism, taxe, programare...</span>
          <span className="bg-[#0b3a6f] text-white rounded px-1.5 py-0.5 text-[6.5px] font-bold">Caută</span>
        </div>
      </div>

      {/* Quick services grid */}
      <div className="px-2.5 py-1.5 grid grid-cols-4 gap-1">
        {PUBLIC_SERVICE_LINKS.map(([l, I, c]) => (
          <div key={l} className="rounded-lg border border-border/60 p-1.5 text-center bg-white hover:shadow-sm">
            <div className={`size-5 rounded-md ${c} grid place-items-center mx-auto mb-0.5`}><I className="size-2.5 text-white" /></div>
            <div className="text-[6.5px] font-semibold leading-tight">{l}</div>
            <div className="text-[5.5px] text-muted-foreground">online</div>
          </div>
        ))}
      </div>

      {/* Hero image strip */}
      <div className="relative h-12 mx-2.5 rounded-lg overflow-hidden">
        <img src={publicImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b3a6f]/90 to-transparent" />
        <div className="relative h-full px-2 flex flex-col justify-center text-white">
          <div className="text-[5.5px] uppercase tracking-wider opacity-80">Anunț important</div>
          <div className="text-[8px] font-bold leading-tight">Buget participativ 2025 — votează proiectele</div>
          <span className="text-[6px] underline opacity-90 mt-0.5">Citește mai mult →</span>
        </div>
      </div>

      {/* Announcements list */}
      <div className="px-2.5 py-1.5 mt-auto">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[6.5px] font-bold uppercase tracking-wider text-[#0b3a6f] flex items-center gap-0.5"><Megaphone className="size-1.5" /> Ultimele anunțuri</span>
          <span className="text-[6px] text-[#0b3a6f]">vezi toate →</span>
        </div>
        <div className="space-y-0.5">
          {[["HCL nr. 142 — aprobare PUZ", "azi"], ["Licitație lucrări parc central", "ieri"], ["Program audiențe primar", "2 zile"]].map(([a, d]) => (
            <div key={a} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-secondary/50 text-[6.5px] border-l-2 border-[#0b3a6f]">
              <span className="truncate">{a}</span>
              <span className="text-muted-foreground shrink-0 ml-1">{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Frame>
);

/* ============================== TURISM — boutique villa (inspirat WanderVillas) ============================== */
export const TurismMockup = () => (
  <Frame url="conac-bradet.ro">
    <div className="h-full flex flex-col bg-[#f5efe6] text-[#2a2018]">
      {/* Nav */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#d9cdb8]/60">
        <span className="font-display italic font-semibold text-[10px] tracking-tight">Conac Brădet</span>
        <div className="hidden xs:flex items-center gap-2 text-[6.5px] text-[#6b5a4a]">
          <span>Camere</span><span>Experiențe</span><span>Despre</span><span>Recenzii</span>
        </div>
        <span className="bg-white border border-[#2a2018] rounded-full px-1.5 py-0.5 text-[6.5px] font-semibold">Contact</span>
      </div>

      {/* Editorial hero */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <img src={hotel} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a2018]/70 via-transparent to-[#f5efe6]/40" />
        {/* Oversized editorial type */}
        <div className="absolute top-2 left-2 right-2">
          <div className="font-display text-[20px] leading-[0.85] tracking-tight text-white drop-shadow">
            <span className="italic font-light text-white/80">dincolo de</span><br/>
            ORAȘ.
          </div>
        </div>
        {/* Postcard floating */}
        <div className="absolute top-1/2 right-1.5 -translate-y-1/2 w-[55%] rounded-md bg-white shadow-xl p-1 rotate-2">
          <div className="grid grid-cols-2 gap-1">
            <div className="rounded overflow-hidden h-10"><img src={hotel} alt="" className="w-full h-full object-cover" /></div>
            <div className="text-[6px] leading-tight">
              <div className="font-display font-bold text-[7.5px]">Vila Brădet</div>
              <div className="text-[#6b5a4a]">Sleeps 8 · Piscină privată · Vie</div>
              <div className="italic text-[6px] mt-0.5 text-[#a08570]">"un retreat liniștit, înconjurat de podgorii"</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#e8dcc6]">
            <span className="text-[5.5px] text-[#6b5a4a]">Villa · 05</span>
            <span className="size-5 rounded-full bg-[#a83d2e] text-white grid place-items-center text-[6px] font-bold">Book</span>
          </div>
        </div>
        {/* Stars badge */}
        <div className="absolute bottom-1 left-2 bg-white/95 rounded-full px-1.5 py-0.5 text-[6.5px] font-semibold flex items-center gap-0.5">
          <Star className="size-1.5 text-yellow-500 fill-yellow-500" /> 4.8 · 213 oaspeți
        </div>
      </div>

      {/* Booking widget bottom */}
      <div className="bg-white border-t border-[#d9cdb8] px-2 py-1.5 grid grid-cols-5 gap-1 items-center">
        <div className="text-[6px]"><div className="text-[#a08570] uppercase tracking-wider">Check-in</div><div className="font-bold text-[7.5px]">12 mai</div></div>
        <div className="text-[6px]"><div className="text-[#a08570] uppercase tracking-wider">Check-out</div><div className="font-bold text-[7.5px]">15 mai</div></div>
        <div className="text-[6px]"><div className="text-[#a08570] uppercase tracking-wider">Oaspeți</div><div className="font-bold text-[7.5px]">2 ad · 1 cop</div></div>
        <div className="text-[6px] text-right col-span-1"><div className="text-[#a08570] uppercase tracking-wider">de la</div><div className="font-display font-bold text-[10px] text-[#2a2018]">€ 180</div></div>
        <button className="bg-[#2a2018] text-white rounded-full py-1 text-[7px] font-bold">Caută</button>
      </div>
    </div>
  </Frame>
);

/* ============================== PRO — Dominion Counsel inspiration ============================== */
export const ProMockup = () => (
  <Frame url="cabinet-ionescu.ro" dark>
    <div className="h-full flex flex-col bg-[#0e1a24] text-white">
      {/* Top contact bar */}
      <div className="bg-[#1a2a36] px-2.5 py-0.5 flex items-center justify-between text-[5.5px] text-white/60">
        <span className="flex items-center gap-1.5"><span className="flex items-center gap-0.5"><Clock className="size-1.5" /> L-V 9-18</span><span className="flex items-center gap-0.5"><MapPin className="size-1.5" /> București</span></span>
        <span className="flex items-center gap-0.5"><Mail className="size-1.5" /> contact@ionescu-law.ro</span>
      </div>
      {/* Nav */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10">
        <div>
          <div className="font-display font-bold text-[10px] text-[#c9a47a] leading-none tracking-wide">Ionescu</div>
          <div className="text-[6px] text-white/50 italic">& Asociații</div>
        </div>
        <div className="hidden xs:flex items-center gap-1.5 text-[6.5px] text-white/70">
          <span>Despre</span><span>Practică</span><span>Cazuri</span><span>Avocați</span>
        </div>
        <span className="bg-[#c9a47a] text-[#0e1a24] rounded px-1.5 py-0.5 text-[6.5px] font-bold flex items-center gap-0.5"><Calendar className="size-1.5" /> Consultație</span>
      </div>

      {/* Hero with portrait BG */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <img src={lawyer} alt="" className="absolute inset-0 w-full h-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e1a24] via-[#0e1a24]/85 to-transparent" />
        <div className="relative h-full px-2.5 py-2 max-w-[65%]">
          <span className="text-[6px] uppercase tracking-[0.25em] text-[#c9a47a]">Litigii · drept comercial</span>
          <div className="font-display font-bold text-[14px] leading-[0.95] mt-1">
            O moștenire de <span className="italic font-light text-[#c9a47a]">încredere</span><br/>
            construită pe excelență juridică.
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="bg-[#c9a47a] text-[#0e1a24] rounded px-2 py-1 text-[7px] font-bold">Cere ajutor juridic</span>
            <span className="border border-white/30 rounded px-1.5 py-1 text-[6.5px]">Cazuri rezolvate</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[6px] text-white/70">
            <span className="flex items-center gap-0.5"><Award className="size-1.5 text-[#c9a47a]" /> Baroul București</span>
            <span className="flex items-center gap-0.5"><Shield className="size-1.5 text-[#c9a47a]" /> 12 ani experiență</span>
          </div>
        </div>
      </div>

      {/* Practice area cards */}
      <div className="grid grid-cols-3 gap-px bg-white/10 border-t border-white/10">
        {[
          ["Drept Civil", "CONSILIERE", "Strategii pentru persoane fizice și familii."],
          ["Drept Comercial", "CONTRACTE", "Negociere și redactare contracte."],
          ["Drept Imobiliar", "PROTECȚIE", "Securizare proprietăți și tranzacții."],
        ].map(([t, k, d]) => (
          <div key={t} className="bg-[#0e1a24] p-1.5">
            <div className="text-[6.5px] font-semibold">{t}</div>
            <div className="text-[7px] font-display font-bold text-[#c9a47a] tracking-wider">{k}</div>
            <div className="text-[5.5px] text-white/50 mt-0.5 leading-tight">{d}</div>
          </div>
        ))}
      </div>

      {/* Stats banner */}
      <div className="bg-[#c9a47a]/10 border-t border-[#c9a47a]/30 px-2.5 py-1 flex items-center justify-around">
        <div><span className="font-display font-bold text-[12px] text-[#c9a47a]">350+</span><span className="text-[6px] text-white/60 ml-1">cazuri</span></div>
        <div><span className="font-display font-bold text-[12px] text-[#c9a47a]">98%</span><span className="text-[6px] text-white/60 ml-1">succes</span></div>
        <div><span className="font-display font-bold text-[12px] text-[#c9a47a]">12</span><span className="text-[6px] text-white/60 ml-1">ani</span></div>
      </div>
    </div>
  </Frame>
);

/* ============================== LOCAL — fitness/trainer style (Zenith Zing inspiration) ============================== */
export const LocalMockup = () => (
  <Frame url="instalatii-rapide.ro" dark>
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white">
      {/* Nav */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10">
        <div className="flex items-center gap-1">
          <div className="size-3.5 rounded-md bg-[#c4f542] grid place-items-center"><Wrench className="size-2 text-black" /></div>
          <span className="font-display font-bold text-[9px]">Rapid<span className="text-[#c4f542]">Fix</span></span>
        </div>
        <div className="hidden xs:flex items-center gap-1.5 text-[6.5px] text-white/60">
          <span>Servicii</span><span>Tarife</span><span>Lucrări</span><span>Echipa</span>
        </div>
        <span className="bg-[#c4f542] text-black rounded px-1.5 py-0.5 text-[6.5px] font-bold italic">Sună acum</span>
      </div>

      {/* Hero */}
      <div className="relative flex-1 min-h-0 overflow-hidden grid grid-cols-5 gap-1.5 px-2.5 py-2">
        <img src={local} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

        <div className="relative col-span-3 flex flex-col justify-center">
          <span className="inline-flex items-center gap-1 text-[6px] text-[#c4f542] font-bold">
            <span className="size-1 rounded-full bg-[#c4f542] animate-pulse" /> Disponibil 24/7 · răspuns &lt; 15 min
          </span>
          <div className="font-display font-black italic text-[18px] leading-[0.85] mt-1 tracking-tight">
            FĂRĂ PANICĂ.
          </div>
          <div className="font-display font-black italic text-[20px] leading-[0.85] text-[#c4f542] tracking-tight"
               style={{textShadow: "0 0 12px rgba(196,245,66,0.5)"}}>
            FĂRĂ AȘTEPTĂRI.
          </div>
          <p className="text-[6.5px] text-white/70 mt-1.5 leading-snug max-w-[95%]">
            Echipa profesionistă de instalatori care ajunge la tine în maxim 60 de minute, cu garanție și factură.
          </p>
          <div className="mt-2">
            <a className="inline-flex items-center gap-1 bg-[#c4f542] text-black rounded px-2 py-1 text-[8px] font-bold italic">
              <Phone className="size-2" /> 0722 123 456
            </a>
          </div>
        </div>

        <div className="relative col-span-2 rounded-lg bg-white/5 border border-white/10 p-1.5 backdrop-blur self-center">
          <div className="text-[5.5px] uppercase tracking-widest text-[#c4f542] font-bold">Calculator preț</div>
          <div className="space-y-0.5 mt-0.5">
            <div className="rounded border border-white/10 px-1 py-0.5 text-[6px] flex justify-between"><span className="text-white/60">Tip:</span><span>Defecțiune robinet</span></div>
            <div className="rounded border border-white/10 px-1 py-0.5 text-[6px] flex justify-between"><span className="text-white/60">Urgență:</span><span className="text-[#c4f542]">Astăzi</span></div>
          </div>
          <div className="mt-1 pt-1 border-t border-white/10">
            <div className="text-[5.5px] text-white/50">Estimare</div>
            <div className="font-display font-black text-[14px] text-[#c4f542] leading-none">~ 250 LEI</div>
            <button className="w-full mt-1 bg-white text-black rounded py-0.5 text-[6.5px] font-bold">Trimite cerere</button>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="border-t border-white/10 px-2.5 py-1 flex items-center justify-around text-[6px]">
        <span className="flex items-center gap-0.5"><Star className="size-1.5 text-[#c4f542] fill-[#c4f542]" /> 4.9 · 1.2K</span>
        <span className="flex items-center gap-0.5"><Shield className="size-1.5 text-[#c4f542]" /> Garanție 12 luni</span>
        <span className="flex items-center gap-0.5"><Zap className="size-1.5 text-[#c4f542]" /> Intervenție rapidă</span>
        <span className="flex items-center gap-0.5"><MapPin className="size-1.5 text-[#c4f542]" /> Tot Bucureștiul</span>
      </div>
    </div>
  </Frame>
);

/* ============================== NATIONAL — Retuvo (păstrat) ============================== */
export const NationalMockup = () => (
  <Frame url="retuvo.ro · app">
    <div className="h-full flex flex-col p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-border/60">
        <img src={retuvoLogo} alt="" className="size-6 object-contain" />
        <div>
          <div className="font-display font-bold text-[10px] leading-none">Retuvo</div>
          <div className="text-[8px] text-muted-foreground">Recuperează garanția SGR</div>
        </div>
        <Menu className="ml-auto size-3 text-muted-foreground" />
      </div>
      <div className="rounded-xl bg-gradient-to-br from-brand to-brand/70 text-background p-2 mb-1.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[8px] uppercase opacity-80 flex items-center gap-0.5"><Wallet className="size-2.5" /> Wallet</span>
          <span className="text-[8px] opacity-80">disponibil</span>
        </div>
        <div className="font-bold text-[18px] leading-tight mt-0.5">24,50 RON</div>
        <div className="text-[8px] opacity-80">49 recipiente returnate luna asta</div>
        <div className="mt-1 h-1 rounded-full bg-white/20 overflow-hidden"><div className="h-full w-[65%] bg-white" /></div>
      </div>
      <button className="w-full bg-foreground text-background rounded-lg py-1.5 font-semibold flex items-center justify-center gap-1 mb-1.5 text-[9px]">
        <ScanLine className="size-2.5" /> Scanează cod de bare
      </button>
      <div className="grid grid-cols-3 gap-1 mb-1.5">
        {RETUVO_ACTIONS.map(([l, I]) => (
          <div key={l} className="rounded-lg bg-secondary/60 p-1 text-center">
            <I className="size-2.5 text-brand mx-auto" />
            <div className="text-[7px] font-semibold mt-0.5">{l}</div>
          </div>
        ))}
      </div>
      <div className="text-[8px] font-bold mb-0.5 text-foreground/70 uppercase tracking-wider">Puncte colectare apropiate</div>
      <div className="space-y-0.5">
        {[["Kaufland Berceni", "0.3 km", "deschis"], ["Lidl Vitan", "1.1 km", "deschis"], ["Carrefour AFI", "2.4 km", "închis"]].map(([n, d, s]) => (
          <div key={n} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-secondary/40 text-[8px]">
            <span className="flex items-center gap-1"><MapPin className="size-2 text-brand" /> {n}</span>
            <span className="flex items-center gap-1"><span className={`text-[6px] ${s === 'deschis' ? 'text-emerald-600' : 'text-muted-foreground'}`}>● {s}</span><span className="text-muted-foreground">{d}</span></span>
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

/* ============================== OTHER — creative studio (David Mark inspo) ============================== */
export const OtherMockup = () => (
  <Frame url="proiectul-tau.avyron.ro">
    <div className="h-full flex flex-col bg-white text-[#0a0a0a]">
      {/* Nav */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/60">
        <div className="flex items-center gap-1">
          <div className="size-3.5 rounded-md bg-foreground grid place-items-center"><Sparkles className="size-2 text-background" /></div>
          <span className="font-display font-bold text-[9px]">Avyron <span className="text-muted-foreground font-normal">Studio</span></span>
        </div>
        <div className="hidden xs:flex items-center gap-2 text-[6.5px] text-muted-foreground">
          <span className="text-foreground font-semibold border-b border-foreground">Home</span><span>Proiecte</span><span>Servicii</span><span>Pricing</span><span>Contact</span>
        </div>
        <span className="bg-foreground text-background rounded-full px-1.5 py-0.5 text-[6.5px] font-bold flex items-center gap-0.5">Menu <Menu className="size-1.5" /></span>
      </div>

      {/* Hero */}
      <div className="px-2.5 py-3 text-center">
        <div className="inline-flex items-center gap-1 mb-1">
          <span className="rounded-full bg-yellow-300 px-1.5 py-0.5 text-[6px] font-semibold">studio</span>
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[6px]">disponibil acum</span>
        </div>
        <div className="font-display font-bold text-[16px] leading-[0.95]">
          <span className="text-muted-foreground/60">Unde Creativitatea</span><br/>
          <span>Întâlnește <span className="italic">Funcționalitatea</span></span>
        </div>
        <p className="text-[6.5px] text-muted-foreground mt-1 max-w-[80%] mx-auto">
          Construim produse digitale moderne, centrate pe utilizator — care nu doar arată impecabil, ci aduc rezultate reale.
        </p>
        <div className="flex items-center justify-center gap-1 mt-1.5">
          <span className="bg-foreground text-background rounded-full px-2 py-1 text-[7px] font-semibold flex items-center gap-0.5">Hai să discutăm <ArrowRight className="size-1.5" /></span>
          <span className="rounded-full border border-border px-2 py-1 text-[7px] font-semibold">Vezi proiecte</span>
        </div>
      </div>

      {/* Portfolio strip */}
      <div className="px-2.5 flex-1 min-h-0 flex items-end gap-1 pb-1.5">
        <div className="rounded-lg overflow-hidden h-12 flex-1 bg-gradient-to-br from-orange-200 to-orange-400 grid place-items-center"><Briefcase className="size-3 text-white" /></div>
        <div className="rounded-lg overflow-hidden h-14 flex-1 bg-gradient-to-br from-slate-700 to-slate-900 grid place-items-center"><Globe className="size-3 text-white" /></div>
        <div className="rounded-lg overflow-hidden h-20 flex-[1.3] bg-gradient-to-br from-rose-300 to-rose-500 grid place-items-end p-1 relative">
          <div className="rounded-full bg-white/95 px-1.5 py-0.5 text-[5.5px] font-bold uppercase tracking-wider">Web · App · AI</div>
        </div>
        <div className="rounded-lg overflow-hidden h-14 flex-1 bg-gradient-to-br from-amber-100 to-amber-300 grid place-items-center"><Camera className="size-3 text-amber-900" /></div>
        <div className="rounded-lg overflow-hidden h-12 flex-1 bg-gradient-to-br from-sky-200 to-sky-500 grid place-items-center"><TrendingUp className="size-3 text-white" /></div>
      </div>

      {/* Capability footer */}
      <div className="border-t border-border/60 px-2.5 py-1 flex items-center justify-between text-[6px] text-muted-foreground">
        <span>★ 50+ proiecte livrate</span>
        <div className="flex gap-1">
          {["Web", "Mobile", "API", "AI", "Hardware"].map((x) => (
            <span key={x} className="rounded-full bg-secondary px-1.5 py-0.5 text-[6px] text-foreground">{x}</span>
          ))}
        </div>
      </div>
    </div>
  </Frame>
);

export const AutoMockup = () => (
  <Frame url="autopro-service.ro" dark>
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10">
        <div className="flex items-center gap-1">
          <div className="size-3.5 rounded-md bg-gradient-to-br from-orange-500 to-red-600 grid place-items-center"><Car className="size-2 text-white" /></div>
          <span className="font-display font-bold text-[9px]">AutoPro <span className="text-white/50 font-normal">Service</span></span>
        </div>
        <div className="hidden xs:flex items-center gap-1.5 text-[6.5px] text-white/60">
          <span>Servicii</span><span>Tarife</span><span>Programări</span><span>Contact</span>
        </div>
        <span className="bg-orange-500 text-white rounded-full px-1.5 py-0.5 text-[6.5px] font-bold flex items-center gap-0.5"><Calendar className="size-1.5" /> Programează</span>
      </div>
      <div className="px-2.5 py-2 flex-1 min-h-0 flex flex-col">
        <span className="inline-flex items-center gap-1 text-[6px] uppercase tracking-[0.2em] text-orange-400 font-bold">
          <Wrench className="size-1.5" /> Service auto · Cluj-Napoca
        </span>
        <div className="font-display font-bold text-[15px] leading-[1] mt-1">
          Mașina ta,<br/>
          <span className="text-orange-400">în mâini bune.</span>
        </div>
        <p className="text-[6.5px] text-white/60 mt-1 max-w-[90%]">
          Revizii, ITP, vulcanizare, detailing și diagnoze — totul cu programare online și transparență totală.
        </p>
        <div className="grid grid-cols-4 gap-1 mt-2">
          {[
            { Icon: Wrench, l: "Mecanică" },
            { Icon: Car, l: "Vulcanizare" },
            { Icon: Sparkles, l: "Detailing" },
            { Icon: Zap, l: "Electrică" },
          ].map(({ Icon, l }) => (
            <div key={l} className="rounded-lg bg-white/5 border border-white/10 p-1.5 flex flex-col items-center gap-0.5">
              <Icon className="size-2.5 text-orange-400" />
              <span className="text-[6px] font-semibold">{l}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-1 pt-1.5">
          <span className="bg-orange-500 text-white rounded-full px-2 py-1 text-[7px] font-bold flex items-center gap-0.5">Programează acum <ArrowRight className="size-1.5" /></span>
          <span className="rounded-full border border-white/20 px-2 py-1 text-[7px] font-semibold flex items-center gap-0.5"><Phone className="size-1.5" /> 0734...</span>
        </div>
      </div>
      <div className="border-t border-white/10 px-2.5 py-1 flex items-center justify-between text-[6px] text-white/50">
        <span className="flex items-center gap-0.5"><Star className="size-1.5 text-yellow-400" /> 4.9 / 320+ recenzii</span>
        <span>L–V 08:00–18:00 · S 09:00–14:00</span>
      </div>
    </div>
  </Frame>
);

/* ============================== ECOMMERCE — Miago.ro marketplace ============================== */
export const EcommerceMockup = () => (
  <Frame url="miago.ro">
    <div className="h-full flex flex-col bg-[#fffdf5] text-[#0a0a0a]">
      {/* Top nav */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/60 bg-[#111]">
        <div className="flex items-center gap-1">
          <div className="size-3.5 rounded-md bg-yellow-400 grid place-items-center"><Car className="size-2 text-black" /></div>
          <span className="font-display font-bold text-[9px] text-white tracking-wide">miago<span className="text-yellow-400">.ro</span></span>
        </div>
        <div className="hidden xs:flex items-center gap-1.5 text-[6.5px] text-white/70">
          <span>Auto</span><span>Moto</span><span>Utilaje</span><span>Piese</span><span>Verificare VIN</span>
        </div>
        <div className="flex items-center gap-1">
          <Search className="size-2.5 text-white/70" />
          <span className="bg-yellow-400 text-black rounded-full px-1.5 py-0.5 text-[6.5px] font-bold">Vinde</span>
        </div>
      </div>

      {/* Hero with truck image */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <img src={miagoTruck} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111]/85 via-[#111]/30 to-transparent" />

        {/* Search bar floating */}
        <div className="absolute top-1.5 left-1.5 right-1.5 rounded-lg bg-white/95 backdrop-blur shadow-md p-1 flex items-center gap-1">
          <Search className="size-2.5 text-[#111]" />
          <span className="text-[6.5px] text-muted-foreground flex-1 truncate">Caută: BMW X5, excavator, scuter...</span>
          <span className="bg-yellow-400 text-black rounded px-1.5 py-0.5 text-[6px] font-bold">Caută</span>
        </div>

        {/* Filter chips */}
        <div className="absolute top-7 left-1.5 right-1.5 flex gap-1 flex-wrap">
          {["Auto", "Moto", "Utilaje", "< 10.000 €", "Diesel"].map((c) => (
            <span key={c} className="rounded-full bg-white/90 px-1.5 py-0.5 text-[6px] font-semibold text-[#111]">{c}</span>
          ))}
        </div>

        {/* Bottom hero text */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 text-white">
          <div className="text-[6px] uppercase tracking-[0.25em] text-yellow-400 font-bold">Marketplace #1 auto/moto/utilaje</div>
          <div className="font-display font-bold text-[13px] leading-[1] mt-0.5">
            Cumpără cu <span className="italic text-yellow-400">încredere.</span>
          </div>
          <div className="text-[6.5px] opacity-80 mt-0.5">Verificare VIN, istoric, kilometraj — toate într-un singur loc.</div>
        </div>
      </div>

      {/* Listing card + tools strip */}
      <div className="grid grid-cols-3 gap-px bg-border/60">
        <div className="col-span-2 bg-white p-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[6.5px] font-bold">BMW X5 · 2019 · 98.500 km</span>
            <span className="text-[6.5px] font-bold text-[#111]">28.900 €</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="rounded bg-emerald-100 text-emerald-700 px-1 text-[5.5px] font-bold flex items-center gap-0.5"><Check className="size-1.5" /> VIN ok</span>
            <span className="rounded bg-yellow-100 text-yellow-800 px-1 text-[5.5px] font-bold">Istoric: 1 dauna</span>
            <span className="rounded bg-secondary px-1 text-[5.5px] font-bold text-foreground/70">Cluj</span>
          </div>
          <div className="text-[5.5px] text-muted-foreground mt-0.5">Preț recomandat: <span className="font-bold text-emerald-700">28.400–30.100 €</span> · sub piață</div>
        </div>
        <div className="bg-[#111] text-white p-1.5 flex flex-col justify-center">
          <div className="text-[5.5px] uppercase tracking-wider text-yellow-400 font-bold flex items-center gap-0.5"><ScanLine className="size-1.5" /> Verifică VIN</div>
          <div className="text-[6.5px] font-semibold leading-tight mt-0.5">Istoric complet în 30s</div>
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
  auto: AutoMockup,
  ecommerce: EcommerceMockup,
  national: NationalMockup,
  other: OtherMockup,
};

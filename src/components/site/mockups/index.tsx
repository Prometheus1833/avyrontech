import { Calendar, Phone, MapPin, Star, Download, FileText, ShoppingBag, Wallet, ScanLine, Sparkles, Clock, Mail, MessageCircle, ChevronRight } from "lucide-react";
import salon from "@/assets/work-beauty-flawless.jpg";
import resto from "@/assets/work-restaurant-new.jpg";
import lawyer from "@/assets/work-lawyer-new.jpg";
import hotel from "@/assets/work-hotel-new.jpg";
import local from "@/assets/work-local-new.jpg";
import publicImg from "@/assets/work-public-miago.jpg";
import retuvoLogo from "@/assets/retuvo-logo.png";

const Frame = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <div className="w-full h-full bg-card flex flex-col">
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 bg-muted/40 shrink-0">
      <span className="size-2 rounded-full bg-red-400" />
      <span className="size-2 rounded-full bg-yellow-400" />
      <span className="size-2 rounded-full bg-green-400" />
      <span className="ml-2 text-[9px] font-mono text-muted-foreground truncate">{url}</span>
    </div>
    <div className="flex-1 overflow-hidden p-2.5 text-[10px] leading-tight">{children}</div>
  </div>
);

const Pill = ({ children, brand }: { children: React.ReactNode; brand?: boolean }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${brand ? "bg-brand text-background" : "bg-secondary text-foreground/70"}`}>{children}</span>
);

export const BeautyMockup = () => (
  <Frame url="lumina-spa.ro">
    <div className="relative h-12 rounded-md overflow-hidden mb-1.5">
      <img src={salon} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute bottom-1 left-1.5 text-white">
        <div className="font-display font-bold text-[11px] leading-none">Lumina Beauty</div>
        <div className="text-[8px] opacity-80">Salon & SPA · București</div>
      </div>
      <Pill brand><span className="absolute top-1 right-1"><Star className="size-2 inline" /> 4.9</span></Pill>
    </div>
    <div className="text-[9px] font-bold mb-1 text-foreground/70 uppercase tracking-wide">Servicii</div>
    <div className="space-y-1 mb-1.5">
      {[["Manichiură gel", "120 lei"], ["Tratament facial", "240 lei"], ["Coafură + spălat", "90 lei"]].map(([s, p]) => (
        <div key={s} className="flex items-center justify-between px-1.5 py-1 rounded bg-secondary/60">
          <span>{s}</span>
          <span className="font-semibold text-brand">{p}</span>
        </div>
      ))}
    </div>
    <button className="w-full bg-foreground text-background rounded-md py-1.5 font-semibold flex items-center justify-center gap-1">
      <Calendar className="size-2.5" /> Programează-te online
    </button>
  </Frame>
);

export const RestoMockup = () => (
  <Frame url="bistro-aroma.ro">
    <div className="relative h-10 rounded-md overflow-hidden mb-1.5">
      <img src={resto} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 flex items-center justify-center text-white font-display font-bold text-[12px]">Bistro Aroma</div>
    </div>
    <div className="rounded-md border border-brand/40 bg-brand/5 p-1.5 mb-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[9px] font-bold text-brand uppercase">Meniul zilei</div>
        <Pill brand>-20%</Pill>
      </div>
      <div className="text-[10px] font-semibold mt-0.5">Ciorbă + Friptură + Desert</div>
      <div className="text-[9px] text-muted-foreground">45 lei · disponibil 12-16</div>
    </div>
    <div className="grid grid-cols-2 gap-1 mb-1.5">
      <button className="bg-foreground text-background rounded py-1 font-semibold text-[9px] flex items-center justify-center gap-0.5">
        <Calendar className="size-2" /> Rezervă
      </button>
      <button className="bg-secondary rounded py-1 font-semibold text-[9px] flex items-center justify-center gap-0.5">
        <ShoppingBag className="size-2" /> Comandă
      </button>
    </div>
    <div className="flex gap-1 flex-wrap">
      <Pill>Glovo</Pill>
      <Pill>Tazz</Pill>
      <Pill>Bolt Food</Pill>
    </div>
  </Frame>
);

export const PublicMockup = () => (
  <Frame url="primaria-orasului.ro">
    <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-border/60">
      <img src={publicImg} alt="" className="size-7 rounded object-cover" />
      <div>
        <div className="font-display font-bold text-[10px] leading-none">Primăria Orașului</div>
        <div className="text-[8px] text-muted-foreground">Site oficial · gov.ro</div>
      </div>
    </div>
    <div className="text-[9px] font-bold mb-1 text-foreground/70 uppercase">Anunțuri recente</div>
    <div className="space-y-0.5 mb-1.5">
      {["Licitație publică deschisă", "Buget 2025 aprobat", "Program audiențe primar"].map((a) => (
        <div key={a} className="flex items-center gap-1 px-1 py-0.5">
          <ChevronRight className="size-2 text-brand shrink-0" />
          <span className="truncate">{a}</span>
        </div>
      ))}
    </div>
    <div className="text-[9px] font-bold mb-1 text-foreground/70 uppercase">Documente</div>
    <div className="space-y-0.5">
      {["Cerere certificat urbanism", "Declarație tip ANAF"].map((d) => (
        <div key={d} className="flex items-center justify-between px-1.5 py-1 rounded bg-secondary/60">
          <span className="flex items-center gap-1"><FileText className="size-2.5" /> {d}</span>
          <Download className="size-2.5 text-brand" />
        </div>
      ))}
    </div>
  </Frame>
);

export const TurismMockup = () => (
  <Frame url="pensiunea-brad.ro">
    <div className="relative h-14 rounded-md overflow-hidden mb-1.5">
      <img src={hotel} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute top-1 left-1 bg-white/90 text-foreground rounded px-1 py-0.5 text-[8px] font-bold">
        <Star className="size-2 inline text-yellow-500" /> 4.8 · 213 recenzii
      </div>
    </div>
    <div className="font-display font-bold text-[11px]">Cameră Dublă Deluxe</div>
    <div className="flex items-center gap-1 text-[8px] text-muted-foreground mb-1">
      <MapPin className="size-2" /> Brașov, Poiana
    </div>
    <div className="rounded-md bg-secondary/60 p-1.5 mb-1.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[8px] text-muted-foreground">de la</div>
          <div className="font-bold text-[12px] text-brand leading-none">320 lei <span className="text-[8px] font-normal text-muted-foreground">/noapte</span></div>
        </div>
        <button className="bg-foreground text-background rounded-md px-2 py-1 text-[9px] font-semibold">Rezervă</button>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-1 text-[8px] text-center">
      {["Wi-Fi", "Mic dejun", "Parcare"].map((x) => <div key={x} className="bg-secondary/40 rounded py-0.5">{x}</div>)}
    </div>
  </Frame>
);

export const ProMockup = () => (
  <Frame url="cabinet-avocat.ro">
    <div className="flex items-center gap-1.5 mb-1.5">
      <img src={lawyer} alt="" className="size-8 rounded-full object-cover border border-border" />
      <div>
        <div className="font-display font-bold text-[10px] leading-none">Av. Maria Ionescu</div>
        <div className="text-[8px] text-muted-foreground">Drept civil & comercial</div>
      </div>
    </div>
    <div className="text-[9px] font-bold mb-1 text-foreground/70 uppercase">Arii de practică</div>
    <div className="grid grid-cols-2 gap-1 mb-1.5">
      {["Civil", "Comercial", "Familie", "Imobiliar"].map((x) => (
        <div key={x} className="px-1.5 py-1 rounded bg-secondary/60 text-[9px]">{x}</div>
      ))}
    </div>
    <button className="w-full bg-foreground text-background rounded-md py-1.5 font-semibold flex items-center justify-center gap-1 mb-1">
      <Calendar className="size-2.5" /> Programează consultație
    </button>
    <div className="flex items-center justify-around pt-1 border-t border-border/40 text-[9px]">
      <span className="flex items-center gap-0.5"><Phone className="size-2.5 text-brand" /> Apel</span>
      <span className="flex items-center gap-0.5"><MessageCircle className="size-2.5 text-brand" /> WhatsApp</span>
      <span className="flex items-center gap-0.5"><Mail className="size-2.5 text-brand" /> Email</span>
    </div>
  </Frame>
);

export const LocalMockup = () => (
  <Frame url="instalatii-rapide.ro">
    <div className="relative h-10 rounded-md overflow-hidden mb-1.5">
      <img src={local} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
      <div className="absolute inset-0 p-1.5 flex flex-col justify-center text-white">
        <div className="font-display font-bold text-[11px] leading-none">Instalații Rapide</div>
        <div className="text-[8px] opacity-80">Non-stop · Răspuns în 15 min</div>
      </div>
    </div>
    <a href="#" className="block w-full bg-brand text-background rounded-md py-2 font-bold flex items-center justify-center gap-1 mb-1.5 text-[11px]">
      <Phone className="size-3" /> 0722 123 456
    </a>
    <div className="text-[9px] font-bold mb-1 text-foreground/70 uppercase">Cerere ofertă rapidă</div>
    <div className="space-y-1">
      <div className="px-1.5 py-1 rounded border border-border/60 text-muted-foreground text-[9px]">Tip lucrare...</div>
      <div className="px-1.5 py-1 rounded border border-border/60 text-muted-foreground text-[9px]">Adresa...</div>
      <button className="w-full bg-foreground text-background rounded py-1 font-semibold text-[9px]">Trimite cerere</button>
    </div>
    <div className="flex items-center gap-1 mt-1 text-[8px] text-muted-foreground">
      <MapPin className="size-2" /> Acoperim toată zona metropolitană
    </div>
  </Frame>
);

export const NationalMockup = () => (
  <Frame url="retuvo.ro · app">
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
    <button className="w-full bg-foreground text-background rounded-md py-1.5 font-semibold flex items-center justify-center gap-1 mb-1.5">
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
  </Frame>
);

export const OtherMockup = () => (
  <Frame url="proiectul-tau.avyron.ro">
    <div className="h-full flex flex-col items-center justify-center text-center px-3">
      <div className="size-10 rounded-2xl bg-gradient-to-br from-brand to-brand/60 text-background grid place-items-center mb-2">
        <Sparkles className="size-5" />
      </div>
      <div className="font-display font-bold text-[12px] leading-tight">Spune-ne ideea ta</div>
      <div className="text-[9px] text-muted-foreground mt-1 mb-2">Construim împreună platforma potrivită — de la idee simplă la ecosistem complex.</div>
      <div className="w-full px-2 py-1.5 rounded-md border border-dashed border-border text-muted-foreground text-[9px] mb-1.5">descrie-ne proiectul...</div>
      <button className="w-full bg-foreground text-background rounded-md py-1.5 font-semibold text-[10px] flex items-center justify-center gap-1">
        <Clock className="size-2.5" /> Răspuns în 24h
      </button>
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

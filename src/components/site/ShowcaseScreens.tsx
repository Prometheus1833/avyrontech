import {
  ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronRight, CirclePlay,
  FileText, Gamepad2, Globe2, Home, Layers3, MapPin, MessageCircle,
  Search, Send, ShieldCheck, SlidersHorizontal, Sparkles, Target,
  Users, Workflow, Zap,
} from "lucide-react";
import type { CSSProperties } from "react";
import { domainContent, type AppMode, type AutomationMode } from "./showcaseContent";

type Domain = { key: string; label: string; title: string };

function DomainArt({ kind, ro }: { kind: string; ro: boolean }) {
  if (kind === "beauty" || kind === "shop") return (
    <div className={`web-still-life web-still-life--${kind}`} aria-hidden="true">
      <div className="web-art-arch" /><div className="web-art-sphere" />
      <div className="web-art-bottle"><span /><i /></div>
      <div className="web-art-vase" /><div className="web-art-stone" />
      <span className="web-art-caption">{kind === "beauty" ? "CARE / NATURALLY" : "THE EVERYDAY COLLECTION"}</span>
    </div>
  );
  if (kind === "auto") return (
    <div className="web-auto-art" aria-hidden="true">
      <svg viewBox="0 0 420 240" fill="none">
        <defs><linearGradient id="showcase-car" x1="80" y1="50" x2="300" y2="200" gradientUnits="userSpaceOnUse"><stop stopColor="#d9e3e9" /><stop offset=".5" stopColor="#536975" /><stop offset="1" stopColor="#202d36" /></linearGradient></defs>
        <path d="M39 159 74 126 143 108 198 67 294 73 342 120 380 136 391 174 38 174Z" fill="url(#showcase-car)" stroke="#b0c6ce" />
        <path d="m152 108 50-32 83 4 36 37Z" fill="#15232b" stroke="#8da5b2" />
        <path d="m245 79-2 36M74 126l264-6M45 153h48m248-17 37 8" stroke="#e3f0f5" strokeWidth="3" />
        <circle cx="112" cy="169" r="32" fill="#11191f" stroke="#a0b0ba" strokeWidth="5" /><circle cx="112" cy="169" r="16" stroke="#6d8592" strokeWidth="6" />
        <circle cx="326" cy="169" r="32" fill="#11191f" stroke="#a0b0ba" strokeWidth="5" /><circle cx="326" cy="169" r="16" stroke="#6d8592" strokeWidth="6" />
        <path d="M32 211h365M58 224h318" stroke="#ff784d" opacity=".35" />
      </svg>
      <span>DIAGNOSTICS / SERVICE / DETAILING</span>
    </div>
  );
  if (kind === "civic") return (
    <div className="web-portal-art">
      <Search size={22} /><strong>{ro ? "Caută în portal" : "Search the portal"}</strong>
      <div><FileText /><span>{ro ? "Cereri & documente" : "Requests & documents"}</span><ChevronRight /></div>
      <div><CalendarDays /><span>{ro ? "Programări online" : "Online appointments"}</span><ChevronRight /></div>
      <div><MapPin /><span>{ro ? "Instituții & sedii" : "Institutions & offices"}</span><ChevronRight /></div>
    </div>
  );
  if (kind === "network") return (
    <div className="web-network-art" aria-hidden="true">
      <svg viewBox="0 0 300 240"><path d="m48 62 104 61 97-73M152 123l-64 79m64-79 99 65M48 62l40 140m161-152 2 138M48 62l203 126" fill="none" stroke="currentColor" opacity=".3" />
        {[[48,62],[152,123],[249,50],[88,202],[251,188]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r={i===1?30:15} fill="#214452" stroke="currentColor"/><circle cx={x} cy={y} r="4" fill="currentColor"/></g>)}
      </svg><span>ONE CONNECTED ECOSYSTEM</span>
    </div>
  );
  return <div className="web-studio-art" aria-hidden="true"><div /><div /><div /><span>IDEA → DESIGN → EXPERIENCE</span></div>;
}

export function WebsiteScreen({ domain, ro }: { domain: Domain; ro: boolean }) {
  const theme = domainContent(domain.key, ro);
  const photo = theme.image;
  return (
    <div className={`showcase-web showcase-web--${theme.visual}`} style={{ "--web-accent": theme.accent, "--web-surface": theme.surface, "--web-ink": theme.ink } as CSSProperties} data-screen-variant={domain.key}>
      <div className="web-browser" aria-hidden="true"><span /><span /><span /><div><ShieldCheck size={10} />{ro ? "site-ul-tău.ro" : "your-website.com"}</div><ArrowUpRight size={11} /></div>
      <div className="web-navigation"><strong>{theme.brand}</strong><span>{ro ? "Descoperă · Despre · Contact" : "Discover · About · Contact"}</span><i><MenuDots /></i></div>
      <div className={`web-hero ${photo && theme.visual === "photo" ? "web-hero--photo" : ""}`}>
        {photo && (
          <img
            src={photo}
            srcSet={theme.imageSet}
            sizes={theme.imageSet ? "(max-width: 600px) 100vw, 800px" : undefined}
            alt=""
            loading="lazy"
            decoding="async"
            className="web-hero-photo"
          />
        )}
        <div className="web-hero-copy">
          <p className="web-kicker">{domain.label}</p>
          <h4>{theme.hero}</h4><p>{theme.intro}</p>
          <span className="web-hero-action">{theme.action}<ArrowUpRight size={12} /></span>
        </div>
        {theme.visual !== "photo" && <DomainArt kind={theme.visual} ro={ro} />}
      </div>
      <div className="web-service-strip">{theme.details.slice(0,3).map((item,index)=><span key={item.title}><i>0{index+1}</i>{item.title}<ArrowRight size={10}/></span>)}</div>
    </div>
  );
}

function MenuDots() { return <><span /><span /></>; }
function PhoneNav({ mode }: { mode: AppMode }) {
  return <div className="phone-app-nav">{[Home, mode==="game"?Gamepad2:CalendarDays, MessageCircle, Users].map((Icon,index)=><span key={index} className={index===0?"is-active":""}><Icon size={16}/></span>)}</div>;
}

export function PhoneScreen({ mode, ro }: { mode: AppMode; ro: boolean }) {
  return (
    <div className={`showcase-phone-ui phone-ui--${mode}`} data-screen-variant={mode}>
      <div className="phone-status"><span>9:41</span><span className="phone-status-icons"><i>▮▮▮</i>◔<b /></span></div>
      <div className="phone-app-content" key={mode}>
        {mode === "app" && <>
          <div className="phone-app-header"><span>NORD / WELLNESS</span><Bell size={16}/></div>
          <p className="phone-overline">{ro?"UN MOMENT PENTRU TINE":"A MOMENT FOR YOURSELF"}</p>
          <h4>{ro?"Următoarea ta pauză.":"Your next pause."}</h4>
          <div className="phone-booking-hero"><div className="phone-orb"/><span>{ro?"Ritual de relaxare":"Relaxation ritual"}</span><strong>60 min</strong><i>{ro?"Vezi tratamentul":"View treatment"} ↗</i></div>
          <div className="phone-row-heading"><strong>{ro?"Alege ziua":"Choose a day"}</strong><span>{ro?"Octombrie":"October"}</span></div>
          <div className="phone-date-grid">{(ro ? ["L","M","M","J","V"] : ["M","T","W","T","F"]).map((day,i)=><span key={i} className={i===2?"is-selected":""}><small>{day}</small><strong>{12+i}</strong></span>)}</div>
          <div className="phone-time-grid"><span>10:00</span><span className="is-selected">14:30</span><span>16:00</span></div>
          <div className="phone-primary">{ro?"Continuă programarea":"Continue booking"}<ArrowRight size={14}/></div>
        </>}
        {mode === "game" && <>
          <div className="phone-app-header"><span>ORBIT / EXPEDITION</span><Gamepad2 size={17}/></div>
          <div className="game-hud"><span>SECTOR 07</span><span>◈ 2 450 XP</span></div>
          <h4>{ro?"Dincolo de orizont.":"Beyond the horizon."}</h4>
          <div className="phone-game-world"><svg viewBox="0 0 250 240" fill="none" aria-hidden="true"><circle cx="174" cy="65" r="40" fill="#75d8de"/><circle cx="174" cy="65" r="52" stroke="#75d8de" opacity=".25"/><path d="m0 199 70-105 68 91 47-47 65 61v41H0Z" fill="#204b62"/><path d="m0 224 85-57 40 43 42-28 83 42v16H0Z" fill="#142c43"/><path d="m110 118 15-46 16 46-16-9Z" fill="#f5e9c8"/><path d="m125 118 0 35" stroke="#f5c67b" strokeWidth="4"/><path d="M31 39h4M55 70h3M210 23h4M84 26h2M216 114h3" stroke="white" strokeWidth="2"/></svg><span>{ro?"Explorează planeta Aurora":"Explore planet Aurora"}</span></div>
          <div className="game-mission"><Target size={18}/><div><strong>{ro?"Misiune: prima aterizare":"Mission: first landing"}</strong><span>{ro?"Navighează · Descoperă · Evoluează":"Navigate · Discover · Evolve"}</span></div></div>
          <div className="phone-primary">{ro?"Continuă aventura":"Continue adventure"}<CirclePlay size={16}/></div>
        </>}
        {mode === "crm" && <>
          <div className="phone-app-header"><span>FLOW / CRM</span><SlidersHorizontal size={16}/></div>
          <p className="phone-overline">{ro?"RELAȚII, ORGANIZATE":"RELATIONSHIPS, ORGANISED"}</p><h4>{ro?"Fiecare oportunitate, la locul ei.":"Every opportunity, in its place."}</h4>
          <div className="crm-summary"><span><strong>03</strong>{ro?"De urmărit":"To review"}</span><span><strong>02</strong>{ro?"Oferte":"Proposals"}</span><span><strong>01</strong>{ro?"Întâlnire":"Meeting"}</span></div>
          <div className="phone-row-heading"><strong>{ro?"Următoarele acțiuni":"Next actions"}</strong><span>{ro?"Astăzi":"Today"}</span></div>
          {[["WE",ro?"Website de prezentare":"Presentation website",ro?"Brief primit · Calificare":"Brief received · Qualify"],["EC",ro?"Magazin online":"Online store",ro?"Ofertă în lucru · Revizuire":"Draft proposal · Review"],["AP",ro?"Aplicație mobilă":"Mobile app",ro?"Discuție tehnică · 14:30":"Technical call · 14:30"]].map(([icon,title,sub],i)=><div className="phone-crm-card" key={icon}><i>{icon}</i><div><strong>{title}</strong><span>{sub}</span></div><span className={`crm-dot crm-dot--${i}`}/></div>)}
          <div className="phone-primary"><Check size={15}/>{ro?"Activitatea este sincronizată":"Activity is synced"}</div>
        </>}
        {mode === "platform" && <>
          <div className="phone-app-header"><span>SPACE / WORKSPACE</span><Layers3 size={16}/></div>
          <p className="phone-overline">{ro?"TOTUL, CONECTAT":"EVERYTHING, CONNECTED"}</p><h4>{ro?"Echipa ta. Un singur spațiu.":"Your team. One shared space."}</h4>
          <div className="platform-project"><span>{ro?"PROIECT ACTIV":"ACTIVE PROJECT"}</span><strong>{ro?"Lansarea colecției":"Collection launch"}</strong><div><i/><i/><i/><i/></div><small>{ro?"Design → Conținut → Livrare":"Design → Content → Delivery"}</small></div>
          <div className="platform-modules">{[[FileText,ro?"Documente":"Documents"],[Users,ro?"Echipă":"Team"],[Workflow,ro?"Fluxuri":"Workflows"],[MessageCircle,ro?"Discuții":"Discussions"]].map(([Icon,label],i)=>{const Glyph=Icon as typeof FileText;return <div key={i}><Glyph size={19}/><strong>{label as string}</strong><ArrowUpRight size={11}/></div>;})}</div>
          <div className="platform-permission"><ShieldCheck size={15}/><span>{ro?"Acces pe roluri · Date comune":"Role-based access · Shared data"}</span></div>
        </>}
      </div>
      <PhoneNav mode={mode}/><div className="phone-home-indicator" aria-hidden="true"/>
    </div>
  );
}

export function TabletScreen({ mode, ro }: { mode: AutomationMode; ro: boolean }) {
  const titles = {
    social: ro?"Conținut pregătit. Tu dai direcția.":"Content ready. You set the direction.",
    leads: ro?"Oportunități relevante, cu context.":"Relevant opportunities, with context.",
    chat: ro?"Conversația continuă, oriunde.":"The conversation continues, everywhere.",
    other: ro?"Mai puține operațiuni repetitive.":"Fewer repetitive operations.",
  };
  const names = {social:ro?"Social Media":"Social Media",leads:"Lead Intelligence",chat:"AI Inbox",other:ro?"Automatizări":"Automations"};
  return (
    <div className={`showcase-tablet-ui tablet-ui--${mode}`} data-screen-variant={mode}>
      <aside className="tablet-sidebar"><div className="tablet-ai-mark"><Sparkles size={19}/></div><span>AVY / OS</span>{[Layers3,CalendarDays,Target,MessageCircle,Workflow].map((Icon,index)=><i key={index} className={index===({social:1,leads:2,chat:3,other:4}[mode])?"is-selected":""}><Icon size={18}/></i>)}<b><ShieldCheck size={16}/></b></aside>
      <div className="tablet-workspace" key={mode}>
        <div className="tablet-topbar"><span>Workspace / {names[mode]}</span><span className="tablet-preview-label">{ro?"EXEMPLU INTERFAȚĂ":"INTERFACE EXAMPLE"}</span><span className="tablet-avatar">AV</span></div>
        <div className="tablet-heading"><div><p>{names[mode]}</p><h4>{titles[mode]}</h4></div><span className="tablet-status"><i/>{ro?"Control uman":"Human control"}</span></div>
        {mode === "social" && <div className="social-workspace">
          <div className="tablet-panel"><div className="tablet-panel-heading"><strong>{ro?"Calendar editorial":"Editorial calendar"}</strong><span>{ro?"Săptămâna aceasta":"This week"} ↗</span></div><div className="social-calendar">{[ro?"LUNI":"MON",ro?"MIERCURI":"WED",ro?"VINERI":"FRI"].map((day,i)=><div key={day}><span>{day}</span><div className={`social-creative creative--${i}`}><span>{["BRAND / STORY","IDEA → IMPACT","BEHIND / THE WORK"][i]}</span><strong>{[ro?"O idee. O identitate.":"One idea. One identity.",ro?"Din detaliu în experiență.":"From detail to experience.",ro?"Oameni care construiesc.":"People who build."][i]}</strong><i/></div><strong>{[ro?"Povestea brandului":"Brand story",ro?"Carusel educativ":"Educational carousel",ro?"Din culise":"Behind the scenes"][i]}</strong><small>{["Instagram · Feed","LinkedIn · Carousel","Facebook · Story"][i]}</small></div>)}</div></div>
          <div className="tablet-approval"><span><ShieldCheck size={16}/>{ro?"Ton, format și canal verificate":"Tone, format and channel checked"}</span><span>{ro?"În așteptarea aprobării":"Awaiting approval"}<b>{ro?"Revizuiește":"Review"}<ArrowUpRight size={12}/></b></span></div>
        </div>}
        {mode === "leads" && <div className="leads-workspace">
          <div className="leads-filter"><Search size={14}/><span>{ro?"Caută afaceri potrivite profilului tău":"Find businesses matching your profile"}</span><SlidersHorizontal size={14}/></div>
          <div className="leads-pipeline">{[ro?"Identificate":"Discovered",ro?"Calificate":"Qualified",ro?"Pregătite de contact":"Ready for contact"].map((stage,i)=><div key={stage}><p><i/>{stage}<span>0{i+1}</span></p><div className="lead-profile"><span className="lead-monogram">{["AR","ST","NC"][i]}</span><strong>{[ro?"Atelier de arhitectură":"Architecture studio",ro?"Studio wellness":"Wellness studio",ro?"Cafenea de specialitate":"Specialty café"][i]}</strong><small><MapPin size={10}/>{["Iași","Cluj-Napoca","Brașov"][i]}</small><hr/><span>{[ro?"Context: portofoliu nou":"Context: new portfolio",ro?"Nevoie: programări online":"Need: online bookings",ro?"Semnal: locație nouă":"Signal: new location"][i]}</span><div className="lead-next"><ArrowRight size={12}/>{[ro?"Verifică sursa publică":"Verify public source",ro?"Confirmă relevanța":"Confirm relevance",ro?"Aprobă mesajul propus":"Approve draft message"][i]}</div></div></div>)}</div>
          <div className="tablet-footnote"><ShieldCheck size={13}/>{ro?"Verificare surse · Eliminare duplicate · Contactare cu aprobare":"Source checks · Deduplication · Approval before contact"}</div>
        </div>}
        {mode === "chat" && <div className="chat-workspace">
          <div className="chat-threads"><span>{ro?"TOATE CONVERSAȚIILE":"ALL CONVERSATIONS"}</span><div className="is-selected"><MessageCircle/><strong>WhatsApp<small>{ro?"Întrebare despre servicii":"Service enquiry"}</small></strong><i/></div><div><Globe2/><strong>Website<small>{ro?"O nouă cerere":"A new enquiry"}</small></strong></div><div className="chat-knowledge"><FileText size={15}/><span>{ro?"Bază de cunoștințe":"Knowledge base"}<small>{ro?"Servicii · Întrebări · Contact":"Services · Questions · Contact"}</small></span></div></div>
          <div className="chat-conversation"><div className="chat-conversation-heading"><span><i/>WhatsApp</span><strong>{ro?"Asistent AI + echipa ta":"AI assistant + your team"}</strong></div><div className="chat-bubble">{ro?"Bună! Aș vrea un site pentru atelierul meu.":"Hi! I'd like a website for my studio."}</div><div className="chat-bubble is-ai"><Sparkles size={12}/><span>{ro?"Bună! Ce servicii oferi și ce ai vrea să poată face vizitatorii pe site?":"Hi! What services do you offer, and what would you like visitors to do on the site?"}</span></div><div className="chat-bubble">{ro?"Să vadă proiectele și să ceară o ofertă.":"View projects and request a quote."}</div><div className="chat-handoff"><Users size={13}/>{ro?"Context salvat · Predare către echipă":"Context saved · Handoff to the team"}</div><div className="chat-compose"><span>{ro?"Răspunde sau preia conversația…":"Reply or take over the conversation…"}</span><Send size={13}/></div></div>
        </div>}
        {mode === "other" && <div className="flow-workspace"><div className="tablet-panel-heading"><strong>{ro?"Cerere → Organizare → Confirmare":"Request → Organise → Confirm"}</strong><span>{ro?"Flux configurabil":"Configurable workflow"}</span></div><div className="workflow-canvas">{[[FileText,ro?"Formular primit":"Form received",ro?"Date și atașamente":"Data and attachments"],[ShieldCheck,ro?"Validare":"Validation",ro?"Câmpuri și duplicate":"Fields and duplicates"],[Layers3,ro?"CRM actualizat":"CRM updated",ro?"Înregistrare + responsabil":"Record + owner"],[Bell,ro?"Echipă notificată":"Team notified",ro?"Context pentru următorul pas":"Context for the next step"]].map(([Icon,title,sub],i)=>{const Glyph=Icon as typeof FileText;return <div className="workflow-node" key={i}><i><Glyph size={21}/></i><strong>{title as string}</strong><small>{sub as string}</small>{i<3&&<ArrowRight className="workflow-connector"/>}</div>;})}</div><div className="workflow-rules"><span><Zap size={14}/>{ro?"Declanșatori clari":"Clear triggers"}</span><span><Workflow size={14}/>{ro?"Reguli configurate":"Configured rules"}</span><span><Check size={14}/>{ro?"Istoric și verificare":"History and checks"}</span></div><div className="tablet-footnote">{ro?"Integrări adaptate procesului tău, cu aprobare acolo unde este necesară.":"Integrations tailored to your process, with approval where required."}</div></div>}
      </div>
    </div>
  );
}

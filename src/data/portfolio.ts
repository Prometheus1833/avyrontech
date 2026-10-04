import cutiutamagica from "@/assets/portfolio/cutiutamagica.jpg";
import miago from "@/assets/portfolio/miago.jpg";
import ruller from "@/assets/portfolio/ruller.jpg";
import clarlumanari from "@/assets/portfolio/clarlumanari.jpg";
import plaseieftineiasi from "@/assets/portfolio/plaseieftineiasi.jpg";
import flawlesstudio from "@/assets/portfolio/flawlesstudio.jpg";
import retuvo from "@/assets/portfolio/retuvo.jpg";
import cofetariadulcedor from "@/assets/portfolio/cofetariadulcedor.jpg";
import studiomaradesign from "@/assets/portfolio/studiomaradesign.jpg";
import pensiuneacerbul from "@/assets/portfolio/pensiuneacerbul.jpg";
import luminaBotez from "@/assets/portfolio/lumina-botez.webp";
import verdia from "@/assets/portfolio/verdia.webp";
import pungiplast from "@/assets/portfolio/pungiplast.webp";
import detectivIcm from "@/assets/portfolio/detectiv-icm.webp";
import craitaDinulescu from "@/assets/portfolio/craita-dinulescu.webp";
import tipografiaUmc from "@/assets/portfolio/tipografia-umc.webp";
import cgcImobiliare from "@/assets/portfolio/cgc-imobiliare.jpg";
import cabaneSucevita from "@/assets/portfolio/cabane-sucevita.jpg";

type L = { ro: string; en: string };
export type PortfolioItem = {
  key: string;
  name: string;
  /** Link real: extern (https://…) sau pagină exemplu internă (/examples/…). */
  href: string;
  external: boolean;
  image: string;
  tag: L;
  desc: L;
};

// Sursa unică pentru proiectele afișate public (fosta pagină Portofoliu).
export const PORTFOLIO: PortfolioItem[] = [
  { key: "cutiutamagica", name: "Cutiutamagica.eu", href: "https://cutiutamagica.eu", external: true, image: cutiutamagica,
    tag: { ro: "Magazin online + comenzi", en: "Online store + orders" },
    desc: { ro: "Cutiuțe muzicale artizanale din lemn: catalog, poveste de brand, livrare prin curier sau Easybox.", en: "Artisan wooden music boxes: catalog, brand story, courier or Easybox delivery." } },
  { key: "ruller", name: "Ruller.eu", href: "https://ruller.eu", external: true, image: ruller,
    tag: { ro: "Site + programări", en: "Site + bookings" },
    desc: { ro: "Barber shop premium din Iași: meniu servicii, galerie și programări prin Mero și WhatsApp.", en: "Premium barber shop in Iași: services, gallery and bookings via Mero and WhatsApp." } },
  { key: "clarlumanari", name: "Clarlumanari.ro", href: "https://clarlumanari.ro", external: true, image: clarlumanari,
    tag: { ro: "Brand artizanal", en: "Artisan brand" },
    desc: { ro: "Lumânări parfumate turnate manual: catalog, poveste de brand și comenzi rapide.", en: "Hand-poured scented candles: catalog, brand story and quick orders." } },
  { key: "flawlesstudio", name: "Flawlesstudio.ro", href: "https://www.flawlesstudio.ro", external: true, image: flawlesstudio,
    tag: { ro: "Site + programări multi-sediu", en: "Site + multi-location bookings" },
    desc: { ro: "Studio de epilare și tratamente faciale din Iași, cu identitate vizuală premium.", en: "Laser hair removal and facial studio in Iași with a premium visual identity." } },
  { key: "plaseieftineiasi", name: "Plaseieftineiasi.ro", href: "https://plaseieftineiasi.ro", external: true, image: plaseieftineiasi,
    tag: { ro: "E-commerce local", en: "Local e-commerce" },
    desc: { ro: "Plase anti-insecte la comandă în Iași: comenzi rapide, contact WhatsApp și montaj.", en: "Custom insect screens in Iași: quick orders, WhatsApp contact and installation." } },
  { key: "retuvo", name: "Retuvo.ro", href: "https://retuvo.ro", external: true, image: retuvo,
    tag: { ro: "Site + aplicație", en: "Site + app" },
    desc: { ro: "Digitalizează SGR: scanezi bonul și primești valoarea garanției direct în cont.", en: "Digital deposit-return: scan the receipt and get the deposit straight to your account." } },
  { key: "miago", name: "Miago.ro", href: "https://miago.ro", external: true, image: miago,
    tag: { ro: "Platformă web + aplicație", en: "Web platform + app" },
    desc: { ro: "Anunțuri auto (autoturisme, camioane, utilaje) într-un concept nou și intuitiv.", en: "Vehicle listings (cars, trucks, machinery) in a fresh, intuitive concept." } },
  { key: "lumina-botez", name: "Lumina Botez", href: "https://demo1.avyron.eu", external: true, image: luminaBotez,
    tag: { ro: "Atelier pentru evenimente", en: "Event atelier" },
    desc: { ro: "Lumânări pentru botez și cununie, mărturii și trusouri personalizate, cu ofertare directă.", en: "Baptism and wedding candles, favors and personalized sets, with direct quote requests." } },
  { key: "verdia", name: "VERDIA", href: "https://demo2.avyron.eu", external: true, image: verdia,
    tag: { ro: "Magazin naturist", en: "Natural products store" },
    desc: { ro: "Suplimente din plante organizate după nevoie, catalog clar, ghid de alegere și cumpărare online.", en: "Plant-based supplements organized by need, with a clear catalog, selection guide and online shopping." } },
  { key: "pungiplast", name: "PungiPlast", href: "https://exemplu1.avyron.eu", external: true, image: pungiplast,
    tag: { ro: "Producător și distribuție", en: "Manufacturing and distribution" },
    desc: { ro: "Catalog B2B de pungi pentru magazine și distribuitori, cu producție proprie și ofertare rapidă.", en: "B2B bag catalog for retailers and distributors, with in-house manufacturing and fast quotes." } },
  { key: "detectiv-icm", name: "Detectiv ICM", href: "https://detectiv-icm.avyron.eu", external: true, image: detectivIcm,
    tag: { ro: "Investigații private", en: "Private investigations" },
    desc: { ro: "Servicii de detectiv licențiat și consultanță criminologică, prezentate sobru și confidențial.", en: "Licensed private investigation and criminology consulting services, presented discreetly and professionally." } },
  { key: "craita-dinulescu", name: "Crăița Dinulescu", href: "https://dinulescu-craita-consultant-financiar.avyron.eu", external: true, image: craitaDinulescu,
    tag: { ro: "Consultanță financiară", en: "Financial consulting" },
    desc: { ro: "Consultanță financiară, fiscală și contabilă pentru antreprenori, cu programare directă a discuției.", en: "Financial, tax and accounting consulting for entrepreneurs, with direct consultation booking." } },
  { key: "tipografia-umc", name: "Tipografia UMC", href: "https://umc.avyron.eu", external: true, image: tipografiaUmc,
    tag: { ro: "Tipografie industrială", en: "Industrial printing" },
    desc: { ro: "Tipar offset, digital și large format, ambalaje și finisări premium într-un flux complet de producție.", en: "Offset, digital and large-format printing, packaging and premium finishing in one production workflow." } },
  { key: "cgc-imobiliare", name: "CGC Imobiliare", href: "https://demo3.avyron.eu", external: true, image: cgcImobiliare,
    tag: { ro: "Consultanță imobiliară", en: "Property advisory" },
    desc: { ro: "Proprietăți atent selectate, consultanță și coordonarea clară a tranzacției, într-o prezentare premium.", en: "Carefully selected properties, advisory and clear transaction coordination in a premium presentation." } },
  { key: "cabane-sucevita", name: "Cabane Sucevița", href: "https://demo4.avyron.eu", external: true, image: cabaneSucevita,
    tag: { ro: "Construcții din lemn", en: "Timber construction" },
    desc: { ro: "Case și cabane din bușteni, foișoare și sculpturi în lemn realizate în Bucovina.", en: "Log homes, cabins, gazebos and wood sculptures crafted in Bucovina." } },
  { key: "cofetariadulcedor", name: "Cofetăria Dulce Dor", href: "/examples/cofetariadulcedor.ro", external: false, image: cofetariadulcedor,
    tag: { ro: "Cofetărie artizanală", en: "Artisan pastry shop" },
    desc: { ro: "Meniu sezonier, torturi pe comandă și comenzi instant prin WhatsApp.", en: "Seasonal menu, custom cakes and instant WhatsApp orders." } },
  { key: "studiomaradesign", name: "Studio Mara Design", href: "/examples/studiomaradesign.ro", external: false, image: studiomaradesign,
    tag: { ro: "Design interior", en: "Interior design" },
    desc: { ro: "Proiecte rezidențiale și comerciale, proces transparent și formular de consultanță.", en: "Residential and commercial projects, clear process and consultation form." } },
  { key: "pensiuneacerbul", name: "Pensiunea Cerbul", href: "/examples/pensiuneacerbul.ro", external: false, image: pensiuneacerbul,
    tag: { ro: "Turism și rezervări", en: "Travel and bookings" },
    desc: { ro: "Camere, facilități și rezervări directe pentru o pensiune montană.", en: "Rooms, amenities and direct bookings for a mountain guesthouse." } },
];

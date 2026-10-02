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
  { key: "cofetariadulcedor", name: "cofetariadulcedor.ro", href: "/examples/cofetariadulcedor.ro", external: false, image: cofetariadulcedor,
    tag: { ro: "Exemplu · Cofetărie", en: "Example · Pastry shop" },
    desc: { ro: "Meniu sezonier, torturi pe comandă și comenzi instant prin WhatsApp.", en: "Seasonal menu, custom cakes and instant WhatsApp orders." } },
  { key: "studiomaradesign", name: "studiomaradesign.ro", href: "/examples/studiomaradesign.ro", external: false, image: studiomaradesign,
    tag: { ro: "Exemplu · Design interior", en: "Example · Interior design" },
    desc: { ro: "Proiecte rezidențiale și comerciale, proces transparent și formular de consultanță.", en: "Residential and commercial projects, clear process and consultation form." } },
  { key: "pensiuneacerbul", name: "pensiuneacerbul.ro", href: "/examples/pensiuneacerbul.ro", external: false, image: pensiuneacerbul,
    tag: { ro: "Exemplu · Pensiune", en: "Example · Guesthouse" },
    desc: { ro: "Camere, facilități și rezervări directe pentru o pensiune montană.", en: "Rooms, amenities and direct bookings for a mountain guesthouse." } },
];

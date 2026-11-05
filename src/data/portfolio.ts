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

import defaults from "@/shared/exampleCarouselDefaults.json";

export const PORTFOLIO_IMAGES: Record<string,string> = {
  "cutiutamagica": cutiutamagica,
  "miago": miago,
  "ruller": ruller,
  "clarlumanari": clarlumanari,
  "plaseieftineiasi": plaseieftineiasi,
  "flawlesstudio": flawlesstudio,
  "retuvo": retuvo,
  "cofetariadulcedor": cofetariadulcedor,
  "studiomaradesign": studiomaradesign,
  "pensiuneacerbul": pensiuneacerbul,
  "lumina-botez": luminaBotez,
  "verdia": verdia,
  "pungiplast": pungiplast,
  "detectiv-icm": detectivIcm,
  "craita-dinulescu": craitaDinulescu,
  "tipografia-umc": tipografiaUmc,
  "cgc-imobiliare": cgcImobiliare,
  "cabane-sucevita": cabaneSucevita
};
export type PortfolioItem = {key:string;name:string;href:string;external:boolean;image:string;tag:{ro:string;en:string};desc:{ro:string;en:string}};
export const PORTFOLIO: PortfolioItem[] = defaults.items.map(item=>({...item,external:item.href.startsWith("https://"),image:PORTFOLIO_IMAGES[item.image.slice(8)]}));

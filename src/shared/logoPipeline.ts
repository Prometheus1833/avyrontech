import type { LogoConfig } from "../features/produse/components/logoConfig";
export const LOGO_PRODUCT_SLUG="logo-studio-3d";
export const LOGO_VARIANT_COUNT=4;
export function cleanLogoProductConfig(raw:unknown):LogoConfig|null {
  if(!raw||typeof raw!=="object")return null;
  const b=raw as Record<string,unknown>;
  if(typeof b.text!=="string"||!b.text.trim()||b.text.length>40||(/[<>]/.test(b.text)||[...b.text].some(char=>char.charCodeAt(0)<32))||!["none","dot","ring","triangle","monogram"].includes(String(b.symbol))||!["glass","metal","neon","matte","particles"].includes(String(b.material))||!/^#[0-9a-f]{6}$/i.test(String(b.colorA))||!/^#[0-9a-f]{6}$/i.test(String(b.colorB))||typeof b.depth!=="number"||!Number.isFinite(b.depth)||b.depth<0||b.depth>80||typeof b.letterSpacing!=="number"||!Number.isFinite(b.letterSpacing)||b.letterSpacing<0||b.letterSpacing>32||typeof b.spin!=="boolean")return null;
  return {text:b.text.trim(),symbol:b.symbol as LogoConfig["symbol"],material:b.material as LogoConfig["material"],colorA:String(b.colorA),colorB:String(b.colorB),depth:b.depth,spin:b.spin,letterSpacing:b.letterSpacing};
}
export function logoRequestMode(lead:{product:string|null;source:string|null;config_json?:string|null}):"2d"|"3d"|null {
  if(lead.product===LOGO_PRODUCT_SLUG&&lead.source==="logo-product:3d")return "3d";
  if(lead.product!=="logo-studio"||!lead.source?.startsWith("logo-studio:"))return null;
  try{return JSON.parse(lead.config_json||"{}").kind==="static"?"2d":null;}catch{return null;}
}

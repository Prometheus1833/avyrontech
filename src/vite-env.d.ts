/// <reference types="vite/client" />
/// <reference types="vite-plugin-glsl/ext" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_PROJECT_ID: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_GOOGLE_ANALYTICS_ID?: string;
  readonly VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY?: string;
  /** "0" dezactivează temporar Biblioteca într-un build de producție. */
  readonly VITE_BIBLIOTECA?: string;
  /** "1" face ruta de lucru Produse Avyron accesibilă într-un build (noindex). */
  readonly VITE_PRODUSE?: string;
  /** "0" retrage temporar Produse Avyron din suprafața publică. */
  readonly VITE_PRODUSE_LIVE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  dataLayer: unknown[];
  gtag: (...args: unknown[]) => void;
}

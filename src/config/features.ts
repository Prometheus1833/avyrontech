/**
 * Steaguri de funcționalitate.
 *
 * Produse Avyron (Artefacte) se construiește separat până la lansare:
 *  - `produse` — ruta de lucru există (în dezvoltare sau cu VITE_PRODUSE=1),
 *    cu `noindex`, în afara sitemap-ului și a prerenderului;
 *  - `produseLive` — pagina e publicată: prerender, sitemap, hreflang, card pe
 *    home. Se aprinde doar cu VITE_PRODUSE_LIVE=1, deci lansarea e o singură
 *    variabilă de mediu.
 */
// Fișierul e citit și de programul Worker-ului (prin i18n/routes), unde
// tipurile Vite nu există, așa că `import.meta.env` se citește defensiv.
const env = (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env ?? {};
const PRODUSE_LIVE = env.VITE_PRODUSE_LIVE === "1";
const PRODUSE_PREVIEW = PRODUSE_LIVE || env.VITE_PRODUSE === "1";

export const FEATURES = {
  produse: PRODUSE_PREVIEW || env.DEV === true,
  produseLive: PRODUSE_LIVE,
} as const;

export type FeatureName = keyof typeof FEATURES;

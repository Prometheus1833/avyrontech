/**
 * Steaguri de funcționalitate.
 *
 * Biblioteca Avyron se construiește etapizat (decizia D7). Două steaguri, nu
 * unul, pentru că sunt două întrebări diferite:
 *
 *  - `biblioteca` — ruta există și poate fi deschisă. Pornită în dezvoltare.
 *  - `bibliotecaLive` — pagina e lansată: intră în prerender, în sitemap, în
 *    hreflang și devine indexabilă. Se aprinde doar cu VITE_BIBLIOTECA=1 la
 *    build, deci lansarea e o singură variabilă de mediu, nu un set de editări.
 */
const LIVE = import.meta.env.VITE_BIBLIOTECA === "1";

export const FEATURES = {
  /** Pagina /biblioteca și efectele ei 3D sunt accesibile. */
  biblioteca: LIVE || import.meta.env.DEV,
  /** Pagina e publicată: indexabilă, în sitemap și în comutatorul de limbă. */
  bibliotecaLive: LIVE,
} as const;

export type FeatureName = keyof typeof FEATURES;

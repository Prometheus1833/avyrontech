/**
 * Cifrele afișate în afara paginii Produse (cardul din home).
 *
 * Fișierul e generat de `scripts/produse-catalog-sql.mjs`: `items.ts` are
 * câteva zeci de kB și nu are ce căuta în chunk-ul paginii principale, dar
 * cifrele trebuie să rămână ale catalogului. Testul `src/test/produse.test.ts`
 * verifică sincronizarea.
 */
export const PRODUSE_COUNTS = {
  total: 87,
  free: 62,
} as const;

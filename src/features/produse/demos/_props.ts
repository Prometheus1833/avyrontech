/**
 * Citirea valorilor din Editor Mode: props-urile vin dintr-un obiect liber,
 * așa că fiecare demo le trece prin filtrele astea și primește o valoare sigură.
 */

export const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
export const str = (v: unknown, fallback: string) => (typeof v === "string" && v.length ? v : fallback);
export const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

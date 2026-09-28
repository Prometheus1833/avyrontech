import { useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";

/**
 * Abonamentele au prețul de bază în RON (bani). Pagina trebuie să arate mereu
 * și echivalentul în cealaltă monedă, cu cursul BCE livrat de Worker.
 */
export function useDualPrice(locale = "ro-RO") {
  const currencyApi = useCurrency(locale);
  const { currency, rate } = currencyApi;

  return useMemo(() => {
    const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    return {
      ...currencyApi,
      /** Prețul în moneda aleasă de vizitator, rotunjit la unități. */
      primary: (cents: number) => currency === "RON"
        ? `${nf.format(Math.round(cents / 100))} RON`
        : `${nf.format(Math.round(cents / 100 / rate))} €`,
      /** Aceeași sumă, în cealaltă monedă. */
      secondary: (cents: number) => currency === "RON"
        ? `${nf.format(Math.round(cents / 100 / rate))} €`
        : `${nf.format(Math.round(cents / 100))} RON`,
      /** Prețul afișat este o conversie, nu suma de pe factură. */
      converted: currency === "EUR",
      /** Valoarea numerică în EUR, pentru datele structurate. */
      eurValue: (cents: number) => Math.round(cents / 100 / rate),
    };
  }, [currencyApi, currency, rate, locale]);
}

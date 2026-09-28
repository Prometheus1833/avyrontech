import { useMemo, useState } from "react";
import { ShoppingCart, Trash2, X } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { ITEM_BY_SLUG } from "../data/items";
import { PLAN_BY_ID } from "../data/plans";
import { EUR_FOR_RON } from "../data/taxonomy";
import { store, useProduseStore } from "../lib/store";
import { useProduseAccount } from "../lib/account";

/**
 * Coșul paginii. Alegerile stau local; plata trece prin Worker, care
 * recalculează prețul din catalog și deschide o sesiune Stripe. Cât timp
 * cheile de plată lipsesc, comanda tot se înregistrează și rămâne calea pe
 * WhatsApp, ca să nu pierdem cererea.
 */
export default function CartDrawer({ lang, open, onOpenChange }: { lang: Lang; open: boolean; onOpenChange: (v: boolean) => void }) {
  const ro = lang === "ro";
  const cart = useProduseStore((s) => s.cart);
  const account = useProduseAccount();
  const [paying, setPaying] = useState(false);
  const [payNotice, setPayNotice] = useState<string | null>(null);

  /**
   * Plata pornește de la prima linie din coș: Worker-ul creează o comandă pe
   * produs sau pe parteneriat. Fără cont nu există comandă, deci trimitem
   * întâi la autentificare; fără chei Stripe comanda rămâne înregistrată.
   */
  const pay = async () => {
    const first = cart[0];
    if (!first) return;
    if (account.signedIn === false) {
      setPayNotice(ro ? "Intră în cont ca să finalizezi plata — durează un minut." : "Sign in to complete the payment — it takes a minute.");
      window.setTimeout(() => {
        window.location.href = "/autentificare";
      }, 1200);
      return;
    }
    setPaying(true);
    setPayNotice(null);
    try {
      const result = await account.checkout(first.kind === "plan" ? { kind: "plan", id: first.plan } : { kind: "item", id: first.slug });
      if (result.ok && result.url) {
        window.location.href = result.url;
        return;
      }
      if (result.code === "payments_unconfigured") {
        setPayNotice(
          ro
            ? "Comanda a fost înregistrată. Plata cu cardul se activează la lansare — îți trimitem link de plată sau proformă."
            : "Your order is recorded. Card payment goes live at launch — we will send a payment link or a proforma.",
        );
        return;
      }
      setPayNotice(ro ? "Nu am putut deschide plata. Încearcă pe WhatsApp, mai jos." : "We could not open the payment. Try WhatsApp below.");
    } finally {
      setPaying(false);
    }
  };

  const lines = useMemo(
    () =>
      cart.map((line, index) => {
        if (line.kind === "plan") {
          const plan = PLAN_BY_ID.get(line.plan);
          return { index, name: plan?.name ?? line.plan, detail: ro ? "parteneriat anual" : "annual partnership", ron: plan?.priceRon ?? 0, eur: plan?.priceEur ?? 0 };
        }
        const item = ITEM_BY_SLUG.get(line.slug);
        return {
          index,
          name: item?.name[lang] ?? line.slug,
          detail: ro ? "licență pe viață" : "lifetime licence",
          ron: item?.priceRon ?? 0,
          eur: item?.priceRon ? EUR_FOR_RON[item.priceRon] : 0,
        };
      }),
    [cart, lang, ro],
  );

  const totalRon = lines.reduce((sum, line) => sum + line.ron, 0);
  const totalEur = lines.reduce((sum, line) => sum + line.eur, 0);

  const whatsapp = `https://wa.me/40734605055?text=${encodeURIComponent(
    (ro ? "Salut! Vreau să comand din Produse Avyron:\n" : "Hi! I'd like to order from Avyron Products:\n") +
      lines.map((l) => `• ${l.name} — ${l.ron} lei`).join("\n") +
      `\n${ro ? "Total" : "Total"}: ${totalRon} lei (${totalEur} €)`,
  )}`;

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="pa-glass fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg transition hover:-translate-y-0.5"
        aria-label={ro ? `Coș (${cart.length})` : `Cart (${cart.length})`}
      >
        <ShoppingCart className="size-4" aria-hidden />
        {cart.length > 0 && <span className="pa-mono tabular-nums">{cart.length}</span>}
        <span className="hidden sm:inline">{ro ? "Coș" : "Cart"}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
          <aside
            className="pa-glass absolute bottom-0 right-0 top-0 w-full max-w-sm overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={ro ? "Coș" : "Cart"}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">{ro ? "Coșul tău" : "Your cart"}</h2>
              <button type="button" onClick={() => onOpenChange(false)} aria-label={ro ? "Închide" : "Close"} className="rounded-full p-1.5 text-muted-foreground hover:bg-foreground/10">
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {lines.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                {ro ? "Coșul e gol. Adaugă un parteneriat sau un produs premium și îl găsești aici." : "Your cart is empty. Add a partnership or a premium product and it shows up here."}
              </p>
            ) : (
              <>
                <ul className="mt-4 grid list-none gap-2 p-0">
                  {lines.map((line) => (
                    <li key={`${line.name}-${line.index}`} className="flex items-start gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{line.name}</p>
                        <p className="text-[11px] text-muted-foreground">{line.detail}</p>
                      </div>
                      <p className="pa-mono whitespace-nowrap text-sm tabular-nums text-foreground">{line.ron} lei</p>
                      <button
                        type="button"
                        onClick={() => store.removeFromCart(line.index)}
                        aria-label={ro ? "Scoate din coș" : "Remove"}
                        className="rounded-lg p-1 text-muted-foreground hover:text-red-300"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between border-t border-foreground/10 pt-3">
                  <span className="text-sm text-muted-foreground">{ro ? "Total" : "Total"}</span>
                  <span className="pa-mono text-base font-semibold tabular-nums text-foreground">
                    {totalRon} lei · {totalEur} €
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void pay()}
                  disabled={paying || cart.length === 0}
                  className="mt-3 w-full rounded-full bg-gradient-to-br from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-55"
                  data-ripple
                >
                  {paying ? (ro ? "Se pregătește plata…" : "Preparing payment…") : ro ? "Plătește cu cardul" : "Pay by card"}
                </button>
                {payNotice && (
                  <p className="mt-2 rounded-xl border border-brand/25 bg-brand/[0.07] px-3 py-2 text-[11.5px] text-foreground" role="status">
                    {payNotice}
                  </p>
                )}
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-2 block w-full rounded-full border border-foreground/15 px-4 py-2.5 text-center text-sm font-semibold text-foreground" data-ripple>
                  {ro ? "Comandă pe WhatsApp" : "Order on WhatsApp"}
                </a>
                <button type="button" onClick={() => store.clearCart()} className="mt-2 w-full text-center text-[11px] text-muted-foreground underline underline-offset-4">
                  {ro ? "Golește coșul" : "Empty the cart"}
                </button>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/80">
                  {ro
                    ? "La lansare: card, Apple Pay, Google Pay și Revolut Pay prin Stripe, factură automată și e-Factura. Firmele pot cere proformă."
                    : "At launch: card, Apple Pay, Google Pay and Revolut Pay through Stripe, automatic invoicing and e-Invoice. Companies can request a proforma."}
                </p>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

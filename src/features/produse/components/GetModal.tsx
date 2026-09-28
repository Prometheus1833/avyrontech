import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, Copy, Lock, MessageCircle, ShoppingCart, X } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { ACCESS_LABEL } from "../data/taxonomy";
import type { CatalogItem, PropValues } from "../data/types";
import { priceLabel } from "../lib/item";
import { guidePath, homePath } from "../lib/paths";
import { store } from "../lib/store";
import { bucketOf, remainingLabel, useProduseAccount } from "../lib/account";
import { sourceFor } from "../lib/source";
import { CopyButton } from "./Primitives";

/**
 * „Obține produsul” — un singur loc pentru toate căile de instalare:
 * CLI (bun/npm/yarn/pnpm), codul sursă, MCP pentru asistenții AI, promptul
 * gata scris și ghidul. Produsele premium arată ce se deblochează cu un
 * parteneriat sau cu o cumpărare separată, fără să livreze codul.
 */

const PMS = [
  { id: "bun", cmd: (url: string) => `bunx --bun shadcn@latest add ${url}` },
  { id: "npm", cmd: (url: string) => `npx shadcn@latest add ${url}` },
  { id: "pnpm", cmd: (url: string) => `pnpm dlx shadcn@latest add ${url}` },
  { id: "yarn", cmd: (url: string) => `yarn dlx shadcn@latest add ${url}` },
] as const;

type Tab = "cli" | "code" | "mcp" | "prompt";

export default function GetModal({
  item,
  values,
  lang,
  open,
  onClose,
}: {
  item: CatalogItem;
  values: PropValues;
  lang: Lang;
  open: boolean;
  onClose: () => void;
}) {
  const ro = lang === "ro";
  const [tab, setTab] = useState<Tab>("cli");
  const [pm, setPm] = useState<(typeof PMS)[number]["id"]>("npm");
  const [source, setSource] = useState<string | null>(null);
  const [inCart, setInCart] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const account = useProduseAccount();
  const registryUrl = `https://avyron.ro/r/${item.slug}.json`;
  const owned = account.state?.purchases.includes(item.slug) ?? false;
  const locked = item.access !== "free" && !owned;

  /**
   * Fiecare obținere e anunțată serverului: el ține contorul zilnic, nu
   * browserul. Fără cont pagina rămâne exact cum era — codul gratuit e public.
   */
  const report = async (channel: "cli" | "code" | "mcp" | "prompt") => {
    store.markCopied(item.slug);
    const result = await account.copy(item.slug, channel);
    if (!result) return;
    if (result.ok) {
      setNotice(remainingLabel(account.state, bucketOf(item), ro));
      return;
    }
    if (result.code === "daily_limit_reached") {
      setNotice(
        ro
          ? "Ai atins limita de azi a parteneriatului. Se resetează la miezul nopții, ora României."
          : "You have reached today's partnership limit. It resets at midnight, Romanian time.",
      );
      return;
    }
    if (result.code === "upgrade_required") {
      setNotice(ro ? "Produsul cere un parteneriat superior sau cumpărare separată." : "This product needs a higher partnership or a separate purchase.");
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || tab !== "code" || locked || source) return;
    void sourceFor(item.slug).then(setSource);
  }, [open, tab, locked, source, item.slug]);

  const prompt = useMemo(
    () =>
      ro
        ? `Adaugă în proiectul meu componenta „${item.name.ro}” din biblioteca Avyron Products (${registryUrl}).
Context: ${item.short.ro}
Tehnologii: ${item.tech.join(", ")}.
Setări dorite: ${JSON.stringify(values)}.
Respectă structura proiectului meu, folosește TypeScript și nu adăuga dependențe în afara: ${(item.deps ?? ["react"]).join(", ")}.`
        : `Add the “${item.name.en}” component from the Avyron Products library (${registryUrl}) to my project.
Context: ${item.short.en}
Technologies: ${item.tech.join(", ")}.
Desired settings: ${JSON.stringify(values)}.
Follow my project structure, use TypeScript and add no dependencies beyond: ${(item.deps ?? ["react"]).join(", ")}.`,
    [item, values, ro, registryUrl],
  );

  const mcpSnippet = `{
  "registries": {
    "@avyron": "https://avyron.ro/r/{name}.json"
  }
}

# apoi, din asistentul tău AI:
npx shadcn@latest add @avyron/${item.slug}`;

  if (!open) return null;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "cli", label: "CLI" },
    { id: "code", label: ro ? "Cod" : "Code" },
    { id: "mcp", label: "MCP" },
    { id: "prompt", label: ro ? "Prompt AI" : "AI prompt" },
  ];

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={ro ? "Obține produsul" : "Get the product"} onClick={onClose}>
      <div className="pa-glass pa-edge max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="pa-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{ro ? "Obține produsul" : "Get the product"}</p>
            <h2 className="mt-1 font-display text-lg font-bold text-foreground">{item.name[lang]}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={ro ? "Închide" : "Close"} className="rounded-full p-1.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground">
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex gap-1 rounded-xl bg-foreground/[0.05] p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition ${tab === t.id ? "bg-gradient-to-br from-brand to-brand-2 text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {notice && (
          <p className="mt-3 rounded-xl border border-brand/25 bg-brand/[0.07] px-3 py-2 text-[11.5px] text-foreground" role="status">
            {notice}
          </p>
        )}

        {account.signedIn === false && !locked && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {ro ? (
              <>
                Cu un cont gratuit îți ții colecția și istoricul pe toate dispozitivele.{" "}
                <Link to="/autentificare" className="underline underline-offset-2">
                  Creează cont
                </Link>
                .
              </>
            ) : (
              <>
                A free account keeps your collection and history across devices.{" "}
                <Link to="/autentificare" className="underline underline-offset-2">
                  Create an account
                </Link>
                .
              </>
            )}
          </p>
        )}

        {locked ? (
          <div className="mt-4 rounded-2xl border border-brand/25 bg-brand/[0.07] p-4">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Lock className="size-4 text-brand" aria-hidden />
              {ro ? `Produs ${ACCESS_LABEL[item.access].ro}` : `${ACCESS_LABEL[item.access].en} product`}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {ro
                ? "Îl deblochezi cu un parteneriat AVY sau îl cumperi separat, cu licență pe viață și actualizări incluse."
                : "Unlock it with an AVY partnership, or buy it separately with a lifetime licence and updates included."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`${homePath(lang)}#parteneriate`} onClick={onClose} className="rounded-full bg-gradient-to-br from-brand to-brand-2 px-3.5 py-2 text-xs font-semibold text-white" data-ripple>
                {ro ? "Vezi parteneriatele" : "See partnerships"}
              </a>
              {item.priceRon && (
                <button
                  type="button"
                  onClick={() => {
                    store.addToCart({ kind: "item", slug: item.slug });
                    setInCart(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-3.5 py-2 text-xs font-semibold text-foreground"
                >
                  {inCart ? <Check className="size-3.5" aria-hidden /> : <ShoppingCart className="size-3.5" aria-hidden />}
                  {inCart ? (ro ? "În coș" : "In cart") : `${ro ? "Cumpără" : "Buy"} — ${priceLabel(item, lang)}`}
                </button>
              )}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground/80">
              {ro ? "Plata cu cardul se activează la lansare; până atunci trimitem link de plată sau proformă." : "Card payment goes live at launch; until then we send a payment link or a proforma."}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            {tab === "cli" && (
              <>
                <div className="flex gap-1">
                  {PMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPm(p.id)}
                      aria-pressed={pm === p.id}
                      className={`rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition ${pm === p.id ? "bg-foreground/15 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {p.id}
                    </button>
                  ))}
                </div>
                <pre className="pa-mono mt-2 overflow-x-auto rounded-xl border border-foreground/10 bg-black/40 p-3 text-[11.5px] text-foreground">
                  {PMS.find((p) => p.id === pm)!.cmd(registryUrl)}
                </pre>
                <CopyButton
                  value={PMS.find((p) => p.id === pm)!.cmd(registryUrl)}
                  label={ro ? "Copiază comanda" : "Copy the command"}
                  copiedLabel={ro ? "Copiat" : "Copied"}
                  onCopied={() => void report("cli")}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-brand to-brand-2 px-3.5 py-2 text-xs font-semibold text-white"
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {ro
                    ? "Comanda folosește registrul compatibil shadcn. Registrul public se publică odată cu pagina; până atunci folosește tabul Cod."
                    : "The command uses the shadcn-compatible registry. The public registry ships with the page; until then use the Code tab."}
                </p>
              </>
            )}

            {tab === "code" && (
              <>
                <pre className="pa-mono max-h-[38vh] overflow-auto rounded-xl border border-foreground/10 bg-black/40 p-3 text-[11px] leading-relaxed text-foreground">
                  {source ?? (ro ? "Se încarcă sursa…" : "Loading source…")}
                </pre>
                {source && (
                  <CopyButton
                    value={source}
                    label={ro ? "Copiază codul" : "Copy the code"}
                    copiedLabel={ro ? "Copiat" : "Copied"}
                    onCopied={() => void report("code")}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-brand to-brand-2 px-3.5 py-2 text-xs font-semibold text-white"
                  />
                )}
              </>
            )}

            {tab === "mcp" && (
              <>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {ro
                    ? "Adaugă registrul Avyron în components.json și asistentul tău (Claude, Cursor, Copilot) poate cere produsele direct, pe nume."
                    : "Add the Avyron registry to components.json and your assistant (Claude, Cursor, Copilot) can pull products by name."}
                </p>
                <pre className="pa-mono mt-2 overflow-x-auto rounded-xl border border-foreground/10 bg-black/40 p-3 text-[11px] text-foreground">{mcpSnippet}</pre>
                <CopyButton value={mcpSnippet} label={ro ? "Copiază configurația" : "Copy the config"} copiedLabel={ro ? "Copiat" : "Copied"} className="mt-2 inline-flex rounded-full border border-foreground/15 px-3.5 py-2 text-xs font-semibold text-foreground" />
              </>
            )}

            {tab === "prompt" && (
              <>
                <pre className="pa-mono max-h-[32vh] overflow-auto whitespace-pre-wrap rounded-xl border border-foreground/10 bg-black/40 p-3 text-[11px] leading-relaxed text-foreground">{prompt}</pre>
                <CopyButton value={prompt} label={ro ? "Copiază promptul" : "Copy the prompt"} copiedLabel={ro ? "Copiat" : "Copied"} className="mt-2 inline-flex rounded-full bg-gradient-to-br from-brand to-brand-2 px-3.5 py-2 text-xs font-semibold text-white" />
              </>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-foreground/10 pt-3 text-xs">
          <Link to={guidePath(lang, "instalare")} onClick={onClose} className="inline-flex items-center gap-1.5 text-muted-foreground underline underline-offset-4 hover:text-foreground">
            <BookOpen className="size-3.5" aria-hidden />
            {ro ? "Citește ghidul" : "Read the guide"}
          </Link>
          <a
            href={`https://wa.me/40734605055?text=${encodeURIComponent(ro ? `Salut! Am nevoie de ajutor cu produsul „${item.name.ro}” din Produse Avyron.` : `Hi! I need help with the “${item.name.en}” product from Avyron Products.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            {ro ? "Nu știi să-l implementezi? Scrie-ne" : "Not sure how to implement it? Message us"}
          </a>
          <span className="pa-mono ml-auto inline-flex items-center gap-1 text-[10.5px] text-muted-foreground/70">
            <Copy className="size-3" aria-hidden />
            {ro ? "o copiere / zi per produs" : "one copy / day per product"}
          </span>
        </div>
      </div>
    </div>
  );
}

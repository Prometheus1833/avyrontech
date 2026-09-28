import { lazy, Suspense, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";
import { ITEM_BY_SLUG } from "./data/items";
import Shell from "./components/Shell";
import { homePath, langOfPath, parseRoute } from "./lib/paths";
import "./produse.css";

const Home = lazy(() => import("./pages/Home"));
const TypePage = lazy(() => import("./pages/TypePage"));
const ItemPage = lazy(() => import("./pages/ItemPage"));
const LogoPage = lazy(() => import("./pages/LogoPage"));
const GuidePage = lazy(() => import("./pages/GuidePage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const CollectionPage = lazy(() => import("./pages/CollectionPage"));
const CollectionsIndex = lazy(() => import("./pages/CollectionPage").then((m) => ({ default: m.CollectionsIndex })));

/**
 * Router-ul intern al paginii Produse Avyron.
 *
 * Toate rutele intră prin `/produse/*` (RO) și `/en/products/*`
 * (EN), iar aici se decide ce se randează. Un singur punct de intrare ține
 * cadrul (bara de sus, fundalul 3D, coșul, paleta de căutare) montat între
 * navigări, deci trecerea dintre liste și produse nu reia preloaderul.
 */
export default function ProduseApp() {
  const { lang } = useLang();
  const { pathname } = useLocation();
  // URL-ul decide limba: /en/... e engleză chiar dacă preferința din context întârzie.
  const effective = langOfPath(pathname) ?? lang;
  const route = useMemo(() => parseRoute(pathname, effective), [pathname, effective]);

  return (
    <Shell lang={effective}>
      <Suspense fallback={<div className="min-h-[50vh]" aria-hidden />}>
        {route.kind === "home" && <Home lang={effective} />}
        {route.kind === "guide" && <GuidePage lang={effective} />}
        {route.kind === "faq" && <FaqPage lang={effective} />}
        {route.kind === "collections" && <CollectionsIndex lang={effective} />}
        {route.kind === "collection" && <CollectionPage seg={route.seg} lang={effective} />}
        {route.kind === "type" && (route.type === "logo" ? <LogoPage lang={effective} /> : <TypePage type={route.type} lang={effective} />)}
        {route.kind === "item" &&
          (() => {
            const item = ITEM_BY_SLUG.get(route.slug);
            if (!item) return <Missing lang={effective} />;
            return <ItemPage item={item} lang={effective} />;
          })()}
        {route.kind === "missing" && <Missing lang={effective} />}
      </Suspense>
    </Shell>
  );
}

function Missing({ lang }: { lang: "ro" | "en" }) {
  const ro = lang === "ro";
  return (
    <div className="grid min-h-[45vh] place-items-center py-12 text-center">
      <div>
        <p className="pa-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-foreground">{ro ? "Produsul nu există (încă)" : "That product doesn't exist (yet)"}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {ro ? "Poate a fost redenumit. Caută în catalog sau cere-l din formularul de la finalul paginii." : "It may have been renamed. Search the catalogue or request it from the form at the end of the page."}
        </p>
        <Link to={homePath(lang)} className="mt-4 inline-flex rounded-full bg-gradient-to-br from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white" data-ripple>
          {ro ? "Înapoi la Produse Avyron" : "Back to Avyron Products"}
        </Link>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import type { WebsitePlan, WebsitePlanId } from "@/shared/websiteSubscriptions";

type Props = {
  lang: "ro" | "en";
  plans: WebsitePlan[];
  onChoose: (id: WebsitePlanId) => void;
};

export default function SubscriptionPlans({ lang, plans, onChoose }: Props) {
  const ro = lang === "ro";
  const viewport = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<WebsitePlanId>("start");

  useEffect(() => {
    const node = viewport.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const mobile = window.matchMedia("(max-width: 760px)");
    const observer = new IntersectionObserver(entries => {
      if (!mobile.matches) return;
      for (const entry of entries) {
        if (entry.intersectionRatio < 0.58) continue;
        const current = plans.find(plan => entry.target.id === `website-plan-${plan.id}`);
        if (current) setActive(current.id);
      }
    }, { root: node, threshold: 0.58 });
    for (const card of node.children) observer.observe(card);
    return () => observer.disconnect();
  }, [plans]);

  const showPlan = (id: WebsitePlanId) => {
    const node = viewport.current;
    const card = document.getElementById(`website-plan-${id}`);
    if (!node || !card) return;
    setActive(id);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollTo({ left: card.offsetLeft, behavior: reduced ? "instant" : "smooth" });
  };

  return (
    <section className="ws-wrap ws-section" id="website-plans" aria-labelledby="ws-plans-title">
      <div className="ws-section-head">
        <h2 id="ws-plans-title">{ro ? "Compară abonamentele" : "Compare website plans"}</h2>
        <p>{ro ? "Toate includ dezvoltarea site-ului. Alege în funcție de numărul de pagini, modificările lunare și funcțiile de care ai nevoie." : "Every plan includes website development. Choose based on the pages, monthly changes and features you need."}</p>
      </div>

      <nav className="ws-plan-nav" aria-label={ro ? "Navigare carusel abonamente" : "Plan carousel navigation"}>
        {plans.map(plan => (
          <a
            key={plan.id}
            href={`#website-plan-${plan.id}`}
            aria-current={active === plan.id ? "true" : undefined}
            onClick={event => {
              event.preventDefault();
              showPlan(plan.id);
            }}
          >
            {plan.name}
          </a>
        ))}
      </nav>
      <div className="ws-plans" ref={viewport} role="region" aria-label={ro ? "Abonamente website" : "Website plans"}>
        {plans.map(plan => (
          <article
            id={`website-plan-${plan.id}`}
            className={`ws-plan ws-plan-${plan.id}`}
            key={plan.id}
            aria-labelledby={`ws-plan-title-${plan.id}`}
          >
            <h3 id={`ws-plan-title-${plan.id}`}>{plan.name}</h3>
            <p className="ws-plan-tagline">{plan.tagline[lang]}</p>
            <div className="ws-price">
              {plan.available && plan.priceMinor !== null ? (
                <>
                  <strong>{(plan.priceMinor / 100).toLocaleString(ro ? "ro-RO" : "en-GB")} {plan.currency}</strong>
                  <span> / {ro ? "lună" : "month"}</span>
                </>
              ) : (
                <strong>{ro ? "Preț lunar la ofertă" : "Monthly price on request"}</strong>
              )}
            </div>
            <dl className="ws-plan-metrics">
              <div><dt>{ro ? "Pagini" : "Pages"}</dt><dd>{plan.pages}</dd></div>
              <div><dt>{ro ? "Modificări / lună" : "Changes / month"}</dt><dd>{plan.changes}</dd></div>
              <div><dt>{ro ? "Butoane de contact" : "Contact buttons"}</dt><dd>{plan.buttons}</dd></div>
              <div><dt>{ro ? "Adrese e-mail*" : "Email addresses*"}</dt><dd>{plan.emails}</dd></div>
            </dl>
            <button type="button" className="ws-button" onClick={() => onChoose(plan.id)}>
              {ro ? "Aleg" : "Choose"} {plan.name}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <details className="ws-plan-features">
              <summary>{ro ? "Ce include" : "What's included"} {plan.name}<ChevronDown size={16} aria-hidden="true" /></summary>
              <ul>{plan.features[lang].map(feature => <li key={feature}><Check aria-hidden="true" />{feature}</li>)}</ul>
            </details>
            {plan.available && (
              <details>
                <summary>{ro ? "Condițiile abonamentului" : "Subscription terms"}<ChevronDown size={16} aria-hidden="true" /></summary>
                <p>{plan.emailPolicy}</p>
                <p>{plan.cancellation}</p>
                <p className="whitespace-pre-wrap">{plan.terms}</p>
              </details>
            )}
          </article>
        ))}
      </div>
      <p className="ws-note">
        {ro
          ? "Găzduirea, mentenanța și un subdomeniu AVYRON sunt incluse. Dacă vrei un domeniu propriu, îl furnizezi tu. *Adresele de e-mail depind de domeniu și de furnizor. Confirmăm costurile și condițiile în ofertă."
          : "Hosting, maintenance and an AVYRON subdomain are included. If you want a custom domain, you provide it. *Email addresses depend on your domain and provider. We confirm all costs and terms in the quote."}
      </p>
    </section>
  );
}

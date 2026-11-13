import { ArrowDown, ArrowRight, Check, CirclePlus, Server } from "lucide-react";

const benefits = {
  ro: {
    included: ["SEO/GEO optimizat", "Acces în cont și monitorizare", "E-mail personalizat*"],
    extras: ["Conturi social media integrate și sincronizate într-o secțiune dedicată", "1–3 butoane plutitoare de contact direct", "Logo profesional, în funcție de pachet"],
  },
  en: {
    included: ["SEO/GEO optimisation", "Account access and monitoring", "Custom email address*"],
    extras: ["Social media accounts connected and synced in a dedicated section", "1–3 floating buttons for direct contact", "Professional logo, according to your plan"],
  },
};

export default function WebsiteOfferHero({ ro }: { ro: boolean }) {
  const { included, extras } = benefits[ro ? "ro" : "en"];

  return (
    <section className="ws-hero ws-wrap" aria-labelledby="ws-hero-title">
      <picture className="ws-hero-art" aria-hidden="true">
        <source
          media="(max-width: 760px)"
          type="image/webp"
          srcSet="/images/website-offer/glass-mobile-480.webp 480w, /images/website-offer/glass-mobile-760.webp 760w"
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcSet="/images/website-offer/glass-wide-960.webp 960w, /images/website-offer/glass-wide-1600.webp 1600w"
          sizes="100vw"
        />
        <img src="/images/website-offer/glass-fallback.jpg" width={960} height={540} alt="" fetchPriority="high" />
      </picture>
      <div className="ws-hero-copy">
        <h1 id="ws-hero-title">
          {ro ? "Un site de prezentare cu identitatea afacerii tale." : "A website shaped around your business."}{" "}
          <em>{ro ? "0 lei pentru dezvoltare." : "No development fee."}</em>
        </h1>
        <p className="ws-lead">
          {ro
            ? "Arată clar ce oferi, câștigă încrederea clienților și oferă-le o cale simplă de a te contacta."
            : "Show customers what you offer, earn their trust and give them a simple way to reach you."}
        </p>
        <div className="ws-actions">
          <a className="ws-button" href="#website-brief">
            {ro ? "Cere o ofertă" : "Request a quote"}
            <ArrowRight size={17} aria-hidden="true" />
          </a>
          <a className="ws-button ws-button-ghost" href="#website-plans">
            {ro ? "Compară pachetele" : "Compare plans"}
            <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
      <aside className="ws-offer" aria-labelledby="ws-offer-title">
        <div className="ws-offer-start">
          <span id="ws-offer-title">{ro ? "Cost de dezvoltare" : "Development fee"}</span>
          <strong>0 <small>{ro ? "lei" : "RON"}</small></strong>
          <p>{ro
            ? "O ocazie de a lansa un site făcut pe măsura afacerii tale, cu design personalizat, cod scris de la zero și o identitate online care îți aparține."
            : "A chance to launch a site tailored to your business, with a custom design, code written from scratch and an online identity of your own."}</p>
        </div>
        <div className="ws-offer-monthly">
          <Server size={19} aria-hidden="true" />
          <p>
            {ro ? "Plătești doar hosting, securitate și mentenanță" : "You only pay for hosting, security and maintenance"}{" "}
            <strong>{ro ? "de la 199 lei/lună" : "from RON 199 / month"}</strong>
          </p>
        </div>
        <div className="ws-offer-benefits">
          <div className="ws-offer-included">
            <h2>{ro ? "Primești gratuit" : "Included at no extra cost"}</h2>
            <ul role="list">
              {included.map(item => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}
            </ul>
          </div>
          <div className="ws-offer-extras">
            <h2>{ro ? "În plus, ai" : "You also get"}</h2>
            <ul role="list">
              {extras.map(item => <li key={item}><CirclePlus size={14} aria-hidden="true" />{item}</li>)}
            </ul>
          </div>
        </div>
        <p className="ws-offer-email-note">{ro
          ? "* Activarea e-mailului depinde de domeniu și de furnizor."
          : "* Email activation depends on your domain and provider."}</p>
      </aside>
    </section>
  );
}

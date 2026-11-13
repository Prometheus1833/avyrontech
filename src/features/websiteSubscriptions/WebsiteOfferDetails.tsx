import { useEffect, useRef } from "react";
import { ArrowUpRight, CalendarDays, Check, Code2, FileText, Globe2, LayoutGrid, MapPin, MessageSquare, MonitorSmartphone, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const cards = [
  { icon: Code2, ro: ["Design cu identitatea ta", "Pornim de la oferta, imaginile și tonul afacerii tale. Organizăm paginile în jurul întrebărilor pe care clienții chiar le pun."], en: ["Design with your identity", "We start with your offer, imagery and tone. The pages follow the questions your customers actually ask."] },
  { icon: Globe2, ro: ["Pregătit pentru căutare", "Punem serviciile și răspunsurile importante în pagini clare, cu titluri relevante și legături utile pentru clienți și motoarele de căutare."], en: ["Ready for search", "Organise your services and answers into clear pages with relevant titles and useful links for customers and search engines."] },
  { icon: MonitorSmartphone, ro: ["Proiectat pentru telefon", "Meniul, formularele și apelul direct sunt ușor de folosit cu o mână. Imaginile se adaptează dimensiunii ecranului."], en: ["Designed for phones", "Menus, forms and tap-to-call work one-handed. Images adapt to the screen size."] },
  { icon: MessageSquare, ro: ["Contact pe canalul potrivit", "Un cabinet poate prelua programări, iar o echipă de amenajări poate cere din formular detaliile unui proiect."], en: ["Contact on the right channel", "A practice can take bookings, while a renovation team can ask for project details through a form."] },
  { icon: Check, ro: ["Vezi site-ul înainte de lansare", "Parcurgi paginile, verifici informațiile și testezi formularele. Lansăm după ce aprobi varianta pregătită."], en: ["Review your site before launch", "Go through the pages, review the information and test the forms. We launch once you approve the result."] },
  { icon: ShieldCheck, ro: ["Hosting, HTTPS și mentenanță", "Site-ul folosește o conexiune criptată. Găzduirea, actualizările și remedierea incidentelor se clarifică în oferta lunară."], en: ["Hosting, HTTPS and maintenance", "Your site uses an encrypted connection. The monthly quote sets out hosting, updates and incident support."] },
  { icon: RefreshCw, ro: ["Conținut care ține pasul cu tine", "Ai un program nou, servicii de adăugat sau lucrări de prezentat? Cere actualizarea din cont. Vezi acolo stadiul cererii și câte modificări mai ai incluse luna aceasta."], en: ["Content that keeps up", "New opening hours, services or projects to share? Request an update from your account, track its status and see how many changes you have left this month."] },
  { icon: LayoutGrid, ro: ["Proiectul la vedere", "Ai un loc pentru stadiul proiectului, aprobări și cereri. Știi ce pregătim și unde e nevoie de feedbackul tău."], en: ["See where your project stands", "Keep project status, approvals and requests in one place. See what we are preparing and where we need your feedback."] },
] as const;

const examples = [
  { icon: CalendarDays, ro: ["Cabinete și studiouri", "Servicii ușor de comparat, program vizibil și calendar de rezervări, dacă folosești un furnizor compatibil."], en: ["Practices and studios", "Easy-to-compare services, visible opening hours and a booking calendar if you use a compatible provider."] },
  { icon: LayoutGrid, ro: ["Construcții și servicii B2B", "Portofoliu cu lucrări și formular de ofertă cu localitate, tipul proiectului și termenul estimat."], en: ["Construction and B2B services", "A portfolio of completed work and a quote form asking for location, project type and expected timing."] },
  { icon: MapPin, ro: ["Afaceri locale", "Program, hartă, apel direct și profiluri sociale, cu informații consecvente pe site și în profilurile publice."], en: ["Local businesses", "Opening hours, map, tap-to-call and social profiles, with consistent information on your site and public profiles."] },
] as const;

const clientBenefits = [
  { icon: Globe2, ro: ["Identitatea ta, la o singură adresă", "Serviciile, lucrările, programul și datele de contact sunt la îndemână, chiar și pentru cine nu are cont pe rețelele sociale."], en: ["Your business, at one address", "Services, past work, opening hours and contact details are easy to find, even for people without a social media account."] },
  { icon: ShieldCheck, ro: ["Noi ne ocupăm de partea tehnică", "Tu ne spui ce vrei să prezinți. Noi construim site-ul și ne ocupăm de găzduire, securitate și mentenanță. Pentru o actualizare, ne scrii direct din cont."], en: ["We take care of the technical work", "Tell us what you want to showcase. We build the site and handle hosting, security and maintenance. Need an update? Send us a request from your account."] },
  { icon: FileText, ro: ["Știi ce se întâmplă cu site-ul tău", "Vezi în cont stadiul cererilor și actualizările făcute. Rapoartele periodice, în ritmul stabilit în ofertă, îți arată ce am făcut și ce merită urmărit mai departe."], en: ["Know what’s happening with your website", "Track requests and completed updates in your account. Regular reports, at the intervals agreed in your quote, explain what we’ve done and what to watch next."] },
] as const;

export default function WebsiteOfferDetails({ ro }: { ro: boolean }) {
  const grid = useRef<HTMLDivElement>(null);
  const lang = ro ? "ro" : "en";

  useEffect(() => {
    const root = grid.current;
    if (!root || !("IntersectionObserver" in window)) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-entered", "");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.18 });
    Array.from(root.children).forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [ro]);

  return (
    <>
      <section className="ws-wrap ws-section ws-value" id="website-benefits" aria-labelledby="ws-benefits-title">
        <div className="ws-section-head">
          <h2 id="ws-benefits-title">{ro ? "Simplu de la început" : "Simple from the start"}</h2>
          <p>{ro ? "Un site de prezentare trebuie să explice ce faci și să îi ajute pe clienți să te contacteze. Iată cum îl pregătim și cum îl poți actualiza după lansare." : "A business website should explain what you do and make it easy to get in touch. Here’s how we build it and how you can update it after launch."}</p>
        </div>
        <div className="ws-benefits" ref={grid}>
          {cards.map(({ icon: Icon, [lang]: [title, description] }) => (
            <article key={title}>
              <span className="ws-icon"><Icon size={20} aria-hidden="true" /></span>
              <div><h3>{title}</h3><p>{description}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="ws-wrap ws-section ws-client-value" id="website-client-value" aria-labelledby="ws-client-value-title">
        <div className="ws-client-value-inner">
          <div className="ws-section-head">
            <h2 id="ws-client-value-title">{ro ? "Un loc al tău online. Mai puține griji." : "Your own place online. Less to worry about."}</h2>
            <p>{ro
              ? "Facebook, Instagram și TikTok te ajută să fii văzut. Când cineva caută ce oferi pe Google sau cere o recomandare unui asistent AI, un site propriu pune la dispoziție informații clare despre afacerea ta, dintr-o sursă pe care o controlezi."
              : "Facebook, Instagram and TikTok help people see your work. When someone searches Google for what you offer or asks an AI assistant for a recommendation, your website gives them clear information about your business from a source you control."}</p>
          </div>
          <ul className="ws-client-value-list" role="list">
            {clientBenefits.map(({ icon: Icon, [lang]: [title, description] }) => (
              <li key={title}>
                <span className="ws-icon"><Icon size={19} aria-hidden="true" /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ws-wrap ws-section" id="website-personalisation" aria-labelledby="ws-personal-title">
        <div className="ws-personal">
          <div className="ws-section-head">
            <h2 id="ws-personal-title">{ro ? "Personal, nu generic" : "Built around your business"}</h2>
            <p>{ro ? "Designul pornește de la felul în care te aleg clienții. Îți propunem paginile, mesajele și integrările care îi ajută să treacă de la interes la o acțiune concretă." : "Design starts with how your customers choose. We propose the pages, messages and integrations that help them go from interest to a concrete next step."}</p>
            <p>{ro ? "Stabilim integrările în ofertă, în funcție de pachet și de instrumentele pe care le folosești deja." : "We confirm the integrations in your quote, based on the plan and tools you already use."}</p>
            <Link className="ws-text-link" to={ro ? "/servicii/seo-ai-visibility-performance" : "/en/services/seo-ai-visibility-performance"}>
              {ro ? "Descoperă optimizarea SEO și vizibilitatea în AI" : "Explore SEO and AI visibility"}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <dl className="ws-personal-details">
            {examples.map(({ icon: Icon, [lang]: [title, description] }) => (
              <div key={title}>
                <dt><Icon size={19} aria-hidden="true" />{title}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}

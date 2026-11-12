import { useEffect, useRef } from "react";
import { ArrowRight, ClipboardList, MessageCircle, Search } from "lucide-react";

const steps = [
  { icon: Search, ro: ["Te găsește", "Caută un serviciu în zona lui și ajunge direct pe pagina relevantă.", "Google · profiluri sociale"], en: ["They find you", "They look for a service nearby and land on the page that answers their search.", "Google · social profiles"] },
  { icon: ClipboardList, ro: ["Își face o idee clară", "Vede ce oferi, cui i se potrivește și cum arată o lucrare reală. Găsește răspunsuri înainte să te contacteze.", "Servicii · portofoliu · întrebări frecvente"], en: ["They know what to expect", "They see what you offer, who it suits and what real work looks like. Their questions are answered before they reach out.", "Services · portfolio · FAQs"] },
  { icon: MessageCircle, ro: ["Face următorul pas", "Trimite o cerere cu informațiile de care ai nevoie sau alege o programare, dacă aceasta se potrivește afacerii tale.", "Formular · WhatsApp · calendar"], en: ["They take the next step", "They send the details you need to quote or choose a time if booking suits your business.", "Form · WhatsApp · calendar"] },
] as const;

export default function SubscriptionJourney({ ro }: { ro: boolean }) {
  const list = useRef<HTMLOListElement>(null);
  const lang = ro ? "ro" : "en";

  useEffect(() => {
    if (!list.current || !("IntersectionObserver" in window)) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-reached", "");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.24 });
    Array.from(list.current.children).forEach(step => observer.observe(step));
    return () => observer.disconnect();
  }, [ro]);

  return (
    <section className="ws-wrap ws-section ws-connections" id="website-connections" aria-labelledby="ws-connections-title">
      <div className="ws-section-head">
        <h2 id="ws-connections-title">{ro ? "De la vizită la conversație" : "From a visit to a conversation"}</h2>
        <p>{ro ? "Imaginează-ți un client care tocmai te-a găsit. Iată ce vede și cum ajunge să îți ceară o ofertă sau o programare." : "Imagine a customer who has just found you. Here’s what they see and how they reach out for a quote or an appointment."}</p>
      </div>
      <ol className="ws-journey-list" ref={list} role="list">
        {steps.map(({ icon: Icon, [lang]: [title, description, channels] }, index) => (
          <li key={title}>
            <div className="ws-journey-marker" aria-hidden="true">
              <span>{index + 1}</span>
              {index < steps.length - 1 && <ArrowRight size={15} />}
            </div>
            <article className="ws-journey-card">
              <span className="ws-icon"><Icon size={20} aria-hidden="true" /></span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
                <p className="ws-journey-channels">{channels}</p>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}

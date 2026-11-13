import { useEffect, useRef } from "react";
import { ClipboardList, MessageCircle, Search } from "lucide-react";

const steps = [
  { icon: Search, ro: ["Te găsește", "Caută un serviciu în zona lui și ajunge direct pe pagina relevantă.", "Google · profiluri sociale"], en: ["They find you", "They look for a service nearby and land on the page that answers their search.", "Google · social profiles"] },
  { icon: ClipboardList, ro: ["Își face o idee clară", "Vede ce oferi, cui i se potrivește și cum arată o lucrare reală. Găsește răspunsuri înainte să te contacteze.", "Servicii · portofoliu · întrebări frecvente"], en: ["They know what to expect", "They see what you offer, who it suits and what real work looks like. Their questions are answered before they reach out.", "Services · portfolio · FAQs"] },
  { icon: MessageCircle, ro: ["Face următorul pas", "Trimite o cerere cu informațiile de care ai nevoie sau alege o programare, dacă aceasta se potrivește afacerii tale.", "Formular · WhatsApp · calendar"], en: ["They take the next step", "They send the details you need to quote or choose a time if booking suits your business.", "Form · WhatsApp · calendar"] },
] as const;

export default function SubscriptionJourney({ ro }: { ro: boolean }) {
  const list = useRef<HTMLOListElement>(null);
  const lang = ro ? "ro" : "en";

  useEffect(() => {
    const node = list.current;
    if (!node) return;
    const markers = Array.from(node.querySelectorAll<HTMLElement>(".ws-journey-marker > span"));
    const segments = Array.from(node.querySelectorAll<HTMLElement>(".ws-journey-connector"));
    const mobile = window.matchMedia("(max-width: 760px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const rect = node.getBoundingClientRect();
      const clamp = (n: number) => Math.min(1, Math.max(0, n));
      const start = viewport * .83;
      const end = viewport * .36;
      const stops = mobile.matches
        ? markers.map(marker => marker.getBoundingClientRect().top)
        : markers.map((_, index) => rect.top + (start - end) * index / 2);
      const staticPath = reduced.matches || saveData;
      const crossing = mobile.matches ? viewport * .68 : start;
      segments.forEach((segment, index) => {
        const fill = staticPath ? 1 : clamp((crossing - stops[index]) / Math.max(1, stops[index + 1] - stops[index]));
        segment.style.setProperty("--ws-journey-fill", fill.toFixed(3));
      });
      markers.forEach((marker, index) => {
        marker.closest("li")?.toggleAttribute("data-reached", Boolean(staticPath || crossing >= stops[index]));
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const resize = new ResizeObserver(schedule);
    resize.observe(node);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    reduced.addEventListener("change", schedule);
    schedule();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
    };
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
              {index < steps.length - 1 && <i className="ws-journey-connector" />}
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

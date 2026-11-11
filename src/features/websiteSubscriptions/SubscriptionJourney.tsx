import { useEffect, useRef } from "react";
import { Globe2, MessageCircle, MonitorSmartphone } from "lucide-react";

const wire = "M 24 50 C 45 86 45 114 24 150 S 3 214 24 250";

export default function SubscriptionJourney({ ro }: { ro: boolean }) {
  const scene = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = scene.current;
    if (!track || !("IntersectionObserver" in window)) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const cards = Array.from(track.querySelectorAll("li"));
    let inView = false;
    let frame = 0;

    const reset = () => {
      delete track.dataset.wireProgress;
      track.style.removeProperty("--ws-wire-offset");
      cards.forEach(card => card.removeAttribute("data-reached"));
    };

    const paint = () => {
      frame = 0;
      const bounds = track.getBoundingClientRect();
      if (!bounds.height) return;
      const start = bounds.top + bounds.height / 6;
      const span = (bounds.height * 2) / 3;
      const progress = Math.min(1, Math.max(0, (window.innerHeight * 0.66 - start) / span));
      track.style.setProperty("--ws-wire-offset", String((100 * (1 - progress)).toFixed(2)));
      track.dataset.wireProgress = String(Math.round(progress * 100));
      cards.forEach((card, index) => {
        card.toggleAttribute("data-reached", index === 0 ? start <= window.innerHeight * 0.66 : progress >= index / 2);
      });
    };

    const schedule = () => {
      if (motion.matches || connection?.saveData || document.hidden || frame) return;
      frame = requestAnimationFrame(paint);
    };
    const onScroll = () => { if (inView) schedule(); };
    const onPreference = () => {
      if (motion.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        reset();
      } else schedule();
    };

    const observer = new IntersectionObserver(entries => {
      inView = entries[entries.length - 1]?.isIntersecting ?? false;
      schedule();
    });
    observer.observe(track);
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onScroll) : undefined;
    resize?.observe(track);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("visibilitychange", onScroll);
    motion.addEventListener("change", onPreference);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onScroll);
      motion.removeEventListener("change", onPreference);
      reset();
    };
  }, []);

  const steps = [
    { icon: Globe2, title: ro ? "Te descoperă" : "They find you", text: ro ? "Un client ajunge pe site dintr-o căutare sau de pe profilul tău social." : "A customer lands on your site from a search or your social profile." },
    { icon: MonitorSmartphone, title: ro ? "Înțeleg ce oferi" : "They see what you offer", text: ro ? "Găsește serviciile, produsele și răspunsurile care îl ajută să decidă." : "They find the services, products and answers they need to decide." },
    { icon: MessageCircle, title: ro ? "Îți scriu" : "They get in touch", text: ro ? "Face următorul pas prin WhatsApp, formular sau e-mail, în funcție de site." : "They take the next step via WhatsApp, a form or email, depending on your site." },
  ];

  return (
    <section className="ws-wrap ws-section ws-connections" id="website-connections" aria-labelledby="ws-connections-title">
      <div className="ws-section-head">
        <h2 id="ws-connections-title">{ro ? "De la vizită la conversație" : "From a visit to a conversation"}</h2>
        <p>{ro ? "Un traseu clar pentru clienții care vor să afle mai mult sau să ia legătura cu tine." : "A clear path for customers who want to learn more or get in touch."}</p>
      </div>
      <div className="ws-contact-journey" ref={scene}>
        <svg className="ws-journey-wire" viewBox="0 0 48 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="ws-wire-base" d={wire} vectorEffect="non-scaling-stroke" />
          <path className="ws-wire-light" d={wire} vectorEffect="non-scaling-stroke" pathLength="100" />
        </svg>
        <ol className="ws-journey-list" role="list">
          {steps.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="ws-journey-node" aria-hidden="true" />
              <article className="ws-journey-card">
                <span className="ws-icon"><Icon size={21} aria-hidden="true" /></span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

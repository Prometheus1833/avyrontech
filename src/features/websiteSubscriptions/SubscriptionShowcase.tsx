import { ArrowUpRight, Check, MonitorSmartphone } from "lucide-react";
import flawless480 from "@/assets/subscription/flawless-480.webp";
import flawless960 from "@/assets/subscription/flawless-960.webp";
import flawless1600 from "@/assets/subscription/flawless-1600.webp";
import ruller480 from "@/assets/subscription/ruller-480.webp";
import ruller960 from "@/assets/subscription/ruller-960.webp";
import ruller1600 from "@/assets/subscription/ruller-1600.webp";

/** Screenshots of existing public projects; no simulated client website or URL. */
export default function SubscriptionShowcase({ ro }: { ro: boolean }) {
  return <div className="ws-stage" aria-label={ro ? "Proiecte reale din portofoliul AVYRON" : "Real projects from the AVYRON portfolio"}>
    <div className="ws-stage-halo" aria-hidden="true" />
    <a className="ws-project-window ws-project-main" href="https://flawlesstudio.ro/" target="_blank" rel="noopener noreferrer">
      <div className="ws-window-bar"><span aria-hidden="true"><i /><i /><i /></span><span>flawlesstudio.ro</span><ArrowUpRight size={14} aria-hidden="true" /></div>
      <img src={flawless960} srcSet={`${flawless480} 480w, ${flawless960} 960w, ${flawless1600} 1600w`} sizes="(max-width: 700px) 94vw, (max-width: 960px) 680px, 50vw" width={1600} height={900} fetchPriority="high" alt={ro ? "Website Flawless Studio, proiect AVYRON — vizitează site-ul real" : "Flawless Studio website, an AVYRON project — visit the real website"} />
      <span className="ws-project-caption">Flawless Studio <span>Wellness / Beauty</span></span>
    </a>
    <a className="ws-project-window ws-project-secondary" href="https://ruller.eu/" target="_blank" rel="noopener noreferrer">
      <img src={ruller480} srcSet={`${ruller480} 480w, ${ruller960} 960w, ${ruller1600} 1600w`} sizes="(max-width: 700px) 53vw, 310px" width={1600} height={900} alt={ro ? "Website Ruller — vizitează proiectul real" : "Ruller website — visit the real project"} />
      <span className="ws-project-caption">Ruller <ArrowUpRight size={14} aria-hidden="true" /></span>
    </a>
    <div className="ws-stage-seal"><Check size={16} aria-hidden="true" /><span>{ro ? "Creat de la zero." : "Built from scratch."}<strong>{ro ? "Adaptat afacerii tale." : "Made for your business."}</strong></span></div>
    <p className="ws-stage-caption"><MonitorSmartphone size={14} aria-hidden="true" />{ro ? "Lucrări AVYRON existente. O direcție proprie pentru fiecare afacere." : "Existing AVYRON work. A distinct direction for every business."}</p>
  </div>;
}

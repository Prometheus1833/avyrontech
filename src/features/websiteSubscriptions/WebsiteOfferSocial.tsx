import { ArrowUpRight, Facebook, Instagram } from "lucide-react";
import { socialProfile } from "@/config/socialProfiles";

function TikTokMark({ size = 19 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.1 20.1a6.34 6.34 0 0 0 10.86-4.43V8.84a8.16 8.16 0 0 0 4.77 1.52V6.91a4.79 4.79 0 0 1-1.14-.22z" />
    </svg>
  );
}

const profiles = [
  { ...socialProfile("instagram"), Icon: Instagram },
  { ...socialProfile("facebook"), Icon: Facebook },
  { ...socialProfile("tiktok"), Icon: TikTokMark },
];

export default function WebsiteOfferSocial({ ro }: { ro: boolean }) {
  return (
    <section className="ws-wrap ws-offer-social" aria-labelledby="ws-offer-social-title">
      <div className="ws-offer-social-inner">
        <div>
          <h2 id="ws-offer-social-title">AVYRON Social</h2>
          <p>{ro ? "Proiecte, idei și detalii din culise." : "Projects, ideas and a look behind the scenes."}</p>
        </div>
        <ul role="list">
          {profiles.map(({ id, name, handle, url, Icon }) => (
            <li key={id}>
              <a href={url} target="_blank" rel="noopener noreferrer" data-channel={id}>
                <span className="ws-social-mark"><Icon size={19} aria-hidden="true" /></span>
                <span className="ws-social-label"><strong>{name}</strong><small>{handle}</small></span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

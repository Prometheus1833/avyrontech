import LinkInBio from "../source/LinkInBio";
import type { DemoProps } from "./registry";

export default function TplLinkbioDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <div className="h-full w-full overflow-auto">
      <LinkInBio
        headingAs="h2"
        name="Avyron"
        tagline={ro ? "Site-uri, magazine și automatizări" : "Websites, stores and automation"}
        accent="#8b5cf6"
        track={false}
        links={[
          { label: ro ? "Vezi produsele" : "Browse the products", href: "#", featured: true, emoji: "✦" },
          { label: ro ? "Cere ofertă" : "Get a quote", href: "#", emoji: "✉" },
          { label: "WhatsApp", href: "#", note: ro ? "răspuns rapid" : "quick reply", emoji: "◍" },
          { label: "Instagram", href: "#", emoji: "◎" },
        ]}
      />
    </div>
  );
}

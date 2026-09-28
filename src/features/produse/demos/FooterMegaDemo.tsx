import MegaFooter from "../source/MegaFooter";
import type { DemoProps } from "./registry";

export default function FooterMegaDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <div className="h-full w-full overflow-auto">
      <MegaFooter
        brand="AVYRON"
        slogan="INNOVATE. DEVELOP. ELEVATE."
        company="Avyron SRL"
        labels={ro ? undefined : { newsletter: "Get the news", placeholder: "you@example.com", submit: "Subscribe", done: "Done! Check your inbox.", rights: "All rights reserved." }}
        columns={[
          { title: ro ? "Produse" : "Products", links: [{ label: ro ? "Componente" : "Components", href: "#" }, { label: ro ? "Secțiuni" : "Sections", href: "#" }, { label: "Templates", href: "#" }] },
          { title: ro ? "Firmă" : "Company", links: [{ label: ro ? "Despre noi" : "About", href: "#" }, { label: "Blog", href: "#" }, { label: ro ? "Contact" : "Contact", href: "#" }] },
        ]}
        legal={[
          { label: "GDPR", href: "#" },
          { label: ro ? "Termeni" : "Terms", href: "#" },
          { label: "ANPC", href: "#" },
          { label: "SOL · SAL", href: "#" },
        ]}
        onSubscribe={() => new Promise((resolve) => window.setTimeout(resolve, 600))}
      />
    </div>
  );
}

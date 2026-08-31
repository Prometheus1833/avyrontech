import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { findExample } from "@/examples/registry";
import logo from "@/assets/avyron-logo.jpg";
import NotFound from "./NotFound";
import PageBackLink from "@/components/site/PageBackLink";

const ExamplePage = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const entry = findExample(slug);

  useEffect(() => {
    if (!entry) return;
    const title = `${entry.domain} — Exemplu Avyron Tech`;
    const description = entry.description.ro;
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({ title, description, path: `/examples/${entry.slug}` }),
    );
    window.scrollTo(0, 0);
  }, [entry]);

  if (!entry) return <NotFound />;

  const Demo = entry.Component;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Banner Avyron — minim, sticky, ca să fie evident că e exemplu */}
      <div className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center justify-between text-xs">
          <PageBackLink to="/portofoliu" label="Înapoi" title="Înapoi la portofoliu" />
          <a href="/#hero" className="flex items-center gap-2" aria-label="Avyron — mergi la hero">
            <span className="hidden sm:inline text-muted-foreground">Exemplu găzduit de</span>
            <img src={logo} alt="Avyron" width={20} height={20} className="size-5 rounded object-cover" />
            <span className="font-display font-bold">Avyron Tech</span>
            <span className="text-muted-foreground hidden md:inline">· avyron.ro/examples/{entry.slug}</span>
          </a>
        </div>
      </div>
      <div className="flex-1">
        <Demo />
      </div>
    </div>
  );
};

export default ExamplePage;

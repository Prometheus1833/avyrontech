import { Component, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

class Boundary extends Component<{ children: ReactNode; english: boolean }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    // Our event contains no URL, exception text, tokens or document content.
    console.error(JSON.stringify({ event: "route_render_failed" }));
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const en = this.props.english;
    return <main role="alert" className="grid min-h-[70dvh] place-items-center bg-background px-6 py-16 text-foreground">
      <div className="max-w-lg rounded-3xl border border-border bg-card p-7 shadow-soft">
        <p className="font-mono text-xs uppercase tracking-widest text-brand">AVYRON</p>
        <h1 className="mt-3 text-2xl font-semibold">{en ? "This page could not be loaded" : "Pagina nu a putut fi încărcată"}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{en ? "Check your connection, then reload or return to the homepage." : "Verifică conexiunea, apoi reîncarcă pagina sau revino la pagina principală."}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">{en ? "Reload page" : "Reîncarcă pagina"}</button>
          <a href={en ? "/en" : "/"} className="inline-flex min-h-11 items-center rounded-full border border-border px-5 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">{en ? "Homepage" : "Pagina principală"}</a>
        </div>
      </div>
    </main>;
  }
}

export default function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary key={pathname} english={/^\/(en|it|hu|de|fr|pl)(\/|$)/.test(pathname)}>{children}</Boundary>;
}

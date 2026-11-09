import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { leadsAgencyApi, type AgencyDocumentSeed } from "@/lib/leadsAgencyApi";
import { Button } from "@/components/ui/button";
/** Loads native authorized context only; never accepts a beneficiary from URL text. */
export default function AgencyGeneratorContext({
  id,
  children,
}: {
  id: string | null;
  children: (seed: AgencyDocumentSeed | undefined) => ReactNode;
}) {
  const [seed, setSeed] = useState<AgencyDocumentSeed>(),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    setSeed(undefined);
    setError("");
    if (!id) return;
    const ctl = new AbortController();
    void leadsAgencyApi
      .documentContext(id, ctl.signal)
      .then((r) => {
        if (
          !r?.opportunityId ||
          r.opportunityId !== id ||
          typeof r.name !== "string"
        )
          throw new Error("Contextul oportunității nu este valid.");
        if (!ctl.signal.aborted) setSeed(r);
      })
      .catch((e) => {
        if (!ctl.signal.aborted)
          setError(e instanceof Error ? e.message : "Context indisponibil.");
      });
    return () => ctl.abort();
  }, [id, retry]);
  if (!id) return children(undefined);
  if (error)
    return (
      <div className="rounded-xl border border-destructive/40 p-4">
        <p role="alert" className="text-sm">
          {error}
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => setRetry((x) => x + 1)}
        >
          Reîncearcă contextul oportunității
        </Button>
      </div>
    );
  if (!seed || seed.opportunityId !== id)
    return (
      <p role="status" className="text-sm">
        Se verifică beneficiarul și contextul Leads Agency…
      </p>
    );
  return (
    <>
      <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm">
        <p className="font-medium">Leads Agency · {seed.projectName}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Beneficiar și proiect precompletate din fișa autorizată. Bugetul
          orientativ nu este un preț ofertat; completează datele fiscale și
          condițiile înainte de finalizare.
        </p>
        <Link
          className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold underline underline-offset-4"
          to={`/profil?tab=leads-agency&agencyOpportunity=${encodeURIComponent(id)}`}
        >
          Înapoi la oportunitate
        </Link>
      </div>
      {children(seed)}
    </>
  );
}

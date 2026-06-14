import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const data = (await res.json()) as { valid?: boolean; reason?: string };
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
          body: JSON.stringify({ token }),
        },
      );
      const data = await res.json();
      if (data.success) setState("done");
      else if (data.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-background px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <h1 className="font-display text-2xl font-bold mb-3">Dezabonare email</h1>
        {state === "loading" && <p className="text-muted-foreground">Se verifică linkul...</p>}
        {state === "valid" && (
          <>
            <p className="text-muted-foreground mb-6">
              Confirmă dezabonarea pentru a nu mai primi emailuri de la Avyron.
            </p>
            <Button onClick={confirm} disabled={busy} className="w-full">
              {busy ? "Se procesează..." : "Confirmă dezabonarea"}
            </Button>
          </>
        )}
        {state === "done" && (
          <p className="text-muted-foreground">Te-ai dezabonat cu succes. Nu vei mai primi emailuri de la noi.</p>
        )}
        {state === "already" && (
          <p className="text-muted-foreground">Adresa este deja dezabonată.</p>
        )}
        {state === "invalid" && (
          <p className="text-muted-foreground">Link invalid sau expirat.</p>
        )}
        {state === "error" && (
          <p className="text-muted-foreground">A apărut o eroare. Te rugăm să încerci din nou.</p>
        )}
        <Link to="/" className="block mt-6 text-sm text-primary hover:underline">
          Înapoi la avyron.ro
        </Link>
      </div>
    </main>
  );
}

import { useState, type FormEvent } from "react";

/**
 * GlassLogin — Avyron Products (avyron.ro/produse)
 * Formular de autentificare din sticlă, accesibil, gata de legat la backend.
 */

type Props = {
  title?: string;
  onSubmit?: (data: { email: string; password: string; remember: boolean }) => Promise<void> | void;
  labels?: Partial<Record<"email" | "password" | "remember" | "submit" | "forgot" | "show" | "hide", string>>;
};

export function GlassLogin({ title = "Intră în cont", onSubmit, labels = {} }: Props) {
  const l = {
    email: "E-mail",
    password: "Parolă",
    remember: "Ține-mă minte",
    submit: "Continuă",
    forgot: "Ai uitat parola?",
    show: "Arată parola",
    hide: "Ascunde parola",
    ...labels,
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit?.({ email, password, remember });
    } finally {
      setBusy(false);
    }
  };

  const field: React.CSSProperties = {
    width: "100%",
    padding: "0.7rem 0.85rem",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    fontSize: 14,
    outlineOffset: 2,
  };

  return (
    <form
      onSubmit={submit}
      style={{
        width: "min(360px, 100%)",
        padding: 22,
        borderRadius: 24,
        background: "linear-gradient(140deg, rgba(255,255,255,.14), rgba(255,255,255,.04))",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        border: "1px solid rgba(255,255,255,.14)",
        boxShadow: "0 30px 70px -40px rgba(0,0,0,.9)",
        color: "#fff",
      }}
    >
      <h2 style={{ margin: "0 0 14px", fontSize: 19, fontWeight: 700 }}>{title}</h2>
      <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginBottom: 4 }} htmlFor="avy-email">
        {l.email}
      </label>
      <input id="avy-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={field} />
      <label style={{ display: "block", fontSize: 12, opacity: 0.7, margin: "12px 0 4px" }} htmlFor="avy-pass">
        {l.password}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id="avy-pass"
          type={reveal ? "text" : "password"}
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ ...field, paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? l.hide : l.show}
          style={{ position: "absolute", right: 6, top: 5, height: 30, width: 32, borderRadius: 8, border: 0, background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", fontSize: 12 }}
        >
          {reveal ? "◡" : "◉"}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 16px", fontSize: 12 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: 0.8 }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> {l.remember}
        </label>
        <a href="#reset" style={{ color: "#a78bfa" }}>
          {l.forgot}
        </a>
      </div>
      <button
        type="submit"
        disabled={busy}
        style={{ width: "100%", padding: "0.8rem", borderRadius: 999, border: 0, background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", color: "#fff", fontWeight: 650, fontSize: 14, cursor: busy ? "progress" : "pointer", opacity: busy ? 0.7 : 1 }}
      >
        {busy ? "…" : l.submit}
      </button>
    </form>
  );
}

export default GlassLogin;

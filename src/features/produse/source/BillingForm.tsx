import { useState } from "react";
import { checkIban } from "./IbanValidator";

/**
 * BillingForm — Avyron Products (avyron.ro/produse)
 * Datele de facturare așa cum le cere o factură din România: persoană fizică
 * sau firmă, CUI și Reg. Com. pentru firme, IBAN verificat matematic. Câmpurile
 * firmei apar doar când sunt necesare, iar erorile apar după completare.
 *
 * Căutarea automată după CUI se face pe server (vezi produsul „ANAF — date
 * firmă după CUI"): API-ul ANAF nu acceptă cereri direct din browser.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export type BillingData = {
  kind: "person" | "company";
  name: string;
  email: string;
  cui?: string;
  regCom?: string;
  address: string;
  city: string;
  county: string;
  iban?: string;
};

type Errors = Partial<Record<keyof BillingData, string>>;

const validate = (data: BillingData): Errors => {
  const errors: Errors = {};
  if (data.name.trim().length < 3) errors.name = "Scrie numele complet";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) errors.email = "Adresă de e-mail invalidă";
  if (data.address.trim().length < 5) errors.address = "Adresa e prea scurtă";
  if (data.city.trim().length < 2) errors.city = "Completează localitatea";
  if (data.kind === "company") {
    const cui = (data.cui ?? "").replace(/^RO/i, "").trim();
    if (!/^\d{2,10}$/.test(cui)) errors.cui = "CUI-ul are între 2 și 10 cifre";
  }
  if (data.iban && data.iban.trim() && !checkIban(data.iban).ok) errors.iban = "IBAN invalid";
  return errors;
};

const EMPTY: BillingData = { kind: "person", name: "", email: "", address: "", city: "", county: "", iban: "" };

export function BillingForm({ onSubmit }: { onSubmit?: (data: BillingData) => void }) {
  const [data, setData] = useState<BillingData>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  const set = <K extends keyof BillingData>(key: K, value: BillingData[K]) => setData((current) => ({ ...current, [key]: value }));

  const field = (key: keyof BillingData, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label style={{ display: "grid", gap: 4, fontSize: 11, color: "rgba(255,255,255,.6)" }}>
      {label}
      <input
        value={String(data[key] ?? "")}
        onChange={(event) => set(key, event.target.value as never)}
        onBlur={() => setErrors(validate(data))}
        aria-invalid={Boolean(errors[key])}
        {...extra}
        style={{
          padding: ".45rem .65rem",
          borderRadius: 10,
          border: `1px solid ${errors[key] ? "#f87171" : "rgba(255,255,255,.14)"}`,
          background: "rgba(255,255,255,.04)",
          color: "#fff",
          fontSize: 13,
        }}
      />
      {errors[key] && <span style={{ color: "#fca5a5", fontSize: 10.5 }}>{errors[key]}</span>}
    </label>
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const found = validate(data);
        setErrors(found);
        if (Object.keys(found).length) return;
        setDone(true);
        onSubmit?.(data);
      }}
      style={{ display: "grid", gap: 10, width: "100%", color: "#fff" }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        {(
          [
            ["person", "Persoană fizică"],
            ["company", "Firmă"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => set("kind", id)}
            aria-pressed={data.kind === id}
            style={{
              flex: 1,
              padding: ".4rem .6rem",
              borderRadius: 10,
              border: 0,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: data.kind === id ? "#fff" : "rgba(255,255,255,.6)",
              background: data.kind === id ? "linear-gradient(135deg,#8b5cf6,#22d3ee)" : "rgba(255,255,255,.06)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {field("name", data.kind === "company" ? "Denumire firmă" : "Nume și prenume")}
      {data.kind === "company" && (
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          {field("cui", "CUI", { placeholder: "RO12345678", inputMode: "text" })}
          {field("regCom", "Reg. Com. (opțional)", { placeholder: "J40/1234/2020" })}
        </div>
      )}
      {field("email", "E-mail", { type: "email", autoComplete: "email" })}
      {field("address", "Adresă", { autoComplete: "street-address" })}
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
        {field("city", "Localitate", { autoComplete: "address-level2" })}
        {field("county", "Județ", { autoComplete: "address-level1" })}
      </div>
      {field("iban", "IBAN (opțional)", { spellCheck: false })}

      <button
        type="submit"
        style={{ marginTop: 2, padding: ".6rem 1rem", borderRadius: 999, border: 0, background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        {done ? "Date salvate" : "Salvează datele de facturare"}
      </button>
    </form>
  );
}

export default BillingForm;

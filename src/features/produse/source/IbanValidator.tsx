import { useMemo, useState } from "react";

/**
 * IbanValidator — Avyron Products (avyron.ro/produse)
 * Verifică un IBAN după regula oficială (mod 97 = 1) și, pentru conturile
 * românești, recunoaște banca din codul BIC de patru litere. Lista de bănci
 * acoperă doar câteva uzuale: un cod necunoscut se afișează ca atare, nu se
 * ghicește. Verificarea e matematică — nu spune dacă contul chiar există.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

/** Lungimea IBAN-ului pe câteva țări din zona în care lucrăm. */
const LENGTHS: Record<string, number> = { RO: 24, BG: 22, HU: 28, DE: 22, FR: 27, IT: 27, ES: 24, NL: 18, AT: 20, GB: 22, MD: 24 };

const RO_BANKS: Record<string, string> = {
  RNCB: "Banca Comercială Română",
  BTRL: "Banca Transilvania",
  BRDE: "BRD — Groupe Société Générale",
  INGB: "ING Bank",
  RZBR: "Raiffeisen Bank",
  BACX: "UniCredit Bank",
  CECE: "CEC Bank",
  OTPV: "OTP Bank",
  BREL: "Libra Internet Bank",
  CRDZ: "Credit Europe Bank",
  MIRO: "ProCredit Bank",
  TREZ: "Trezoreria Statului",
};

/** Restul împărțirii la 97, calculat pe bucăți ca să nu depășim `Number`. */
const mod97 = (digits: string) => {
  let remainder = 0;
  for (const character of digits) remainder = (remainder * 10 + Number(character)) % 97;
  return remainder;
};

export function checkIban(input: string): { ok: boolean; reason?: string; country?: string; bank?: string; pretty: string } {
  const raw = input.replace(/\s+/g, "").toUpperCase();
  const pretty = raw.replace(/(.{4})/g, "$1 ").trim();
  if (raw.length < 5) return { ok: false, reason: "prea scurt", pretty };
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(raw)) return { ok: false, reason: "format invalid", pretty };

  const country = raw.slice(0, 2);
  const expected = LENGTHS[country];
  if (expected && raw.length !== expected) return { ok: false, reason: `pentru ${country} sunt ${expected} caractere`, country, pretty };

  const rearranged = raw.slice(4) + raw.slice(0, 4);
  const digits = [...rearranged].map((character) => (/[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character)).join("");
  if (mod97(digits) !== 1) return { ok: false, reason: "cifra de control nu se verifică", country, pretty };

  const bank = country === "RO" ? (RO_BANKS[raw.slice(4, 8)] ?? `cod bancă ${raw.slice(4, 8)}`) : undefined;
  return { ok: true, country, bank, pretty };
}

export function IbanValidator({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  const result = useMemo(() => (value.trim() ? checkIban(value) : null), [value]);

  return (
    <div style={{ display: "grid", gap: 10, width: "100%", color: "#fff" }}>
      <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>
        IBAN
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="RO49 AAAA 1B31 0075 9384 0000"
          spellCheck={false}
          style={{
            width: "100%",
            marginTop: 4,
            padding: ".55rem .7rem",
            borderRadius: 12,
            border: `1px solid ${result && !result.ok ? "#f87171" : "rgba(255,255,255,.14)"}`,
            background: "rgba(255,255,255,.04)",
            color: "#fff",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            letterSpacing: ".04em",
          }}
        />
      </label>

      {result && (
        <p style={{ margin: 0, fontSize: 12.5, color: result.ok ? "#a3e635" : "#fca5a5" }} role="status">
          {result.ok ? `IBAN valid${result.bank ? ` · ${result.bank}` : ""}` : `Invalid: ${result.reason}`}
        </p>
      )}
      <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.45)" }}>
        Verificarea e matematică (mod 97). Nu confirmă că contul există sau că aparține cuiva anume.
      </p>
    </div>
  );
}

export default IbanValidator;

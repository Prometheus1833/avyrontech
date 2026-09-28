import { useId, useState, type InputHTMLAttributes } from "react";

/**
 * FloatingInput — Avyron Products (avyron.ro/produse)
 * Câmp cu etichetă care urcă și validare care apare abia după ce omul a
 * terminat de scris — nu îl cerți în timp ce tastează. Eticheta e un `<label>`
 * real, iar mesajul de eroare e legat prin `aria-describedby`.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Întoarce mesajul de eroare sau null dacă valoarea e bună. */
  validate?: (value: string) => string | null;
  color?: string;
};

export function FloatingInput({ label, validate, color = "#8b5cf6", ...rest }: Props) {
  const id = useId();
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const error = touched && validate ? validate(value) : null;
  const floated = value.length > 0;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        {...rest}
        id={id}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        placeholder=" "
        style={{
          width: "100%",
          padding: "1.35rem .9rem .6rem",
          borderRadius: 14,
          border: `1px solid ${error ? "#f87171" : "rgba(255,255,255,.14)"}`,
          background: "rgba(255,255,255,.04)",
          color: "#fff",
          outline: "none",
          transition: "border-color .25s ease, box-shadow .25s ease",
          boxShadow: error ? "0 0 0 3px rgba(248,113,113,.18)" : "none",
        }}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = error ? "#f87171" : color;
          event.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in oklab, ${color} 22%, transparent)`;
        }}
      />
      <label
        htmlFor={id}
        style={{
          position: "absolute",
          left: ".95rem",
          top: floated ? 8 : 16,
          fontSize: floated ? 11 : 14,
          color: error ? "#fca5a5" : "rgba(255,255,255,.6)",
          pointerEvents: "none",
          transition: "top .2s ease, font-size .2s ease, color .2s ease",
        }}
      >
        {label}
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" style={{ margin: "6px 2px 0", fontSize: 11.5, color: "#fca5a5" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default FloatingInput;

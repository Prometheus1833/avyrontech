import { useState } from "react";
import type { DemoProps } from "./registry";

/**
 * Demo pentru integrarea ANAF. Serviciul ANAF nu permite apeluri din browser
 * (fără CORS), deci aici arătăm fluxul cu un răspuns de exemplu — codul livrat
 * conține worker-ul care face apelul real.
 */

const SAMPLE: Record<string, { name: string; address: string; regCom: string; vat: boolean; eInvoice: boolean }> = {
  "45123456": { name: "EXEMPLU DIGITAL SRL", address: "Str. Palat 1, Iași, jud. Iași", regCom: "J22/1234/2021", vat: true, eInvoice: true },
};

export default function AnafDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  const [cui, setCui] = useState("45123456");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const info = SAMPLE[cui.replace(/\D/g, "")];

  const run = () => {
    setState("loading");
    window.setTimeout(() => setState(SAMPLE[cui.replace(/\D/g, "")] ? "done" : "error"), 650);
  };

  return (
    <div className="h-full w-full overflow-auto p-4 text-white">
      <p className="pa-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{ro ? "Verificare CUI · răspuns de exemplu" : "Company lookup · sample response"}</p>
      <div className="mt-2 flex gap-2">
        <input
          value={cui}
          onChange={(e) => {
            setCui(e.target.value);
            setState("idle");
          }}
          aria-label="CUI"
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
          placeholder="RO45123456"
        />
        <button type="button" onClick={run} className="rounded-xl bg-gradient-to-br from-brand to-brand-2 px-3 py-2 text-sm font-semibold">
          {state === "loading" ? "…" : ro ? "Caută" : "Look up"}
        </button>
      </div>
      {state === "error" && <p className="mt-3 text-xs text-red-300">{ro ? "Încearcă 45123456 — demo-ul are un singur CUI de exemplu." : "Try 45123456 — the demo ships one sample company."}</p>}
      {state === "done" && info && (
        <dl className="mt-3 grid gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-white/50">{ro ? "Denumire" : "Name"}</dt>
            <dd className="text-right font-medium">{info.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-white/50">{ro ? "Adresă" : "Address"}</dt>
            <dd className="text-right">{info.address}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-white/50">Reg. com.</dt>
            <dd className="text-right">{info.regCom}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-white/50">TVA</dt>
            <dd className="text-right">{info.vat ? (ro ? "plătitor" : "registered") : ro ? "neplătitor" : "not registered"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-white/50">e-Factura</dt>
            <dd className="text-right">{info.eInvoice ? "RO e-Factura" : "—"}</dd>
          </div>
        </dl>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-white/40">
        {ro
          ? "În producție, apelul trece printr-un worker cu cache 24 h și limitare — ANAF nu răspunde direct browserului."
          : "In production the call goes through a worker with 24 h cache and throttling — ANAF does not answer the browser directly."}
      </p>
    </div>
  );
}

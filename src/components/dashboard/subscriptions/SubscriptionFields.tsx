import { cloneElement, useId, type ReactElement } from "react";
import { inputClass } from "./subscriptionPresentation";
import type { BillingDetails } from "@/shared/subscriptionOperations";
export function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
  wide?: boolean;
}) {
  const id = useId();
  return (
    <div
      className={`min-w-0 text-xs text-slate-400 ${wide ? "sm:col-span-2" : ""}`}
    >
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
export function BillingFields({
  value,
  onChange,
}: {
  value: BillingDetails;
  onChange: (value: BillingDetails) => void;
}) {
  return (
    <fieldset className="grid min-w-0 gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-2">
      <legend className="px-1 text-sm font-semibold">
        Date pentru facturare
      </legend>
      <Field label="Tip beneficiar">
        <select
          className={inputClass}
          value={value.entityType}
          onChange={(e) =>
            onChange({
              ...value,
              entityType: e.target.value as BillingDetails["entityType"],
            })
          }
        >
          <option value="individual">Persoană fizică</option>
          <option value="company">Societate</option>
          <option value="pfa">PFA / II / IF</option>
          <option value="ngo">ONG / asociație</option>
          <option value="other">Altă formă</option>
        </select>
      </Field>
      <Field label="Denumire legală">
        <input
          className={inputClass}
          required
          value={value.legalName}
          onChange={(e) => onChange({ ...value, legalName: e.target.value })}
        />
      </Field>
      <Field
        label={
          value.entityType === "individual"
            ? "Identificator fiscal, dacă este necesar"
            : "CUI / identificator fiscal"
        }
      >
        <input
          className={inputClass}
          required={["company", "pfa"].includes(value.entityType)}
          value={value.taxId}
          onChange={(e) => onChange({ ...value, taxId: e.target.value })}
        />
      </Field>
      <Field label="E-mail facturare">
        <input
          className={inputClass}
          type="email"
          required
          value={value.invoiceEmail}
          onChange={(e) => onChange({ ...value, invoiceEmail: e.target.value })}
        />
      </Field>
      <Field label="Adresă de facturare" wide>
        <input
          className={inputClass}
          required
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
        />
      </Field>
      <Field label="Termen de plată · zile">
        <input
          className={inputClass}
          type="number"
          required
          min={0}
          max={90}
          value={value.paymentTermsDays}
          onChange={(e) =>
            onChange({ ...value, paymentTermsDays: Number(e.target.value) })
          }
        />
      </Field>
      <p className="self-center text-xs text-slate-500">
        Datele se păstrează pentru acest beneficiar. Verifică regimul fiscal
        înainte de emitere.
      </p>
    </fieldset>
  );
}

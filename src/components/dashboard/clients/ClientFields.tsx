import { cloneElement, type ReactElement, type ReactNode } from "react";
import {
  CLIENT_ENTITY_TYPES,
  type ClientIdentity,
  type NewClientAccount,
} from "@/shared/clientWorkspace";
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="cw-field">
      <span>{label}</span>
      {cloneElement(children as ReactElement, { "aria-label": label })}
    </label>
  );
}
export function IdentityFields({
  value,
  onChange,
  disabled = false,
}: {
  value: ClientIdentity;
  onChange: (v: ClientIdentity) => void;
  disabled?: boolean;
}) {
  const update = (key: keyof ClientIdentity, v: string) =>
    onChange({ ...value, [key]: v });
  return (
    <fieldset disabled={disabled} className="cw-grid">
      <Field label="Nume client / denumire afișată">
        <input
          required
          maxLength={180}
          value={value.companyName}
          onChange={(e) => {
            const companyName = e.target.value;
            onChange({
              ...value,
              companyName,
              legalName:
                !value.legalName || value.legalName === value.companyName
                  ? companyName
                  : value.legalName,
            });
          }}
        />
      </Field>
      <Field label="Tip client">
        <select
          value={value.entityType}
          required
          onChange={(e) => update("entityType", e.target.value)}
        >
          {!value.entityType && (
            <option value="">Selectează tipul clientului…</option>
          )}
          {CLIENT_ENTITY_TYPES.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </Field>
      <Field label="Denumire legală / nume complet">
        <input
          required
          maxLength={180}
          value={value.legalName}
          onChange={(e) => update("legalName", e.target.value)}
        />
      </Field>
      <Field label="Starea relației">
        <select
          value={value.status}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="active">Activ</option>
          <option value="paused">În pauză</option>
          <option value="archived">Arhivat</option>
        </select>
      </Field>
      <Field label="Persoană de contact">
        <input
          maxLength={180}
          value={value.contactName}
          onChange={(e) => update("contactName", e.target.value)}
        />
      </Field>
      <Field label="Email de contact">
        <input
          required
          type="email"
          maxLength={254}
          value={value.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </Field>
      <Field label="Telefon">
        <input
          type="tel"
          maxLength={40}
          value={value.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
      </Field>
      <Field label="Cod fiscal, dacă este necesar">
        <input
          maxLength={80}
          value={value.taxId}
          onChange={(e) => update("taxId", e.target.value)}
        />
      </Field>
      <Field label="Nr. registru / identificare, dacă există">
        <input
          maxLength={100}
          value={value.registrationNumber}
          onChange={(e) => update("registrationNumber", e.target.value)}
        />
      </Field>
      <Field label="Reprezentant">
        <input
          maxLength={180}
          value={value.representative}
          onChange={(e) => update("representative", e.target.value)}
        />
      </Field>
      <Field label="Adresă fiscală">
        <textarea
          maxLength={600}
          rows={2}
          value={value.address}
          onChange={(e) => update("address", e.target.value)}
        />
      </Field>
      <Field label="Note interne">
        <textarea
          maxLength={2000}
          rows={2}
          value={value.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </Field>
    </fieldset>
  );
}
export function AccountFields({
  value,
  onChange,
}: {
  value: NewClientAccount;
  onChange: (v: NewClientAccount) => void;
}) {
  const update = (key: keyof NewClientAccount, v: string) =>
    onChange({ ...value, [key]: v });
  return (
    <>
      <div className="cw-grid">
        <Field label="Email de autentificare">
          <input
            required
            type="email"
            autoComplete="off"
            maxLength={254}
            value={value.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
        <Field label="Nume utilizator">
          <input
            required
            autoComplete="off"
            minLength={3}
            maxLength={40}
            pattern="[a-zA-Z0-9._-]+"
            value={value.username}
            onChange={(e) => update("username", e.target.value)}
          />
        </Field>
        <Field label="Nume afișat în cont">
          <input
            required
            maxLength={100}
            value={value.displayName}
            onChange={(e) => update("displayName", e.target.value)}
          />
        </Field>
        <Field label="Parolă temporară">
          <input
            required
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={256}
            pattern="(?=.*[A-Z])(?=.*[0-9]).{10,}"
            value={value.temporaryPassword}
            onChange={(e) => update("temporaryPassword", e.target.value)}
          />
        </Field>
      </div>
      <p className="cw-hint">
        Minimum 10 caractere, o literă mare și o cifră. La prima autentificare,
        clientul trebuie să schimbe parola înainte de a accesa contul. Datele de
        acces se comunică printr-un canal securizat.
      </p>
    </>
  );
}
export function Confirm({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="cw-confirm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

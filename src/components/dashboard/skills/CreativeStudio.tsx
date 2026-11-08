import type { SkillBrief, SkillSlug } from "@/shared/skills/model";
import {
  CREATIVE_CHECKS,
  CREATIVE_VERSION,
  LOGO_PALETTES,
  LOGO_STYLES,
  MEDIA_PURPOSES,
  MEDIA_LIGHTS,
  MEDIA_COMPOSITIONS,
  mediaPrompt,
} from "@/shared/skills/creative";
import { Button } from "@/components/ui/button";
import { Copy, Download, Palette, ImageIcon } from "lucide-react";
import { toast } from "sonner";
const control =
  "min-h-11 w-full min-w-0 rounded-xl border border-white/15 bg-[#0b1120] px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";
const presets = {
  "logo-engine": [
    { label: "Tech clar", palette: "violet" },
    { label: "Natural rafinat", palette: "sage" },
    { label: "Editorial premium", palette: "amber" },
  ],
  "media-generate": [
    {
      label: "Hero cinematic",
      purpose: "hero",
      lighting: "cinematic",
      composition: "left",
    },
    {
      label: "Produs în studio",
      purpose: "product",
      lighting: "studio",
      composition: "center",
    },
    {
      label: "Editorial natural",
      purpose: "editorial",
      lighting: "natural",
      composition: "detail",
    },
  ],
} as const;
export function CreativeStudioIntro({
  slug,
  brief,
  onChange,
}: {
  slug: SkillSlug;
  brief: SkillBrief;
  onChange: (b: SkillBrief) => void;
}) {
  if (slug === "site-builder") return null;
  const logo = slug === "logo-engine";
  const Icon = logo ? Palette : ImageIcon;
  return (
    <section
      aria-label={logo ? "Atelier identitate" : "Atelier imagine"}
      className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-4"
    >
      <div className="flex items-start gap-3">
        <Icon aria-hidden className="mt-1 size-5 shrink-0 text-violet-300" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-violet-300">
            {logo ? "Identitate cu direcție" : "Imagine cu intenție"} ·{" "}
            {CREATIVE_VERSION}
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {logo
              ? "De la caracterul mărcii la un sistem vizual."
              : "De la idee la un master verificat."}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
            {logo
              ? "Trei studii de compoziție, paletă și handoff. Conceptele editabile nu sunt identități finale sau mărci verificate."
              : "Brief, prompt, generare explicită și control de calitate. Masterul se păstrează separat de variantele web; rezoluția se raportează exact."}
          </p>
        </div>
      </div>
      <div
        className="mt-3 flex flex-wrap gap-2"
        aria-label="Puncte de pornire creative"
      >
        {presets[slug].map((p, i) => (
          <Button
            key={p.label}
            variant="outline"
            type="button"
            className="h-auto min-h-11 max-w-full whitespace-normal text-xs"
            onClick={() =>
              onChange(
                logo
                  ? {
                      ...brief,
                      logo: {
                        ...brief.logo,
                        palette: presets["logo-engine"][i].palette,
                      },
                    }
                  : {
                      ...brief,
                      media: {
                        ...brief.media,
                        purpose: presets["media-generate"][i].purpose,
                        lighting: presets["media-generate"][i].lighting,
                        composition: presets["media-generate"][i].composition,
                      },
                    },
              )
            }
          >
            {p.label}
          </Button>
        ))}
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300 sm:grid-cols-4">
        {(logo
          ? [
              "Brief și caracter",
              "Trei direcții",
              "Verificare și rafinare",
              "Handoff / produs potrivit",
            ]
          : [
              "Scop și compoziție",
              "Prompt exact",
              "Generare autorizată",
              "Verificare și master",
            ]
        ).map((s, i) => (
          <li key={s} className="rounded-lg border border-white/10 px-3 py-2">
            <span className="mr-2 text-violet-300">0{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </section>
  );
}
export function CreativeBriefFields({
  slug,
  brief,
  onChange,
}: {
  slug: SkillSlug;
  brief: SkillBrief;
  onChange: (b: SkillBrief) => void;
}) {
  if (slug === "site-builder") return null;
  const logo = slug === "logo-engine";
  const select = (
    id: string,
    label: string,
    value: string,
    options: Record<string, string>,
    change: (v: string) => void,
  ) => (
    <label
      className="block min-w-0 space-y-1.5 text-xs text-slate-300"
      htmlFor={id}
    >
      <span id={`${id}-label`}>{label}</span>
      <select
        aria-labelledby={`${id}-label`}
        id={id}
        className={control}
        value={value}
        onChange={(e) => change(e.target.value)}
      >
        {Object.entries(options).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  const input = (
    id: string,
    label: string,
    value: string,
    max: number,
    change: (v: string) => void,
    placeholder: string,
  ) => (
    <label className="block space-y-1.5 text-xs text-slate-300" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className={control}
        maxLength={max}
        value={value}
        placeholder={placeholder}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );
  return (
    <fieldset className="min-w-0 space-y-3 border-t border-white/10 pt-3">
      <legend className="px-1 text-xs font-semibold text-violet-200">
        {logo ? "Caracterul identității" : "Direcția imaginii"}
      </legend>
      {logo ? (
        <>
          {select(
            "logo-kind",
            "Tip de identitate",
            brief.logo.kind,
            LOGO_STYLES,
            (v) =>
              onChange({
                ...brief,
                logo: { ...brief.logo, kind: v as SkillBrief["logo"]["kind"] },
              }),
          )}
          {select(
            "logo-palette",
            "Paletă de explorat",
            brief.logo.palette,
            Object.fromEntries(
              Object.entries(LOGO_PALETTES).map(([k, v]) => [k, v.label]),
            ),
            (v) =>
              onChange({
                ...brief,
                logo: {
                  ...brief.logo,
                  palette: v as SkillBrief["logo"]["palette"],
                },
              }),
          )}
          {input(
            "logo-tagline",
            "Semnătură / tagline (opțional)",
            brief.logo.tagline,
            70,
            (v) => onChange({ ...brief, logo: { ...brief.logo, tagline: v } }),
            "Fără slogan inventat",
          )}
          {input(
            "logo-symbols",
            "Simboluri / idei de explorat",
            brief.logo.symbols,
            300,
            (v) => onChange({ ...brief, logo: { ...brief.logo, symbols: v } }),
            "Ex.: formă compactă, mișcare, inițiale",
          )}
          {input(
            "logo-avoid",
            "Ce evităm în identitate",
            brief.logo.avoid,
            200,
            (v) => onChange({ ...brief, logo: { ...brief.logo, avoid: v } }),
            "Ex.: clișee, simboluri prea detaliate",
          )}
        </>
      ) : (
        <>
          {select(
            "media-purpose",
            "Utilizarea imaginii",
            brief.media.purpose,
            MEDIA_PURPOSES,
            (v) =>
              onChange({
                ...brief,
                media: {
                  ...brief.media,
                  purpose: v as SkillBrief["media"]["purpose"],
                },
              }),
          )}
          {input(
            "media-subject",
            "Subiectul principal",
            brief.media.subject,
            280,
            (v) =>
              onChange({ ...brief, media: { ...brief.media, subject: v } }),
            "Ex.: suită spa cu piatră naturală și lumină caldă",
          )}
          {select(
            "media-lighting",
            "Lumină",
            brief.media.lighting,
            {
              natural: "Naturală",
              studio: "Studio controlat",
              cinematic: "Cinematică",
            },
            (v) =>
              onChange({
                ...brief,
                media: {
                  ...brief.media,
                  lighting: v as SkillBrief["media"]["lighting"],
                },
              }),
          )}
          {select(
            "media-composition",
            "Compoziție",
            brief.media.composition,
            {
              left: "Spațiu pentru text în stânga",
              center: "Subiect centrat · crop sigur",
              detail: "Detaliu de material",
            },
            (v) =>
              onChange({
                ...brief,
                media: {
                  ...brief.media,
                  composition: v as SkillBrief["media"]["composition"],
                },
              }),
          )}
          <p className="text-[11px] leading-relaxed text-slate-400">
            {MEDIA_LIGHTS[brief.media.lighting]}.{" "}
            {MEDIA_COMPOSITIONS[brief.media.composition]}.
          </p>
          {input(
            "media-avoid",
            "Ce evităm în imagine",
            brief.media.avoid,
            200,
            (v) => onChange({ ...brief, media: { ...brief.media, avoid: v } }),
            "Ex.: plastic, text randat, culori artificiale",
          )}
        </>
      )}
      {input(
        "creative-preferences",
        "Preferințe de art direction",
        brief.preferences,
        1200,
        (v) => onChange({ ...brief, preferences: v }),
        "Stil, materiale, atmosferă, utilizări",
      )}
      {slug === "media-generate" && (
        <details className="rounded-xl border border-white/10 p-3">
          <summary className="cursor-pointer py-1 text-xs font-medium text-violet-200">
            Promptul pregătit · fără apel AI
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-300">
            {mediaPrompt(brief)}
          </pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="outline"
              type="button"
              className="min-h-11 text-xs"
              onClick={() =>
                void navigator.clipboard
                  .writeText(mediaPrompt(brief))
                  .then(() => toast.success("Prompt copiat"))
                  .catch(() =>
                    toast.error(
                      "Copierea nu este disponibilă. Selectează textul.",
                    ),
                  )
              }
            >
              <Copy className="mr-2 size-3.5" />
              Copiază prompt
            </Button>
            <Button
              variant="outline"
              type="button"
              className="min-h-11 text-xs"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([mediaPrompt(brief)], {
                    type: "text/plain;charset=utf-8",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "avy-media-prompt.txt";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              <Download className="mr-2 size-3.5" />
              Descarcă prompt
            </Button>
          </div>
        </details>
      )}
    </fieldset>
  );
}
export function CreativeQualityPanel({ slug }: { slug: SkillSlug }) {
  if (slug === "site-builder") return null;
  return (
    <details className="mt-3 rounded-xl border border-white/10 p-3">
      <summary className="cursor-pointer py-1 text-xs font-medium text-violet-200">
        Repere pentru verificarea calității
      </summary>
      <ul className="mt-2 space-y-2 text-xs text-slate-300">
        {CREATIVE_CHECKS[slug].map((c) => (
          <li key={c}>· {c}</li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-slate-400">
        Aprobarea internă este o decizie umană. Nu publică, nu livrează și nu
        modifică tarifele sau licențele.
      </p>
    </details>
  );
}

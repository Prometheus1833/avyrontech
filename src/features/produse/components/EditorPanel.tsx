import type { Lang } from "@/i18n/translations";
import type { CatalogItem, PropValues } from "../data/types";

/**
 * Editor Mode: props live. Valorile modificate merg direct în demo și în
 * promptul/codul copiat, deci ce vezi e ce primești.
 */
export default function EditorPanel({
  item,
  values,
  onChange,
  lang,
}: {
  item: CatalogItem;
  values: PropValues;
  onChange: (next: PropValues) => void;
  lang: Lang;
}) {
  if (!item.props?.length) return null;
  const set = (key: string, value: string | number | boolean) => onChange({ ...values, [key]: value });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {item.props.map((prop) => (
        <label key={prop.key} className="block">
          <span className="pa-mono mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {prop.label[lang]}
            {prop.type === "number" && <span className="tabular-nums text-foreground/70">{String(values[prop.key] ?? prop.default)}</span>}
          </span>
          {prop.type === "color" && (
            <input
              type="color"
              value={String(values[prop.key] ?? prop.default)}
              onChange={(e) => set(prop.key, e.target.value)}
              className="h-8 w-full cursor-pointer rounded-lg border border-foreground/10 bg-transparent p-0"
            />
          )}
          {prop.type === "number" && (
            <input
              type="range"
              min={prop.min}
              max={prop.max}
              step={prop.step ?? 1}
              value={Number(values[prop.key] ?? prop.default)}
              onChange={(e) => set(prop.key, Number(e.target.value))}
              className="h-1 w-full accent-[hsl(var(--pa-hue)_90%_68%)]"
            />
          )}
          {prop.type === "boolean" && (
            <input
              type="checkbox"
              checked={Boolean(values[prop.key] ?? prop.default)}
              onChange={(e) => set(prop.key, e.target.checked)}
              className="size-4 accent-[hsl(var(--pa-hue)_90%_68%)]"
            />
          )}
          {prop.type === "text" && (
            <input
              value={String(values[prop.key] ?? prop.default)}
              maxLength={prop.max ?? 60}
              onChange={(e) => set(prop.key, e.target.value)}
              className="w-full rounded-lg border border-foreground/12 bg-foreground/[0.04] px-2.5 py-1.5 text-sm text-foreground"
            />
          )}
          {prop.type === "select" && (
            <select
              value={String(values[prop.key] ?? prop.default)}
              onChange={(e) => set(prop.key, e.target.value)}
              className="w-full rounded-lg border border-foreground/12 bg-foreground/[0.04] px-2.5 py-1.5 text-sm text-foreground"
            >
              {prop.options.map((option) => (
                <option key={option.value} value={option.value} className="bg-background">
                  {option.label[lang]}
                </option>
              ))}
            </select>
          )}
        </label>
      ))}
    </div>
  );
}

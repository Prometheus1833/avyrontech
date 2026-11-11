import { useState } from "react";
import { AppWindow, Braces, FileCheck2, Layers3, PanelsTopLeft, Sparkles, Wrench } from "lucide-react";
import type { CatalogItem } from "../data/types";

const icons = {
  api: Braces,
  component: Layers3,
  doc: FileCheck2,
  effect: Sparkles,
  logo: Sparkles,
  section: PanelsTopLeft,
  template: AppWindow,
  tool: Wrench,
};

export default function ProductPoster({ item, note, eager = false }: { item: CatalogItem; note?: string; eager?: boolean }) {
  const [failed, setFailed] = useState("");
  const Icon = icons[item.type];
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#090f1d]" data-product-preview={item.slug}>
      <div aria-hidden="true" className="absolute inset-0 grid place-items-center text-indigo-200/70">
        <Icon className="size-12" />
      </div>
      {failed !== item.slug && (
        <img
          src={`/previews/produse/${item.slug}.webp`}
          alt=""
          width={480}
          height={300}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(item.slug)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {note && <p className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-center text-xs text-white">{note}</p>}
    </div>
  );
}

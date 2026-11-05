import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";
import {
  carouselConfigSchema,
  defaultCarousel,
  publicCarousel,
  type CarouselConfig,
} from "@/shared/exampleCarousels";
import { publicBootstrapJson } from "@/shared/exampleCarouselRendering";
const jsdom = () =>
  typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
function initial(key: string): { config: CarouselConfig | null } | undefined {
  if (jsdom()) return { config: publicCarousel(defaultCarousel(key)) };
  try {
    const data = JSON.parse(
      document.getElementById("example-carousel-initial")?.textContent || "{}",
    );
    if (Object.prototype.hasOwnProperty.call(data, key))
      return {
        config:
          data[key] === null ? null : carouselConfigSchema.parse(data[key]),
      };
  } catch {
    /* Missing bootstrap on SPA navigation is fetched before rendering. */
  }
}
export function useExampleCarousel(key: string) {
  const query = useQuery({
    queryKey: ["public-example-carousel", key],
    initialData: () => initial(key),
    queryFn: async () => {
      const r = await fetch(
        apiUrl(`/api/public/example-carousels/${encodeURIComponent(key)}`),
        { credentials: "omit", cache: "no-store" },
      );
      if (!r.ok) throw Error("Caruselul nu este disponibil.");
      const data = (await r.json()) as { config?: CarouselConfig | null };
      if (!Object.prototype.hasOwnProperty.call(data, "config"))
        throw Error("Răspuns invalid.");
      return {
        config:
          data.config === null
            ? null
            : publicCarousel(carouselConfigSchema.parse(data.config)),
      };
    },
    enabled: !!key && !jsdom(),
    staleTime: 0,
    retry: 1,
    refetchInterval: 60000,
  });
  // Only the build-time renderer emits a static bootstrap. The live Worker
  // replaces it with the currently published public projection.
  useEffect(() => {
    if (jsdom() && typeof document !== "undefined") {
      let script = document.getElementById("example-carousel-initial");
      if (!script) {
        script = document.createElement("script");
        script.id = "example-carousel-initial";
        script.setAttribute("type", "application/json");
        document.head.appendChild(script);
      }
      script.textContent = publicBootstrapJson(key, query.data?.config ?? null);
    }
  }, [key, query.data]);
  return query.data?.config ?? null;
}

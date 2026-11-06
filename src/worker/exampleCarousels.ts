import {
  carouselConfigSchema,
  carouselPageForPath,
  publicCarousel,
  type CarouselConfig,
} from "../shared/exampleCarousels";
import {
  defaultCarouselHeading,
  publicBootstrapJson,
  renderCarouselStatic,
  type CarouselHeading,
} from "../shared/exampleCarouselRendering";
import { headersForTransformedBody } from "./blogHtml";

/** Revalidate on every page load so an unpublished/hidden example cannot linger
 * in prerendered HTML or flash back during React startup. API failure hides the
 * carousel; it never resurrects an old published snapshot. */
export async function rewriteExampleCarousels(
  response: Response,
  url: URL,
  load: (key: string) => Promise<CarouselConfig | null>,
) {
  const page = carouselPageForPath(url.pathname);
  if (
    !page ||
    response.status !== 200 ||
    !response.headers.get("content-type")?.includes("text/html") ||
    typeof HTMLRewriter === "undefined"
  )
    return response;
  let config: CarouselConfig | null = null;
  try {
    const value = await load(page.key);
    config =
      value === null ? null : publicCarousel(carouselConfigSchema.parse(value));
  } catch {
    /* Fail closed for this optional public surface. */
  }
  const headers = headersForTransformedBody(response.headers);
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  const json = publicBootstrapJson(page.key, config);
  return new HTMLRewriter()
    .on("script#example-carousel-initial", {
      element(e) {
        e.remove();
      },
    })
    .on("head", {
      element(e) {
        e.append(
          `<script type="application/json" id="example-carousel-initial">${json}</script>`,
          { html: true },
        );
      },
    })
    .on("[data-example-carousel]", {
      element(e) {
        if (e.getAttribute("data-example-carousel") !== page.key) return;
        let images: Record<string, string> = {},
          heading: CarouselHeading = defaultCarouselHeading(page.lang);
        try {
          images = JSON.parse(
            decodeURIComponent(e.getAttribute("data-example-images") || ""),
          );
          heading = JSON.parse(
            decodeURIComponent(e.getAttribute("data-example-heading") || ""),
          );
        } catch {
          /* Valid built-in content always carries these attributes. */
        }
        e.setInnerContent(
          renderCarouselStatic(config, page.lang, images, heading),
          { html: true },
        );
      },
    })
    .transform(
      new Response(response.body, { status: response.status, headers }),
    );
}

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { homeAnchorDepth, useHomeAnchor } from "@/lib/useHomeAnchor";
let first: ReturnType<typeof vi.fn>, second: ReturnType<typeof vi.fn>;
beforeEach(() => {
  document.body.innerHTML =
    '<main><div data-deferred-pending></div><section id="blog-avyron"></section><section id="social"></section></main>';
  first = vi.fn();
  second = vi.fn();
  document.getElementById("blog-avyron")!.scrollIntoView = first;
  document.getElementById("social")!.scrollIntoView = second;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
it("waits for preceding deferred sections before committing a deep link once", async () => {
  const view = renderHook(() => useHomeAnchor("#blog-avyron"));
  expect(view.result.current).toBe(false);
  expect(first).not.toHaveBeenCalled();
  document.querySelector("[data-deferred-pending]")!.remove();
  await waitFor(() => expect(first).toHaveBeenCalledTimes(1));
  expect(view.result.current).toBe(true);
  document.querySelector("main")!.append(document.createElement("p"));
  await new Promise((resolve) => setTimeout(resolve, 180));
  expect(first).toHaveBeenCalledTimes(1);
});
it("does not let an old hash jump override the user after a pointer interaction", async () => {
  const view = renderHook(() => useHomeAnchor("#blog-avyron"));
  act(() => window.dispatchEvent(new Event("pointerdown")));
  expect(view.result.current).toBe(true);
  document.querySelector("[data-deferred-pending]")!.remove();
  await new Promise((resolve) => setTimeout(resolve, 180));
  expect(first).not.toHaveBeenCalled();
});
it("cancels the earlier anchor when the destination changes", async () => {
  const view = renderHook(({ hash }) => useHomeAnchor(hash), {
    initialProps: { hash: "#blog-avyron" },
  });
  view.rerender({ hash: "#social" });
  document.querySelector("[data-deferred-pending]")!.remove();
  await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
  expect(first).not.toHaveBeenCalled();
});
it("only reveals sections preceding a known destination", () => {
  expect(homeAnchorDepth("#blog-avyron")).toBe(9);
  expect(homeAnchorDepth("#domenii")).toBe(0);
  expect(homeAnchorDepth("#de-ce")).toBe(1);
  expect(homeAnchorDepth("#unknown")).toBe(-1);
});

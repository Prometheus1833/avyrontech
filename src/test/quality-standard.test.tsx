import { render, cleanup, act } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import QualityStandard from "../components/site/QualityStandard";
let callback: IntersectionObserverCallback,
  frame: FrameRequestCallback | undefined;
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup(reduced = false) {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: globalThis.matchMedia,
  });
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((cb: FrameRequestCallback) => {
      frame = cb;
      return 1;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const view = render(<QualityStandard />),
    section = view.container.querySelector("section")!;
  return {
    view,
    section,
    enter: () =>
      act(() =>
        callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
      ),
  };
}
it("waits for viewport entry, animates once, and settles without a persistent frame loop", () => {
  const { section, enter } = setup();
  expect(section.dataset.qualityProgress).toBe("0");
  expect(requestAnimationFrame).not.toHaveBeenCalled();
  enter();
  act(() => frame!(0));
  act(() => frame!(725));
  expect(Number(section.dataset.qualityProgress)).toBeGreaterThan(0);
  expect(Number(section.dataset.qualityProgress)).toBeLessThan(100);
  act(() => frame!(1450));
  expect(section.dataset.qualityProgress).toBe("100");
  const count = vi.mocked(requestAnimationFrame).mock.calls.length;
  enter();
  expect(requestAnimationFrame).toHaveBeenCalledTimes(count);
  expect(section.querySelectorAll("article")).toHaveLength(5);
  expect(section.textContent).toContain("audit");
});
it("uses the final static state with reduced motion and cleans up the observer", () => {
  const { section, enter, view } = setup(true);
  enter();
  expect(section.dataset.qualityProgress).toBe("100");
  expect(requestAnimationFrame).not.toHaveBeenCalled();
  view.unmount();
  expect(cancelAnimationFrame).toHaveBeenCalled();
});

it("starts for the newest entry when the observer batches exit and entry", () => {
  const { section } = setup(true);
  act(() =>
    callback(
      [
        { isIntersecting: false },
        { isIntersecting: true },
      ] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    ),
  );
  expect(section.dataset.qualityProgress).toBe("100");
});

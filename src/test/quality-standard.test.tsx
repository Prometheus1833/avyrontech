import { render, cleanup, act } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import QualityStandard from "../components/site/QualityStandard";
let frame: FrameRequestCallback | undefined;
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup(reduced = false) {
  let callback: IntersectionObserverCallback | undefined;
  const disconnect = vi.fn(() => { callback = undefined; });
  const observe = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe = observe;
      disconnect = disconnect;
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
    observe,
    disconnect,
    enter: (entries = [{ isIntersecting: true }]) =>
      act(() =>
        callback?.(
          entries as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        ),
      ),
  };
}
it("waits for viewport entry, animates once, and settles without a persistent frame loop", () => {
  const { section, enter } = setup();
  expect(section.dataset.qualityProgress).toBe("100");
  expect(requestAnimationFrame).not.toHaveBeenCalled();
  enter();
  act(() => frame!(0));
  expect(section.dataset.qualityProgress).toBe("0");
  act(() => frame!(725));
  expect(Number(section.dataset.qualityProgress)).toBeGreaterThan(0);
  expect(Number(section.dataset.qualityProgress)).toBeLessThan(100);
  act(() => frame!(1450));
  expect(section.dataset.qualityProgress).toBe("100");
  const count = vi.mocked(requestAnimationFrame).mock.calls.length;
  enter();
  expect(requestAnimationFrame).toHaveBeenCalledTimes(count);
  expect(section.querySelectorAll("article")).toHaveLength(5);
  expect(section.querySelectorAll("li")).toHaveLength(20);
});
it("uses the final static state with reduced motion without observing the viewport", () => {
  const { section, observe } = setup(true);
  expect(section.dataset.qualityProgress).toBe("100");
  expect(observe).not.toHaveBeenCalled();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});

it("disconnects and cancels the frame on unmount", () => {
  const { enter, view, disconnect } = setup();
  enter();
  view.unmount();
  expect(disconnect).toHaveBeenCalled();
  expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
});

it("starts for the newest entry when the observer batches exit and entry", () => {
  const { enter } = setup();
  enter([{ isIntersecting: false }, { isIntersecting: true }]);
  expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
});

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LatestBlog from "@/components/site/LatestBlog";
const state = vi.hoisted(() => ({
  next: vi.fn(),
  to: vi.fn(),
  reduced: false,
  visible: undefined as IntersectionObserverCallback | undefined,
}));
vi.mock("framer-motion", () => ({ useReducedMotion: () => state.reduced }));
vi.mock("@/lib/blogApi", () => ({
  blogApi: { listPublished: vi.fn(async () => ({ data: [] })) },
}));
vi.mock("embla-carousel-react", () => {
  const api = {
    selectedScrollSnap: () => 0,
    scrollSnapList: () => [0, 1, 2],
    canScrollPrev: () => false,
    canScrollNext: () => true,
    scrollNext: state.next,
    scrollTo: state.to,
    on: () => api,
    off: () => api,
  };
  return { default: () => [vi.fn(), api] };
});
beforeEach(() => {
  state.reduced = false;
  state.next.mockClear();
  vi.useFakeTimers();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        state.visible = cb;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function mount() {
  const view = render(
    <MemoryRouter>
      <LatestBlog />
    </MemoryRouter>,
  );
  return {
    ...view,
    enter: () =>
      act(() =>
        state.visible!(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
      ),
  };
}
it("only advances while visible and stops permanently on an article interaction", async () => {
  const view = mount();
  await act(async () => {});
  act(() => vi.advanceTimersByTime(7000));
  expect(state.next).not.toHaveBeenCalled();
  view.enter();
  act(() => vi.advanceTimersByTime(6000));
  expect(state.next).toHaveBeenCalledTimes(1);
  fireEvent.pointerDown(view.container.querySelector("article a")!);
  act(() => vi.advanceTimersByTime(12000));
  expect(state.next).toHaveBeenCalledTimes(1);
  fireEvent.click(
    screen.getByRole("button", { name: "Pornește rularea automată" }),
  );
  act(() => vi.advanceTimersByTime(6000));
  expect(state.next).toHaveBeenCalledTimes(2);
  view.unmount();
  act(() => vi.advanceTimersByTime(12000));
  expect(state.next).toHaveBeenCalledTimes(2);
});
it("pauses for keyboard focus and hover without taking over page navigation", async () => {
  const view = mount();
  await act(async () => {});
  view.enter();
  pointer(view.container.querySelector("section")!, "pointerover", "mouse");
  act(() => vi.advanceTimersByTime(6000));
  expect(state.next).not.toHaveBeenCalled();
  pointer(view.container.querySelector("section")!, "pointerout", "mouse");
  act(() => vi.advanceTimersByTime(6000));
  expect(state.next).toHaveBeenCalledTimes(1);
  fireEvent.focus(view.container.querySelector("article a")!);
  act(() => vi.advanceTimersByTime(6000));
  expect(state.next).toHaveBeenCalledTimes(1);
});
it("keeps reduced-motion users in manual mode", async () => {
  state.reduced = true;
  const view = mount();
  await act(async () => {});
  view.enter();
  act(() => vi.advanceTimersByTime(12000));
  expect(state.next).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: "Oprește rularea automată" }),
  ).toBeNull();
});

it("suspends timers outside the viewport and in a hidden tab", async () => {
  const view = mount();
  await act(async () => {});
  view.enter();
  act(() =>
    state.visible!(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
  act(() => vi.advanceTimersByTime(12000));
  expect(state.next).not.toHaveBeenCalled();
  view.enter();
  act(() => vi.advanceTimersByTime(6000));
  expect(state.next).toHaveBeenCalledTimes(1);
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  act(() => vi.advanceTimersByTime(12000));
  expect(state.next).toHaveBeenCalledTimes(1);
  hidden.mockRestore();
});

function pointer(node: Element, type: string, pointerType: string) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  fireEvent(node, event);
}
it("does not leave touch users in a synthetic hover state when playback is resumed", async () => {
  const view = mount();
  await act(async () => {});
  view.enter();
  pointer(view.container.querySelector("section")!, "pointerover", "touch");
  fireEvent.pointerDown(view.container.querySelector("article a")!);
  fireEvent.click(
    screen.getByRole("button", { name: "Pornește rularea automată" }),
  );
  act(() => vi.advanceTimersByTime(6000));
  expect(state.next).toHaveBeenCalledTimes(1);
});

it("uses the newest queued intersection instead of an obsolete exit event", async () => {
  mount();
  await act(async () => {});
  const batch = (values: boolean[]) =>
    act(() =>
      state.visible!(
        values.map(
          (isIntersecting) => ({ isIntersecting }) as IntersectionObserverEntry,
        ),
        {} as IntersectionObserver,
      ),
    );
  batch([false, true]);
  act(() => vi.advanceTimersByTime(6000));
  expect(state.next).toHaveBeenCalledTimes(1);
  batch([true, false]);
  act(() => vi.advanceTimersByTime(12000));
  expect(state.next).toHaveBeenCalledTimes(1);
});

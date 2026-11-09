import { Component, Suspense, type ReactNode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import RouteTransition from "@/components/site/RouteTransition";
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() { return this.state.error ? <p role="alert">{this.state.error.message}</p> : this.props.children; }
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); window.dispatchEvent(new Event("pageshow")); });
describe("route chunk recovery", () => {
  it("preserves the retry guard until a successfully loaded route commits", () => {
    sessionStorage.setItem("avyron:chunk-reload", "1");
    render(<MemoryRouter><RouteTransition><p>Loaded route</p></RouteTransition></MemoryRouter>);
    expect(screen.getByText("Loaded route")).toBeVisible();
    expect(sessionStorage.getItem("avyron:chunk-reload")).toBeNull();
  });
  it("does not clear the guard while a route is suspended", () => {
    sessionStorage.setItem("avyron:chunk-reload", "1");
    const Pending = lazyWithRetry(() => new Promise(() => {}));
    render(<MemoryRouter><Suspense fallback={<p>Loading</p>}><RouteTransition><Pending /></RouteTransition></Suspense></MemoryRouter>);
    expect(screen.getByText("Loading")).toBeVisible();
    expect(sessionStorage.getItem("avyron:chunk-reload")).toBe("1");
  });
  it("does not let an import cancelled by leaving the document trigger another reload", async () => {
    let reject!: (error: Error) => void;
    const Pending = lazyWithRetry(() => new Promise((_resolve, fail) => { reject = fail; }));
    render(<Suspense fallback={<p>Loading</p>}><Pending /></Suspense>);
    await act(async () => { window.dispatchEvent(new Event("pagehide")); reject(new Error("cancelled import")); await Promise.resolve(); });
    expect(sessionStorage.getItem("avyron:chunk-reload")).toBeNull();
    expect(screen.getByText("Loading")).toBeVisible();
  });
  it("does not reload the old URL when an import fails on a later task during navigation", async () => {
    let reject!: (error: Error) => void;
    const Pending = lazyWithRetry(() => new Promise((_resolve, fail) => { reject = fail; }));
    render(<Suspense fallback={<p>Loading</p>}><Pending /></Suspense>);
    await act(async () => {
      window.dispatchEvent(new Event("beforeunload"));
      await new Promise(resolve => setTimeout(resolve, 10));
      reject(new TypeError("Failed to fetch dynamically imported module"));
      await Promise.resolve();
    });
    expect(sessionStorage.getItem("avyron:chunk-reload")).toBeNull();
  });
  it("allows normal recovery again when the user stays and interacts with the document", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sessionStorage.setItem("avyron:chunk-reload", "1");
    window.dispatchEvent(new Event("beforeunload"));
    window.dispatchEvent(new KeyboardEvent("keydown", {key:"Tab"}));
    const Failed = lazyWithRetry(() => Promise.reject(new Error("recoverable import error")));
    await act(async () => { render(<Boundary><Suspense fallback={<p>Loading</p>}><Failed /></Suspense></Boundary>); });
    expect(screen.getByRole("alert")).toHaveTextContent("recoverable import error");
  });
  it("keeps the actual import error when browser storage is blocked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    const Failed = lazyWithRetry(() => Promise.reject(new Error("original import failure")));
    await act(async () => { render(<Boundary><Suspense fallback={<p>Loading</p>}><Failed /></Suspense></Boundary>); });
    expect(screen.getByRole("alert")).toHaveTextContent("original import failure");
  });
});

it("offers a safe recovery view without exposing exception details", async () => {
  const { default: RouteErrorBoundary } = await import("@/components/site/RouteErrorBoundary");
  vi.spyOn(console, "error").mockImplementation(() => {});
  const Failure = () => { throw new Error("private-document-token"); };
  render(<MemoryRouter><RouteErrorBoundary><Failure /></RouteErrorBoundary></MemoryRouter>);
  expect(screen.getByRole("alert")).toHaveTextContent("Pagina nu a putut fi încărcată");
  expect(screen.getByRole("button", { name: "Reîncarcă pagina" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Pagina principală" })).toHaveAttribute("href", "/");
  expect(screen.queryByText(/private-document-token/)).not.toBeInTheDocument();
});

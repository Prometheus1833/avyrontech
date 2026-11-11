import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cfAuth } from "@/lib/cfAuth";
import { AccountCartProvider } from "@/hooks/AccountCartProvider";
import { useAccountCart } from "@/hooks/useAccountCart";
import {
  ACCOUNT_CART_KEY,
  ACCOUNT_CART_OWNER_KEY,
  accountCartApi,
  cartStorage,
  pendingAccountCart,
  prepareCartOwner,
  readLocalAccountCart,
  replayPendingCart,
  writeLocalAccountCart,
  type AccountCartItem,
} from "@/lib/accountCart";
import { cartDisplayItem, safeInvoiceDownload } from "@/lib/clientCommerce";
import { clientSectionDestination } from "@/lib/clientPortalNavigation";
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "client-a" }, loading: false }),
}));
const item = (id: string): AccountCartItem => ({
  id,
  source: "services",
  type: "service",
  sku: "custom-request",
  name: id,
  serviceKey: id,
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
function Harness() {
  const cart = useAccountCart();
  return (
    <>
      <output>{cart.items.map((item) => item.id).join(",") || "empty"}</output>
      <button onClick={() => cart.replace([...cart.items, item("new")])}>
        Add
      </button>
    </>
  );
}
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  prepareCartOwner("__test_cleanup__");
  localStorage.clear();
});
describe("native cart reconciliation", () => {
  it("does not read or overwrite the cache of another account opened in a second tab", () => {
    prepareCartOwner("account-a");
    writeLocalAccountCart([item("private-a")]);
    localStorage.setItem(ACCOUNT_CART_OWNER_KEY, "account-b");
    localStorage.setItem(ACCOUNT_CART_KEY, JSON.stringify([item("private-b")]));
    expect(readLocalAccountCart().map((item) => item.id)).toEqual([
      "private-a",
    ]);
    writeLocalAccountCart([item("updated-a")]);
    expect(JSON.parse(localStorage.getItem(ACCOUNT_CART_KEY)!)[0].id).toBe(
      "private-b",
    );
    expect(readLocalAccountCart()[0].id).toBe("updated-a");
  });
  it("keeps the account view updated when the existing public product cart replaces its own source", async () => {
    const product = {
      ...item("external"),
      source: "products" as const,
      type: "product" as const,
      productSlug: "external",
    };
    const request = vi
      .spyOn(cfAuth, "request")
      .mockImplementation((path) =>
        Promise.resolve({ data: path.endsWith("/sync") ? [product] : [] }),
      );
    render(
      <AccountCartProvider>
        <Harness />
      </AccountCartProvider>,
    );
    await waitFor(() => expect(request).toHaveBeenCalled());
    await act(async () => {
      await accountCartApi.replaceSource("products", [product]);
    });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("external"),
    );
  });
  it("continues authenticated cart synchronization when browser storage is denied", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    prepareCartOwner("private-account");
    writeLocalAccountCart([item("memory")]);
    expect(cartStorage.getItem(ACCOUNT_CART_OWNER_KEY)).toBe("private-account");
    expect(readLocalAccountCart()).toHaveLength(1);
    const request = vi
      .spyOn(cfAuth, "request")
      .mockResolvedValue({ data: [item("memory")] });
    await accountCartApi.save(readLocalAccountCart());
    expect(request).toHaveBeenCalledTimes(1);
    expect(pendingAccountCart().removed).toEqual([]);
  });
  it("ends a stalled cart request instead of leaving Add blocked indefinitely", async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(cfAuth, "request").mockImplementation(
        () => new Promise(() => {}),
      );
      const result = expect(accountCartApi.load()).rejects.toThrow(
        "cart_request_timeout",
      );
      await vi.advanceTimersByTimeAsync(10001);
      await result;
    } finally {
      vi.useRealTimers();
    }
  });
  it("does not resurrect a stale clean local cart after the server removed an item", async () => {
    localStorage.setItem(ACCOUNT_CART_OWNER_KEY, "client-a");
    localStorage.setItem(ACCOUNT_CART_KEY, JSON.stringify([item("stale")]));
    vi.spyOn(cfAuth, "request").mockResolvedValue({ data: [] });
    render(
      <AccountCartProvider>
        <Harness />
      </AccountCartProvider>,
    );
    await waitFor(() => expect(readLocalAccountCart()).toEqual([]));
    expect(screen.getByRole("status")).toHaveTextContent("empty");
  });
  it("replays a local addition made while hydration is still pending", async () => {
    const load = deferred<{ data: AccountCartItem[] }>();
    vi.spyOn(cfAuth, "request").mockImplementation((path, options) =>
      options?.method === "PUT"
        ? Promise.resolve({ data: JSON.parse(String(options.body)).items })
        : load.promise,
    );
    render(
      <AccountCartProvider>
        <Harness />
      </AccountCartProvider>,
    );
    fireEvent.click(screen.getByText("Add"));
    await act(async () => load.resolve({ data: [item("cloud")] }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("cloud,new"),
    );
  });
  it("persists deletions across reload and isolates the next account", () => {
    prepareCartOwner("a");
    writeLocalAccountCart([item("keep"), item("remove")], false);
    writeLocalAccountCart([item("keep")]);
    expect(
      replayPendingCart([item("keep"), item("remove")]).map((item) => item.id),
    ).toEqual(["keep"]);
    prepareCartOwner("b");
    expect(readLocalAccountCart()).toEqual([]);
    expect(Object.keys(pendingAccountCart().upserts)).toEqual([]);
  });
  it("serializes writes and never sends an obsolete queued write after an account switch", async () => {
    prepareCartOwner("a");
    const first = deferred<{ data: AccountCartItem[] }>();
    const request = vi
      .spyOn(cfAuth, "request")
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue({ data: [] });
    const old = accountCartApi.save([item("old")]);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const queued = accountCartApi.save([item("new")]);
    const rejection = expect(queued).rejects.toThrow("cart_owner_changed");
    prepareCartOwner("b");
    first.resolve({ data: [] });
    await old;
    await rejection;
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("uses current service/product prices without rewriting a cloud line to a legacy preset", () => {
    const result = cartDisplayItem(
      { ...item("site"), name: "Old", price_estimate: 1 },
      {
        services: [
          {
            key: "site",
            name: "Site actualizat",
            category: "website",
            sku: "svc-current",
            priceMinor: 0,
            currency: "EUR",
            payable: true,
          },
        ],
        products: [],
      },
    );
    expect(result).toMatchObject({
      id: "site",
      name: "Site actualizat",
      sku: "svc-current",
      price_estimate: 0,
      price_currency: "EUR",
    });
    expect(
      cartDisplayItem(item("unavailable"), { services: [], products: [] })
        .price_estimate,
    ).toBeUndefined();
  });
  it("preserves recurring terms when a monthly plan was added from the services catalog", () => {
    const key = "sub-seo-essential";
    expect(cartDisplayItem(item(key), {
      services: [{ key, sku: key, name: "SEO Essential", category: "growth", priceMinor: 69_000, currency: "RON", payable: true }],
      products: [],
    })).toMatchObject({ sku: key, serviceKey: key, type: "subscription", period: "monthly", price_estimate: 69_000 });
  });
});
describe("client navigation and invoice download boundaries", () => {
  it("maps old chat and invoice URLs to the unified client destinations", () => {
    expect(clientSectionDestination("intern")).toEqual({
      section: "tickets",
      params: { supportView: "messages" },
    });
    expect(clientSectionDestination("invoices")).toEqual({
      section: "payments",
      params: { billingView: "invoices" },
    });
  });
  it("allows private native invoice paths and approved provider URLs only", () => {
    expect(
      safeInvoiceDownload("/api/workspace/invoices/invoice-a/content"),
    ).toContain("invoice-a");
    expect(
      safeInvoiceDownload("https://www.oblio.eu/facturi/approved.pdf"),
    ).toBeTruthy();
    for (const url of [
      "javascript:alert(1)",
      "http://www.oblio.eu/file",
      "https://www.oblio.eu.evil.test/file",
      "https://user:pass@www.oblio.eu/file",
      "/api/finance/documents/private/content",
    ])
      expect(safeInvoiceDownload(url)).toBeNull();
  });
});

import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { useServicePageContent } from "../hooks/useServicePageContent";
import { servicePageQueryKey } from "../lib/servicePageQuery";
const { auth } = vi.hoisted(() => ({
  auth: {
    user: { id: "owner" } as { id: string } | null,
    isStaff: true,
    isAdmin: true,
    isSuperAdmin: true,
    loading: false,
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth }));
afterEach(() => {
  auth.user = { id: "owner" };
  auth.isStaff = true;
  auth.isAdmin = true;
  auth.isSuperAdmin = true;
  window.history.replaceState({}, "", "/");
});
function setup() {
  window.history.replaceState(
    {},
    "",
    "/servicii/website-prezentare-profesional?servicePreview=premium-website&revision=1",
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const key = servicePageQueryKey("premium-website", true, 1, "owner");
  client.setQueryData(key, {
    "service.copy.ro.heroTitle": "Conținut privat al ciornei",
  });
  const source = { copy: { ro: { heroTitle: "Pagina publică originală" } } };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    client,
    key,
    hook: renderHook(
      () => useServicePageContent("premium-website", "service", source),
      { wrapper },
    ),
  };
}
it.each(["signout", "client", "role_revoked"])(
  "does not reuse a private preview after %s",
  (mode) => {
    const { client, hook } = setup();
    expect(hook.result.current.copy.ro.heroTitle).toBe(
      "Conținut privat al ciornei",
    );
    auth.user =
      mode === "signout"
        ? null
        : { id: mode === "client" ? "client" : "owner" };
    auth.isStaff = false;
    auth.isAdmin = false;
    auth.isSuperAdmin = false;
    hook.rerender();
    expect(hook.result.current.copy.ro.heroTitle).toBe(
      "Pagina publică originală",
    );
    hook.unmount();
    client.clear();
  },
);
it("hides a previously cached draft when a fresh resource check is denied", async () => {
  const { client, key, hook } = setup();
  await act(async () => {
    await client
      .fetchQuery({
        queryKey: key,
        queryFn: async () => {
          throw new Error("forbidden");
        },
        retry: false,
      })
      .catch(() => undefined);
  });
  await waitFor(() =>
    expect(hook.result.current.copy.ro.heroTitle).toBe(
      "Pagina publică originală",
    ),
  );
  hook.unmount();
  client.clear();
});

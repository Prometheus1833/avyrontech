import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ClientDocuments from "@/features/documents/ClientDocuments";
import { documentsApi } from "@/lib/documentsApi";
const navigation = vi.hoisted(() => ({
  params: new URLSearchParams("tab=documents&document=denied"),
  set: vi.fn(),
}));
vi.mock("react-router-dom", () => ({ useSearchParams: () => [navigation.params, navigation.set] }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({user:{id:"customer"}}) }));
vi.mock("@/lib/documentsApi", () => ({ documentsApi: { list:vi.fn(), get:vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("client document navigation", () => {
  it("does not retry a denied document while navigation back to the library is pending", async () => {
    navigation.params=new URLSearchParams("tab=documents&document=denied");
    vi.mocked(documentsApi.get).mockRejectedValue(new Error("forbidden"));
    vi.mocked(documentsApi.list).mockRejectedValue(new Error("unavailable"));
    const view=render(<ClientDocuments />);
    await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("accesul a fost retras"));
    fireEvent.click(screen.getByRole("button",{name:"Înapoi la documente"}));
    // Hold the URL transition so urgent state updates can settle first.
    await act(async()=>{await Promise.resolve();});
    expect(documentsApi.get).toHaveBeenCalledTimes(1);
    navigation.params=navigation.set.mock.calls[0][0];
    view.rerender(<ClientDocuments />);
    await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("Documentele nu au putut fi încărcate"));
    expect(documentsApi.get).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Nu ai încă documente disponibile/)).not.toBeInTheDocument();
  });
});

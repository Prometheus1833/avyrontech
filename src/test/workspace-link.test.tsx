import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import WorkspaceLink from "@/components/site/WorkspaceLink";
import { registerDocumentSave } from "@/features/documents/navigation";
import { registerServicePageGuard } from "@/lib/servicePageNavigation";
const dispose: (() => void)[] = [];
afterEach(() => {
  cleanup();
  dispose.splice(0).forEach((f) => f());
});
function Harness({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <>
      <p role="status">{location.pathname}</p>
      <WorkspaceLink to="/mentenanta" onNavigate={onNavigate}>
        Mentenanță
      </WorkspaceLink>
    </>
  );
}
it("keeps unsaved document content in place and serializes repeated navigation attempts", async () => {
  let finish: (value: boolean) => void = () => {};
  const save = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    ),
    onNavigate = vi.fn();
  dispose.push(registerDocumentSave(save));
  render(
    <MemoryRouter initialEntries={["/editor"]}>
      <Harness onNavigate={onNavigate} />
    </MemoryRouter>,
  );
  const link = screen.getByRole("link", { name: "Mentenanță" });
  fireEvent.click(link);
  fireEvent.click(link);
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status")).toHaveTextContent("/editor");
  await act(async () => finish(false));
  expect(onNavigate).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent("/editor");
});
it("flushes both native editor guards before closing the panel and entering another workspace", async () => {
  const order: string[] = [],
    onNavigate = () => order.push("close");
  dispose.push(
    registerDocumentSave(async () => {
      order.push("document");
      return true;
    }),
  );
  const service = registerServicePageGuard(async () => {
    order.push("service-block");
    return false;
  });
  dispose.push(service);
  render(
    <MemoryRouter initialEntries={["/editor"]}>
      <Harness onNavigate={onNavigate} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("link"));
  await waitFor(() => expect(order).toEqual(["document", "service-block"]));
  expect(screen.getByRole("status")).toHaveTextContent("/editor");
  service();
  dispose.push(
    registerServicePageGuard(async () => {
      order.push("service-save");
      return true;
    }),
  );
  fireEvent.click(screen.getByRole("link"));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("/mentenanta"),
  );
  expect(order).toEqual([
    "document",
    "service-block",
    "document",
    "service-save",
    "close",
  ]);
});

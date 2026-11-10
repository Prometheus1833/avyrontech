import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApprovalCenter from "../components/dashboard/ApprovalCenter";
import type { ApprovalDetail, ApprovalInbox } from "../shared/approvals";
const api = vi.hoisted(() => ({
  approvals: vi.fn(),
  approval: vi.fn(),
  decideItem: vi.fn(),
}));
vi.mock("../lib/osApi", () => ({ osApi: api }));
const detail: ApprovalDetail = {
  id: "request-1",
  source: "content",
  title: "Material în aprobare",
  summary: "Proiect sintetic",
  requestedAt: 1,
  revision: 17,
  href: "/intern/ai-projects/test",
  canDecide: true,
  canReject: true,
  contextId: "project-1",
  detail: "Acesta este textul versiunii care necesită decizie.",
};
const feed: ApprovalInbox = {
  generatedAt: 1,
  data: [detail],
  total: 1,
  counts: { agent: 0, content: 1, operation: 0, template: 0, learning: 0 },
  nextCursor: null,
};
const show = (authorized = true) =>
  render(
    <MemoryRouter>
      <ApprovalCenter authorized={authorized} />
    </MemoryRouter>,
  );
describe("Unified approval center", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.approvals.mockResolvedValue(feed);
    api.approval.mockResolvedValue(detail);
    api.decideItem.mockResolvedValue({ ok: true });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
  it("loads original requests, requires review and explicit confirmation before approval", async () => {
    show();
    await screen.findByText("Material în aprobare");
    fireEvent.click(screen.getByRole("button", { name: "Revizuiește" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Material în aprobare",
    });
    expect(
      within(dialog).getByText(/Acesta este textul versiunii/),
    ).toBeInTheDocument();
    const approve = within(dialog).getByRole("button", {
      name: "Confirmă aprobarea",
    });
    expect(approve).toBeDisabled();
    expect(api.decideItem).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(approve);
    await waitFor(() =>
      expect(api.decideItem).toHaveBeenCalledWith(
        detail,
        "approved",
        expect.any(String),
      ),
    );
    expect(api.approval).toHaveBeenCalledWith(
      expect.objectContaining({ id: "request-1", revision: 17 }),
    );
  });
  it("shows actual platforms and publication time separately from request time", async () => {
    api.approvals.mockResolvedValue({...feed,data:[{...detail,publication:{platforms:['instagram','facebook'],scheduledAt:Date.UTC(2026,10,10,12,30),format:'carousel'}}]});
    show();
    expect(await screen.findByText('Instagram · Facebook')).toBeInTheDocument();
    expect(screen.getByText(/Programat:.*14:30/)).toBeInTheDocument();
    expect(screen.getByText('carousel')).toBeInTheDocument();
  });
  it("does not substitute request time when publication has not been scheduled", async () => {
    api.approvals.mockResolvedValue({...feed,data:[{...detail,publication:{platforms:[],scheduledAt:null,format:null}}]});
    show();
    expect(await screen.findByText('Dată de publicare de stabilit')).toBeInTheDocument();
    expect(screen.getByText('Platformă de stabilit')).toBeInTheDocument();
    expect(screen.queryByText(/^Programat:/)).not.toBeInTheDocument();
  });
  it("refreshes automatically while visible and stops polling in a hidden tab", async () => {
    vi.useFakeTimers();
    show();
    await act(async () => {});
    expect(api.approvals).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(api.approvals).toHaveBeenCalledTimes(2);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(api.approvals).toHaveBeenCalledTimes(2);
  });
  it("does not fetch platform requests for an unauthorized role", () => {
    show(false);
    expect(screen.getByText(/responsabililor autorizați/)).toBeInTheDocument();
    expect(api.approvals).not.toHaveBeenCalled();
  });
  it("shows a recoverable refresh error inside the open list and retains the previous requests", async () => {
    show();
    await screen.findByText("Material în aprobare");
    fireEvent.click(
      screen.getByRole("button", { name: "Vezi toate solicitările · 1" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Toate aprobările și revizuirile",
    });
    api.approvals.mockRejectedValueOnce(new Error("Conexiune întreruptă"));
    fireEvent.change(within(dialog).getByRole("combobox"), {
      target: { value: "content" },
    });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Conexiune întreruptă",
    );
    expect(
      within(dialog).getByText("Material în aprobare"),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Reîncearcă" }));
    await waitFor(() =>
      expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(api.approvals).toHaveBeenLastCalledWith("content", undefined);
  });
  it("keeps legal model reviews in the original module without a blanket approve button", async () => {
    api.approval.mockResolvedValue({
      ...detail,
      source: "template",
      canDecide: false,
      canReject: false,
      href: "/profil?tab=documents&template=model-1",
    });
    show();
    await screen.findByText("Material în aprobare");
    fireEvent.click(screen.getByRole("button", { name: "Revizuiește" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Material în aprobare",
    });
    expect(
      within(dialog).queryByRole("button", { name: "Confirmă aprobarea" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Deschide în modulul sursă" }),
    ).toBeInTheDocument();
  });
});

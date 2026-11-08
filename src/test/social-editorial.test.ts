import { describe, it, expect, vi } from "vitest";
import {
  socialDraftSchema,
  socialDateEpoch,
  socialDateInput,
} from "../shared/socialEditorial";
import { socialOperator } from "../../scripts/social-editorial-operator.mjs";
describe("editorial contract and native operator", () => {
  it("keeps Bucharest target dates stable across DST and rejects nonexistent local times", () => {
    for (const value of [
      "2026-10-25T10:15",
      "2027-03-28T10:15",
      "2026-11-08T20:15",
    ])
      expect(socialDateInput(socialDateEpoch(value)!)).toBe(value);
    expect(socialDateEpoch("2027-03-28T03:30")).toBeNull();
    expect(socialDateEpoch("not-a-date")).toBeNull();
  });
  it("cannot import an approval or unknown private fields as content", () => {
    const draft = {
      title: "O temă reală",
      caption: "Un material editorial complet.",
      format: "post",
      channels: ["facebook"],
    };
    expect(
      socialDraftSchema.safeParse({ ...draft, status: "approved" }).success,
    ).toBe(false);
    expect(
      socialDraftSchema.safeParse({ ...draft, sourceRef: "campaign" }).success,
    ).toBe(false);
    expect(socialDraftSchema.parse(draft)).toMatchObject({
      reusable: true,
      requestApproval: false,
    });
  });
  it("records a human chat approval through the same authenticated native endpoint and CAS", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    await socialOperator(
      {
        command: "review",
        id: "material",
        revision: 9,
        reference: "codex://human/exact-revision",
        token: "synthetic-token",
      },
      fetcher,
    );
    const [url, input] = fetcher.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.avyron.ro/api/ai-projects/aip_avyron_web/content/material",
    );
    expect(JSON.parse(input.body)).toEqual({
      status: "approved",
      expectedUpdatedAt: 9,
      origin: "codex_chat",
      approvalReference: "codex://human/exact-revision",
    });
  });
  it("refuses token exfiltration, missing sessions and missing exact approval evidence", async () => {
    const fetcher = vi.fn();
    for (const options of [
      { command: "agenda", token: "secret", base: "https://evil.example" },
      { command: "agenda" },
      { command: "review", id: "x", revision: 1, token: "secret" },
    ])
      await expect(socialOperator(options, fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

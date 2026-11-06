import type { Page } from "@playwright/test";
import {
  STAFF_RANKS,
  STAFF_PERMISSIONS,
  STAFF_MANAGED,
} from "../src/shared/staffAccess";
export async function staffFixture(
  page: Page,
  options: {
    role?: "platform_owner" | "superadmin" | "vibe_dev" | "avy_contabil";
    mfa?: boolean;
    rollout?: boolean;
  } = {},
) {
  const role = options.role || "platform_owner",
    principal = ["platform_owner", "superadmin"].includes(role);
  const profiles = STAFF_RANKS.map((p) => ({
    ...p,
    permissions: [...p.permissions],
    revision: 1,
  }));
  const data = [
    {
      id: "self",
      display_name: "Owner sintetic",
      email: "owner@example.test",
      roles: "user,admin",
      rank_id: null,
      platform_role: "platform_owner",
      disabled_at: null,
    },
    {
      id: "peer",
      display_name: "Anișoara Test",
      email: "peer@example.test",
      roles: "user,staff",
      rank_id: "vibe_dev",
      platform_role: null,
      revision: 1,
      disabled_at: null,
    },
    {
      id: "peer-b",
      display_name: "Victor Test",
      email: "victor@example.test",
      roles: "user,staff",
      rank_id: "senior_dev",
      platform_role: null,
      revision: 1,
      disabled_at: null,
    },
    {
      id: "client",
      display_name: "Client sintetic",
      email: "client@example.test",
      roles: "user",
      rank_id: null,
      platform_role: null,
      disabled_at: null,
    },
  ];
  const config = {
    data,
    profiles,
    permissions: STAFF_PERMISSIONS,
    projects: [
      { id: "project-a", name: "Website sintetic", client_id: "client-a" },
    ],
    subscriptions: [
      {
        id: "subscription-a",
        project_id: "project-a",
        project_name: "Website sintetic",
        name: "Core sintetic",
      },
    ],
    clients: [{ id: "client-a", name: "Beneficiar sintetic" }],
    aiProjects: [{ id: "ai-a", name: "Marketing sintetic" }],
    canManage: principal,
    mfaVerified: options.mfa !== false,
    mfaSatisfied: options.mfa !== false || options.rollout === true,
    platformRole: principal ? role : null,
  };
  const captures: {
    path: string;
    body: {
      rankId?: string;
      permissions?: string[];
      staffAssignment?: { rankId: string; permissions: string[] };
      [key: string]: unknown;
    };
    key: string | null;
  }[] = [];
  await page.addInitScript(() => {
    localStorage.setItem(
      "avyron-cookie-consent-v2",
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        savedAt: new Date().toISOString(),
        policyVersion: "2026-09-12",
      }),
    );
  });
  await page.route("**/api/**", (r) =>
    r.fulfill({ json: { data: [], total: 0 } }),
  );
  await page.route("**/api/auth/refresh", (r) =>
    r.fulfill({
      json: {
        access_token: "synthetic-local",
        expires_in: 900,
        user: {
          id: "self",
          roles: principal ? ["user", "admin"] : ["user", "staff"],
        },
      },
    }),
  );
  await page.route("**/api/auth/me", (r) =>
    r.fulfill({
      json: {
        user: {
          id: "self",
          email: "owner@example.test",
          display_name: "Owner sintetic",
          email_verified: 1,
          must_change_password: 0,
        },
        profile: {
          id: "self",
          display_name: "Owner sintetic",
          theme: "dark",
          language: "ro",
        },
        roles: principal ? ["user", "admin"] : ["user", "staff"],
        superadmin: principal,
        platformRole: principal ? role : null,
        capabilities: principal
          ? []
          : [
              STAFF_MANAGED,
              "staff.rank." + role,
              ...STAFF_RANKS.find((p) => p.id === role)!.permissions,
            ],
      },
    }),
  );
  await page.route("**/api/staff-access**", async (r) => {
    const path = new URL(r.request().url()).pathname;
    if (r.request().method() !== "GET") {
      captures.push({
        path,
        body: r.request().postDataJSON(),
        key: r.request().headers()["idempotency-key"],
      });
      return r.fulfill({ json: { ok: true } });
    }
    return r.fulfill({
      json:
        path === "/api/staff-access"
          ? config
          : {
              assignment: {
                rankId: "vibe_dev",
                permissions: [
                  ...STAFF_RANKS.find((p) => p.id === "vibe_dev")!.permissions,
                ],
                revision: 1,
                expiresAt: null,
              },
              projects: [],
              subscriptions: [],
              clients: [],
              aiProjects: [],
              capabilities: [],
              canManage:
                principal &&
                (role === "platform_owner" || !path.endsWith("/self")),
            },
    });
  });
  await page.route("**/api/admin/users", async (r) => {
    captures.push({
      path: "/api/admin/users",
      body: r.request().postDataJSON(),
      key: r.request().headers()["idempotency-key"],
    });
    return r.fulfill({ status: 201, json: { data: { id: "created" } } });
  });
  await page.route("**/api/workspace/chat/members", (r) =>
    r.fulfill({
      json: { data: data.filter((d) => d.id !== "self" && d.id !== "client") },
    }),
  );
  const messages: Record<
    string,
    { id: string; author_id: string; content: string; created_at: string }[]
  > = {
    "dm:peer": [
      {
        id: "incoming",
        author_id: "peer",
        content: "Mesaj sintetic de verificat",
        created_at: "2026-11-05T10:00:00.000Z",
      },
    ],
  };
  await page.route("**/api/workspace/chat**", async (r) => {
    if (new URL(r.request().url()).pathname.endsWith("/members"))
      return r.fallback();
    const url = new URL(r.request().url());
    if (url.pathname.endsWith("/conversations"))
      return r.fulfill({
        json: {
          data: [
            {
              target: "dm:peer",
              last_id: "incoming",
              last_content: "Mesaj sintetic de verificat",
              last_at: "2026-11-05T10:00:00.000Z",
              unread: 1,
            },
          ],
        },
      });
    if (url.pathname.endsWith("/read"))
      return r.fulfill({ json: { ok: true } });
    if (r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      captures.push({
        path: url.pathname,
        body,
        key: r.request().headers()["idempotency-key"],
      });
      const target = body.recipient_id
        ? "dm:" + body.recipient_id
        : "channel:" + body.channel;
      const m = {
        id: "sent-" + captures.length,
        author_id: "self",
        content: body.content,
        created_at: new Date().toISOString(),
      };
      (messages[target] ||= []).push(m);
      return r.fulfill({ json: { id: m.id } });
    }
    return r.fulfill({
      json: {
        data:
          messages[
            url.searchParams.get("recipient_id")
              ? "dm:" + url.searchParams.get("recipient_id")
              : "channel:" + url.searchParams.get("channel")
          ] || [],
      },
    });
  });
  return { config, captures, messages };
}

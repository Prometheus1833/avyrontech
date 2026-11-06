// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { staffAccessRouter } from "../../cloudflare/workers/api/src/staffAccess";
import { aiProjectsRouter } from "../../cloudflare/workers/api/src/aiProjects";
import { workspaceRouter } from "../../cloudflare/workers/api/src/workspace";
import { visualAssetsRouter } from "../../cloudflare/workers/api/src/visualAssets";
import {
  staffRequestAllowed,
  canManageStaffTarget,
} from "../../cloudflare/workers/api/src/staffAccessPolicy";
import { canAccessProject } from "../../cloudflare/workers/api/src/projects";
import { maintenanceWorkAccess } from "../../cloudflare/workers/api/src/maintenancePolicy";
import {
  documentActor,
  documentCapability,
} from "../../cloudflare/workers/api/src/documentPolicy";
import { hasCapability } from "../../cloudflare/workers/api/src/authorization";
import {
  STAFF_RANKS,
  STAFF_PERMISSION_KEYS,
  staffPermissionIssues,
  staffRequestPermission,
} from "../shared/staffAccess";
class Statement {
  values: SQLInputValue[] = [];
  constructor(
    readonly db: DatabaseSync,
    readonly sql: string,
  ) {}
  bind(...values: SQLInputValue[]) {
    this.values = values;
    return this;
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.values) || null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.values) };
  }
  async run() {
    return { meta: this.db.prepare(this.sql).run(...this.values) };
  }
}
describe("Agency ranks and private chat: real Hono/D1 handlers", () => {
  let db: DatabaseSync,
    app: Hono,
    actor: string,
    mfa: boolean,
    mfaEnabled: string | undefined,
    binding: D1Database,
    beforeBatch: (() => void) | null;
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    for (const f of readdirSync("cloudflare/d1/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      db.exec(readFileSync("cloudflare/d1/migrations/" + f, "utf8"));
    for (const [id, email, role] of [
      ["owner", "prometheus@avyron.ro", "admin"],
      ["super", "super@example.test", "admin"],
      ["dev", "dev@example.test", "staff"],
      ["finance", "finance@example.test", "staff"],
      ["other", "other@example.test", "staff"],
      ["client", "client@example.test", "user"],
    ]) {
      db.prepare(
        "INSERT INTO users(id,email,display_name,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,?,1,1,1)",
      ).run(id, email, id, "synthetic-not-credential");
      db.prepare("INSERT INTO user_roles VALUES(?,?)").run(id, role);
    }
    db.exec(
      "INSERT INTO platform_principals(email,role,status,created_at,updated_at) VALUES('super@example.test','superadmin','active',1,1)",
    );
    db.exec(
      "INSERT INTO clients(id,company_name,email,created_at) VALUES('ca','Client A','a@example.test',1),('cb','Client B','b@example.test',1); INSERT INTO projects(id,name,slug,client_id,created_at) VALUES('pa','Website A','website-a','ca',1),('pb','Website B','website-b','cb',1); INSERT INTO services(id,project_id,service_name,price,billing_cycle) VALUES('sa','pa','Website',100,'monthly'); INSERT INTO subscriptions(id,client_id,service_id,next_billing_date,maintenance_enabled,status) VALUES('sub-a','ca','sa',1,1,'active'); INSERT INTO sessions(id,user_id,created_at,last_seen_at,expires_at) VALUES('dev-session','dev',1,1,4102444800000);",
    );
    const adapter = {
      prepare: (sql: string) => new Statement(db, sql),
      batch: async (statements: Statement[]) => {
        const hook = beforeBatch;
        beforeBatch = null;
        hook?.();
        db.exec("BEGIN");
        try {
          const out = [];
          for (const s of statements)
            out.push({ meta: db.prepare(s.sql).run(...s.values) });
          db.exec("COMMIT");
          return out;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    };
    binding = adapter as unknown as D1Database;
    actor = "owner";
    mfa = true;
    mfaEnabled = "true";
    beforeBatch = null;
    app = new Hono();
    app.use("*", async (c, next) => {
      Object.assign(c.env, { DB: binding, MFA_AUTH_ENABLED: mfaEnabled });
      c.set("userId", actor);
      c.set(
        "roles",
        db
          .prepare("SELECT role FROM user_roles WHERE user_id=?")
          .all(actor)
          .map((r) => r.role),
      );
      c.set("mfaVerified", mfa);
      if (
        !(await staffRequestAllowed(binding, actor, c.req.path, c.req.method))
      )
        return c.json({ error: { code: "staff_permission_required" } }, 403);
      await next();
    });
    app.route("/", staffAccessRouter);
    app.route("/", workspaceRouter);
    app.route("/", aiProjectsRouter);
    app.route("/", visualAssetsRouter);
    app.onError((e) => {
      console.error(e);
      return new Response("safe failure", { status: 500 });
    });
  });
  afterEach(() => {
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.close();
  });
  const req = (
    path: string,
    body?: unknown,
    method = "PUT",
    key = crypto.randomUUID(),
  ) =>
    app.request(
      path,
      body === undefined
        ? {}
        : {
            method,
            headers: {
              "content-type": "application/json",
              "idempotency-key": key,
            },
            body: JSON.stringify(body),
          },
      {},
    );
  const assignment = (
    rankId: string,
    changes: Record<string, unknown> = {},
  ) => ({
    rankId,
    permissions: [
      ...(STAFF_RANKS.find((r) => r.id === rankId)?.permissions || []),
    ],
    projectIds: [],
    subscriptionIds: [],
    clientIds: [],
    aiProjectIds: [],
    revision: 0,
    expiresAt: null,
    reason: "Alocare sintetică pentru verificare",
    confirmed: true,
    ...changes,
  });
  async function grant(
    id: string,
    rankId: string,
    changes: Record<string, unknown> = {},
  ) {
    const response = await req(
      "/api/staff-access/" + id,
      assignment(rankId, changes),
    );
    expect(response.status, await response.clone().text()).toBe(200);
    return response;
  }
  it("seeds the seven ranks without reassigning existing users or inventing permissions", async () => {
    const c = await (await req("/api/staff-access")).json();
    expect(c.profiles).toHaveLength(7);
    expect(
      c.data.find((m: { id: string }) => m.id === "owner").platform_role,
    ).toBe("platform_owner");
    expect(
      db.prepare("SELECT count(*) n FROM staff_rank_assignments").get()!.n,
    ).toBe(0);
    for (const profile of c.profiles) {
      expect(staffPermissionIssues(profile.permissions)).toEqual([]);
      expect(
        profile.permissions.every((p: string) =>
          STAFF_PERMISSION_KEYS.includes(p),
        ),
      ).toBe(true);
    }
    expect(c.canManage).toBe(true);
    actor = "dev";
    const view = await (await req("/api/staff-access")).json();
    expect(view.canManage).toBe(false);
    expect(view.clients).toEqual([]);
    expect(JSON.stringify(view)).not.toContain("Documente SC");
    expect(JSON.stringify(view)).not.toContain("backupurile firmei");
    expect(
      view.profiles.every(
        (p: { permissions: string[] }) => p.permissions.length === 0,
      ),
    ).toBe(true);
    expect(JSON.stringify(view.data)).not.toContain("example.test");
    expect(view.data.some((m: { id: string }) => m.id === "client")).toBe(
      false,
    );
  });
  it("allows managed project staff into Media without exposing another client's resources", async () => {
    await grant("dev", "vibe_dev", { projectIds: ["pa"] });
    actor = "dev";
    const options = await req("/api/visual-assets/options");
    expect(options.status).toBe(200);
    const data = await options.json();
    expect(data.projects.map((p: { id: string }) => p.id)).toEqual(["pa"]);
    expect(data.canManageAgency).toBe(false);
    expect((await req("/api/visual-assets?scope=client")).status).toBe(200);
    expect((await req("/api/visual-assets/context?project=pb")).status).toBe(404);
    expect(staffRequestPermission("/api/visual-assets/upload", "POST")).toBe("projects.write");
  });
  it("does not recreate a revoked legacy client grant by matching email after staff demotion", async () => {
    db.exec("UPDATE clients SET email='dev@example.test' WHERE id='ca'");
    await grant("dev", "vibe_dev", { clientIds: ["ca"] });
    expect(db.prepare("SELECT access_managed FROM clients WHERE id='ca'").get()!.access_managed).toBe(1);
    // Reproduce a grant created before managed client-access replacement existed.
    db.exec("UPDATE clients SET access_managed=0 WHERE id='ca'");
    const removed = await req("/api/staff-access/dev", assignment("vibe_dev", {
      rankId: null, permissions: [], clientIds: [], revision: 1,
    }));
    expect(removed.status).toBe(200);
    actor = "dev";
    await req("/api/workspace/invoices");
    await req("/api/workspace/subscriptions");
    expect(db.prepare("SELECT access_managed FROM clients WHERE id='ca'").get()!.access_managed).toBe(1);
    expect(db.prepare("SELECT count(*) n FROM client_account_access WHERE user_id='dev'").get()!.n).toBe(0);
  });
  it("enforces canonical capability revocation even when the reviewed snapshot still lists it", async () => {
    await grant("dev", "vibe_dev");
    expect(
      await staffRequestAllowed(binding, "dev", "/api/workspace/chat", "POST"),
    ).toBe(true);
    db.exec(
      "UPDATE user_capabilities SET revoked_at=1 WHERE user_id='dev' AND capability='chat.write'",
    );
    expect(
      await staffRequestAllowed(binding, "dev", "/api/workspace/chat", "POST"),
    ).toBe(false);
    expect(
      await staffRequestAllowed(binding, "dev", "/api/workspace/chat", "GET"),
    ).toBe(true);
  });
  it("revokes all-project access at the individual resource boundary", async () => {
    await grant("dev", "senior_dev");
    expect((await canAccessProject(binding, "pb", "dev", ["staff"])).read).toBe(
      true,
    );
    db.exec(
      "UPDATE user_capabilities SET revoked_at=1 WHERE user_id='dev' AND capability='projects.all'",
    );
    expect((await canAccessProject(binding, "pb", "dev", ["staff"])).read).toBe(
      false,
    );
  });
  it("protects disabled Owner identities and the dedicated machine account", async () => {
    db.exec("UPDATE users SET disabled_at=1 WHERE id='owner'");
    actor = "super";
    expect(await canManageStaffTarget(binding, "super", "owner")).toBe(false);
    expect(
      (await req("/api/staff-access/owner", assignment("vibe_dev"))).status,
    ).toBe(404);
    db.exec(
      "UPDATE users SET disabled_at=NULL WHERE id='owner';UPDATE users SET email='codexagent@avyron.ro' WHERE id='other'",
    );
    actor = "owner";
    expect(
      (await req("/api/staff-access/other", assignment("vibe_dev"))).status,
    ).toBe(403);
    expect(
      db
        .prepare(
          "SELECT count(*) n FROM staff_rank_assignments WHERE user_id='other'",
        )
        .get()!.n,
    ).toBe(0);
  });
  it("atomically grants a VibeDev only assigned projects and maintenance and revokes old sessions", async () => {
    await grant("dev", "vibe_dev", {
      projectIds: ["pa"],
      subscriptionIds: ["sub-a"],
    });
    expect(
      db
        .prepare("SELECT revoked_at FROM sessions WHERE id='dev-session'")
        .get()!.revoked_at,
    ).not.toBeNull();
    expect(await hasCapability(binding, "dev", "finance.read")).toBe(false);
    expect(
      await canAccessProject(binding, "pa", "dev", ["staff"]),
    ).toMatchObject({ read: true, write: true });
    expect(
      await canAccessProject(binding, "pb", "dev", ["staff"]),
    ).toMatchObject({ read: false, write: false });
    actor = "dev";
    expect(
      (await req("/api/staff-access/other", assignment("ultimate_dev"))).status,
    ).toBe(403);
    expect((await req("/api/finance/overview")).status).toBe(403);
    expect((await req("/api/projects", {}, "POST")).status).toBe(403);
  });
  const socialFixture = () => {
    const t = Date.now();
    db.prepare("INSERT INTO ai_projects(id,slug,name,product_key,status,created_at,updated_at) VALUES('social-a','social-a','Social A','other','active',?,?),('social-b','social-b','Social B','other','active',?,?)").run(t,t,t,t);
    db.prepare("INSERT INTO ai_social_jobs(id,project_id,schedule_key,kind,format,primary_channel,topic,status,due_at,created_at,updated_at) VALUES('plan-a','social-a','plan-a','daily_post','post','facebook','Tema viitoare','queued',?,?,17),('plan-b','social-b','plan-b','daily_post','post','facebook','Alta tema','queued',?,?,17)").run(t+86400000,t,t+86400000,t);
    return t;
  };
  it("reviews future plans with project scope, confirmation, revision checks and one audit event", async () => {
    socialFixture();
    const path = "/api/ai-projects/social-a/social-jobs/plan-a/review";
    expect((await req(path,{decision:"approved",expectedUpdatedAt:17,confirmed:false},"POST")).status).toBe(400);
    expect((await req("/api/ai-projects/social-a/social-jobs/plan-b/review",{decision:"approved",expectedUpdatedAt:17,confirmed:true},"POST")).status).toBe(409);
    expect((await req(path,{decision:"approved",expectedUpdatedAt:17,confirmed:true},"POST")).status).toBe(200);
    const job = db.prepare("SELECT status,plan_review_state,plan_reviewed_by,updated_at FROM ai_social_jobs WHERE id='plan-a'").get()!;
    expect(job).toMatchObject({status:"queued",plan_review_state:"approved",plan_reviewed_by:"owner"});
    expect((await req(path,{decision:"approved",expectedUpdatedAt:17,confirmed:true},"POST")).status).toBe(409);
    expect(db.prepare("SELECT count(*) n FROM ai_project_events WHERE action='social_studio.plan.approved'").get()!.n).toBe(1);
    expect((await req(path,{decision:"rejected",expectedUpdatedAt:job.updated_at,confirmed:true},"POST")).status).toBe(200);
    expect(db.prepare("SELECT status,plan_review_state FROM ai_social_jobs WHERE id='plan-a'").get()).toMatchObject({status:"skipped",plan_review_state:"rejected"});
    expect((await req("/api/ai-projects/social-a/social-jobs/plan-a/retry",{},"POST")).status).toBe(409);
  });
  it("exposes linked material across filters and synchronizes approved content atomically within its own project", async () => {
    const t = socialFixture();
    db.prepare("INSERT INTO ai_content_items(id,project_id,format,objective,title,caption,status,created_at,updated_at,expires_at) VALUES('future-material','social-a','post','visibility','Material viitor','Text verificabil','pending_approval',?,?,?)").run(t,31,t+86400000);
    db.exec("UPDATE ai_social_jobs SET content_id='future-material',status='awaiting_approval' WHERE id='plan-a'");
    const snapshot = await (await req("/api/ai-projects/social-a/social-manager?status=approved")).json();
    expect(snapshot.content).toEqual([]);
    expect(snapshot.activityContent[0].id).toBe("future-material");
    expect(snapshot.permission).toMatchObject({canReview:true,canPlan:true});
    expect((await req("/api/ai-projects/social-a/content/future-material",{status:"approved",expectedUpdatedAt:31},"PATCH")).status).toBe(200);
    expect(db.prepare("SELECT status FROM ai_social_jobs WHERE id='plan-a'").get()!.status).toBe("approved");
    db.exec("UPDATE ai_social_jobs SET status='draft_ready' WHERE id='plan-a'");
    expect((await req("/api/ai-projects/social-a/social-manager/sync",{},"POST")).status).toBe(200);
    expect(db.prepare("SELECT status FROM ai_social_jobs WHERE id='plan-a'").get()!.status).toBe("approved");
    expect(db.prepare("SELECT status FROM ai_social_jobs WHERE id='plan-b'").get()!.status).toBe("queued");
    expect(db.prepare("SELECT published_at,scheduled_at FROM ai_content_items WHERE id='future-material'").get()).toMatchObject({published_at:null,scheduled_at:null});
  });
  it("denies future commands to viewers, revoked members and sessions without MFA", async () => {
    socialFixture();
    db.exec("INSERT INTO ai_project_members(project_id,user_id,role,status,granted_at,updated_at) VALUES('social-a','client','viewer','active',1,1)");
    actor = "client";
    const path = "/api/ai-projects/social-a/social-jobs/plan-a/review", body = {decision:"approved",expectedUpdatedAt:17,confirmed:true};
    expect((await req(path,body,"POST")).status).toBe(403);
    expect((await req("/api/ai-projects/social-a/social-manager/sync",{},"POST")).status).toBe(403);
    expect((await req("/api/ai-projects/social-a/social-studio/plan",{},"POST")).status).toBe(403);
    db.exec("UPDATE ai_project_members SET status='revoked' WHERE user_id='client'");
    expect((await req(path,body,"POST")).status).toBe(404);
    actor = "owner"; mfa = false;
    expect((await req(path,body,"POST")).status).toBe(403);
    expect(db.prepare("SELECT plan_review_state FROM ai_social_jobs WHERE id='plan-a'").get()!.plan_review_state).toBe("pending");
  });
  it("plans only the selected project, with stable keys and without generating content", async () => {
    socialFixture();
    db.exec("INSERT INTO ai_social_policies(project_id,status,created_at,updated_at) VALUES('social-a','active',1,1),('social-b','active',1,1)");
    expect((await req("/api/ai-projects/social-a/social-studio/plan",{},"POST")).status).toBe(200);
    const count = db.prepare("SELECT count(*) n FROM ai_social_jobs WHERE project_id='social-a'").get()!.n;
    expect(Number(count)).toBeGreaterThan(1);
    expect((await req("/api/ai-projects/social-a/social-studio/plan",{},"POST")).status).toBe(200);
    expect(db.prepare("SELECT count(*) n FROM ai_social_jobs WHERE project_id='social-a'").get()!.n).toBe(count);
    expect(db.prepare("SELECT count(*) n FROM ai_social_jobs WHERE project_id='social-b'").get()!.n).toBe(1);
    expect(db.prepare("SELECT count(*) n FROM ai_content_items WHERE project_id IN ('social-a','social-b')").get()!.n).toBe(0);
  });
  it("allows editorial approval separately from content creation, in the assigned AI project only", async () => {
    const t = Date.now();
    db.prepare(
      "INSERT INTO ai_projects(id,slug,name,product_key,created_at,updated_at) VALUES('ai-review','review-test','Review test','other',?,?)",
    ).run(t, t);
    db.prepare(
      "INSERT INTO ai_content_items(id,project_id,format,objective,title,caption,status,created_at,updated_at,expires_at) VALUES('review-item','ai-review','post','visibility','Synthetic','Synthetic','pending_approval',?,?,?)",
    ).run(t, t, t + 86400000);
    await grant("dev", "avy_consultant", {
      permissions: [
        "team.read",
        "ai_projects.read",
        "marketing.read",
        "marketing.write",
        "social.approve",
      ],
      aiProjectIds: ["ai-review"],
    });
    actor = "dev";
    expect(
      (
        await req(
          "/api/ai-projects/ai-review/content/review-item",
          { status: "approved", expectedUpdatedAt: t },
          "PATCH",
        )
      ).status,
    ).toBe(200);
    expect(
      db
        .prepare(
          "SELECT approved_by FROM ai_content_items WHERE id='review-item'",
        )
        .get()!.approved_by,
    ).toBe("dev");
    expect(
      (
        await req(
          "/api/ai-projects/ai-review/content/generate",
          { topic: "Synthetic" },
          "POST",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await req(
          "/api/ai-projects/unassigned/content/review-item",
          { status: "approved" },
          "PATCH",
        )
      ).status,
    ).toBe(404);
  });
  it("delegates maintenance configuration without granting financial or platform privileges", async () => {
    await grant("dev", "ultimate_dev", {
      permissions: ["team.read", "maintenance.read", "maintenance.manage"],
    });
    actor = "dev";
    const config = await (
      await req("/api/workspace/maintenance/config")
    ).json();
    expect(config.canManage).toBe(true);
    expect((await req("/api/workspace/maintenance", {}, "POST")).status).toBe(
      400,
    );
    expect((await req("/api/finance/overview")).status).toBe(403);
    expect((await req("/api/workspace/domains")).status).toBe(403);
    actor = "owner";
    await grant("other", "vibe_dev");
    actor = "other";
    expect((await req("/api/workspace/maintenance", {}, "POST")).status).toBe(
      403,
    );
  });
  it("separates maintenance read access from development editing and intervention rights", async () => {
    await grant("dev", "senior_dev", {
      permissions: [
        "team.read",
        "projects.read",
        "projects.write",
        "projects.all",
        "maintenance.read",
      ],
      projectIds: ["pa"],
      subscriptionIds: ["sub-a"],
    });
    expect(
      await maintenanceWorkAccess({ DB: binding } as never, "pa", "dev", [
        "staff",
      ]),
    ).toEqual({ read: true, write: false });
    expect(
      await maintenanceWorkAccess({ DB: binding } as never, "pb", "dev", [
        "staff",
      ]),
    ).toEqual({ read: true, write: false });
    actor = "owner";
    await grant("other", "vibe_dev", {
      permissions: ["team.read", "maintenance.read"],
      projectIds: ["pa"],
    });
    expect(
      await maintenanceWorkAccess({ DB: binding } as never, "pa", "other", [
        "staff",
      ]),
    ).toEqual({ read: true, write: false });
  });
  it("respects the existing explicit MFA rollout exception without reporting a verified session", async () => {
    mfa = false;
    mfaEnabled = "false";
    const config = await (await req("/api/staff-access")).json();
    expect(config.mfaVerified).toBe(false);
    expect(config.mfaSatisfied).toBe(true);
    await grant("dev", "vibe_dev");
    const audit = db
      .prepare(
        "SELECT metadata_json FROM security_events WHERE action='staff.access.updated' ORDER BY created_at DESC LIMIT 1",
      )
      .get()!;
    expect(JSON.parse(String(audit.metadata_json)).mfaVerified).toBe(false);
    mfaEnabled = undefined;
    expect(
      (await req("/api/staff-access/other", assignment("vibe_dev"))).status,
    ).toBe(403);
  });
  it("gives accounting financial capabilities without project edit, marketing or company archive access", async () => {
    await grant("finance", "avy_contabil");
    expect(await hasCapability(binding, "finance", "finance.write")).toBe(true);
    expect(await hasCapability(binding, "finance", "projects.write")).toBe(
      false,
    );
    db.exec("INSERT INTO project_staff VALUES('pa','finance','contributor',1)");
    expect(
      await canAccessProject(binding, "pa", "finance", ["staff"]),
    ).toMatchObject({ read: false, write: false });
    expect(
      documentCapability(
        (await documentActor(binding, "finance"))!,
        "documents.company.owner",
      ),
    ).toBe(false);
    actor = "finance";
    expect((await req("/api/workspace/chat")).status).toBe(200);
    expect((await req("/api/ai-projects")).status).toBe(403);
    expect(
      (await req("/api/admin/users/client/roles", {}, "PATCH")).status,
    ).toBe(403);
  });
  it("separates project read, edit, new-project and all-project privileges", async () => {
    const readOnly = [
      "dashboard.read",
      "team.read",
      "projects.read",
      "projects.all",
    ];
    await grant("dev", "senior_dev", { permissions: readOnly });
    expect(
      await canAccessProject(binding, "pb", "dev", ["staff"]),
    ).toMatchObject({ read: true, write: false });
    actor = "dev";
    expect((await req("/api/projects", {}, "POST")).status).toBe(403);
    expect((await req("/api/projects/pa", {}, "PATCH")).status).toBe(403);
  });
  it("keeps maintenance-only assignments usable without opening project development", async () => {
    await grant("dev", "vibe_dev", {
      permissions: ["team.read", "maintenance.read", "maintenance.work"],
      subscriptionIds: ["sub-a"],
    });
    expect(
      await canAccessProject(binding, "pa", "dev", ["staff"]),
    ).toMatchObject({ read: false, write: false });
    expect(
      await maintenanceWorkAccess({ DB: binding } as never, "pa", "dev", [
        "staff",
      ]),
    ).toEqual({ read: true, write: true });
    expect(
      await maintenanceWorkAccess({ DB: binding } as never, "pb", "dev", [
        "staff",
      ]),
    ).toEqual({ read: false, write: false });
  });
  it("requires MFA and explicit confirmation for assigning privileged access", async () => {
    mfa = false;
    expect(
      (await req("/api/staff-access/dev", assignment("vibe_dev"))).status,
    ).toBe(403);
    mfa = true;
    mfaEnabled = "true";
    expect(
      (
        await req(
          "/api/staff-access/dev",
          assignment("vibe_dev", { confirmed: false }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await req(
          "/api/staff-access/dev",
          assignment("vibe_dev", { permissions: ["finance.write"] }),
        )
      ).status,
    ).toBe(403);
    expect(
      db
        .prepare("SELECT count(*) n FROM user_capabilities WHERE user_id='dev'")
        .get()!.n,
    ).toBe(0);
  });
  it("prevents staff and Super Admin from controlling Owner or elevating another platform principal", async () => {
    actor = "super";
    expect(await canManageStaffTarget(binding, "super", "owner")).toBe(false);
    expect(
      (await req("/api/staff-access/dev", assignment("platform_owner"))).status,
    ).toBe(403);
    expect(
      (await req("/api/staff-access/dev", assignment("superadmin"))).status,
    ).toBe(403);
    expect(
      (await req("/api/staff-access/owner", assignment("avy_contabil"))).status,
    ).toBe(403);
    expect(
      (await req("/api/staff-access/super", assignment("vibe_dev"))).status,
    ).toBe(403);
    actor = "owner";
    expect(
      (await req("/api/staff-access/owner", assignment("vibe_dev"))).status,
    ).toBe(403);
  });
  it("lets Owner explicitly appoint Super Admin with full company archive and finance access", async () => {
    await grant("other", "superadmin");
    expect(await hasCapability(binding, "other", "finance.write")).toBe(true);
    expect(
      documentCapability(
        (await documentActor(binding, "other"))!,
        "documents.company.owner",
      ),
    ).toBe(true);
    expect(
      db
        .prepare(
          "SELECT role FROM platform_principals WHERE email='other@example.test'",
        )
        .get()!.role,
    ).toBe("superadmin");
    const forged = await documentActor(binding, "dev");
    forged!.capabilities.push({
      capability: "documents.company.owner",
      organization_id: null,
    });
    expect(documentCapability(forged!, "documents.company.owner")).toBe(false);
  });
  it("uses stable idempotency keys and rejects stale or concurrently changed assignments without partial writes", async () => {
    const key = crypto.randomUUID(),
      body = assignment("vibe_dev", { projectIds: ["pa"] });
    expect((await req("/api/staff-access/dev", body, "PUT", key)).status).toBe(
      200,
    );
    expect((await req("/api/staff-access/dev", body, "PUT", key)).status).toBe(
      200,
    );
    expect(
      (await req("/api/staff-access/dev", assignment("avy_contabil"))).status,
    ).toBe(409);
    beforeBatch = () =>
      db.exec(
        "UPDATE staff_rank_assignments SET revision=revision+1 WHERE user_id='dev'",
      );
    const conflict = await req(
      "/api/staff-access/dev",
      assignment("avy_contabil", { revision: 1 }),
    );
    expect(conflict.status, await conflict.clone().text()).toBe(409);
    expect(
      db
        .prepare(
          "SELECT rank_id FROM staff_rank_assignments WHERE user_id='dev'",
        )
        .get()!.rank_id,
    ).toBe("vibe_dev");
    expect(await hasCapability(binding, "dev", "finance.write")).toBe(false);
  });
  it("validates scopes before writing and updates profile defaults without silently changing current members", async () => {
    expect(
      (
        await req(
          "/api/staff-access/dev",
          assignment("vibe_dev", { projectIds: ["missing"] }),
        )
      ).status,
    ).toBe(403);
    expect(
      db.prepare("SELECT count(*) n FROM staff_rank_assignments").get()!.n,
    ).toBe(0);
    await grant("dev", "vibe_dev");
    const profile = STAFF_RANKS.find((r) => r.id === "vibe_dev")!;
    expect(
      (
        await req(
          "/api/staff-access/profiles/vibe_dev",
          { permissions: ["team.read"], revision: 1, confirmed: true },
          "PATCH",
        )
      ).status,
    ).toBe(200);
    expect(
      (await (await req("/api/staff-access/dev")).json()).assignment
        .permissions,
    ).toEqual([...profile.permissions].sort());
    expect(
      (
        await req(
          "/api/staff-access/profiles/vibe_dev",
          { permissions: [], revision: 1, confirmed: true },
          "PATCH",
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await req(
          "/api/staff-access/profiles/superadmin",
          { permissions: [], revision: 1, confirmed: true },
          "PATCH",
        )
      ).status,
    ).toBe(409);
  });
  it("expires capabilities immediately and blocks old access-grant routes after opt-in", async () => {
    await grant("dev", "vibe_dev", { expiresAt: Date.now() + 60000 });
    db.exec(
      "UPDATE staff_rank_assignments SET expires_at=1 WHERE user_id='dev'; UPDATE user_capabilities SET expires_at=1 WHERE user_id='dev' AND capability NOT LIKE 'staff.%'",
    );
    actor = "dev";
    expect((await req("/api/workspace/chat")).status).toBe(403);
    expect((await canAccessProject(binding, "pa", "dev", ["staff"])).read).toBe(
      false,
    );
    actor = "owner";
    expect(
      (
        await req("/api/workspace/account-access/dev", {
          client_ids: [],
          access_level: "admin",
        })
      ).status,
    ).toBe(409);
  });
  it("keeps channel and direct previews private and tracks only the caller’s own read cursor", async () => {
    const put = (
      id: string,
      author: string,
      recipient: string | null,
      content: string,
      t: number,
    ) =>
      db
        .prepare("INSERT INTO staff_chat_messages(id,author_id,recipient_id,channel,content,created_at) VALUES(?,?,?,?,?,?)")
        .run(id, author, recipient, "general", content, t);
    put("general", "other", null, "Anunț comun", 100);
    put("mine", "other", "dev", "Mesaj privat pentru dev", 200);
    put("secret", "other", "finance", "Mesaj secret contabil", 300);
    actor = "dev";
    const threads = await (
      await req("/api/workspace/chat/conversations")
    ).json();
    expect(JSON.stringify(threads)).not.toContain("secret");
    expect(
      threads.data.find((t: { target: string }) => t.target === "dm:other")
        .unread,
    ).toBe(1);
    expect(
      (
        await req(
          "/api/workspace/chat/read",
          { target: "dm:other", messageId: "mine" },
          "POST",
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await req(
          "/api/workspace/chat/read",
          { target: "dm:finance", messageId: "secret" },
          "POST",
        )
      ).status,
    ).toBe(404);
    const after = await (await req("/api/workspace/chat/conversations")).json();
    expect(
      after.data.find((t: { target: string }) => t.target === "dm:other")
        .unread,
    ).toBe(0);
    actor = "finance";
    expect(
      (await (await req("/api/workspace/chat/conversations")).json()).data.find(
        (t: { target: string }) => t.target === "dm:other",
      ).unread,
    ).toBe(1);
    actor = "client";
    expect((await req("/api/workspace/chat/conversations")).status).toBe(403);
  });
  it("paginates history by timestamp and id without leaking a different direct thread, and does not regress read markers", async () => {
    for (const [id, t] of [
      ["a", 100],
      ["b", 100],
      ["c", 200],
    ] as const)
      db.prepare("INSERT INTO staff_chat_messages(id,author_id,recipient_id,channel,content,created_at) VALUES(?,?,?,?,?,?)").run(
        id,
        "other",
        "dev",
        "general",
        id,
        t,
      );
    actor = "dev";
    const old = await (
      await req("/api/workspace/chat?recipient_id=other&before=100:b")
    ).json();
    expect(old.data.map((m: { id: string }) => m.id)).toEqual(["a"]);
    expect((await req("/api/workspace/chat?before=bad")).status).toBe(400);
    await req(
      "/api/workspace/chat/read",
      { target: "dm:other", messageId: "c" },
      "POST",
    );
    await req(
      "/api/workspace/chat/read",
      { target: "dm:other", messageId: "a" },
      "POST",
    );
    expect(
      db
        .prepare("SELECT message_id FROM staff_chat_reads WHERE user_id='dev'")
        .get()!.message_id,
    ).toBe("c");
    expect(staffRequestPermission("/api/workspace/chat/read", "POST")).toBe(
      "chat.read",
    );
  });
});

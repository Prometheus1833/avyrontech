import { bouncerFixture, fixtureScannerSettings, malwareBucket } from "./helpers/bouncerFixture";
// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { Hono } from "hono";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  documentCenterRouter,
  cleanupDocumentExports,
} from "../../cloudflare/workers/api/src/documentCenter";
import {
  blankPayload,
  paragraph,
  documentIssues,
  payloadSchema,
  replaceVariables,
} from "../shared/documents/model";
import {
  DOCUMENT_TEMPLATES,
  templateFields,
} from "../shared/documents/templates";
import { unzipSync } from "fflate";
import { exportDocument } from "../../cloudflare/workers/api/src/documentExports";
import { filterPrivateDocumentNotices } from "../../cloudflare/workers/api/src/documentPolicy";
class Statement {
  values: SQLInputValue[] = [];
  constructor(
    readonly db: DatabaseSync,
    readonly sql: string,
  ) {}
  bind(...v: SQLInputValue[]) {
    this.values = v;
    return this;
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.values) ?? null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.values) };
  }
  async run() {
    return { meta: this.db.prepare(this.sql).run(...this.values) };
  }
}
function store() {
  const data = new Map<string, Uint8Array>();
  const metadata = new Map<string, Record<string,string>>();
  return {
    data,
    put: async (key: string, value: Uint8Array | string, options?: { customMetadata?: Record<string,string> }) => {
      const bytes =
        typeof value === "string" ? new TextEncoder().encode(value) : value;
      data.set(key, bytes);
      metadata.set(key, options?.customMetadata || {});
      return { size: bytes.length };
    },
    get: async (key: string) => {
      const b = data.get(key);
      return b
        ? {
            size: b.length,
            customMetadata: metadata.get(key),
            body: new Response(b).body,
            arrayBuffer: async () =>
              b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
            text: async () => new TextDecoder().decode(b),
          }
        : null;
    },
    delete: async (key: string) => {
      data.delete(key);
      metadata.delete(key);
    },
  };
}
describe("Document Center actual handlers, immutable records and private storage", () => {
  let db: DatabaseSync,
    app: Hono,
    actor: string,
    mfa: boolean,
    env: Record<string, unknown>,
    files: ReturnType<typeof store>,
    backups: ReturnType<typeof store>;
  const payload = {
    ...blankPayload("Ofertă pentru Client A"),
    body: {
      type: "doc",
      content: [
        paragraph(
          "Document de verificare pentru servicii profesionale. Condițiile și livrabilele sunt confirmate de reprezentanții autorizați. Documentul nu conține date fictive folosite în producție.",
        ),
      ],
    },
  };
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    for (const file of readdirSync("cloudflare/d1/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
    for (const [id, email, role] of [
      ["owner", "prometheus@avyron.ro", "admin"],
      ["super", "super@example.test", "admin"],
      ["staff", "staff@example.test", "staff"],
      ["a", "a@example.test", "user"],
      ["b", "b@example.test", "user"],
    ]) {
      db.prepare(
        "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,1,1,1)",
      ).run(id, email, "fixture-not-credential");
      db.prepare("INSERT INTO user_roles VALUES(?,?)").run(id, role);
    }
    db.exec(
      "INSERT INTO platform_principals(email,role,status,created_at,updated_at) VALUES('super@example.test','superadmin','active',1,1); INSERT INTO clients(id,company_name,email,created_at) VALUES('ca','Client A','a@example.test',1),('cb','Client B','b@example.test',1); INSERT INTO client_account_access VALUES('ca','a','owner',1),('cb','b','owner',1); INSERT INTO projects(id,client_id,name,slug,created_at) VALUES('pa','ca','Project A','project-a',1),('pb','cb','Project B','project-b',1);",
    );
    actor = "owner";
    mfa = false;
    files = store();
    backups = store();
    const binding = {
      prepare: (sql: string) => new Statement(db, sql),
      batch: async (statements: Statement[]) => {
        db.exec("BEGIN");
        try {
          const out = [];
          for (const s of statements)
            out.push(
              /^\s*SELECT/i.test(s.sql)
                ? { results: db.prepare(s.sql).all(...s.values) }
                : { meta: db.prepare(s.sql).run(...s.values) },
            );
          db.exec("COMMIT");
          return out;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    };
    env = {
      DB: binding,
      FILES: files,
      DOCUMENT_BACKUPS: backups,
      DOCUMENT_BACKUP_ISOLATION_VERIFIED: "true",
      DOCUMENT_STORAGE_PRIVACY_VERIFIED: "true",
      DOCUMENT_COMPANY_BACKUPS: store(),
      DOCUMENT_EXPORTS: {
        getByName: () => ({ render: exportDocument }),
      },
      MFA_AUTH_ENABLED: "false",
    };
    app = new Hono();
    app.use("*", async (c, next) => {
      Object.assign(c.env, env);
      c.set("userId", actor);
      c.set(
        "roles",
        actor === "owner" || actor === "super"
          ? ["admin"]
          : actor === "staff"
            ? ["staff"]
            : ["user"],
      );
      c.set("mfaVerified", mfa);
      await next();
    });
    app.route("/", documentCenterRouter);
    app.onError((e) => {
      console.error(e);
      return new Response("safe failure", { status: 500 });
    });
  });
  afterEach(() => db.close());
  const req = (
    path = "",
    body?: unknown,
    method = "POST",
    key = crypto.randomUUID(),
  ) =>
    app.request(
      "/api/documents" + path,
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
  const create = async (
    scope = "client",
    beneficiaryId: string | null = "ca",
    assignments: unknown[] = [],
  ) => {
    const r = await req("", {
      payload,
      scope,
      collection: "library",
      beneficiaryId,
      templateVersionId: null,
      assignments,
    });
    expect(r.status, await r.clone().text()).toBe(200);
    return await r.json();
  };
  const revision = (id: string) =>
    Number(
      db.prepare("SELECT revision FROM documents WHERE id=?").get(id)!.revision,
    );
  const approve = async (id: string) => {
    const r = await req("/" + id + "/approve", {
      revision: revision(id),
      legalReviewReference: "",
    });
    expect(r.status, await r.clone().text()).toBe(200);
  };
  const publish = async (
    id: string,
    recipients = ["a"],
    allowClientShare = false,
  ) => {
    const r = await req("/" + id + "/publish", {
      revision: revision(id),
      recipients,
      allowClientShare,
      allowAttachments: false,
    });
    expect(r.status, await r.clone().text()).toBe(200);
  };
  it("keeps unpublished documents invisible; isolates search, IDs, counts and downloads", async () => {
    const d = await create();
    actor = "a";
    expect((await (await req()).json()).total).toBe(0);
    expect((await req("/" + d.id)).status).toBe(404);
    actor = "owner";
    await approve(d.id);
    await publish(d.id);
    actor = "a";
    expect((await req("/" + d.id)).status).toBe(200);
    actor = "b";
    expect((await req("/" + d.id)).status).toBe(404);
    expect((await req("/" + d.id + "/export/pdf")).status).toBe(404);
    expect((await (await req("?q=Client")).json()).total).toBe(0);
  });
  it("company metadata, history, storage, shares and backups remain restricted to platform principals", async () => {
    const d = await create("company", null);
    for (const who of ["staff", "a", "b"]) {
      actor = who;
      expect((await (await req("?scope=company")).json()).total).toBe(0);
      for (const path of ["", "/export/pdf", "/backups", "/recipients"])
        expect((await req("/" + d.id + path)).status).toBe(404);
    }
  });
  it("rechecks disabled accounts and membership revocation on every resource operation", async () => {
    const d = await create();
    await approve(d.id);
    await publish(d.id);
    actor = "a";
    expect((await req("/" + d.id)).status).toBe(200);
    db.exec("DELETE FROM client_account_access WHERE user_id='a'");
    expect((await req("/" + d.id)).status).toBe(404);
    actor = "owner";
    db.exec("UPDATE users SET disabled_at=1 WHERE id='owner'");
    expect((await req("/" + d.id)).status).toBe(403);
  });
  it("rejects cross-beneficiary consolidation and references to unknown projects", async () => {
    for (const id of ["pb", "missing"])
      expect(
        (
          await req("", {
            payload,
            scope: "client",
            collection: "library",
            beneficiaryId: "ca",
            templateVersionId: null,
            assignments: [{ kind: "project", id }],
          })
        ).status,
      ).toBe(403);
    expect(db.prepare("SELECT count(*) n FROM documents").get()!.n).toBe(0);
  });
  it("does not mutate the master or published version; rejects stale writes atomically", async () => {
    const d = await create();
    await approve(d.id);
    await publish(d.id);
    const rev = revision(d.id),
      original = db
        .prepare("SELECT published_version_id FROM documents WHERE id=?")
        .get(d.id)!.published_version_id;
    const body = {
      payload: { ...payload, title: "Noua ciornă" },
      revision: rev,
    };
    expect((await req("/" + d.id, body, "PUT")).status).toBe(200);
    expect(
      (
        await req(
          "/" + d.id,
          { ...body, payload: { ...payload, title: "Stale" } },
          "PUT",
        )
      ).status,
    ).toBe(409);
    expect(
      db
        .prepare("SELECT count(*) n FROM document_versions WHERE document_id=?")
        .get(d.id)!.n,
    ).toBe(2);
    actor = "a";
    const view = await (await req("/" + d.id)).json();
    expect(view.version.id).toBe(original);
    expect(view.version.payload.title).toBe(payload.title);
    expect(
      (
        await req(
          "/" +
            d.id +
            "?version=" +
            db
              .prepare("SELECT current_version_id FROM documents WHERE id=?")
              .get(d.id)!.current_version_id,
        )
      ).status,
    ).toBe(404);
    expect(() =>
      db
        .prepare("UPDATE document_versions SET search_text=? WHERE id=?")
        .run("changed", original),
    ).toThrow("document_version_immutable");
  });
  it("is idempotent and preserves immutable template content across edits", async () => {
    const input = {
      payload,
      scope: "client",
      collection: "library",
      beneficiaryId: "ca",
      templateVersionId: "offer_v1",
      assignments: [],
    };
    const key = crypto.randomUUID();
    const a = await (await req("", input, "POST", key)).json();
    const b = await (await req("", input, "POST", key)).json();
    expect(a.id).toBe(b.id);
    expect(
      (
        await req(
          "",
          { ...input, payload: { ...payload, title: "Different" } },
          "POST",
          key,
        )
      ).status,
    ).toBe(409);
    const master = db
      .prepare(
        "SELECT payload_json FROM document_template_versions WHERE id='offer_v1'",
      )
      .get()!.payload_json;
    await req(
      "/" + a.id,
      { revision: 1, payload: { ...payload, title: "Instance" } },
      "PUT",
    );
    expect(
      db
        .prepare(
          "SELECT payload_json FROM document_template_versions WHERE id='offer_v1'",
        )
        .get()!.payload_json,
    ).toBe(master);
  });
  it("restricts company settings to platform principals and preserves capital for older clients", async () => {
    const identity = { legal_name: "Emitent configurat SRL", tax_id: "CUI-TEST", registration_number: "ONRC-TEST", address: "Sediu confirmat", representative: "Reprezentant confirmat", contact_email: "issuer@example.test" };
    actor = "staff";
    expect((await req("/settings/company", { ...identity, share_capital: "500 RON" }, "PUT")).status).toBe(403);
    actor = "owner";
    expect((await req("/settings/company", { ...identity, share_capital: "500 RON" }, "PUT")).status).toBe(200);
    expect((await req("/settings/company", identity, "PUT")).status).toBe(200);
    const result = await req("/context");
    expect((await result.json()).company).toMatchObject({ ...identity, share_capital: "500 RON" });
  });
  it("provides all 11 substantial families, and blocks unresolved legal documents", async () => {
    expect(DOCUMENT_TEMPLATES).toHaveLength(11);
    for (const t of DOCUMENT_TEMPLATES) {
      expect(JSON.stringify(t.payload).length).toBeGreaterThan(1800);
      expect(documentIssues(t.payload, t.required).length).toBeGreaterThan(0);
    }
    actor = "staff";
    expect(
      (
        await req("/templates/framework/versions", {
          name: "No",
          payload,
          required: [],
          legal: true,
        })
      ).status,
    ).toBe(403);
    actor = "owner";
    const d = await req("", {
      payload,
      scope: "client",
      collection: "library",
      beneficiaryId: "ca",
      templateVersionId: "framework_v1",
      assignments: [],
    });
    const id = (await d.json()).id;
    expect(
      (
        await req("/" + id + "/approve", {
          revision: 1,
          legalReviewReference: "Specialist review",
        })
      ).status,
    ).toBe(409);
  });
  it("requires share permission, explicit confirmation and an authorized recipient", async () => {
    const d = await create();
    await approve(d.id);
    await publish(d.id);
    const share = {
      versionId: d.versionId,
      recipientId: "b",
      channel: "link",
      subject: "",
      message: "",
      attachment: "none",
      confirmed: true,
    };
    expect((await req("/" + d.id + "/share", share)).status).toBe(403);
    actor = "a";
    expect(
      (await req("/" + d.id + "/share", { ...share, recipientId: "a" })).status,
    ).toBe(404);
    actor = "owner";
    await publish(d.id, ["a"], true);
    actor = "a";
    const recipients = await (await req("/" + d.id + "/recipients")).json();
    expect(recipients.data.map((r: { id: string }) => r.id)).toEqual(["a"]);
    const response = await req("/" + d.id + "/share", {
      ...share,
      recipientId: "a",
      channel: "whatsapp",
    });
    expect(response.status, await response.clone().text()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("prepared");
    expect(body.manualUrl).toContain("wa.me");
    expect(body.link).toContain("app.avyron.ro/profil");
  });
  it("blocks confidential imports before storage until provider compliance is configured", async () => {
    const d = await create();
    const r = await app.request(`/api/documents/${d.id}/import`, {
      method: "POST", headers: {"content-type":"application/pdf","X-File-Name":"test.pdf","idempotency-key":crypto.randomUUID()},body:"%PDF-1.7\nfixture",
    }, {});
    expect(r.status).toBe(503);
    expect((await r.json()).error.code).toBe("antivirus_compliance_blocked");
    expect(db.prepare("SELECT count(*) n FROM document_files WHERE document_id=?").get(d.id)!.n).toBe(0);
    expect(files.data.size).toBe(0);
  });
  it("admits imported bytes only after Bouncer CLEAN and keeps malware out of the document record", async () => {
    files=malwareBucket();Object.assign(env,fixtureScannerSettings,{FILES:files});const provider=bouncerFixture();
    const d=await create();
    const upload=(text:string)=>app.request(`/api/documents/${d.id}/import`,{method:"POST",headers:{"content-type":"application/pdf","X-File-Name":"fixture.pdf","idempotency-key":crypto.randomUUID()},body:text},{});
    const response=await upload("%PDF-1.7\nSynthetic CLEAN fixture");expect(response.status).toBe(201);
    const f=await response.json();expect(f.status).toBe("clean_scanned");const downloaded=await req(`/${d.id}/files/${f.id}`);expect(downloaded.status).toBe(200);expect(await downloaded.text()).toContain("Synthetic CLEAN");
    provider.setVerdict("malicious");expect((await upload("%PDF-1.7\nDifferent malware fixture")).status).toBe(400);
    expect(db.prepare("SELECT count(*) n FROM document_files WHERE document_id=?").get(d.id)!.n).toBe(1);
    expect((await req(`/${d.id}/files/${f.id}`)).status).toBe(200);
  });
  it("rejects unconfigured mail and forbidden external attachments without claiming delivery", async () => {
    const d = await create();
    await approve(d.id);
    await publish(d.id);
    const share = {
      versionId: d.versionId,
      recipientId: "a",
      channel: "email",
      subject: "Document",
      message: "Private",
      attachment: "pdf",
      confirmed: true,
      attachmentConfirmed: false,
    };
    expect((await req("/" + d.id + "/share", share)).status).toBe(409);
    const r = await req("/" + d.id + "/share", {
      ...share,
      attachment: "none",
    });
    expect((await r.json()).status).toBe("failed");
  });
  it("backs up object bytes separately; restores a new draft and preserves current access/publication", async () => {
    const d = await create();
    await approve(d.id);
    await publish(d.id);
    const backup = await req("/" + d.id + "/backups", {});
    expect(backup.status, await backup.clone().text()).toBe(200);
    const b = await backup.json();
    expect(b.status).toBe("verified");
    const publication = db
      .prepare("SELECT published_version_id FROM documents WHERE id=?")
      .get(d.id)!.published_version_id;
    const restore = await req(`/${d.id}/backups/${b.id}/restore`, {
      revision: revision(d.id),
      confirmed: true,
    });
    expect(restore.status, await restore.clone().text()).toBe(200);
    expect(
      db
        .prepare("SELECT published_version_id FROM documents WHERE id=?")
        .get(d.id)!.published_version_id,
    ).toBe(publication);
    expect(
      db
        .prepare("SELECT count(*) n FROM document_versions WHERE document_id=?")
        .get(d.id)!.n,
    ).toBe(2);
    delete env.DOCUMENT_BACKUPS;
    expect((await req("/" + d.id + "/backups", {})).status).toBe(503);
  });
  it("exports a prospective beneficiary and future project as a private unapproved draft without creating CRM records", async () => {
    const before = db.prepare("SELECT count(*) n FROM clients").get()!.n;
    const manual = { ...payload, title: "Propunere pentru proiect viitor", fields: { ...payload.fields, "beneficiary.legal_name":"Beneficiar viitor", "project.future_name":"Website în negociere" }, body: {type:"doc",content:[paragraph("Beneficiar viitor · date completate direct"),paragraph("Website în negociere · proiect viitor")]}};
    const response = await req("",{payload:manual,scope:"internal",collection:"library",beneficiaryId:null,templateVersionId:null,assignments:[]});
    expect(response.status, await response.clone().text()).toBe(200);
    const {id}=await response.json();
    expect(db.prepare("SELECT count(*) n FROM clients").get()!.n).toBe(before);
    const pdf = await req(`/${id}/export/pdf`); expect(pdf.status).toBe(200); expect((await pdf.text()).startsWith("%PDF")).toBe(true);
    const word = await req(`/${id}/export/docx`); expect(word.status).toBe(200);
    expect(word.headers.get("cache-control")).toBe("private, no-store"); expect(word.headers.get("content-disposition")).toContain("attachment;");
    const zip=unzipSync(new Uint8Array(await word.arrayBuffer()));
    expect(new TextDecoder().decode(zip["word/document.xml"])).toContain("Beneficiar viitor");
    expect(new TextDecoder().decode(zip["word/document.xml"])).toContain("Website în negociere");
    expect(new TextDecoder().decode(zip["word/document.xml"])).toContain("CIORNĂ NEAPROBATĂ");
    actor="a"; expect((await req(`/${id}`)).status).toBe(404); expect((await req(`/${id}/export/docx`)).status).toBe(404);
  });
  it("generates genuine PDF/DOCX exports with Romanian text, tables and several pages", async () => {
    const long = {
      ...payload,
      body: {
        type: "doc",
        content: [
          ...Array.from({ length: 65 }, (_, i) =>
            paragraph(
              `Articol ${i + 1}. Știință, țară, îmbunătățire și obligații. Acesta este un paragraf de verificare a diacriticelor și a paginării. `.repeat(
                3,
              ),
            ),
          ),
          {
            type: "table",
            content: [
              {
                type: "tableRow",
                content: ["Serviciu", "Livrabil"].map((text) => ({
                  type: "tableHeader",
                  content: [paragraph(text)],
                })),
              },
              ...Array.from({ length: 30 }, (_, i) => ({
                type: "tableRow",
                content: [
                  { type: "tableCell", content: [paragraph("Serviciu " + i)] },
                  {
                    type: "tableCell",
                    content: [
                      paragraph("Livrabil verificabil, fără date personale."),
                    ],
                  },
                ],
              })),
            ],
          },
        ],
      },
    };
    const r = await req("", {
      payload: long,
      scope: "internal",
      collection: "library",
      beneficiaryId: null,
      templateVersionId: null,
      assignments: [],
    });
    const d = await r.json();
    mkdirSync("/tmp/avyron-document-qa", { recursive: true });
    for (const format of ["pdf", "docx"]) {
      const exportResponse = await req(`/${d.id}/export/${format}`);
      expect(
        exportResponse.status,
        await exportResponse
          .clone()
          .text()
          .then((s) => s.slice(0, 500)),
      ).toBe(200);
      const bytes = new Uint8Array(await exportResponse.arrayBuffer());
      writeFileSync(`/tmp/avyron-document-qa/multipage.${format}`, bytes);
      if (format === "pdf")
        expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
      else {
        const zip = unzipSync(bytes);
        expect(zip["word/document.xml"]).toBeDefined();
        expect(new TextDecoder().decode(zip["word/header1.xml"])).not.toContain(
          "AVYRON · AVYRON",
        );
        expect(new TextDecoder().decode(zip["word/styles.xml"])).toContain(
          "6550A3",
        );
        expect(new TextDecoder().decode(zip["word/document.xml"])).toContain(
          "Știință",
        );
      }
    }
  });
  it("rejects executable editor nodes, arbitrary attributes and missing discount justifications", () => {
    expect(
      payloadSchema.safeParse({
        ...payload,
        body: { type: "doc", content: [{ type: "script", text: "alert(1)" }] },
      }).success,
    ).toBe(false);
    expect(
      payloadSchema.safeParse({
        ...payload,
        body: { type: "doc", attrs: { onclick: "alert(1)" } },
      }).success,
    ).toBe(false);
  });
  it("revokes a published client grant independently from email-based CRM links", async () => {
    const d = await create();
    await approve(d.id);
    await publish(d.id, ["a"], true);
    const revoked = await req(`/${d.id}/access`, {
      revision: revision(d.id),
      userId: "a",
      revoke: true,
      canEdit: false,
      canShare: false,
    });
    expect(revoked.status).toBe(200);
    actor = "a";
    expect((await req("/" + d.id)).status).toBe(404);
    expect((await (await req("/notices")).json()).data).toEqual([]);
  });
  it("never leaks an unpublished version pointer, file count or internal review notes in the client list", async () => {
    const d = await create();
    await approve(d.id);
    await publish(d.id);
    const result = await req(
      "/" + d.id,
      {
        revision: revision(d.id),
        payload: { ...payload, title: "Private unpublished revision" },
      },
      "PUT",
    );
    expect(result.status).toBe(200);
    const privateVersion = db
      .prepare("SELECT current_version_id FROM documents WHERE id=?")
      .get(d.id)!.current_version_id;
    actor = "a";
    const list = await (await req()).json();
    expect(JSON.stringify(list)).not.toContain(privateVersion);
    expect(list.data[0].title).toBe(payload.title);
    expect(list.data[0].current_version_id).toBe(
      list.data[0].published_version_id,
    );
    const detail = await (await req("/" + d.id)).json();
    expect(detail.approvals[0]).toEqual({ approved: true });
  });
  it("gives an active Super Admin company access and revokes it immediately with the principal", async () => {
    const d = await create("company", null);
    actor = "super";
    expect((await req("/" + d.id)).status).toBe(200);
    expect((await (await req("?scope=company")).json()).total).toBe(1);
    db.exec(
      "UPDATE platform_principals SET status='revoked' WHERE email='super@example.test'",
    );
    expect((await req("/" + d.id)).status).toBe(404);
    actor = "staff";
    db.exec(
      "INSERT INTO user_capabilities(id,user_id,capability,reason,created_at) VALUES('forged-company','staff','documents.company.owner','insufficient non-principal grant',1)",
    );
    expect((await req("/" + d.id)).status).toBe(404);
  });
  it("supports several projects and stable service/subscription instances for the same beneficiary", async () => {
    db.exec(
      "INSERT INTO projects(id,client_id,name,slug,created_at) VALUES('pa2','ca','Second project','project-a2',1); INSERT INTO services(id,project_id,service_name,price,billing_cycle) VALUES('sa','pa','Service A',100,'monthly'); INSERT INTO subscriptions(id,client_id,service_id,next_billing_date) VALUES('suba','ca','sa',1)",
    );
    const d = await create("client", "ca", [
      { kind: "project", id: "pa" },
      { kind: "project", id: "pa2" },
      { kind: "service", id: "sa" },
      { kind: "subscription", id: "suba" },
    ]);
    for (const filter of [
      "project=pa",
      "project=pa2",
      "service=sa",
      "subscription=suba",
    ])
      expect(
        (await (await req("?" + filter)).json()).data.map(
          (row: { id: string }) => row.id,
        ),
      ).toContain(d.id);
    expect(() =>
      db
        .prepare(
          "INSERT INTO document_assignments(id,document_id,project_id,created_by,created_at) VALUES(?,?,?,?,1)",
        )
        .run("bad-reference", d.id, "pb", "owner"),
    ).toThrow("document_beneficiary_mismatch");
  });
  it("keeps commercial catalog snapshots stable and rejects forged tax or catalog values", async () => {
    const source = db
      .prepare(
        "SELECT * FROM commercial_catalog_codes WHERE entity_type='service' LIMIT 1",
      )
      .get()!;
    const line = {
      catalogId: source.id,
      label: source.display_name,
      sku: source.sku || "",
      quantity: 1,
      catalogPriceMinor: source.base_price_minor,
      offeredPriceMinor: source.base_price_minor || 0,
      priceConfirmed: source.base_price_minor !== null,
      discountReason: "",
      currency: source.currency,
      vatBasisPoints: source.vat_basis_points,
      taxVerified: source.tax_status === "verified",
      billingCycle: source.billing_cycle,
      priceModel: source.price_model,
      package: "",
    };
    const input = {
      payload: { ...payload, lines: [line] },
      scope: "client",
      collection: "library",
      beneficiaryId: "ca",
      templateVersionId: null,
      assignments: [],
    };
    expect(
      (
        await req("", {
          ...input,
          payload: {
            ...input.payload,
            lines: [{ ...line, taxVerified: !line.taxVerified }],
          },
        })
      ).status,
    ).toBe(409);
    const created = await req("", input);
    expect(created.status).toBe(200);
    const d = await created.json();
    const before = source.base_price_minor;
    const changed = {
      ...input.payload,
      lines: [
        {
          ...line,
          offeredPriceMinor: 5000,
          priceConfirmed: true,
          discountReason: "Ofertă specială de verificare",
        },
      ],
    };
    expect(
      (await req("/" + d.id, { payload: changed, revision: 1 }, "PUT")).status,
    ).toBe(200);
    expect(
      db
        .prepare(
          "SELECT base_price_minor FROM commercial_catalog_codes WHERE id=?",
        )
        .get(source.id)!.base_price_minor,
    ).toBe(before);
    expect(
      (
        await req(
          "/" + d.id,
          {
            payload: {
              ...changed,
              lines: [{ ...line, catalogPriceMinor: 999 }],
            },
            revision: 2,
          },
          "PUT",
        )
      ).status,
    ).toBe(409);
  });
  it.each(["PF", "PJ", "PFA", "ONG"])(
    "preserves the independently selected legal identity %s",
    async (type) => {
      const d = await req("", {
        payload: {
          ...payload,
          fields: {
            "beneficiary.entity_type": type,
            "beneficiary.legal_name": "Beneficiar de verificare",
          },
        },
        scope: "client",
        collection: "library",
        beneficiaryId: "ca",
        templateVersionId: null,
        assignments: [],
      });
      expect(d.status).toBe(200);
      const result = await (await req("/" + (await d.json()).id)).json();
      expect(result.version.payload.fields["beneficiary.entity_type"]).toBe(
        type,
      );
    },
  );
  it("keeps the MFA policy effective for private reads and mutations without applying it to clients", async () => {
    const d = await create();
    env.MFA_AUTH_ENABLED = "true";
    env.ADMIN_MFA_POLICY = "required";
    expect((await req("/" + d.id)).status).toBe(403);
    expect(
      (await req("/" + d.id, { payload, revision: 1 }, "PUT")).status,
    ).toBe(403);
    actor = "a";
    expect((await req("/notices")).status).toBe(200);
  });
  it("rejects a corrupt backup manifest and never overwrites historical content", async () => {
    const d = await create();
    const backup = await (await req("/" + d.id + "/backups", {})).json();
    const row = db
      .prepare("SELECT object_key FROM document_backup_records WHERE id=?")
      .get(backup.id)!;
    backups.data.set(String(row.object_key), new TextEncoder().encode("{}"));
    expect(
      (
        await req(`/${d.id}/backups/${backup.id}/restore`, {
          revision: revision(d.id),
          confirmed: true,
        })
      ).status,
    ).toBe(409);
    expect(
      db
        .prepare("SELECT count(*) n FROM document_versions WHERE document_id=?")
        .get(d.id)!.n,
    ).toBe(1);
  });
  it("does not permit data URI images to bypass import quarantine", async () => {
    const image = {
      ...payload,
      body: {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: "data:image/png;base64,iVBORw0KGgo=" },
          },
        ],
      },
    };
    expect(
      (
        await req("", {
          payload: image,
          scope: "internal",
          collection: "library",
          beneficiaryId: null,
          templateVersionId: null,
          assignments: [],
        })
      ).status,
    ).toBe(423);
  });
  it("rebuilds an approved export instead of reusing the draft watermark and preserves official files", async () => {
    const d = await create();
    expect((await req("/" + d.id + "/export/pdf")).status).toBe(200);
    await approve(d.id);
    expect((await req("/" + d.id + "/export/pdf")).status).toBe(200);
    const rows = db
      .prepare(
        "SELECT expires_at,object_key FROM document_files WHERE document_id=? ORDER BY created_at",
      )
      .all(d.id);
    expect(rows).toHaveLength(2);
    expect(rows.some((row) => row.expires_at === null)).toBe(true);
    const official = rows.find((row) => row.expires_at === null)!;
    await cleanupDocumentExports(env as never, Date.now() + 3 * 86400000);
    expect(files.data.has(String(official.object_key))).toBe(true);
  });
  it("allows active Super Admin to back up and restore company documents while excluding staff", async () => {
    const d = await create("company", null);
    actor = "super";
    const response = await req(`/${d.id}/backups`, {});
    expect(response.status, await response.clone().text()).toBe(200);
    const backup = await response.json();
    expect(backups.data.size).toBe(0);
    expect(
      (env.DOCUMENT_COMPANY_BACKUPS as ReturnType<typeof store>).data.size,
    ).toBeGreaterThan(0);
    const restored = await req(`/${d.id}/backups/${backup.id}/restore`, {
      revision: revision(d.id),
      confirmed: true,
    });
    expect(restored.status, await restored.clone().text()).toBe(200);
    actor = "staff";
    expect((await req(`/${d.id}/backups`)).status).toBe(404);
    expect(
      (
        await req(`/${d.id}/backups/${backup.id}/restore`, {
          revision: revision(d.id),
          confirmed: true,
        })
      ).status,
    ).toBe(404);
  });
  it("requires verified separate destinations and isolates corporate backups", async () => {
    const d = await create();
    env.DOCUMENT_BACKUP_ISOLATION_VERIFIED = "false";
    expect((await req(`/${d.id}/backups`, {})).status).toBe(503);
    env.DOCUMENT_BACKUP_ISOLATION_VERIFIED = "true";
    env.DOCUMENT_BACKUPS = files;
    expect((await req(`/${d.id}/backups`, {})).status).toBe(503);
    env.DOCUMENT_BACKUPS = backups;
    const company = await (
      await req("", {
        payload,
        scope: "company",
        collection: "library",
        beneficiaryId: null,
        templateVersionId: null,
        assignments: [],
      })
    ).json();
    env.DOCUMENT_COMPANY_BACKUPS = backups;
    expect((await req(`/${company.id}/backups`, {})).status).toBe(503);
  });
  it("reports the persisted backup state on retries and batches only the selected project", async () => {
    const d = await create("client", "ca", [{ kind: "project", id: "pa" }]);
    const key = crypto.randomUUID();
    const first = await (await req(`/${d.id}/backups`, {}, "POST", key)).json();
    const second = await (
      await req(`/${d.id}/backups`, {}, "POST", key)
    ).json();
    expect(second).toEqual({ id: first.id, status: "verified" });
    expect(
      db.prepare("SELECT count(*) n FROM document_backup_records").get()!.n,
    ).toBe(1);
    const result = await req("/project-backups", {
      projectId: "pa",
      confirmed: true,
    });
    expect(result.status, await result.clone().text()).toBe(200);
    expect((await result.json()).data).toHaveLength(1);
    actor = "b";
    expect(
      (await req("/project-backups", { projectId: "pa", confirmed: true }))
        .status,
    ).toBe(404);
  });
  it("keeps approvals immutable and filters states on the server", async () => {
    const d = await create();
    await approve(d.id);
    expect(() =>
      db
        .prepare("DELETE FROM document_approvals WHERE document_id=?")
        .run(d.id),
    ).toThrow("document_approval_immutable");
    expect((await (await req("?state=Ciornă")).json()).data).toHaveLength(0);
    expect((await (await req("?state=Aprobat")).json()).data).toHaveLength(1);
    expect(
      (
        await req("/templates/missing/review", {
          reference: "Reviewed by specialist",
        })
      ).status,
    ).toBe(404);
  });
  it("supports bounded merged tables and rejects malformed geometry", async () => {
    const cell = (text: string, attrs = {}) => ({
      type: "tableCell",
      attrs,
      content: [paragraph(text)],
    });
    const content = {
      ...payload,
      body: {
        type: "doc",
        content: [
          {
            type: "table",
            content: [
              {
                type: "tableRow",
                content: [cell("A", { rowspan: 2 }), cell("B")],
              },
              { type: "tableRow", content: [cell("C")] },
            ],
          },
        ],
      },
    };
    expect(payloadSchema.safeParse(content).success).toBe(true);
    const r = await req("", {
      payload: content,
      scope: "internal",
      collection: "library",
      beneficiaryId: null,
      templateVersionId: null,
      assignments: [],
    });
    expect(r.status).toBe(200);
    const d = await r.json();
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(200);
    content.body.content[0].content[1].content.push(cell("Extra"));
    expect(payloadSchema.safeParse(content).success).toBe(false);
  });
  it("keeps service profiles on catalog IDs and purchase contexts on a single legal beneficiary", async () => {
    const catalog = db
      .prepare("SELECT id FROM commercial_catalog_codes WHERE active=1 LIMIT 1")
      .get()!;
    const config = {
      fields: { scope: "Livrabile aprobate" },
      deliverables: "Livrabilele și limitele se confirmă cu beneficiarul.",
      documents: ["brief", "annex"],
    };
    actor = "staff";
    expect(
      (await req(`/service-profiles/${catalog.id}`, config, "PUT")).status,
    ).toBe(403);
    actor = "owner";
    expect(
      (await req(`/service-profiles/${catalog.id}`, config, "PUT")).status,
    ).toBe(200);
    db.exec(
      "INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,total_cents,created_at,updated_at) VALUES('oa','a','[]',100,100,1,1)",
    );
    expect((await (await req("/context")).json()).purchases).toHaveLength(1);
    db.exec("INSERT INTO client_account_access VALUES('cb','a','owner',1)");
    expect((await (await req("/context")).json()).purchases).toHaveLength(0);
  });

  it("requires authorization for each published version and never carries a recipient into the next publication", async () => {
    const d = await create();
    await approve(d.id);
    await publish(d.id);
    const initial = db
      .prepare("SELECT current_version_id FROM documents WHERE id=?")
      .get(d.id)!.current_version_id;
    db.exec(
      "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES('a2','a2@example.test','fixture',1,1,1); INSERT INTO user_roles VALUES('a2','user'); INSERT INTO client_account_access VALUES('ca','a2','owner',1)",
    );
    await req(
      "/" + d.id,
      {
        payload: { ...payload, title: "Versiunea pentru alt reprezentant" },
        revision: revision(d.id),
      },
      "PUT",
    );
    await approve(d.id);
    expect(
      (
        await req("/" + d.id + "/publish", {
          revision: revision(d.id),
          recipients: ["a2"],
          allowClientShare: false,
          allowAttachments: false,
        })
      ).status,
    ).toBe(200);
    actor = "a";
    expect((await req("/" + d.id)).status).toBe(404);
    actor = "a2";
    const detail = await (await req("/" + d.id)).json();
    expect(detail.versions).toHaveLength(1);
    expect((await req("/" + d.id + "?version=" + initial)).status).toBe(404);
    expect(
      (await req("/" + d.id + "/export/pdf?version=" + initial)).status,
    ).toBe(404);
  });
  it("stores the actual provider message ID without claiming mailbox delivery", async () => {
    const d = await create();
    await approve(d.id);
    await publish(d.id);
    env.SMTP_FROM = "document@example.test";
    let calls = 0;
    env.TRANSACTIONAL_EMAIL = {
      send: async () => {
        calls++;
        return { messageId: "fixture-provider-message" };
      },
    };
    const key = crypto.randomUUID();
    const body = {
      versionId: d.versionId,
      recipientId: "a",
      channel: "email",
      subject: "Verificare locală",
      message: "Date sintetice",
      attachment: "none",
      confirmed: true,
    };
    const response = await req(`/${d.id}/share`, body, "POST", key);
    expect((await response.json()).status).toBe("sent");
    expect(
      (await (await req(`/${d.id}/share`, body, "POST", key)).json()).status,
    ).toBe("sent");
    expect(calls).toBe(1);
    expect(
      db
        .prepare("SELECT provider_id FROM document_shares WHERE document_id=?")
        .get(d.id)!.provider_id,
    ).toBe("fixture-provider-message");
  });
  it("routes rendering through the private version runtime and fails closed without it", async () => {
    const d = await create();
    delete env.DOCUMENT_EXPORTS;
    const unavailable = await req(`/${d.id}/export/pdf`);
    expect(unavailable.status).toBe(503);
    expect((await unavailable.json()).error.code).toBe(
      "document_export_runtime_unconfigured",
    );
    const names: string[] = [];
    env.DOCUMENT_EXPORTS = {
      getByName: (name: string) => {
        names.push(name);
        return { render: exportDocument };
      },
    };
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(200);
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(200);
    expect(names).toEqual([`${d.versionId}:pdf:draft:avyron-2026-r1`]);
    await approve(d.id);
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(200);
    expect(names[1]).toBe(`${d.versionId}:pdf:final:avyron-2026-r1`);
    actor = "b";
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(404);
    expect(names).toHaveLength(2);
  });
  it("blocks storage before privacy verification and rechecks access before download begins", async () => {
    const d = await create();
    await approve(d.id);
    await publish(d.id);
    env.DOCUMENT_STORAGE_PRIVACY_VERIFIED = "false";
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(503);
    env.DOCUMENT_STORAGE_PRIVACY_VERIFIED = "true";
    actor = "a";
    const put = files.put;
    files.put = async (key, value) => {
      const result = await put(key, value);
      db.prepare(
        "UPDATE document_access_grants SET revoked_at=? WHERE document_id=? AND user_id=?",
      ).run(Date.now(), d.id, "a");
      return result;
    };
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(404);
  });
  it("uses the private version search index without revealing another beneficiary", async () => {
    const d = await create();
    await approve(d.id);
    await publish(d.id);
    actor = "a";
    expect((await (await req("?q=profesionale")).json()).data).toHaveLength(1);
    actor = "b";
    expect((await (await req("?q=profesionale")).json()).data).toHaveLength(0);
    expect((await req("?q=%22%27%25")).status).toBe(200);
  });
  it("deduplicates concurrent exports and keeps restored historical files out of the new export cache", async () => {
    const d = await create();
    await approve(d.id);
    const exports = await Promise.all([
      req(`/${d.id}/export/pdf`),
      req(`/${d.id}/export/pdf`),
    ]);
    expect(exports.map((r) => r.status)).toEqual([200, 200]);
    expect(
      db
        .prepare(
          "SELECT count(*) n FROM document_files WHERE document_id=? AND kind='pdf'",
        )
        .get(d.id)!.n,
    ).toBe(1);
    expect(files.data.size).toBe(1);
    const backup = await (await req(`/${d.id}/backups`, {})).json();
    const restored = await (
      await req(`/${d.id}/backups/${backup.id}/restore`, {
        revision: revision(d.id),
        confirmed: true,
      })
    ).json();
    expect(
      db
        .prepare("SELECT kind FROM document_files WHERE version_id=?")
        .get(restored.versionId)!.kind,
    ).toBe("import");
    await approve(d.id);
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(200);
    expect(
      db
        .prepare(
          "SELECT count(*) n FROM document_files WHERE version_id=? AND kind='pdf'",
        )
        .get(restored.versionId)!.n,
    ).toBe(1);
  });
  it("keeps proposed templates private, de-identifies known variables and follows source access revocation", async () => {
    const data = {
      ...payload,
      fields: { "beneficiary.legal_name": "Beneficiar confidențial" },
      body: {
        type: "doc",
        content: [
          paragraph(
            "Document profesional destinat Beneficiar confidențial, cu livrabile și condiții pentru verificarea modelului reutilizabil.",
          ),
        ],
      },
    };
    const d = await (
      await req("", {
        payload: data,
        scope: "client",
        collection: "library",
        beneficiaryId: "ca",
        templateVersionId: null,
        assignments: [],
      })
    ).json();
    const proposal = await (await req(`/${d.id}/save-template`, {})).json();
    const ownerContext = await (await req("/context")).json();
    const template = ownerContext.templates.find(
      (t: { id: string }) => t.id === proposal.id,
    );
    expect(template.visibility).toBe("private_proposal");
    expect(template.payload.fields["beneficiary.legal_name"]).toBe("");
    expect(JSON.stringify(template.payload)).not.toContain(
      "Beneficiar confidențial",
    );
    db.exec(
      "INSERT INTO user_capabilities(id,user_id,capability,granted_by,reason,created_at) VALUES('template-manager','staff','documents.templates.manage','owner','fixture',1),('document-creator','staff','documents.create','owner','fixture',1)",
    );
    actor = "staff";
    expect(
      (await (await req("/context")).json()).templates.some(
        (t: { id: string }) => t.id === proposal.id,
      ),
    ).toBe(false);
    expect(
      (
        await req(`/templates/${proposal.id}/versions`, {
          name: "Unauthorized change",
          payload,
          required: [],
          legal: false,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await req("", {
          payload,
          scope: "internal",
          collection: "library",
          beneficiaryId: null,
          templateVersionId: proposal.versionId,
          assignments: [],
        })
      ).status,
    ).toBe(400);
    db.exec(
      `INSERT INTO client_account_access VALUES('ca','staff','owner',1); INSERT INTO document_access_grants(document_id,user_id,granted_by,created_at) VALUES('${d.id}','staff','owner',1)`,
    );
    expect(
      (await (await req("/context")).json()).templates.some(
        (t: { id: string }) => t.id === proposal.id,
      ),
    ).toBe(true);
    db.exec("DELETE FROM client_account_access WHERE user_id='staff'");
    expect(
      (await (await req("/context")).json()).templates.some(
        (t: { id: string }) => t.id === proposal.id,
      ),
    ).toBe(false);
  });
  it("also removes revoked corporate notices from the existing operations feed", async () => {
    const d = await create("company", null);
    await approve(d.id);
    await req(`/${d.id}/share`, {
      versionId: d.versionId,
      recipientId: "owner",
      channel: "internal",
      subject: "Fixture",
      message: "",
      attachment: "none",
      confirmed: true,
    });
    const notices = db
      .prepare(
        "SELECT id,deduplication_key FROM operation_notifications WHERE user_id=? AND deduplication_key LIKE 'document-share:%'",
      )
      .all("owner") as { id: string; deduplication_key: string }[];
    const original = { id: "ordinary", deduplication_key: "ordinary" };
    notices.push(original);
    expect(
      await filterPrivateDocumentNotices(env.DB as never, "owner", notices),
    ).toHaveLength(2);
    db.exec(
      "UPDATE platform_principals SET status='revoked' WHERE email='prometheus@avyron.ro'",
    );
    expect(
      await filterPrivateDocumentNotices(env.DB as never, "owner", notices),
    ).toEqual([original]);
  });
  it("allows a scoped publisher to select recipients without granting external share permission", async () => {
    const d = await create();
    await approve(d.id);
    db.exec(
      `INSERT INTO client_account_access VALUES('ca','staff','owner',1); INSERT INTO document_access_grants(document_id,user_id,can_edit,granted_by,created_at) VALUES('${d.id}','staff',1,'owner',1); INSERT INTO user_capabilities(id,user_id,capability,granted_by,reason,created_at) VALUES('publisher','staff','documents.publish','owner','fixture',1)`,
    );
    actor = "staff";
    expect((await req(`/${d.id}/recipients`)).status).toBe(200);
    expect(
      (
        await req(`/${d.id}/publish`, {
          revision: revision(d.id),
          recipients: ["a"],
          allowClientShare: false,
          allowAttachments: false,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await req(`/${d.id}/share`, {
          versionId: d.versionId,
          recipientId: "a",
          channel: "link",
          subject: "",
          message: "",
          attachment: "none",
          confirmed: true,
        })
      ).status,
    ).toBe(404);
  });
  it("completes a legal master review and a fully populated contract through approval and both exports", async () => {
    const model = DOCUMENT_TEMPLATES.find((t) => t.id === "framework")!;
    const fields = Object.fromEntries(
      [...new Set([...model.required, ...templateFields(model.payload)])].map(
        (key) => [key, "Date sintetice pentru verificarea locală"],
      ),
    );
    const content = replaceVariables(model.payload, fields);
    expect(documentIssues(content, model.required)).toHaveLength(0);
    expect(
      (
        await req("/templates/framework_v1/review", {
          reference: "Referință sintetică de revizuire a modelului în test",
        })
      ).status,
    ).toBe(200);
    const created = await req("", {
      payload: content,
      scope: "client",
      collection: "library",
      beneficiaryId: "ca",
      templateVersionId: "framework_v1",
      assignments: [{ kind: "project", id: "pa" }],
    });
    expect(created.status, await created.clone().text()).toBe(200);
    const d = await created.json();
    const approval = await req(`/${d.id}/approve`, {
      revision: revision(d.id),
      legalReviewReference:
        "Referință sintetică pentru versiunea contractului, numai în test",
    });
    expect(approval.status, await approval.clone().text()).toBe(200);
    for (const format of ["pdf", "docx"]) {
      const response = await req(`/${d.id}/export/${format}`);
      expect(response.status).toBe(200);
      const bytes = new Uint8Array(await response.arrayBuffer());
      mkdirSync("/tmp/avyron-document-qa", { recursive: true });
      writeFileSync(`/tmp/avyron-document-qa/contract.${format}`, bytes);
    }
  });
  it("keeps legacy payloads and their cached exports readable without changing design", async () => {
    const legacy = { ...payload, labels: {} };
    const result = await req("", { payload: legacy, scope: "internal", collection: "library", beneficiaryId: null, templateVersionId: null, assignments: [] });
    expect(result.status).toBe(200);
    const d = await result.json();
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(200);
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(200);
    expect(db.prepare("SELECT count(*) n FROM document_files WHERE document_id=? AND kind='pdf'").get(d.id)!.n).toBe(1);
    expect(JSON.parse(db.prepare("SELECT payload_json FROM document_versions WHERE document_id=?").get(d.id)!.payload_json as string)).toEqual(legacy);
  });
  it("refreshes an export with unknown rendering metadata without deleting the official copy", async () => {
    const d = await create(); await approve(d.id);
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(200);
    const previous = db.prepare("SELECT object_key FROM document_files WHERE document_id=? AND kind='pdf' AND expires_at IS NULL").get(d.id)!.object_key as string;
    const bytes = files.data.get(previous)!;
    await files.put(previous, bytes);
    db.prepare("UPDATE document_files SET renderer_version='classic' WHERE object_key=?").run(previous); // Retained export produced by the previous API.
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(200);
    expect(files.data.get(previous)).toEqual(bytes);
    const count = db.prepare("SELECT count(*) n FROM document_files WHERE document_id=? AND kind='pdf' AND expires_at IS NULL").get(d.id)!.n;
    expect(count).toBe(2);
    expect((await req(`/${d.id}/export/pdf`)).status).toBe(200);
    expect(db.prepare("SELECT count(*) n FROM document_files WHERE document_id=? AND kind='pdf'").get(d.id)!.n).toBe(count);
  });
  it("cleans only partial backup copies when a source fails, preserving verified backups and original files", async () => {
    const d = await create();
    await approve(d.id);
    await req(`/${d.id}/export/pdf`);
    await req(`/${d.id}/export/docx`);
    expect((await req(`/${d.id}/backups`, {})).status).toBe(200);
    const count = backups.data.size,
      originals = files.data.size,
      get = files.get;
    let calls = 0;
    files.get = async (key) => {
      calls++;
      return calls === 2 ? null : get(key);
    };
    expect((await req(`/${d.id}/backups`, {})).status).toBe(503);
    expect(backups.data.size).toBe(count);
    expect(files.data.size).toBe(originals);
    expect(
      db
        .prepare(
          "SELECT count(*) n FROM document_backup_records WHERE status='failed'",
        )
        .get()!.n,
    ).toBe(1);
  });
  const billingSource = async () => {
    const source = db
      .prepare(
        "SELECT * FROM commercial_catalog_codes WHERE entity_type='service' LIMIT 1",
      )
      .get()!;
    db.prepare(
      "UPDATE commercial_catalog_codes SET base_price_minor=10000,vat_basis_points=2100,tax_status='verified' WHERE id=?",
    ).run(source.id);
    const line = {
      catalogId: source.id,
      label: source.display_name,
      sku: source.sku || "",
      quantity: 2,
      catalogPriceMinor: 10000,
      offeredPriceMinor: 9000,
      priceConfirmed: true,
      discountReason: "Reducere confirmată pentru test",
      currency: source.currency,
      vatBasisPoints: 2100,
      taxVerified: true,
      billingCycle: source.billing_cycle,
      priceModel: source.price_model,
      package: "",
    };
    const result = await req("", {
      payload: { ...payload, lines: [line] },
      scope: "client",
      beneficiaryId: "ca",
      templateVersionId: null,
      collection: "library",
      assignments: [{ kind: "project", id: "pa" }],
    });
    expect(result.status, await result.clone().text()).toBe(200);
    const created = await result.json();
    const versionId = db
      .prepare("SELECT current_version_id FROM documents WHERE id=?")
      .get(created.id)!.current_version_id;
    return { ...created, versionId };
  };
  const billingBody = (versionId: string) => ({
    versionId,
    invoiceDate: Date.UTC(2026, 10, 5),
    dueDate: Date.UTC(2026, 10, 15),
    confirmed: true,
  });
  it("prepares one financial draft per approved version with correct totals and no fiscal number or payment", async () => {
    const d = await billingSource();
    mfa = true;
    expect(
      (await req(`/${d.id}/prepare-billing`, billingBody(d.versionId))).status,
    ).toBe(409);
    await approve(d.id);
    const key = crypto.randomUUID();
    const first = await req(
      `/${d.id}/prepare-billing`,
      billingBody(d.versionId),
      "POST",
      key,
    );
    expect(first.status, await first.clone().text()).toBe(200);
    const result = await first.json();
    expect(
      (
        await (
          await req(
            `/${d.id}/prepare-billing`,
            billingBody(d.versionId),
            "POST",
            key,
          )
        ).json()
      ).revenue_id,
    ).toBe(result.revenue_id);
    expect(
      (
        await (
          await req(`/${d.id}/prepare-billing`, billingBody(d.versionId))
        ).json()
      ).revenue_id,
    ).toBe(result.revenue_id);
    const row = db
      .prepare("SELECT * FROM financial_revenues WHERE id=?")
      .get(result.revenue_id);
    expect(row).toMatchObject({
      client_id: "ca",
      project_id: "pa",
      status: "draft",
      invoice_number: null,
      payment_date: null,
      net_amount_minor: 18000,
      vat_amount_minor: 3780,
      gross_amount_minor: 21780,
    });
    expect(
      db.prepare("SELECT count(*) n FROM financial_revenues").get()!.n,
    ).toBe(1);
    expect(
      db
        .prepare(
          "SELECT count(*) n FROM financial_audit_events WHERE action='document.billing.prepared'",
        )
        .get()!.n,
    ).toBe(1);
    expect(
      (await (await req(`/${d.id}`)).json()).billingPreparation.revenue_id,
    ).toBe(result.revenue_id);
    await publish(d.id);
    actor = "a";
    expect(
      (await (await req(`/${d.id}`)).json()).billingPreparation,
    ).toBeNull();
    expect(
      (await req(`/${d.id}/prepare-billing`, billingBody(d.versionId))).status,
    ).toBe(403);
    actor = "b";
    expect((await req(`/${d.id}`)).status).toBe(404);
  });
  it("rejects unverified finance permissions, invalid dates, obsolete approvals and cross-client IDs", async () => {
    const d = await billingSource();
    await approve(d.id);
    expect(
      (await req(`/${d.id}/prepare-billing`, billingBody(d.versionId))).status,
    ).toBe(403);
    mfa = true;
    actor = "staff";
    expect(
      (await req(`/${d.id}/prepare-billing`, billingBody(d.versionId))).status,
    ).toBe(403);
    actor = "owner";
    expect(
      (
        await req(`/${d.id}/prepare-billing`, {
          ...billingBody(d.versionId),
          dueDate: 1,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await req(`/${d.id}/prepare-billing`, {
          ...billingBody(d.versionId),
          dueDate: 4102444800001,
        })
      ).status,
    ).toBe(400);
    const other = await create();
    expect(
      (await req(`/${other.id}/prepare-billing`, billingBody(d.versionId)))
        .status,
    ).toBe(409);
    const changed = await req(
      `/${d.id}`,
      {
        payload: { ...payload, title: "Corecție neaprobată" },
        revision: revision(d.id),
      },
      "PUT",
    );
    expect(changed.status).toBe(200);
    expect(
      (await req(`/${d.id}/prepare-billing`, billingBody(d.versionId))).status,
    ).toBe(409);
    expect(
      db.prepare("SELECT count(*) n FROM financial_revenues").get()!.n,
    ).toBe(0);
  });
  it("rolls back the financial draft if the approved source changes during the atomic operation", async () => {
    const d = await billingSource();
    await approve(d.id);
    mfa = true;
    db.exec(
      `CREATE TRIGGER simulate_document_race BEFORE INSERT ON financial_revenues BEGIN UPDATE documents SET archived_at=1 WHERE id='${d.id}'; END;`,
    );
    const response = await req(
      `/${d.id}/prepare-billing`,
      billingBody(d.versionId),
    );
    expect(response.status, await response.clone().text()).toBe(409);
    expect(
      db.prepare("SELECT count(*) n FROM financial_revenues").get()!.n,
    ).toBe(0);
    expect(
      db.prepare("SELECT archived_at FROM documents WHERE id=?").get(d.id)!
        .archived_at,
    ).toBeNull();
    expect(
      db.prepare("SELECT count(*) n FROM document_billing_preparations").get()!
        .n,
    ).toBe(0);
  });
  it("filters families and number order without revealing company documents to other roles", async () => {
    const d = await create();
    await create("company", null);
    expect(
      (await (await req("?family=custom&sort=number")).json()).data.map(
        (r: { id: string }) => r.id,
      ),
    ).toContain(d.id);
    expect((await (await req("?family=offer")).json()).total).toBe(0);
    actor = "staff";
    const list = await (await req("?family=custom&sort=number")).json();
    expect(
      list.data.every((r: { scope: string }) => r.scope !== "company"),
    ).toBe(true);
    expect(
      (await (await req("?scope=company&family=custom")).json()).total,
    ).toBe(0);
  });
});

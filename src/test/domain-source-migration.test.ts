// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
it("preserves every historical domain check and its indexes while admitting registrar results", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(
      readFileSync(
        "cloudflare/d1/migrations/0055_public_flow_sync.sql",
        "utf8",
      ),
    );
    for (const [id, source, status] of [
      ["one", "iana-rdap", "available"],
      ["two", "cloudflare-doh", "registered"],
      ["three", "unavailable", "unknown"],
    ])
      db.prepare("INSERT INTO public_domain_checks VALUES(?,?,?,?,?,?,?)").run(
        id,
        id + ".ro",
        status,
        source,
        "ro",
        "landing",
        123,
      );
    const before = db
      .prepare("SELECT * FROM public_domain_checks ORDER BY id")
      .all();
    db.exec("BEGIN");
    db.exec(
      readFileSync(
        "cloudflare/d1/migrations/0109_domain_registrar_source.sql",
        "utf8",
      ),
    );
    db.exec("COMMIT");
    expect(
      db.prepare("SELECT * FROM public_domain_checks ORDER BY id").all(),
    ).toEqual(before);
    db.prepare("INSERT INTO public_domain_checks VALUES(?,?,?,?,?,?,?)").run(
      "provider",
      "example.ro",
      "available",
      "openprovider",
      "ro",
      "landing",
      456,
    );
    expect(db.prepare("PRAGMA integrity_check").get()).toMatchObject({
      integrity_check: "ok",
    });
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='index' AND name IN('idx_public_domain_checks_created','idx_public_domain_checks_domain')",
        )
        .all(),
    ).toHaveLength(2);
  } finally {
    db.close();
  }
});
